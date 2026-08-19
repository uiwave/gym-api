import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoutineExercisesService } from './routine-exercises.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoutineIdParamDto } from './dto/routine-id-param.dto';
import { RoutineExerciseIdDto } from './dto/routine-exercise-id.dto';
import { CreateRoutineExerciseDto } from './dto/create-routine-exercise.dto';
import { UpdateRoutineExerciseDto } from './dto/update-routine-exercise.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('routines/:routineId/exercises')
@UseGuards(AuthGuard, RolesGuard)
export class RoutineExercisesController {
  constructor(
    private readonly routineExercisesService: RoutineExercisesService,
  ) {}

  @Get()
  async findAll(
    @Req() request: AuthRequest,
    @Param() params: RoutineIdParamDto,
  ) {
    const exercises = await this.routineExercisesService.findAll(
      params.routineId,
      request.user,
    );

    return {
      data: exercises,
    };
  }

  @Post()
  @Roles('admin', 'trainer')
  async create(
    @Req() request: AuthRequest,
    @Param() params: RoutineIdParamDto,
    @Body() dto: CreateRoutineExerciseDto,
  ) {
    const exercise = await this.routineExercisesService.create(
      params.routineId,
      dto,
      request.user,
    );

    return {
      data: exercise,
    };
  }

  @Patch(':exerciseId')
  @Roles('admin', 'trainer')
  async update(
    @Req() request: AuthRequest,
    @Param() params: RoutineIdParamDto,
    @Param() exerciseParams: RoutineExerciseIdDto,
    @Body() dto: UpdateRoutineExerciseDto,
  ) {
    const exercise = await this.routineExercisesService.update(
      params.routineId,
      exerciseParams.id,
      dto,
      request.user,
    );

    return {
      data: exercise,
    };
  }

  @Delete(':exerciseId')
  @Roles('admin', 'trainer')
  async remove(
    @Req() request: AuthRequest,
    @Param() params: RoutineIdParamDto,
    @Param() exerciseParams: RoutineExerciseIdDto,
  ) {
    const result = await this.routineExercisesService.remove(
      params.routineId,
      exerciseParams.id,
      request.user,
    );

    return {
      data: result,
    };
  }
}
