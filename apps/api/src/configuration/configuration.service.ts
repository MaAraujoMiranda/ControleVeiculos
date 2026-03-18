import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@Injectable()
export class ConfigurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getConfiguration() {
    return this.ensureConfiguration();
  }

  async updateConfiguration(dto: UpdateConfigurationDto) {
    const current = await this.ensureConfiguration();

    const updated = await this.prisma.configuration.update({
      where: { id: 1 },
      data: {
        ...(dto.allowMultipleVehiclesPerClient !== undefined
          ? {
              allowMultipleVehiclesPerClient:
                dto.allowMultipleVehiclesPerClient,
            }
          : {}),
        ...(dto.sessionDurationDays !== undefined
          ? { sessionDurationDays: dto.sessionDurationDays }
          : {}),
      },
    });

    await this.auditService.record({
      action: AuditAction.UPDATE,
      entity: 'configuration',
      entityId: String(updated.id),
      previousData: current,
      newData: updated,
    });

    return updated;
  }

  async ensureConfiguration() {
    return this.prisma.configuration.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        allowMultipleVehiclesPerClient: false,
        sessionDurationDays: 7,
      },
    });
  }
}
