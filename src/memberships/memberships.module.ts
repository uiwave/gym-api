import { Module } from '@nestjs/common';
import { MembershipsController } from './memberships.controller';
import { MemberMembershipsController } from './member-memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  controllers: [MembershipsController, MemberMembershipsController],
  providers: [MembershipsService],
})
export class MembershipsModule {}
