import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExerciseQueryDto } from './dto/exercise-query.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(query: ExerciseQueryDto) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.muscleGroup) {
      params.push(query.muscleGroup);
      conditions.push(`muscle_group ILIKE $${params.length}`);
    }

    if (query.difficulty) {
      params.push(query.difficulty);
      conditions.push(`difficulty = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM exercises
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
        muscle_group,
        equipment,
        difficulty,
        instructions,
        image_url,
        created_at,
        updated_at
      FROM exercises
      ${whereClause}
      ORDER BY name ASC
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
    const exercise = await this.findExerciseById(id);

    if (!exercise) {
      throw new NotFoundException('Ejercicio no encontrado');
    }

    return exercise;
  }

  async create(dto: CreateExerciseDto) {
    try {
      const result = await this.databaseService.query(
        `
        INSERT INTO exercises (
          name,
          description,
          muscle_group,
          equipment,
          difficulty,
          instructions,
          image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          name,
          description,
          muscle_group,
          equipment,
          difficulty,
          instructions,
          image_url,
          created_at,
          updated_at
      `,
        [
          dto.name,
          dto.description ?? null,
          dto.muscleGroup ?? null,
          dto.equipment ?? null,
          dto.difficulty ?? 'BEGINNER',
          dto.instructions ?? null,
          dto.imageUrl ?? null,
        ],
      );

      return result.rows[0];
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe un ejercicio con ese nombre');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateExerciseDto) {
    await this.findOne(id);

    try {
      const result = await this.databaseService.query(
        `
        UPDATE exercises
        SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          muscle_group = COALESCE($4, muscle_group),
          equipment = COALESCE($5, equipment),
          difficulty = COALESCE($6, difficulty),
          instructions = COALESCE($7, instructions),
          image_url = COALESCE($8, image_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          name,
          description,
          muscle_group,
          equipment,
          difficulty,
          instructions,
          image_url,
          created_at,
          updated_at
      `,
        [
          id,
          dto.name ?? null,
          dto.description ?? null,
          dto.muscleGroup ?? null,
          dto.equipment ?? null,
          dto.difficulty ?? null,
          dto.instructions ?? null,
          dto.imageUrl ?? null,
        ],
      );

      return result.rows[0];
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe un ejercicio con ese nombre');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const exercise = await this.findOne(id);

    await this.databaseService.query('DELETE FROM exercises WHERE id = $1', [
      id,
    ]);

    return exercise;
  }

  private async findExerciseById(id: string) {
    const result = await this.databaseService.query(
      `
      SELECT
        id,
        name,
        description,
        muscle_group,
        equipment,
        difficulty,
        instructions,
        image_url,
        created_at,
        updated_at
      FROM exercises
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
