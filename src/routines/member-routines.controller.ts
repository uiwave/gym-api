import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { RoutinesService } from './routines.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberIdParamDto } from '../common/dto/member-id-param.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('members')
@UseGuards(AuthGuard, RolesGuard)
export class MemberRoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get(':memberId/routines')
  async findByMember(
    @Req() request: AuthRequest,
    @Param() params: MemberIdParamDto,
  ) {
    const routines = await this.routinesService.findByMember(
      params.memberId,
      request.user,
    );

    return {
      data: routines,
    };
  }
}
