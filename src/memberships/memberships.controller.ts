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
import { MembershipsService } from './memberships.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MembershipIdDto } from './dto/membership-id.dto';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipQueryDto } from './dto/membership-query.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('memberships')
@UseGuards(AuthGuard, RolesGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @Roles('admin', 'receptionist', 'trainer')
  async findAll(@Query() query: MembershipQueryDto) {
    const result = await this.membershipsService.findAll(query);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Req() request: AuthRequest, @Param() params: MembershipIdDto) {
    const membership = await this.membershipsService.findOne(
      params.id,
      request.user,
    );

    return {
      data: membership,
    };
  }

  @Post()
  @Roles('admin', 'receptionist')
  async create(@Req() request: AuthRequest, @Body() dto: CreateMembershipDto) {
    const membership = await this.membershipsService.create(dto, request.user);

    return {
      data: membership,
    };
  }

  @Patch(':id')
  @Roles('admin', 'receptionist')
  async update(
    @Req() request: AuthRequest,
    @Param() params: MembershipIdDto,
    @Body() dto: UpdateMembershipDto,
  ) {
    const membership = await this.membershipsService.update(
      params.id,
      dto,
      request.user,
    );

    return {
      data: membership,
    };
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Req() request: AuthRequest, @Param() params: MembershipIdDto) {
    const membership = await this.membershipsService.remove(
      params.id,
      request.user,
    );

    return {
      data: { id: membership.id, deleted: true },
    };
  }
}
