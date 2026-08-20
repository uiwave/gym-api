import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository, UserListQuery } from './users.repository';
import { auth } from '../auth/auth';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(query: UserListQuery) {
    return this.usersRepository.findAll(query);
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async create(dto: CreateUserDto, headers: Headers) {
    const result = await auth.api.createUser({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        role: dto.role ?? 'member',
      },
      headers,
    });

    return result.user;
  }

  async setRole(id: string, dto: UpdateUserRoleDto, headers: Headers) {
    await auth.api.setRole({
      body: { userId: id, role: dto.role },
      headers,
    });
  }

  async banUser(id: string, headers: Headers) {
    await auth.api.banUser({
      body: { userId: id },
      headers,
    });
  }

  async unbanUser(id: string, headers: Headers) {
    await auth.api.unbanUser({
      body: { userId: id },
      headers,
    });
  }

  async remove(id: string, headers: Headers) {
    await auth.api.removeUser({
      body: { userId: id },
      headers,
    });
  }
}
