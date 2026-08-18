import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getHello() {
    const result = await this.databaseService.query<{
      result: number;
    }>('SELECT 1 AS result');

    return result.rows;
  }
}
