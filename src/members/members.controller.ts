import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { MembersService } from './members.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
}
