import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { RoutineQueryDto } from './dto/routine-query.dto';
import { TrainersService } from '../trainers/trainers.service';
import type { AuthSession } from '../auth/types/auth-request';

export interface RoutineRow {
  id: string;
  member_id: string;
  trainer_id: string | null;
  name: string;
  description: string | null;
  start_date: Date | null;
  end_date: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class RoutinesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly trainersService: TrainersService,
  ) {}

  async findAll(query: RoutineQueryDto, user: AuthSession['user']) {
    if (user.role === 'receptionist') {
      throw new ForbiddenException(
        'El recepcionista no puede consultar rutinas',
      );
    }

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (query.memberId) {
      params.push(query.memberId);
      conditions.push(`r.member_id = $${params.length}`);
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
      conditions.push(`r.member_id = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM routines r
      ${whereClause}
    `,
      params.slice(0, params.length - 2),
    );

    const result = await this.databaseService.query(
      `
      SELECT
        r.id,
        r.member_id,
        r.trainer_id,
        r.name,
        r.description,
        r.start_date,
        r.end_date,
        r.status,
        r.created_at,
        r.updated_at,
        mb.document_number AS member_document_number,
        u.name AS member_name,
        t.specialization AS trainer_specialization,
        tu.name AS trainer_name
      FROM routines r
      JOIN members mb ON mb.id = r.member_id
      LEFT JOIN "user" u ON u.id = mb.user_id
      LEFT JOIN trainers t ON t.id = r.trainer_id
      LEFT JOIN "user" tu ON tu.id = t.user_id
      ${whereClause}
      ORDER BY r.created_at DESC
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
    const routine = await this.findRoutineById(id);

    if (!routine) {
      throw new NotFoundException('Rutina no encontrada');
    }

    await this.assertRoutineAccess(routine, user);

    return routine;
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

    if (user.role === 'receptionist') {
      throw new ForbiddenException(
        'El recepcionista no puede consultar rutinas',
      );
    }

    const result = await this.databaseService.query(
      `
      SELECT
        r.id,
        r.member_id,
        r.trainer_id,
        r.name,
        r.description,
        r.start_date,
        r.end_date,
        r.status,
        r.created_at,
        r.updated_at,
        t.specialization AS trainer_specialization,
        tu.name AS trainer_name
      FROM routines r
      LEFT JOIN trainers t ON t.id = r.trainer_id
      LEFT JOIN "user" tu ON tu.id = t.user_id
      WHERE r.member_id = $1
      ORDER BY r.created_at DESC
    `,
      [memberId],
    );

    return result.rows;
  }

  async create(dto: CreateRoutineDto, user: AuthSession['user']) {
    if (!['admin', 'trainer'].includes(user.role ?? '')) {
      throw new ForbiddenException('No tienes permisos para crear rutinas');
    }

    await this.assertMemberExists(dto.memberId);

    let trainerId = dto.trainerId ?? null;

    if (dto.trainerId) {
      await this.assertTrainerExists(dto.trainerId);
    } else if (user.role === 'trainer') {
      const trainer = await this.trainersService.findTrainerByUserId(user.id);

      if (!trainer) {
        throw new BadRequestException(
          'No tienes un perfil de entrenador asociado. Asigna trainer_id.',
        );
      }

      trainerId = trainer.id;
    }

    this.assertValidDates(dto.startDate, dto.endDate);

    const result = await this.databaseService.query(
      `
      INSERT INTO routines (
        member_id,
        trainer_id,
        name,
        description,
        start_date,
        end_date,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        member_id,
        trainer_id,
        name,
        description,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
    `,
      [
        dto.memberId,
        trainerId,
        dto.name,
        dto.description ?? null,
        dto.startDate ?? null,
        dto.endDate ?? null,
        dto.status ?? 'ACTIVE',
      ],
    );

    return result.rows[0];
  }

  async update(id: string, dto: UpdateRoutineDto, user: AuthSession['user']) {
    if (!['admin', 'trainer'].includes(user.role ?? '')) {
      throw new ForbiddenException('No tienes permisos para modificar rutinas');
    }

    const routine = await this.findRoutineById(id);

    if (!routine) {
      throw new NotFoundException('Rutina no encontrada');
    }

    if (user.role === 'trainer') {
      await this.assertTrainerOwnsRoutine(routine, user);
    }

    if (dto.memberId) {
      await this.assertMemberExists(dto.memberId);
    }

    if (dto.trainerId) {
      await this.assertTrainerExists(dto.trainerId);
    }

    const startDate =
      dto.startDate ??
      (routine.start_date ? this.toIsoDate(routine.start_date) : null);
    const endDate =
      dto.endDate ??
      (routine.end_date ? this.toIsoDate(routine.end_date) : null);

    if (startDate && endDate) {
      this.assertValidDates(startDate, endDate);
    }

    const result = await this.databaseService.query(
      `
      UPDATE routines
      SET
        member_id = COALESCE($2, member_id),
        trainer_id = COALESCE($3, trainer_id),
        name = COALESCE($4, name),
        description = COALESCE($5, description),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date),
        status = COALESCE($8, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        member_id,
        trainer_id,
        name,
        description,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
    `,
      [
        id,
        dto.memberId ?? null,
        dto.trainerId ?? null,
        dto.name ?? null,
        dto.description ?? null,
        dto.startDate ?? null,
        dto.endDate ?? null,
        dto.status ?? null,
      ],
    );

    return result.rows[0];
  }

  async remove(id: string, user: AuthSession['user']) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo el administrador puede eliminar rutinas',
      );
    }

    const routine = await this.findRoutineById(id);

    if (!routine) {
      throw new NotFoundException('Rutina no encontrada');
    }

    await this.databaseService.query('DELETE FROM routines WHERE id = $1', [
      id,
    ]);

    return routine;
  }

  async assertRoutineAccess(routine: RoutineRow, user: AuthSession['user']) {
    if (['admin', 'trainer'].includes(user.role ?? '')) {
      return;
    }

    if (user.role === 'receptionist') {
      throw new ForbiddenException(
        'El recepcionista no puede consultar rutinas',
      );
    }

    const member = await this.databaseService.query(
      'SELECT id FROM members WHERE id = $1 AND user_id = $2',
      [routine.member_id, user.id],
    );

    if (member.rows.length === 0) {
      throw new NotFoundException('Rutina no encontrada');
    }
  }

  private async findRoutineById(id: string): Promise<RoutineRow | null> {
    const result = await this.databaseService.query<RoutineRow>(
      `
      SELECT
        id,
        member_id,
        trainer_id,
        name,
        description,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      FROM routines
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

  private async assertTrainerExists(trainerId: string) {
    const result = await this.databaseService.query(
      'SELECT id FROM trainers WHERE id = $1',
      [trainerId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Entrenador no encontrado');
    }
  }

  private async assertTrainerOwnsRoutine(
    routine: RoutineRow,
    user: AuthSession['user'],
  ) {
    const trainer = await this.trainersService.findTrainerByUserId(user.id);

    if (!trainer || trainer.id !== routine.trainer_id) {
      throw new ForbiddenException(
        'No tienes permisos para modificar esta rutina',
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

  private assertValidDates(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
  ) {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior o igual a la fecha de inicio',
      );
    }
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
