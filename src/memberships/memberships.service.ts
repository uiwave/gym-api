import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipQueryDto } from './dto/membership-query.dto';
import type { AuthSession } from '../auth/types/auth-request';

const STAFF_ROLES = ['admin', 'receptionist', 'trainer'];

interface MembershipRow {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: Date;
  end_date: Date;
  status: string;
  price: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class MembershipsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(query: MembershipQueryDto) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`m.status = $${params.length}`);
    }

    if (query.memberId) {
      params.push(query.memberId);
      conditions.push(`m.member_id = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM memberships m
      ${whereClause}
    `,
      params.slice(0, params.length - 2),
    );

    const result = await this.databaseService.query(
      `
      SELECT
        m.id,
        m.member_id,
        m.plan_id,
        m.start_date,
        m.end_date,
        m.status,
        m.price,
        m.created_at,
        m.updated_at,
        p.name AS plan_name,
        p.duration_days AS plan_duration_days,
        mb.document_number AS member_document_number,
        u.name AS member_name,
        u.email AS member_email
      FROM memberships m
      JOIN plans p ON p.id = m.plan_id
      JOIN members mb ON mb.id = m.member_id
      LEFT JOIN "user" u ON u.id = mb.user_id
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
    const membership = await this.findMembershipById(id);

    if (!membership) {
      throw new NotFoundException('Membresía no encontrada');
    }

    if (!(await this.canAccessMembership(membership, user))) {
      throw new NotFoundException('Membresía no encontrada');
    }

    return membership;
  }

  async findByMember(memberId: string, user: AuthSession['user']) {
    const member = await this.databaseService.query(
      'SELECT id, user_id FROM members WHERE id = $1',
      [memberId],
    );

    if (member.rows.length === 0) {
      throw new NotFoundException('Miembro no encontrado');
    }

    if (
      !STAFF_ROLES.includes(user.role ?? '') &&
      member.rows[0].user_id !== user.id
    ) {
      throw new NotFoundException('Miembro no encontrado');
    }

    const result = await this.databaseService.query(
      `
      SELECT
        m.id,
        m.member_id,
        m.plan_id,
        m.start_date,
        m.end_date,
        m.status,
        m.price,
        m.created_at,
        m.updated_at,
        p.name AS plan_name,
        p.duration_days AS plan_duration_days
      FROM memberships m
      JOIN plans p ON p.id = m.plan_id
      WHERE m.member_id = $1
      ORDER BY m.created_at DESC
    `,
      [memberId],
    );

    return result.rows;
  }

  async create(dto: CreateMembershipDto, user: AuthSession['user']) {
    if (!STAFF_ROLES.includes(user.role ?? '')) {
      throw new ForbiddenException('No tienes permisos para crear membresías');
    }

    await this.assertMemberExists(dto.memberId);
    const plan = await this.assertPlanExists(dto.planId);

    this.assertValidDates(dto.startDate, dto.endDate);

    const price = dto.price ?? Number(plan.price);

    const result = await this.databaseService.query(
      `
      INSERT INTO memberships (member_id, plan_id, start_date, end_date, status, price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        price,
        created_at,
        updated_at
    `,
      [
        dto.memberId,
        dto.planId,
        dto.startDate,
        dto.endDate,
        dto.status ?? 'PENDING',
        price,
      ],
    );

    return result.rows[0];
  }

  async update(
    id: string,
    dto: UpdateMembershipDto,
    user: AuthSession['user'],
  ) {
    if (!STAFF_ROLES.includes(user.role ?? '')) {
      throw new ForbiddenException(
        'No tienes permisos para modificar membresías',
      );
    }

    const membership = await this.findMembershipById(id);

    if (!membership) {
      throw new NotFoundException('Membresía no encontrada');
    }

    if (dto.memberId) {
      await this.assertMemberExists(dto.memberId);
    }
    if (dto.planId) {
      await this.assertPlanExists(dto.planId);
    }

    const startDate = dto.startDate ?? this.toIsoDate(membership.start_date);
    const endDate = dto.endDate ?? this.toIsoDate(membership.end_date);

    this.assertValidDates(startDate, endDate);

    const result = await this.databaseService.query(
      `
      UPDATE memberships
      SET
        member_id = COALESCE($2, member_id),
        plan_id = COALESCE($3, plan_id),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        status = COALESCE($6, status),
        price = COALESCE($7, price),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        price,
        created_at,
        updated_at
    `,
      [
        id,
        dto.memberId ?? null,
        dto.planId ?? null,
        dto.startDate ?? null,
        dto.endDate ?? null,
        dto.status ?? null,
        dto.price ?? null,
      ],
    );

    return result.rows[0];
  }

  async remove(id: string, user: AuthSession['user']) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo el administrador puede eliminar membresías',
      );
    }

    const membership = await this.findMembershipById(id);

    if (!membership) {
      throw new NotFoundException('Membresía no encontrada');
    }

    await this.databaseService.query('DELETE FROM memberships WHERE id = $1', [
      id,
    ]);

    return membership;
  }

  private async findMembershipById(id: string): Promise<MembershipRow | null> {
    const result = await this.databaseService.query<MembershipRow>(
      `
      SELECT
        id,
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        price,
        created_at,
        updated_at
      FROM memberships
      WHERE id = $1
    `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private async assertMemberExists(memberId: string) {
    const result = await this.databaseService.query(
      'SELECT id FROM members WHERE id = $1',
      [memberId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Miembro no encontrado');
    }
  }

  private async assertPlanExists(planId: string) {
    const result = await this.databaseService.query<{
      id: string;
      price: string;
    }>('SELECT id, price FROM plans WHERE id = $1', [planId]);

    if (result.rows.length === 0) {
      throw new NotFoundException('Plan no encontrado');
    }

    return result.rows[0];
  }

  private assertValidDates(startDate: string, endDate: string) {
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior o igual a la fecha de inicio',
      );
    }
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private async canAccessMembership(
    membership: MembershipRow,
    user: AuthSession['user'],
  ): Promise<boolean> {
    if (STAFF_ROLES.includes(user.role ?? '')) {
      return true;
    }

    const result = await this.databaseService.query(
      'SELECT id FROM members WHERE id = $1 AND user_id = $2',
      [membership.member_id, user.id],
    );

    return result.rows.length > 0;
  }
}
