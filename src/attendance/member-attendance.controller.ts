import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberIdParamDto } from '../common/dto/member-id-param.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('members')
@UseGuards(AuthGuard, RolesGuard)
export class MemberAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get(':memberId/attendance')
  async findByMember(
    @Req() request: AuthRequest,
    @Param() params: MemberIdParamDto,
  ) {
    const attendance = await this.attendanceService.findByMember(
      params.memberId,
      request.user,
    );

    return {
      data: attendance,
    };
  }
}
