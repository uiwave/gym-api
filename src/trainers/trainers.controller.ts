import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TrainerIdDto } from './dto/trainer-id.dto';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { TrainerQueryDto } from './dto/trainer-query.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('trainers')
@UseGuards(AuthGuard, RolesGuard)
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  @Roles('admin', 'receptionist', 'trainer')
  async findAll(@Query() query: TrainerQueryDto) {
    const result = await this.trainersService.findAll(query);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @Roles('admin', 'receptionist', 'trainer')
  async findOne(@Req() request: AuthRequest, @Param() params: TrainerIdDto) {
    const trainer = await this.trainersService.findOne(params.id, request.user);

    return {
      data: trainer,
    };
  }

  @Post()
  @Roles('admin')
  async create(@Req() request: AuthRequest, @Body() dto: CreateTrainerDto) {
    const trainer = await this.trainersService.create(dto, request.user);

    return {
      data: trainer,
    };
  }

  @Patch(':id')
  @Roles('admin', 'trainer')
  async update(
    @Req() request: AuthRequest,
    @Param() params: TrainerIdDto,
    @Body() dto: UpdateTrainerDto,
  ) {
    const trainer = await this.trainersService.update(
      params.id,
      dto,
      request.user,
    );

    return {
      data: trainer,
    };
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Req() request: AuthRequest, @Param() params: TrainerIdDto) {
    const trainer = await this.trainersService.remove(params.id, request.user);

    return {
      data: { id: trainer.id, deleted: true },
    };
  }
}
