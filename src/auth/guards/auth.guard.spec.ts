import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { auth } from '../auth';
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

  beforeEach(() => {
    guard = new AuthGuard();
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

  it('debe autenticar cuando existe sesión', async () => {
    getSessionMock.mockResolvedValue(session);

    const request = createRequest({ authorization: 'Bearer token' });
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

    const request = createRequest({ authorization: 'Bearer token' });
    const context = createContext(request);

    await guard.canActivate(context).catch(() => undefined);

    const [args] = getSessionMock.mock.calls[0] as [{ headers: Headers }];
    expect(args.headers.get('authorization')).toBe('Bearer token');
  });
});
