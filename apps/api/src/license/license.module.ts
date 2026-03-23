import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AsaasService } from './asaas.service';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';

@Module({
  imports: [PrismaModule],
  controllers: [LicenseController],
  providers: [LicenseService, AsaasService],
})
export class LicenseModule {}
