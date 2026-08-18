import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  @Get('me')
  async me(@Req() request: Request) {
    return {
      message: 'Endpoint funcionando',
      headers: request.headers,
    };
  }
}
