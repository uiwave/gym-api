import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { DatabaseService } from '../database/database.service';
import type { AuthSession } from '../auth/types/auth-request';

describe('MembershipsService', () => {
  let service: MembershipsService;
  let mockQuery: jest.Mock;

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

  const membershipRow = {
    id: 'ms1',
    member_id: 'm1',
    plan_id: 'p1',
    start_date: new Date('2026-01-01'),
    end_date: new Date('2026-02-01'),
    status: 'PENDING',
    price: '100',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    mockQuery = jest.fn();
    const databaseService = {
      query: mockQuery,
      withTransaction: jest.fn(),
      getPool: jest.fn(),
    } as unknown as DatabaseService;

    service = new MembershipsService(databaseService);
  });

  it('debe rechazar creación a un miembro común', async () => {
    await expect(
      service.create(
        {
          memberId: 'm1',
          planId: 'p1',
          startDate: '2026-01-01',
          endDate: '2026-02-01',
        },
        memberUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('debe crear membresía como staff', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'p1', price: '100' }] })
      .mockResolvedValueOnce({ rows: [membershipRow] });

    const result = await service.create(
      {
        memberId: 'm1',
        planId: 'p1',
        startDate: '2026-01-01',
        endDate: '2026-02-01',
      },
      adminUser,
    );

    expect(result).toEqual(membershipRow);
  });

  it('debe rechazar fechas inválidas', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'p1', price: '100' }] });

    await expect(
      service.create(
        {
          memberId: 'm1',
          planId: 'p1',
          startDate: '2026-02-01',
          endDate: '2026-01-01',
        },
        adminUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe listar membresías de un miembro', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1', user_id: 'user1' }] })
      .mockResolvedValueOnce({ rows: [membershipRow] });

    const result = await service.findByMember('m1', adminUser);

    expect(result).toHaveLength(1);
  });

  it('debe ocultar membresías de otros miembros', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1', user_id: 'other' }] });

    await expect(service.findByMember('m1', memberUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
