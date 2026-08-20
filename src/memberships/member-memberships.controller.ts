import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberIdParamDto } from '../common/dto/member-id-param.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('members')
@UseGuards(AuthGuard, RolesGuard)
export class MemberMembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get(':memberId/memberships')
  async findByMember(
    @Req() request: AuthRequest,
    @Param() params: MemberIdParamDto,
  ) {
    const memberships = await this.membershipsService.findByMember(
      params.memberId,
      request.user,
    );

    return {
      data: memberships,
    };
  }
}
