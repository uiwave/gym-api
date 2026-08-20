import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import type { AuthSession } from '../auth/types/auth-request';

const STAFF_ROLES = ['admin', 'receptionist', 'trainer'];

interface MemberRow {
  id: string;
  user_id: string;
  document_number: string | null;
  phone: string | null;
  birth_date: Date | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class MembersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(query: MemberQueryDto) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(
        `(
          u.name ILIKE $${params.length}
          OR u.email ILIKE $${params.length}
          OR m.document_number ILIKE $${params.length}
          OR m.phone ILIKE $${params.length}
        )`,
      );
    }

    if (query.status) {
      params.push(query.status);
      conditions.push(`m.status = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM members m
      LEFT JOIN "user" u ON u.id = m.user_id
      ${whereClause}
    `,
      params.slice(0, params.length - 2),
    );

    const result = await this.databaseService.query(
      `
      SELECT
        m.id,
        m.user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        m.document_number,
        m.phone,
        m.birth_date,
        m.address,
        m.emergency_contact_name,
        m.emergency_contact_phone,
        m.status,
        m.created_at,
        m.updated_at
      FROM members m
      LEFT JOIN "user" u ON u.id = m.user_id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
    );

    return {
      data: result.rows,
      meta: {
        total: countResult.rows[0]?.total ?? 0,
        page: query.page,
        limit: query.limit,
      },
    };
  }

  async findOne(id: string, user: AuthSession['user']) {
    const member = await this.findMemberById(id);

    if (!this.canAccessMember(member, user)) {
      throw new NotFoundException('Miembro no encontrado');
    }

    return member;
  }

  async create(user: AuthSession['user'], dto: CreateMemberDto) {
    let userId = user.id;

    if (dto.userId) {
      if (!STAFF_ROLES.includes(user.role ?? '')) {
        throw new ForbiddenException(
          'No tienes permisos para crear un miembro para otro usuario',
        );
      }
      userId = dto.userId;
    }

    const existing = await this.databaseService.query<{ id: string }>(
      'SELECT id FROM members WHERE user_id = $1',
      [userId],
    );

    if (existing.rows.length > 0) {
      throw new ForbiddenException(
        'Este usuario ya tiene un perfil de miembro',
      );
    }

    const result = await this.databaseService.query(
      `
      INSERT INTO members (
        user_id,
        document_number,
        phone,
        birth_date,
        address,
        emergency_contact_name,
        emergency_contact_phone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        user_id,
        document_number,
        phone,
        birth_date,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        status,
        created_at,
        updated_at
    `,
      [
        userId,
        dto.documentNumber ?? null,
        dto.phone ?? null,
        dto.birthDate ?? null,
        dto.address ?? null,
        dto.emergencyContactName ?? null,
        dto.emergencyContactPhone ?? null,
      ],
    );

    return result.rows[0];
  }

  async update(id: string, dto: UpdateMemberDto, user: AuthSession['user']) {
    const member = await this.findMemberById(id);

    if (!this.canAccessMember(member, user)) {
      throw new NotFoundException('Miembro no encontrado');
    }

    if (dto.userId && !STAFF_ROLES.includes(user.role ?? '')) {
      throw new ForbiddenException(
        'No tienes permisos para reasignar el usuario de un miembro',
      );
    }

    const result = await this.databaseService.query(
      `
      UPDATE members
      SET
        user_id = COALESCE($2, user_id),
        document_number = COALESCE($3, document_number),
        phone = COALESCE($4, phone),
        birth_date = COALESCE($5, birth_date),
        address = COALESCE($6, address),
        emergency_contact_name = COALESCE($7, emergency_contact_name),
        emergency_contact_phone = COALESCE($8, emergency_contact_phone),
        status = COALESCE($9, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        user_id,
        document_number,
        phone,
        birth_date,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        status,
        created_at,
        updated_at
    `,
      [
        id,
        dto.userId ?? null,
        dto.documentNumber ?? null,
        dto.phone ?? null,
        dto.birthDate ?? null,
        dto.address ?? null,
        dto.emergencyContactName ?? null,
        dto.emergencyContactPhone ?? null,
        dto.status ?? null,
      ],
    );

    return result.rows[0];
  }

  async remove(id: string, user: AuthSession['user']) {
    if (!STAFF_ROLES.includes(user.role ?? '')) {
      throw new ForbiddenException('No tienes permisos para eliminar miembros');
    }

    const member = await this.findMemberById(id);

    await this.databaseService.query('DELETE FROM members WHERE id = $1', [id]);

    return member;
  }

  async findMemberByUserId(userId: string) {
    return this.findMemberBy('user_id', userId);
  }

  private async findMemberById(id: string) {
    const member = await this.findMemberBy('id', id);

    if (!member) {
      throw new NotFoundException('Miembro no encontrado');
    }

    return member;
  }

  private async findMemberBy(column: 'id' | 'user_id', value: string) {
    const result = await this.databaseService.query<MemberRow>(
      `
      SELECT
        id,
        user_id,
        document_number,
        phone,
        birth_date,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        status,
        created_at,
        updated_at
      FROM members
      WHERE ${column} = $1
    `,
      [value],
    );

    return result.rows[0] ?? null;
  }

  private canAccessMember(
    member: MemberRow | null,
    user: AuthSession['user'],
  ): boolean {
    if (!member) {
      return false;
    }

    if (STAFF_ROLES.includes(user.role ?? '')) {
      return true;
    }

    return member.user_id === user.id;
  }
}
