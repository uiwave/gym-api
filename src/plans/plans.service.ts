import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanQueryDto } from './dto/plan-query.dto';

@Injectable()
export class PlansService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(query: PlanQueryDto) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`status = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM plans
      ${whereClause}
    `,
      params.slice(0, params.length - 2),
    );

    const result = await this.databaseService.query(
      `
      SELECT
        id,
        name,
        description,
        price,
        duration_days,
        status,
        created_at,
        updated_at
      FROM plans
      ${whereClause}
      ORDER BY created_at DESC
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

  async findOne(id: string) {
    const plan = await this.findPlanById(id);

    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }

    return plan;
  }

  async create(dto: CreatePlanDto) {
    const result = await this.databaseService.query(
      `
      INSERT INTO plans (name, description, price, duration_days, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        name,
        description,
        price,
        duration_days,
        status,
        created_at,
        updated_at
    `,
      [
        dto.name,
        dto.description ?? null,
        dto.price ?? 0,
        dto.durationDays,
        dto.status ?? 'active',
      ],
    );

    return result.rows[0];
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);

    try {
      const result = await this.databaseService.query(
        `
        UPDATE plans
        SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          price = COALESCE($4, price),
          duration_days = COALESCE($5, duration_days),
          status = COALESCE($6, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          name,
          description,
          price,
          duration_days,
          status,
          created_at,
          updated_at
      `,
        [
          id,
          dto.name ?? null,
          dto.description ?? null,
          dto.price ?? null,
          dto.durationDays ?? null,
          dto.status ?? null,
        ],
      );

      return result.rows[0];
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe un plan con ese nombre');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const plan = await this.findOne(id);

    await this.databaseService.query('DELETE FROM plans WHERE id = $1', [id]);

    return plan;
  }

  async findPlanById(id: string) {
    const result = await this.databaseService.query(
      `
      SELECT
        id,
        name,
        description,
        price,
        duration_days,
        status,
        created_at,
        updated_at
      FROM plans
      WHERE id = $1
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
