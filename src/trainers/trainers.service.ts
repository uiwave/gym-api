import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { TrainerQueryDto } from './dto/trainer-query.dto';
import type { AuthSession } from '../auth/types/auth-request';

const STAFF_ROLES = ['admin', 'receptionist', 'trainer'];

interface TrainerRow {
  id: string;
  user_id: string;
  specialization: string | null;
  phone: string | null;
  bio: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  user_name?: string | null;
  user_email?: string | null;
}

@Injectable()
export class TrainersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(query: TrainerQueryDto) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(
        `(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`,
      );
    }

    if (query.status) {
      params.push(query.status);
      conditions.push(`t.status = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM trainers t
      LEFT JOIN "user" u ON u.id = t.user_id
      ${whereClause}
    `,
      params.slice(0, params.length - 2),
    );

    const result = await this.databaseService.query(
      `
      SELECT
        t.id,
        t.user_id,
        t.specialization,
        t.phone,
        t.bio,
        t.status,
        t.created_at,
        t.updated_at,
        u.name AS user_name,
        u.email AS user_email
      FROM trainers t
      LEFT JOIN "user" u ON u.id = t.user_id
      ${whereClause}
      ORDER BY t.created_at DESC
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
    if (!STAFF_ROLES.includes(user.role ?? '')) {
      throw new ForbiddenException(
        'No tienes permisos para consultar entrenadores',
      );
    }

    const trainer = await this.findTrainerById(id);

    if (!trainer) {
      throw new NotFoundException('Entrenador no encontrado');
    }

    return trainer;
  }

  async create(dto: CreateTrainerDto, user: AuthSession['user']) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo el administrador puede crear entrenadores',
      );
    }

    const userResult = await this.databaseService.query(
      'SELECT id FROM "user" WHERE id = $1',
      [dto.userId],
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    try {
      const result = await this.databaseService.query(
        `
        INSERT INTO trainers (user_id, specialization, phone, bio, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          user_id,
          specialization,
          phone,
          bio,
          status,
          created_at,
          updated_at
      `,
        [
          dto.userId,
          dto.specialization ?? null,
          dto.phone ?? null,
          dto.bio ?? null,
          dto.status ?? 'active',
        ],
      );

      return result.rows[0];
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Este usuario ya tiene un perfil de entrenador',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTrainerDto, user: AuthSession['user']) {
    const trainer = await this.findTrainerById(id);

    if (!trainer) {
      throw new NotFoundException('Entrenador no encontrado');
    }

    const isOwner = trainer.user_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'No tienes permisos para modificar este entrenador',
      );
    }

    if (dto.userId && !isAdmin) {
      throw new ForbiddenException(
        'Solo el administrador puede reasignar el usuario de un entrenador',
      );
    }

    const result = await this.databaseService.query(
      `
      UPDATE trainers
      SET
        user_id = COALESCE($2, user_id),
        specialization = COALESCE($3, specialization),
        phone = COALESCE($4, phone),
        bio = COALESCE($5, bio),
        status = COALESCE($6, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        user_id,
        specialization,
        phone,
        bio,
        status,
        created_at,
        updated_at
    `,
      [
        id,
        dto.userId ?? null,
        dto.specialization ?? null,
        dto.phone ?? null,
        dto.bio ?? null,
        dto.status ?? null,
      ],
    );

    return result.rows[0];
  }

  async remove(id: string, user: AuthSession['user']) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo el administrador puede eliminar entrenadores',
      );
    }

    const trainer = await this.findTrainerById(id);

    if (!trainer) {
      throw new NotFoundException('Entrenador no encontrado');
    }

    await this.databaseService.query('DELETE FROM trainers WHERE id = $1', [
      id,
    ]);

    return trainer;
  }

  async findTrainerByUserId(userId: string) {
    const result = await this.databaseService.query<TrainerRow>(
      `
      SELECT
        id,
        user_id,
        specialization,
        phone,
        bio,
        status,
        created_at,
        updated_at
      FROM trainers
      WHERE user_id = $1
    `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  private async findTrainerById(id: string) {
    const result = await this.databaseService.query<TrainerRow>(
      `
      SELECT
        t.id,
        t.user_id,
        t.specialization,
        t.phone,
        t.bio,
        t.status,
        t.created_at,
        t.updated_at,
        u.name AS user_name,
        u.email AS user_email
      FROM trainers t
      LEFT JOIN "user" u ON u.id = t.user_id
      WHERE t.id = $1
    `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    );
  }
}
