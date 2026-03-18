import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

interface AuditEntry {
  action: AuditAction;
  entity: string;
  entityId: string;
  userId?: string | null;
  previousData?: unknown;
  newData?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, executor: PrismaExecutor = this.prisma) {
    const data = {
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      ...(entry.userId ? { user: { connect: { id: entry.userId } } } : {}),
      ...(entry.ip ? { ip: entry.ip } : {}),
      ...(entry.userAgent ? { userAgent: entry.userAgent } : {}),
      ...(entry.previousData !== undefined
        ? { previousData: this.toJsonValue(entry.previousData) }
        : {}),
      ...(entry.newData !== undefined
        ? { newData: this.toJsonValue(entry.newData) }
        : {}),
    } satisfies Prisma.AuditLogCreateInput;

    await executor.auditLog.create({ data });
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
