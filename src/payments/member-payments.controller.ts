import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberIdParamDto } from '../common/dto/member-id-param.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('members')
@UseGuards(AuthGuard, RolesGuard)
export class MemberPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':memberId/payments')
  async findByMember(
    @Req() request: AuthRequest,
    @Param() params: MemberIdParamDto,
  ) {
    const payments = await this.paymentsService.findByMember(
      params.memberId,
      request.user,
    );

    return {
      data: payments,
    };
  }
}
