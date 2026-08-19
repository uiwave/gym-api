import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { auth } from '../auth';
import { DatabaseService } from '../../database/database.service';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthRequest } from '../types/auth-request';

jest.mock('../auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let getSessionMock: jest.Mock;
  let mockQuery: jest.Mock;

  const session = {
    user: {
      id: 'u1',
      name: 'Test',
      email: 'test@example.com',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'admin',
    },
    session: {
      id: 's1',
      createdAt: new Date(),
      expiresAt: new Date(),
    },
  };

  const userRow = {
    id: 'u1',
    name: 'Test',
    email: 'test@example.com',
    emailVerified: false,
    image: null,
    banned: null,
    banReason: null,
    banExpires: null,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockQuery = jest.fn();
    const databaseService = {
      query: mockQuery,
      withTransaction: jest.fn(),
      getPool: jest.fn(),
    } as unknown as DatabaseService;

    guard = new AuthGuard(databaseService);
    getSessionMock = auth.api.getSession as jest.Mock;
    getSessionMock.mockReset();
  });

  function createRequest(headers: object): AuthRequest {
    return { headers } as unknown as AuthRequest;
  }

  function createContext(request: AuthRequest): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('debe autenticar con Bearer token válido', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 3600000) },
        ],
      })
      .mockResolvedValueOnce({ rows: [userRow] });

    const request = createRequest({ authorization: 'Bearer token123' });
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user.id).toBe('u1');
    expect(request.user.role).toBe('admin');
    expect(request.session.token).toBe('token123');
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('debe tolerar el prefijo Bearer duplicado', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 3600000) },
        ],
      })
      .mockResolvedValueOnce({ rows: [userRow] });

    const request = createRequest({
      authorization: 'Bearer Bearer token123',
    });
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.session.token).toBe('token123');
  });

  it('debe tolerar el token sin prefijo Bearer', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 3600000) },
        ],
      })
      .mockResolvedValueOnce({ rows: [userRow] });

    const request = createRequest({ authorization: 'token123' });
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.session.token).toBe('token123');
  });

  it('debe rechazar Bearer token inválido o expirado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const request = createRequest({ authorization: 'Bearer token-invalido' });
    const context = createContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('debe autenticar con cookie cuando no hay Bearer', async () => {
    getSessionMock.mockResolvedValue(session);

    const request = createRequest({
      cookie: 'better-auth.session_token=abc',
    });
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(session.user);
    expect(request.session).toEqual(session.session);
  });

  it('debe lanzar UnauthorizedException cuando no hay sesión', async () => {
    getSessionMock.mockResolvedValue(null);

    const request = createRequest({});
    const context = createContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('debe construir headers a partir de la petición', async () => {
    getSessionMock.mockResolvedValue(null);

    const request = createRequest({
      cookie: 'better-auth.session_token=abc',
    });
    const context = createContext(request);

    await guard.canActivate(context).catch(() => undefined);

    const [args] = getSessionMock.mock.calls[0] as [{ headers: Headers }];
    expect(args.headers.get('cookie')).toBe('better-auth.session_token=abc');
  });
});
