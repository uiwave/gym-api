import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberIdDto } from './dto/member-id.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}
  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Req() request: AuthRequest) {
    const members = await this.membersService.findAll();

    return {
      user: request.user,
      data: members,
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param() params: MemberIdDto) {
    const member = await this.membersService.findOne(params.id);

    return {
      data: member,
    };
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() request: AuthRequest, @Body() dto: CreateMemberDto) {
    const member = await this.membersService.create(request.user.id, dto);

    return {
      data: member,
    };
  }
}
