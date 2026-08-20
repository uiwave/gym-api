import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { DatabaseService } from '../database/database.service';
import type { AuthSession } from '../auth/types/auth-request';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockQuery: jest.Mock;
  let mockClientQuery: jest.Mock;
  let mockWithTransaction: jest.Mock;

  const adminUser = {
    id: 'admin1',
    name: 'Admin',
    role: 'admin',
  } as unknown as AuthSession['user'];
  const memberUser = {
    id: 'user1',
    name: 'User',
    role: 'member',
  } as unknown as AuthSession['user'];

  const paymentRow = {
    id: 'pay1',
    member_id: 'm1',
    membership_id: 'ms1',
    amount: '100',
    payment_method: 'CASH',
    payment_date: new Date(),
    status: 'COMPLETED',
    reference: null,
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    mockQuery = jest.fn();
    mockClientQuery = jest.fn();
    mockWithTransaction = jest.fn(
      async (fn: (client: { query: jest.Mock }) => Promise<unknown>) =>
        fn({ query: mockClientQuery }),
    );

    const databaseService = {
      query: mockQuery,
      withTransaction: mockWithTransaction,
      getPool: jest.fn(),
    } as unknown as DatabaseService;

    service = new PaymentsService(databaseService);
  });

  it('debe rechazar registro de pago a un miembro común', async () => {
    await expect(
      service.create(
        { memberId: 'm1', amount: 100, paymentMethod: 'CASH' },
        memberUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('debe registrar pago pendiente sin transacción', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rows: [paymentRow] });

    const result = await service.create(
      { memberId: 'm1', amount: 100, paymentMethod: 'CASH', status: 'PENDING' },
      adminUser,
    );

    expect(result).toEqual(paymentRow);
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });

  it('debe completar pago en transacción: inserta pago, activa membresía y notifica', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ms1' }] });

    mockClientQuery
      .mockResolvedValueOnce({ rows: [paymentRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'user1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.create(
      {
        memberId: 'm1',
        membershipId: 'ms1',
        amount: 100,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
      },
      adminUser,
    );

    expect(result).toEqual(paymentRow);
    expect(mockWithTransaction).toHaveBeenCalled();
    expect(mockClientQuery).toHaveBeenCalledTimes(4);
  });

  it('debe lanzar 404 si la membresía no pertenece al miembro', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      service.create(
        {
          memberId: 'm1',
          membershipId: 'ms1',
          amount: 100,
          paymentMethod: 'CASH',
        },
        adminUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
