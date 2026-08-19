import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RoutinesService, RoutineRow } from './routines.service';
import { CreateRoutineExerciseDto } from './dto/create-routine-exercise.dto';
import { UpdateRoutineExerciseDto } from './dto/update-routine-exercise.dto';
import type { AuthSession } from '../auth/types/auth-request';

@Injectable()
export class RoutineExercisesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly routinesService: RoutinesService,
  ) {}

  async findAll(routineId: string, user: AuthSession['user']) {
    const routine = await this.findRoutine(routineId);
    await this.routinesService.assertRoutineAccess(routine, user);

    const result = await this.databaseService.query(
      `
      SELECT
        re.id,
        re.routine_id,
        re.exercise_id,
        re.sets,
        re.repetitions,
        re.weight,
        re.rest_seconds,
        re.notes,
        re.order_index,
        re.created_at,
        re.updated_at,
        e.name AS exercise_name,
        e.muscle_group AS exercise_muscle_group,
        e.difficulty AS exercise_difficulty
      FROM routine_exercises re
      JOIN exercises e ON e.id = re.exercise_id
      WHERE re.routine_id = $1
      ORDER BY re.order_index ASC
    `,
      [routineId],
    );

    return result.rows;
  }

  async create(
    routineId: string,
    dto: CreateRoutineExerciseDto,
    user: AuthSession['user'],
  ) {
    this.assertCanWrite(user);

    const routine = await this.findRoutine(routineId);
    await this.routinesService.assertRoutineAccess(routine, user);

    const exercise = await this.databaseService.query(
      'SELECT id FROM exercises WHERE id = $1',
      [dto.exerciseId],
    );

    if (exercise.rows.length === 0) {
      throw new NotFoundException('Ejercicio no encontrado');
    }

    try {
      const result = await this.databaseService.query(
        `
        INSERT INTO routine_exercises (
          routine_id,
          exercise_id,
          sets,
          repetitions,
          weight,
          rest_seconds,
          notes,
          order_index
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          routine_id,
          exercise_id,
          sets,
          repetitions,
          weight,
          rest_seconds,
          notes,
          order_index,
          created_at,
          updated_at
      `,
        [
          routineId,
          dto.exerciseId,
          dto.sets,
          dto.repetitions,
          dto.weight ?? 0,
          dto.restSeconds ?? 60,
          dto.notes ?? null,
          dto.orderIndex ?? (await this.nextOrderIndex(routineId)),
        ],
      );

      return result.rows[0];
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Ese ejercicio ya está en la rutina o el order_index ya existe',
        );
      }
      throw error;
    }
  }

  async update(
    routineId: string,
    exerciseId: string,
    dto: UpdateRoutineExerciseDto,
    user: AuthSession['user'],
  ) {
    this.assertCanWrite(user);

    const routine = await this.findRoutine(routineId);
    await this.routinesService.assertRoutineAccess(routine, user);

    const existing = await this.databaseService.query(
      'SELECT id FROM routine_exercises WHERE routine_id = $1 AND id = $2',
      [routineId, exerciseId],
    );

    if (existing.rows.length === 0) {
      throw new NotFoundException('Ejercicio de rutina no encontrado');
    }

    if (dto.exerciseId) {
      const exercise = await this.databaseService.query(
        'SELECT id FROM exercises WHERE id = $1',
        [dto.exerciseId],
      );

      if (exercise.rows.length === 0) {
        throw new NotFoundException('Ejercicio no encontrado');
      }
    }

    try {
      const result = await this.databaseService.query(
        `
        UPDATE routine_exercises
        SET
          exercise_id = COALESCE($3, exercise_id),
          sets = COALESCE($4, sets),
          repetitions = COALESCE($5, repetitions),
          weight = COALESCE($6, weight),
          rest_seconds = COALESCE($7, rest_seconds),
          notes = COALESCE($8, notes),
          order_index = COALESCE($9, order_index),
          updated_at = CURRENT_TIMESTAMP
        WHERE routine_id = $1 AND id = $2
        RETURNING
          id,
          routine_id,
          exercise_id,
          sets,
          repetitions,
          weight,
          rest_seconds,
          notes,
          order_index,
          created_at,
          updated_at
      `,
        [
          routineId,
          exerciseId,
          dto.exerciseId ?? null,
          dto.sets ?? null,
          dto.repetitions ?? null,
          dto.weight ?? null,
          dto.restSeconds ?? null,
          dto.notes ?? null,
          dto.orderIndex ?? null,
        ],
      );

      return result.rows[0];
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Ese ejercicio ya está en la rutina o el order_index ya existe',
        );
      }
      throw error;
    }
  }

  async remove(
    routineId: string,
    exerciseId: string,
    user: AuthSession['user'],
  ) {
    this.assertCanWrite(user);

    const routine = await this.findRoutine(routineId);
    await this.routinesService.assertRoutineAccess(routine, user);

    const existing = await this.databaseService.query(
      'SELECT id FROM routine_exercises WHERE routine_id = $1 AND id = $2',
      [routineId, exerciseId],
    );

    if (existing.rows.length === 0) {
      throw new NotFoundException('Ejercicio de rutina no encontrado');
    }

    await this.databaseService.query(
      'DELETE FROM routine_exercises WHERE routine_id = $1 AND id = $2',
      [routineId, exerciseId],
    );

    return { id: exerciseId, deleted: true };
  }

  private assertCanWrite(user: AuthSession['user']) {
    if (!['admin', 'trainer'].includes(user.role ?? '')) {
      throw new ForbiddenException('No tienes permisos para modificar rutinas');
    }
  }

  private async findRoutine(routineId: string): Promise<RoutineRow> {
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
      [routineId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Rutina no encontrada');
    }

    return result.rows[0];
  }

  private async nextOrderIndex(routineId: string): Promise<number> {
    const result = await this.databaseService.query<{ max: number | null }>(
      'SELECT COALESCE(MAX(order_index), -1)::int AS max FROM routine_exercises WHERE routine_id = $1',
      [routineId],
    );

    return (result.rows[0]?.max ?? -1) + 1;
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
