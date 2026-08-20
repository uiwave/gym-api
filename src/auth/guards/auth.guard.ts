import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthRequest } from '../types/auth-request';
import { auth } from '../auth';
import { DatabaseService } from '../../database/database.service';

interface SessionRow {
  id: string;
  userId: string;
  expiresAt: Date;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  role: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    const authorization = request.headers.authorization;

    if (authorization) {
      let token = authorization.trim();

      while (token.toLowerCase().startsWith('bearer ')) {
        token = token.slice(7).trim();
      }

      if (token) {
        return this.authenticateWithBearer(request, token);
      }
    }

    return this.authenticateWithCookie(request);
  }

  private async authenticateWithBearer(
    request: AuthRequest,
    token: string,
  ): Promise<boolean> {
    const sessionResult = await this.databaseService.query<SessionRow>(
      `
      SELECT id, "userId", "expiresAt"
      FROM "session"
      WHERE token = $1 AND "expiresAt" > now()
      LIMIT 1
    `,
      [token],
    );

    const sessionRow = sessionResult.rows[0];

    if (!sessionRow) {
      throw new UnauthorizedException('No autenticado');
    }

    const userResult = await this.databaseService.query<UserRow>(
      `
      SELECT
        id,
        name,
        email,
        "emailVerified",
        image,
        banned,
        "banReason",
        "banExpires",
        role,
        "createdAt",
        "updatedAt"
      FROM "user"
      WHERE id = $1
    `,
      [sessionRow.userId],
    );

    const userRow = userResult.rows[0];

    if (!userRow) {
      throw new UnauthorizedException('No autenticado');
    }

    request.session = {
      id: sessionRow.id,
      token,
      userId: sessionRow.userId,
      expiresAt: sessionRow.expiresAt,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    request.user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      emailVerified: userRow.emailVerified,
      image: userRow.image ?? null,
      banned: userRow.banned ?? false,
      banReason: userRow.banReason ?? null,
      banExpires: userRow.banExpires ?? null,
      role: userRow.role ?? null,
      createdAt: userRow.createdAt,
      updatedAt: userRow.updatedAt,
    };

    return true;
  }

  private async authenticateWithCookie(request: AuthRequest): Promise<boolean> {
    const headers = new Headers();

    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    }

    const session = await auth.api.getSession({
      headers,
    });

    if (!session) {
      throw new UnauthorizedException('No autenticado');
    }

    request.user = session.user;
    request.session = session.session;

    return true;
  }
}
