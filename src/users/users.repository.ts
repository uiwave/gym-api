import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PaginatedResult } from '../common/types/paginated-result';

export interface UserListQuery {
  page: number;
  limit: number;
  search?: string;
  role?: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(
    query: UserListQuery,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(
        `(name ILIKE $${params.length} OR email ILIKE $${params.length})`,
      );
    }

    if (query.role) {
      params.push(query.role);
      conditions.push(`role = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM "user"
      ${whereClause}
    `,
      params.slice(0, params.length - 2),
    );

    const result = await this.databaseService.query(
      `
      SELECT
        id,
        name,
        email,
        "emailVerified",
        image,
        role,
        banned,
        "banReason",
        "banExpires",
        "createdAt",
        "updatedAt"
      FROM "user"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
    );

    return {
      data: result.rows,
      meta: {
        total: countResult.rows[0]?.total ?? 0,
        page: query.page,
        limit: query.limit,
      },
    };
  }

  async findOne(id: string) {
    const result = await this.databaseService.query(
      `
      SELECT
        id,
        name,
        email,
        "emailVerified",
        image,
        role,
        banned,
        "banReason",
        "banExpires",
        "createdAt",
        "updatedAt"
      FROM "user"
      WHERE id = $1
    `,
      [id],
    );

    return result.rows[0] ?? null;
  }
}
