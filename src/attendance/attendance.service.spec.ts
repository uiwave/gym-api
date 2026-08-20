import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { DatabaseService } from '../database/database.service';
import type { AuthSession } from '../auth/types/auth-request';

describe('AttendanceService', () => {
  let service: AttendanceService;
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

  beforeEach(() => {
    mockQuery = jest.fn();
    const databaseService = {
      query: mockQuery,
      withTransaction: jest.fn(),
      getPool: jest.fn(),
    } as unknown as DatabaseService;

    service = new AttendanceService(databaseService);
  });

  it('debe rechazar check-in sin membresía activa', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      service.checkIn({ memberId: 'm1' }, adminUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe registrar check-in de un miembro', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ms1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'a1', member_id: 'm1' }] });

    const result = await service.checkIn({ memberId: 'm1' }, adminUser);

    expect(result).toEqual({ id: 'a1', member_id: 'm1' });
  });

  it('debe rechazar doble check-in abierto', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ms1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'a1' }] });

    await expect(
      service.checkIn({ memberId: 'm1' }, adminUser),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('debe rechazar check-out sin check-in abierto', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      service.checkOut({ memberId: 'm1' }, adminUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe rechazar check-in de otro miembro si es miembro común', async () => {
    await expect(
      service.checkIn({ memberId: 'm1' }, memberUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('debe rechazar check-in si el miembro común no tiene perfil', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(service.checkIn({}, memberUser)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
