import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import type { AuthSession } from '../auth/types/auth-request';

const STAFF_ROLES = ['admin', 'receptionist', 'trainer'];

interface AttendanceRow {
  id: string;
  member_id: string;
  check_in: Date;
  check_out: Date | null;
  date: Date;
  created_at: Date;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly databaseService: DatabaseService) {}

  async checkIn(dto: CheckInDto, user: AuthSession['user']) {
    const memberId = await this.resolveMemberIdForWrite(dto.memberId, user);

    await this.assertActiveMembership(memberId);

    const open = await this.databaseService.query(
      'SELECT id FROM attendance WHERE member_id = $1 AND check_out IS NULL',
      [memberId],
    );

    if (open.rows.length > 0) {
      throw new ConflictException('El miembro ya tiene un check-in sin cerrar');
    }

    const result = await this.databaseService.query(
      `
      INSERT INTO attendance (member_id, check_in, date)
      VALUES ($1, CURRENT_TIMESTAMP, CURRENT_DATE)
      RETURNING
        id,
        member_id,
        check_in,
        check_out,
        date,
        created_at
    `,
      [memberId],
    );

    return result.rows[0];
  }

  async checkOut(dto: CheckOutDto, user: AuthSession['user']) {
    const memberId = await this.resolveMemberIdForWrite(dto.memberId, user);

    const open = await this.databaseService.query<AttendanceRow>(
      `
      SELECT
        id,
        member_id,
        check_in,
        check_out,
        date,
        created_at
      FROM attendance
      WHERE member_id = $1 AND check_out IS NULL
      ORDER BY check_in DESC
      LIMIT 1
    `,
      [memberId],
    );

    if (open.rows.length === 0) {
      throw new BadRequestException(
        'No hay un check-in abierto para este miembro',
      );
    }

    const now = new Date();
    const checkIn = new Date(open.rows[0].check_in);

    if (now < checkIn) {
      throw new BadRequestException(
        'La hora de salida no puede ser anterior a la entrada',
      );
    }

    const result = await this.databaseService.query(
      `
      UPDATE attendance
      SET check_out = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        member_id,
        check_in,
        check_out,
        date,
        created_at
    `,
      [open.rows[0].id],
    );

    return result.rows[0];
  }

  async findAll(query: AttendanceQueryDto, user: AuthSession['user']) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.from) {
      params.push(query.from);
      conditions.push(`a.date >= $${params.length}`);
    }

    if (query.to) {
      params.push(query.to);
      conditions.push(`a.date <= $${params.length}`);
    }

    if (query.memberId) {
      params.push(query.memberId);
      conditions.push(`a.member_id = $${params.length}`);
    }

    if (user.role === 'member') {
      const member = await this.findMemberByUserId(user.id);

      if (!member) {
        return {
          data: [],
          meta: { total: 0, page: query.page, limit: query.limit },
        };
      }

      params.push(member.id);
      conditions.push(`a.member_id = $${params.length}`);
    } else if (user.role === 'receptionist') {
      // receptionist puede ver todo
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM attendance a
      ${whereClause}
    `,
      params.slice(0, params.length - 2),
    );

    const result = await this.databaseService.query(
      `
      SELECT
        a.id,
        a.member_id,
        a.check_in,
        a.check_out,
        a.date,
        a.created_at,
        mb.document_number AS member_document_number,
        u.name AS member_name
      FROM attendance a
      JOIN members mb ON mb.id = a.member_id
      LEFT JOIN "user" u ON u.id = mb.user_id
      ${whereClause}
      ORDER BY a.check_in DESC
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
    const attendance = await this.findAttendanceById(id);

    if (!attendance) {
      throw new NotFoundException('Registro de asistencia no encontrado');
    }

    if (!(await this.canAccessAttendance(attendance, user))) {
      throw new NotFoundException('Registro de asistencia no encontrado');
    }

    return attendance;
  }

  async findByMember(memberId: string, user: AuthSession['user']) {
    const member = await this.databaseService.query<{ user_id: string }>(
      'SELECT id, user_id FROM members WHERE id = $1',
      [memberId],
    );

    if (member.rows.length === 0) {
      throw new NotFoundException('Miembro no encontrado');
    }

    if (user.role === 'member' && member.rows[0].user_id !== user.id) {
      throw new NotFoundException('Miembro no encontrado');
    }

    const result = await this.databaseService.query(
      `
      SELECT
        id,
        member_id,
        check_in,
        check_out,
        date,
        created_at
      FROM attendance
      WHERE member_id = $1
      ORDER BY check_in DESC
    `,
      [memberId],
    );

    return result.rows;
  }

  private async resolveMemberIdForWrite(
    requestedMemberId: string | undefined,
    user: AuthSession['user'],
  ): Promise<string> {
    const isStaff = STAFF_ROLES.includes(user.role ?? '');

    if (isStaff) {
      if (!requestedMemberId) {
        throw new BadRequestException('Se requiere el memberId del miembro');
      }

      const member = await this.databaseService.query(
        'SELECT id FROM members WHERE id = $1',
        [requestedMemberId],
      );

      if (member.rows.length === 0) {
        throw new NotFoundException('Miembro no encontrado');
      }

      return requestedMemberId;
    }

    if (requestedMemberId) {
      throw new ForbiddenException(
        'No tienes permisos para registrar asistencia de otro miembro',
      );
    }

    const member = await this.findMemberByUserId(user.id);

    if (!member) {
      throw new BadRequestException('No tienes un perfil de miembro asociado');
    }

    return member.id;
  }

  private async assertActiveMembership(memberId: string) {
    const result = await this.databaseService.query(
      `
      SELECT id
      FROM memberships
      WHERE member_id = $1
        AND status = 'ACTIVE'
        AND start_date <= CURRENT_DATE
        AND end_date >= CURRENT_DATE
      LIMIT 1
    `,
      [memberId],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException(
        'El miembro no tiene una membresía activa vigente',
      );
    }
  }

  private async findMemberByUserId(userId: string) {
    const result = await this.databaseService.query<{ id: string }>(
      'SELECT id FROM members WHERE user_id = $1',
      [userId],
    );

    return result.rows[0] ?? null;
  }

  private async findAttendanceById(id: string): Promise<AttendanceRow | null> {
    const result = await this.databaseService.query<AttendanceRow>(
      `
      SELECT
        id,
        member_id,
        check_in,
        check_out,
        date,
        created_at
      FROM attendance
      WHERE id = $1
    `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private async canAccessAttendance(
    attendance: AttendanceRow,
    user: AuthSession['user'],
  ): Promise<boolean> {
    if (STAFF_ROLES.includes(user.role ?? '')) {
      return true;
    }

    const result = await this.databaseService.query(
      'SELECT id FROM members WHERE id = $1 AND user_id = $2',
      [attendance.member_id, user.id],
    );

    return result.rows.length > 0;
  }
}
