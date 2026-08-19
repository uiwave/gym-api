import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserIdDto } from './dto/user-id.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'receptionist')
  async findAll(@Query() query: UserQueryDto) {
    const result = await this.usersService.findAll(query);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @Roles('admin', 'receptionist')
  async findOne(@Param() params: UserIdDto) {
    const user = await this.usersService.findOne(params.id);

    return {
      data: user,
    };
  }

  @Post()
  @Roles('admin')
  async create(@Req() request: AuthRequest, @Body() dto: CreateUserDto) {
    const user = await this.usersService.create(
      dto,
      this.buildHeaders(request),
    );

    return {
      data: user,
    };
  }

  @Patch(':id/role')
  @Roles('admin')
  async setRole(
    @Req() request: AuthRequest,
    @Param() params: UserIdDto,
    @Body() dto: UpdateUserRoleDto,
  ) {
    await this.usersService.setRole(params.id, dto, this.buildHeaders(request));

    return {
      data: { id: params.id, role: dto.role },
    };
  }

  @Patch(':id/ban')
  @Roles('admin')
  async ban(@Req() request: AuthRequest, @Param() params: UserIdDto) {
    await this.usersService.banUser(params.id, this.buildHeaders(request));

    return {
      data: { id: params.id, banned: true },
    };
  }

  @Patch(':id/unban')
  @Roles('admin')
  async unban(@Req() request: AuthRequest, @Param() params: UserIdDto) {
    await this.usersService.unbanUser(params.id, this.buildHeaders(request));

    return {
      data: { id: params.id, banned: false },
    };
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Req() request: AuthRequest, @Param() params: UserIdDto) {
    await this.usersService.remove(params.id, this.buildHeaders(request));

    return {
      data: { id: params.id, deleted: true },
    };
  }

  private buildHeaders(request: AuthRequest): Headers {
    const headers = new Headers();

    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    }

    return headers;
  }
}
