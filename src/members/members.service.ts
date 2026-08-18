import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

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
}
