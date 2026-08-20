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
import { PlansService } from './plans.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanIdDto } from './dto/plan-id.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanQueryDto } from './dto/plan-query.dto';

@Controller('plans')
@UseGuards(AuthGuard, RolesGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async findAll(@Query() query: PlanQueryDto) {
    const result = await this.plansService.findAll(query);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param() params: PlanIdDto) {
    const plan = await this.plansService.findOne(params.id);

    return {
      data: plan,
    };
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreatePlanDto) {
    const plan = await this.plansService.create(dto);

    return {
      data: plan,
    };
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param() params: PlanIdDto, @Body() dto: UpdatePlanDto) {
    const plan = await this.plansService.update(params.id, dto);

    return {
      data: plan,
    };
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param() params: PlanIdDto) {
    const plan = await this.plansService.remove(params.id);

    return {
      data: { id: plan.id, deleted: true },
    };
  }
}
