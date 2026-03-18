import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './database/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async getHealth() {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    let databaseStatus: 'connected' | 'not-configured' | 'error' =
      'not-configured';

    if (databaseUrl) {
      try {
        await this.prismaService.$queryRaw`SELECT 1`;
        databaseStatus = 'connected';
      } catch {
        databaseStatus = 'error';
      }
    }

    return {
      name: 'controle-acesso-api',
      status: databaseStatus === 'error' ? 'degraded' : 'ok',
      version: '0.1.0',
      database: {
        configured: Boolean(databaseUrl),
        status: databaseStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
