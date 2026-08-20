import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { DatabaseService } from '../database/database.service';
import type { AuthSession } from '../auth/types/auth-request';

describe('MembersService', () => {
  let service: MembersService;
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
  const memberRow = {
    id: 'm1',
    user_id: 'user1',
    document_number: '12345678',
    phone: null,
    birth_date: null,
    address: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    status: 'active',
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

    service = new MembersService(databaseService);
  });

  it('debe listar miembros paginados', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [memberRow] });

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('debe crear un miembro como staff', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [memberRow] });

    const result = await service.create(adminUser, {
      documentNumber: '12345678',
    });

    expect(result).toEqual(memberRow);
  });

  it('debe rechazar crear miembro para otro usuario sin ser staff', async () => {
    await expect(
      service.create(memberUser, { documentNumber: '123', userId: 'other' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('debe rechazar crear miembro si el usuario ya tiene perfil', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] });

    await expect(
      service.create(adminUser, { documentNumber: '123' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('debe devolver 404 si el miembro no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(service.findOne('m1', adminUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('debe permitir a un miembro ver solo su propio perfil', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [memberRow] });

    await expect(service.findOne('m1', memberUser)).resolves.toEqual(memberRow);
  });

  it('debe ocultar el perfil de otro miembro', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [memberRow] });

    await expect(
      service.findOne('m1', { ...memberUser, id: 'other' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
