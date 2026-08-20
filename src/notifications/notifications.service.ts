import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import type { AuthSession } from '../auth/types/auth-request';

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(query: NotificationQueryDto, user: AuthSession['user']) {
    const conditions: string[] = ['user_id = $1'];
    const params: unknown[] = [user.id];

    if (query.read !== undefined) {
      params.push(query.read);
      conditions.push(`read = $${params.length}`);
    }

    if (query.type) {
      params.push(query.type);
      conditions.push(`type = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM notifications
      ${whereClause}
    `,
      params.slice(0, params.length - 2),
    );

    const result = await this.databaseService.query(
      `
      SELECT
        id,
        user_id,
        title,
        message,
        type,
        read,
        created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
    );

    const unreadResult = await this.databaseService.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [user.id],
    );

    return {
      data: result.rows,
      meta: {
        total: countResult.rows[0]?.total ?? 0,
        page: query.page,
        limit: query.limit,
        unread: unreadResult.rows[0]?.count ?? 0,
      },
    };
  }

  async markRead(id: string, user: AuthSession['user']) {
    const result = await this.databaseService.query(
      `
      UPDATE notifications
      SET read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING
        id,
        user_id,
        title,
        message,
        type,
        read,
        created_at
    `,
      [id, user.id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return result.rows[0];
  }

  async markAllRead(user: AuthSession['user']) {
    const result = await this.databaseService.query(
      `
      UPDATE notifications
      SET read = TRUE
      WHERE user_id = $1 AND read = FALSE
      RETURNING id
    `,
      [user.id],
    );

    return { updated: result.rows.length };
  }

  async remove(id: string, user: AuthSession['user']) {
    const notification = await this.findNotificationById(id);

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (notification.user_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenException(
        'No tienes permisos para eliminar esta notificación',
      );
    }

    await this.databaseService.query(
      'DELETE FROM notifications WHERE id = $1',
      [id],
    );

    return { id, deleted: true };
  }

  async create(dto: CreateNotificationDto, user: AuthSession['user']) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo el administrador puede generar notificaciones',
      );
    }

    const targetUser = await this.databaseService.query(
      'SELECT id FROM "user" WHERE id = $1',
      [dto.userId],
    );

    if (targetUser.rows.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const result = await this.databaseService.query(
      `
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        user_id,
        title,
        message,
        type,
        read,
        created_at
    `,
      [dto.userId, dto.title, dto.message, dto.type],
    );

    return result.rows[0];
  }

  private async findNotificationById(id: string) {
    const result = await this.databaseService.query<{
      id: string;
      user_id: string;
    }>(
      `
      SELECT id, user_id
      FROM notifications
      WHERE id = $1
    `,
      [id],
    );

    return result.rows[0] ?? null;
  }
}
