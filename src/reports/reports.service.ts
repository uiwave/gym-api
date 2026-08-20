import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async dashboard() {
    const [
      totalMembers,
      activeMembers,
      activeMemberships,
      expiredMemberships,
      monthlyRevenue,
      todayAttendance,
      pendingPayments,
    ] = await Promise.all([
      this.databaseService.query<{ count: number }>(
        'SELECT COUNT(*)::int AS count FROM members',
      ),
      this.databaseService.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM members WHERE status = 'active'`,
      ),
      this.databaseService.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM memberships WHERE status = 'ACTIVE'`,
      ),
      this.databaseService.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM memberships
         WHERE status = 'EXPIRED' OR (status = 'ACTIVE' AND end_date < CURRENT_DATE)`,
      ),
      this.databaseService.query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM payments
         WHERE status = 'COMPLETED'
           AND payment_date >= date_trunc('month', CURRENT_DATE)`,
      ),
      this.databaseService.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM attendance
         WHERE date = CURRENT_DATE`,
      ),
      this.databaseService.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM payments
         WHERE status = 'PENDING'`,
      ),
    ]);

    return {
      totalMembers: totalMembers.rows[0]?.count ?? 0,
      activeMembers: activeMembers.rows[0]?.count ?? 0,
      activeMemberships: activeMemberships.rows[0]?.count ?? 0,
      expiredMemberships: expiredMemberships.rows[0]?.count ?? 0,
      monthlyRevenue: Number(monthlyRevenue.rows[0]?.total ?? 0),
      todayAttendance: todayAttendance.rows[0]?.count ?? 0,
      pendingPayments: pendingPayments.rows[0]?.count ?? 0,
    };
  }

  async members(query: ReportQueryDto) {
    const byStatus = await this.databaseService.query(
      `
      SELECT status, COUNT(*)::int AS total
      FROM members
      GROUP BY status
      ORDER BY status
    `,
    );

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.from) {
      params.push(query.from);
      conditions.push(`created_at >= $${params.length}`);
    }

    if (query.to) {
      params.push(query.to);
      conditions.push(
        `created_at < $${params.length}::date + INTERVAL '1 day'`,
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const newPerMonth = await this.databaseService.query(
      `
      SELECT
        TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
        COUNT(*)::int AS total
      FROM members
      ${whereClause}
      GROUP BY date_trunc('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `,
      params,
    );

    return {
      byStatus: byStatus.rows,
      newPerMonth: newPerMonth.rows,
    };
  }

  async revenue(query: ReportQueryDto) {
    const conditions: string[] = [`status = 'COMPLETED'`];
    const params: unknown[] = [];

    if (query.from) {
      params.push(query.from);
      conditions.push(`payment_date >= $${params.length}`);
    }

    if (query.to) {
      params.push(query.to);
      conditions.push(
        `payment_date < $${params.length}::date + INTERVAL '1 day'`,
      );
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const byMonth = await this.databaseService.query(
      `
      SELECT
        TO_CHAR(date_trunc('month', payment_date), 'YYYY-MM') AS month,
        COUNT(*)::int AS payments,
        COALESCE(SUM(amount), 0) AS total
      FROM payments
      ${whereClause}
      GROUP BY date_trunc('month', payment_date)
      ORDER BY month DESC
      LIMIT 12
    `,
      params,
    );

    const byMethod = await this.databaseService.query(
      `
      SELECT
        payment_method,
        COUNT(*)::int AS payments,
        COALESCE(SUM(amount), 0) AS total
      FROM payments
      ${whereClause}
      GROUP BY payment_method
      ORDER BY payment_method
    `,
      params,
    );

    const totals = await this.databaseService.query<{ total: string }>(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      ${whereClause}
    `,
      params,
    );

    return {
      totalRevenue: Number(totals.rows[0]?.total ?? 0),
      byMonth: byMonth.rows.map((row) => ({
        ...row,
        total: Number(row.total),
      })),
      byMethod: byMethod.rows.map((row) => ({
        ...row,
        total: Number(row.total),
      })),
    };
  }

  async attendance(query: ReportQueryDto) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.from) {
      params.push(query.from);
      conditions.push(`date >= $${params.length}`);
    }

    if (query.to) {
      params.push(query.to);
      conditions.push(`date <= $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.databaseService.query(
      `
      SELECT
        TO_CHAR(date, 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS check_ins,
        COUNT(check_out)::int AS check_outs
      FROM attendance
      ${whereClause}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `,
      params,
    );

    const avg = await this.databaseService.query<{ avg: string }>(
      `
      SELECT COALESCE(ROUND(AVG(daily.count), 2), 0)::text AS avg
      FROM (
        SELECT date, COUNT(*)::int AS count
        FROM attendance
        ${whereClause}
        GROUP BY date
      ) daily
    `,
      params,
    );

    return {
      daily: result.rows,
      averagePerDay: Number(avg.rows[0]?.avg ?? 0),
    };
  }

  async memberships() {
    const byStatus = await this.databaseService.query(
      `
      SELECT status, COUNT(*)::int AS total
      FROM memberships
      GROUP BY status
      ORDER BY status
    `,
    );

    const expiringSoon = await this.databaseService.query<{ count: number }>(
      `
      SELECT COUNT(*)::int AS count
      FROM memberships
      WHERE status = 'ACTIVE'
        AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    `,
    );

    const expiringSoonList = await this.databaseService.query(
      `
      SELECT
        m.id,
        m.member_id,
        m.plan_id,
        m.start_date,
        m.end_date,
        m.status,
        p.name AS plan_name,
        mb.document_number AS member_document_number,
        u.name AS member_name
      FROM memberships m
      JOIN plans p ON p.id = m.plan_id
      JOIN members mb ON mb.id = m.member_id
      LEFT JOIN "user" u ON u.id = mb.user_id
      WHERE m.status = 'ACTIVE'
        AND m.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY m.end_date ASC
    `,
    );

    return {
      byStatus: byStatus.rows,
      expiringSoon: expiringSoon.rows[0]?.count ?? 0,
      expiringSoonList: expiringSoonList.rows,
    };
  }
}
