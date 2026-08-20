import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { AuthRequest } from './types/auth-request';

@Controller('auth')
@UseGuards(AuthGuard, RolesGuard)
export class AuthController {
  @Get('me')
  me(@Req() request: AuthRequest) {
    const user = request.user;

    return {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
        role: user.role ?? null,
        banned: user.banned ?? false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }
}
