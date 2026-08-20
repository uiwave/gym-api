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
import { RoutinesService } from './routines.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoutineIdDto } from './dto/routine-id.dto';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { RoutineQueryDto } from './dto/routine-query.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('routines')
@UseGuards(AuthGuard, RolesGuard)
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  async findAll(@Req() request: AuthRequest, @Query() query: RoutineQueryDto) {
    const result = await this.routinesService.findAll(query, request.user);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Req() request: AuthRequest, @Param() params: RoutineIdDto) {
    const routine = await this.routinesService.findOne(params.id, request.user);

    return {
      data: routine,
    };
  }

  @Post()
  @Roles('admin', 'trainer')
  async create(@Req() request: AuthRequest, @Body() dto: CreateRoutineDto) {
    const routine = await this.routinesService.create(dto, request.user);

    return {
      data: routine,
    };
  }

  @Patch(':id')
  @Roles('admin', 'trainer')
  async update(
    @Req() request: AuthRequest,
    @Param() params: RoutineIdDto,
    @Body() dto: UpdateRoutineDto,
  ) {
    const routine = await this.routinesService.update(
      params.id,
      dto,
      request.user,
    );

    return {
      data: routine,
    };
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Req() request: AuthRequest, @Param() params: RoutineIdDto) {
    const routine = await this.routinesService.remove(params.id, request.user);

    return {
      data: { id: routine.id, deleted: true },
    };
  }
}
