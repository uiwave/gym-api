import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExerciseIdDto } from './dto/exercise-id.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExerciseQueryDto } from './dto/exercise-query.dto';

@Controller('exercises')
@UseGuards(AuthGuard, RolesGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  async findAll(@Query() query: ExerciseQueryDto) {
    const result = await this.exercisesService.findAll(query);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param() params: ExerciseIdDto) {
    const exercise = await this.exercisesService.findOne(params.id);

    return {
      data: exercise,
    };
  }

  @Post()
  @Roles('admin', 'trainer')
  async create(@Body() dto: CreateExerciseDto) {
    const exercise = await this.exercisesService.create(dto);

    return {
      data: exercise,
    };
  }

  @Patch(':id')
  @Roles('admin', 'trainer')
  async update(@Param() params: ExerciseIdDto, @Body() dto: UpdateExerciseDto) {
    const exercise = await this.exercisesService.update(params.id, dto);

    return {
      data: exercise,
    };
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param() params: ExerciseIdDto) {
    const exercise = await this.exercisesService.remove(params.id);

    return {
      data: { id: exercise.id, deleted: true },
    };
  }
}
