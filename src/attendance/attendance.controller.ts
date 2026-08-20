import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceIdDto } from './dto/attendance-id.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('attendance')
@UseGuards(AuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  async checkIn(@Req() request: AuthRequest, @Body() dto: CheckInDto) {
    const attendance = await this.attendanceService.checkIn(dto, request.user);

    return {
      data: attendance,
    };
  }

  @Post('check-out')
  async checkOut(@Req() request: AuthRequest, @Body() dto: CheckOutDto) {
    const attendance = await this.attendanceService.checkOut(dto, request.user);

    return {
      data: attendance,
    };
  }

  @Get()
  @Roles('admin', 'receptionist', 'trainer')
  async findAll(
    @Req() request: AuthRequest,
    @Query() query: AttendanceQueryDto,
  ) {
    const result = await this.attendanceService.findAll(query, request.user);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Req() request: AuthRequest, @Param() params: AttendanceIdDto) {
    const attendance = await this.attendanceService.findOne(
      params.id,
      request.user,
    );

    return {
      data: attendance,
    };
  }
}
