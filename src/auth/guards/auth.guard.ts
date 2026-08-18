import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthRequest } from '../types/auth-request';

import { auth } from '../auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();

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
