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
import { MembersService } from './members.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberIdDto } from './dto/member-id.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('members')
@UseGuards(AuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles('admin', 'receptionist', 'trainer')
  async findAll(@Query() query: MemberQueryDto) {
    const result = await this.membersService.findAll(query);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Req() request: AuthRequest, @Param() params: MemberIdDto) {
    const member = await this.membersService.findOne(params.id, request.user);

    return {
      data: member,
    };
  }

  @Post()
  async create(@Req() request: AuthRequest, @Body() dto: CreateMemberDto) {
    const member = await this.membersService.create(request.user, dto);

    return {
      data: member,
    };
  }

  @Patch(':id')
  async update(
    @Req() request: AuthRequest,
    @Param() params: MemberIdDto,
    @Body() dto: UpdateMemberDto,
  ) {
    const member = await this.membersService.update(
      params.id,
      dto,
      request.user,
    );

    return {
      data: member,
    };
  }

  @Delete(':id')
  @Roles('admin', 'receptionist')
  async remove(@Req() request: AuthRequest, @Param() params: MemberIdDto) {
    const member = await this.membersService.remove(params.id, request.user);

    return {
      data: { id: member.id, deleted: true },
    };
  }
}
