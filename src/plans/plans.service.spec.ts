import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { DatabaseService } from '../database/database.service';

describe('PlansService', () => {
  let service: PlansService;
  let mockQuery: jest.Mock;

  const planRow = {
    id: 'p1',
    name: 'Plan Básico',
    description: null,
    price: 100,
    duration_days: 30,
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

    service = new PlansService(databaseService);
  });

  it('debe crear un plan', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [planRow] });

    const result = await service.create({
      name: 'Plan Básico',
      durationDays: 30,
    });

    expect(result).toEqual(planRow);
  });

  it('debe listar planes', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [planRow] });

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('debe lanzar 404 si el plan no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(service.findOne('p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('debe lanzar 409 por nombre duplicado', async () => {
    const duplicateError = { code: '23505' };

    mockQuery
      .mockResolvedValueOnce({ rows: [planRow] })
      .mockRejectedValueOnce(duplicateError);

    await expect(
      service.update('p1', { name: 'Plan Básico' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('debe eliminar un plan', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [planRow] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.remove('p1');

    expect(result).toEqual(planRow);
  });
});
