import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  cleanString,
  formatPlate,
  isValidPlate,
  normalizeForSearch,
  normalizePlate,
  nullableTrim,
} from '../common/utils/normalization.util';
import { buildPaginationMeta } from '../common/utils/pagination.util';
import { rethrowPrismaError } from '../common/utils/prisma-error.util';
import { PrismaService } from '../database/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listVehicles(query: QueryVehiclesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const q = query.q ? cleanString(query.q) : null;
    const normalizedQuery = q ? normalizeForSearch(q) : null;
    const plateQuery = q ? normalizePlate(q) : null;

    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(q
        ? {
            OR: [
              { plateNormalized: { contains: plateQuery ?? undefined } },
              { brandModel: { contains: q } },
              {
                client: {
                  nameNormalized: {
                    contains: normalizedQuery ?? undefined,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: true,
          _count: {
            select: {
              registrations: true,
            },
          },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, pageSize),
    };
  }

  async getVehicleById(id: string) {
    return this.findActiveVehicleOrThrow(id);
  }

  async createVehicle(dto: CreateVehicleDto) {
    await this.ensureActiveClient(dto.clientId);
    await this.ensureMultipleVehiclesRule(dto.clientId);
    const payload = this.buildCreateVehicleData(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.vehicle.create({
          data: payload,
        });

        await this.auditService.record(
          {
            action: AuditAction.CREATE,
            entity: 'vehicle',
            entityId: created.id,
            newData: created,
          },
          tx,
        );

        return tx.vehicle.findUniqueOrThrow({
          where: { id: created.id },
          include: {
            client: true,
            registrations: {
              where: { deletedAt: null },
              orderBy: [{ createdAt: 'desc' }],
            },
          },
        });
      });
    } catch (error) {
      rethrowPrismaError(error, 'Nao foi possivel criar o veiculo.');
    }
  }

  async updateVehicle(id: string, dto: UpdateVehicleDto) {
    const current = await this.findActiveVehicleOrThrow(id);
    const nextClientId = dto.clientId ?? current.clientId;

    if (nextClientId !== current.clientId) {
      await this.ensureActiveClient(nextClientId);
    }

    await this.ensureMultipleVehiclesRule(nextClientId, id);
    const payload = this.buildUpdateVehicleData(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.vehicle.update({
          where: { id },
          data: payload,
        });

        await this.auditService.record(
          {
            action: AuditAction.UPDATE,
            entity: 'vehicle',
            entityId: updated.id,
            previousData: current,
            newData: updated,
          },
          tx,
        );

        return tx.vehicle.findUniqueOrThrow({
          where: { id },
          include: {
            client: true,
            registrations: {
              where: { deletedAt: null },
              orderBy: [{ createdAt: 'desc' }],
            },
          },
        });
      });
    } catch (error) {
      rethrowPrismaError(error, 'Nao foi possivel atualizar o veiculo.');
    }
  }

  async deleteVehicle(id: string) {
    const current = await this.findActiveVehicleOrThrow(id);
    const deletedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.registration.updateMany({
        where: {
          vehicleId: id,
          deletedAt: null,
        },
        data: { deletedAt },
      });

      await tx.vehicle.update({
        where: { id },
        data: { deletedAt },
      });

      await this.auditService.record(
        {
          action: AuditAction.DELETE,
          entity: 'vehicle',
          entityId: id,
          previousData: current,
          newData: { deletedAt: deletedAt.toISOString() },
        },
        tx,
      );
    });

    return {
      message: 'Veiculo removido com sucesso.',
    };
  }

  private async findActiveVehicleOrThrow(id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        client: true,
        registrations: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: 'desc' }],
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veiculo nao encontrado.');
    }

    return vehicle;
  }

  private async ensureActiveClient(clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente vinculado nao encontrado.');
    }
  }

  private async ensureMultipleVehiclesRule(
    clientId: string,
    currentVehicleId?: string,
  ) {
    const settings = await this.prisma.configuration.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        allowMultipleVehiclesPerClient: false,
        sessionDurationDays: 7,
      },
    });

    if (settings.allowMultipleVehiclesPerClient) {
      return;
    }

    const totalVehicles = await this.prisma.vehicle.count({
      where: {
        clientId,
        deletedAt: null,
        ...(currentVehicleId ? { id: { not: currentVehicleId } } : {}),
      },
    });

    if (totalVehicles > 0) {
      throw new BadRequestException(
        'A configuracao atual permite apenas um veiculo por cliente.',
      );
    }
  }

  private buildCreateVehicleData(dto: CreateVehicleDto) {
    if (!isValidPlate(dto.plate)) {
      throw new BadRequestException(
        'Placa invalida. Informe no padrao antigo ou Mercosul.',
      );
    }

    const plateNormalized = normalizePlate(dto.plate);

    return {
      clientId: dto.clientId,
      plate: formatPlate(plateNormalized),
      plateNormalized,
      brandModel: nullableTrim(dto.brandModel),
      color: nullableTrim(dto.color),
      category: nullableTrim(dto.category),
      photoUrl: nullableTrim(dto.photoUrl),
    } satisfies Prisma.VehicleUncheckedCreateInput;
  }

  private buildUpdateVehicleData(dto: UpdateVehicleDto) {
    const data: Prisma.VehicleUncheckedUpdateInput = {};

    if (dto.clientId !== undefined) {
      data.clientId = dto.clientId;
    }

    if (dto.plate !== undefined) {
      if (!isValidPlate(dto.plate)) {
        throw new BadRequestException(
          'Placa invalida. Informe no padrao antigo ou Mercosul.',
        );
      }

      const plateNormalized = normalizePlate(dto.plate);
      data.plate = formatPlate(plateNormalized);
      data.plateNormalized = plateNormalized;
    }

    if (dto.brandModel !== undefined) {
      data.brandModel = nullableTrim(dto.brandModel);
    }

    if (dto.color !== undefined) {
      data.color = nullableTrim(dto.color);
    }

    if (dto.category !== undefined) {
      data.category = nullableTrim(dto.category);
    }

    if (dto.photoUrl !== undefined) {
      data.photoUrl = nullableTrim(dto.photoUrl);
    }

    return data;
  }
}
