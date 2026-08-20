import { Module } from '@nestjs/common';
import { RoutinesController } from './routines.controller';
import { RoutineExercisesController } from './routine-exercises.controller';
import { MemberRoutinesController } from './member-routines.controller';
import { RoutinesService } from './routines.service';
import { RoutineExercisesService } from './routine-exercises.service';
import { TrainersModule } from '../trainers/trainers.module';

@Module({
  imports: [TrainersModule],
  controllers: [
    RoutinesController,
    RoutineExercisesController,
    MemberRoutinesController,
  ],
  providers: [RoutinesService, RoutineExercisesService],
})
export class RoutinesModule {}
