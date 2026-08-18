import { Controller, Get } from '@nestjs/common';

@Controller('members')
export class MembersController {
  @Get()
  findAll() {
    return {
      message: 'Lista de miembrssos',
    };
  }
}
