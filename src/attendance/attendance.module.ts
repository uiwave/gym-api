import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { MemberAttendanceController } from './member-attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController, MemberAttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
