import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationIdDto } from './dto/notification-id.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('notifications')
@UseGuards(AuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Req() request: AuthRequest,
    @Query() query: NotificationQueryDto,
  ) {
    const result = await this.notificationsService.findAll(query, request.user);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Post()
  @Roles('admin')
  async create(
    @Req() request: AuthRequest,
    @Body() dto: CreateNotificationDto,
  ) {
    const notification = await this.notificationsService.create(
      dto,
      request.user,
    );

    return {
      data: notification,
    };
  }

  @Patch(':id/read')
  async markRead(
    @Req() request: AuthRequest,
    @Param() params: NotificationIdDto,
  ) {
    const notification = await this.notificationsService.markRead(
      params.id,
      request.user,
    );

    return {
      data: notification,
    };
  }

  @Patch('read-all')
  async markAllRead(@Req() request: AuthRequest) {
    const result = await this.notificationsService.markAllRead(request.user);

    return {
      data: result,
    };
  }

  @Delete(':id')
  async remove(
    @Req() request: AuthRequest,
    @Param() params: NotificationIdDto,
  ) {
    const result = await this.notificationsService.remove(
      params.id,
      request.user,
    );

    return {
      data: result,
    };
  }
}
