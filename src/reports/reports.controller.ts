import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportQueryDto } from './dto/report-query.dto';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'receptionist')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async dashboard() {
    return {
      data: await this.reportsService.dashboard(),
    };
  }

  @Get('members')
  async members(@Query() query: ReportQueryDto) {
    return {
      data: await this.reportsService.members(query),
    };
  }

  @Get('revenue')
  async revenue(@Query() query: ReportQueryDto) {
    return {
      data: await this.reportsService.revenue(query),
    };
  }

  @Get('attendance')
  async attendance(@Query() query: ReportQueryDto) {
    return {
      data: await this.reportsService.attendance(query),
    };
  }

  @Get('memberships')
  async memberships() {
    return {
      data: await this.reportsService.memberships(),
    };
  }
}
