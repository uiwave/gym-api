import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { CreateMemberDto } from './dto/create-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll() {
    const pool = this.databaseService.getPool();

    const result = await pool.query(`
      SELECT
        id,
        user_id,
        document_number,
        phone,
        birth_date,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        status,
        created_at,
        updated_at
      FROM members
      ORDER BY created_at DESC
    `);

    return result.rows;
  }

  async findOne(id: string) {
    const pool = this.databaseService.getPool();

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        document_number,
        phone,
        birth_date,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        status,
        created_at,
        updated_at
      FROM members
      WHERE id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Miembro no encontrado');
    }

    return result.rows[0];
  }
  async create(userId: string, dto: CreateMemberDto) {
    const pool = this.databaseService.getPool();

    const result = await pool.query(
      `
      INSERT INTO members (
        user_id,
        document_number,
        phone,
        birth_date,
        address,
        emergency_contact_name,
        emergency_contact_phone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        user_id,
        document_number,
        phone,
        birth_date,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        status,
        created_at,
        updated_at
    `,
      [
        userId,
        dto.documentNumber ?? null,
        dto.phone ?? null,
        dto.birthDate ?? null,
        dto.address ?? null,
        dto.emergencyContactName ?? null,
        dto.emergencyContactPhone ?? null,
      ],
    );

    return result.rows[0];
  }
}
