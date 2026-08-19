import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import type { AuthSession } from '../auth/types/auth-request';

const STAFF_ROLES = ['admin', 'receptionist', 'trainer'];

interface PaymentRow {
  id: string;
  member_id: string;
  membership_id: string | null;
  amount: string;
  payment_method: string;
  payment_date: Date;
  status: string;
  reference: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(query: PaymentQueryDto) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (query.from) {
      params.push(query.from);
      conditions.push(`p.payment_date >= $${params.length}`);
    }

    if (query.to) {
      params.push(query.to);
      conditions.push(
        `p.payment_date <= $${params.length}::date + INTERVAL '1 day'`,
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const countResult = await this.databaseService.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM payments p
      ${whereClause}
    `,
      params.slice(0, params.length - 2),
    );

    const result = await this.databaseService.query(
      `
      SELECT
        p.id,
        p.member_id,
        p.membership_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.status,
        p.reference,
        p.notes,
        p.created_at,
        p.updated_at,
        mb.document_number AS member_document_number,
        u.name AS member_name,
        u.email AS member_email
      FROM payments p
      JOIN members mb ON mb.id = p.member_id
      LEFT JOIN "user" u ON u.id = mb.user_id
      ${whereClause}
      ORDER BY p.payment_date DESC
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

  async findOne(id: string, user: AuthSession['user']) {
    const payment = await this.findPaymentById(id);

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (!(await this.canAccessPayment(payment, user))) {
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }

  async findByMember(memberId: string, user: AuthSession['user']) {
    await this.assertMemberAccess(memberId, user);

    const result = await this.databaseService.query(
      `
      SELECT
        p.id,
        p.member_id,
        p.membership_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.status,
        p.reference,
        p.notes,
        p.created_at,
        p.updated_at
      FROM payments p
      WHERE p.member_id = $1
      ORDER BY p.payment_date DESC
    `,
      [memberId],
    );

    return result.rows;
  }

  async create(dto: CreatePaymentDto, user: AuthSession['user']) {
    if (!STAFF_ROLES.includes(user.role ?? '')) {
      throw new ForbiddenException('No tienes permisos para registrar pagos');
    }

    await this.assertMemberExists(dto.memberId);

    if (dto.membershipId) {
      await this.assertMembershipBelongsToMember(
        dto.membershipId,
        dto.memberId,
      );
    }

    const status = dto.status ?? 'PENDING';
    const paymentDate = dto.paymentDate ?? new Date().toISOString();

    if (status === 'COMPLETED') {
      return this.createCompletedPayment(dto, paymentDate);
    }

    const result = await this.databaseService.query(
      `
      INSERT INTO payments (
        member_id,
        membership_id,
        amount,
        payment_method,
        payment_date,
        status,
        reference,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        member_id,
        membership_id,
        amount,
        payment_method,
        payment_date,
        status,
        reference,
        notes,
        created_at,
        updated_at
    `,
      [
        dto.memberId,
        dto.membershipId ?? null,
        dto.amount,
        dto.paymentMethod,
        paymentDate,
        status,
        dto.reference ?? null,
        dto.notes ?? null,
      ],
    );

    return result.rows[0];
  }

  async update(id: string, dto: UpdatePaymentDto, user: AuthSession['user']) {
    if (!STAFF_ROLES.includes(user.role ?? '')) {
      throw new ForbiddenException('No tienes permisos para modificar pagos');
    }

    const payment = await this.findPaymentById(id);

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (dto.memberId) {
      await this.assertMemberExists(dto.memberId);
    }

    if (dto.membershipId) {
      await this.assertMembershipBelongsToMember(
        dto.membershipId,
        dto.memberId ?? payment.member_id,
      );
    }

    const newStatus = dto.status ?? payment.status;
    const wasCompleted = payment.status === 'COMPLETED';
    const becomesCompleted = newStatus === 'COMPLETED';

    if (becomesCompleted && !wasCompleted) {
      return this.completePayment(id, dto, payment);
    }

    const result = await this.databaseService.query(
      `
      UPDATE payments
      SET
        member_id = COALESCE($2, member_id),
        membership_id = COALESCE($3, membership_id),
        amount = COALESCE($4, amount),
        payment_method = COALESCE($5, payment_method),
        payment_date = COALESCE($6, payment_date),
        status = COALESCE($7, status),
        reference = COALESCE($8, reference),
        notes = COALESCE($9, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        member_id,
        membership_id,
        amount,
        payment_method,
        payment_date,
        status,
        reference,
        notes,
        created_at,
        updated_at
    `,
      [
        id,
        dto.memberId ?? null,
        dto.membershipId ?? null,
        dto.amount ?? null,
        dto.paymentMethod ?? null,
        dto.paymentDate ?? null,
        dto.status ?? null,
        dto.reference ?? null,
        dto.notes ?? null,
      ],
    );

    return result.rows[0];
  }

  private async createCompletedPayment(
    dto: CreatePaymentDto,
    paymentDate: string,
  ) {
    return this.databaseService.withTransaction(async (client) => {
      const result = await client.query<PaymentRow>(
        `
        INSERT INTO payments (
          member_id,
          membership_id,
          amount,
          payment_method,
          payment_date,
          status,
          reference,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, 'COMPLETED', $6, $7)
        RETURNING
          id,
          member_id,
          membership_id,
          amount,
          payment_method,
          payment_date,
          status,
          reference,
          notes,
          created_at,
          updated_at
      `,
        [
          dto.memberId,
          dto.membershipId ?? null,
          dto.amount,
          dto.paymentMethod,
          paymentDate,
          dto.reference ?? null,
          dto.notes ?? null,
        ],
      );

      if (dto.membershipId) {
        await this.activateMembership(client, dto.membershipId);
      }

      await this.notifyPayment(client, dto.memberId, dto.amount);

      return result.rows[0];
    });
  }

  private async completePayment(
    id: string,
    dto: UpdatePaymentDto,
    payment: PaymentRow,
  ) {
    return this.databaseService.withTransaction(async (client) => {
      const result = await client.query<PaymentRow>(
        `
        UPDATE payments
        SET
          member_id = COALESCE($2, member_id),
          membership_id = COALESCE($3, membership_id),
          amount = COALESCE($4, amount),
          payment_method = COALESCE($5, payment_method),
          payment_date = COALESCE($6, payment_date),
          status = 'COMPLETED',
          reference = COALESCE($7, reference),
          notes = COALESCE($8, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          member_id,
          membership_id,
          amount,
          payment_method,
          payment_date,
          status,
          reference,
          notes,
          created_at,
          updated_at
      `,
        [
          id,
          dto.memberId ?? null,
          dto.membershipId ?? null,
          dto.amount ?? null,
          dto.paymentMethod ?? null,
          dto.paymentDate ?? null,
          dto.reference ?? null,
          dto.notes ?? null,
        ],
      );

      const membershipId = dto.membershipId ?? payment.membership_id;
      const memberId = dto.memberId ?? payment.member_id;

      if (membershipId) {
        await this.activateMembership(client, membershipId);
      }

      await this.notifyPayment(
        client,
        memberId,
        Number(dto.amount ?? payment.amount),
      );

      return result.rows[0];
    });
  }

  private async activateMembership(client: PoolClient, membershipId: string) {
    await client.query(
      `
      UPDATE memberships
      SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'PENDING'
    `,
      [membershipId],
    );
  }

  private async notifyPayment(
    client: PoolClient,
    memberId: string,
    amount: number,
  ) {
    const memberResult = await client.query<{ user_id: string }>(
      'SELECT user_id FROM members WHERE id = $1',
      [memberId],
    );

    const userId = memberResult.rows[0]?.user_id;

    if (!userId) {
      return;
    }

    await client.query(
      `
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, $2, $3, 'PAYMENT')
    `,
      [
        userId,
        'Pago registrado',
        `Se registró un pago por S/ ${amount.toFixed(2)}`,
      ],
    );
  }

  private async findPaymentById(id: string): Promise<PaymentRow | null> {
    const result = await this.databaseService.query<PaymentRow>(
      `
      SELECT
        id,
        member_id,
        membership_id,
        amount,
        payment_method,
        payment_date,
        status,
        reference,
        notes,
        created_at,
        updated_at
      FROM payments
      WHERE id = $1
    `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private async assertMemberExists(memberId: string) {
    const result = await this.databaseService.query(
      'SELECT id FROM members WHERE id = $1',
      [memberId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Miembro no encontrado');
    }
  }

  private async assertMembershipBelongsToMember(
    membershipId: string,
    memberId: string,
  ) {
    const result = await this.databaseService.query(
      'SELECT id FROM memberships WHERE id = $1 AND member_id = $2',
      [membershipId, memberId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        'La membresía no pertenece al miembro indicado',
      );
    }
  }

  private async assertMemberAccess(
    memberId: string,
    user: AuthSession['user'],
  ) {
    const result = await this.databaseService.query<{ user_id: string }>(
      'SELECT id, user_id FROM members WHERE id = $1',
      [memberId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Miembro no encontrado');
    }

    if (
      !STAFF_ROLES.includes(user.role ?? '') &&
      result.rows[0].user_id !== user.id
    ) {
      throw new NotFoundException('Miembro no encontrado');
    }
  }

  private async canAccessPayment(
    payment: PaymentRow,
    user: AuthSession['user'],
  ): Promise<boolean> {
    if (STAFF_ROLES.includes(user.role ?? '')) {
      return true;
    }

    const result = await this.databaseService.query(
      'SELECT id FROM members WHERE id = $1 AND user_id = $2',
      [payment.member_id, user.id],
    );

    return result.rows.length > 0;
  }
}
