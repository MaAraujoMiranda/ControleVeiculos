import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, RegistrationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  cleanString,
  normalizeCardNumber,
  normalizeForSearch,
  normalizePlate,
  normalizeTrSl,
  nullableTrim,
} from '../common/utils/normalization.util';
import { buildPaginationMeta } from '../common/utils/pagination.util';
import { rethrowPrismaError } from '../common/utils/prisma-error.util';
import { PrismaService } from '../database/prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { QueryRegistrationsDto } from './dto/query-registrations.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listRegistrations(query: QueryRegistrationsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const q = query.q ? cleanString(query.q) : null;
    const normalizedQuery = q ? normalizeForSearch(q) : null;
    const plateQuery = q ? normalizePlate(q) : null;

    const baseFilters: Prisma.RegistrationWhereInput[] = [{ deletedAt: null }];

    if (query.clientId) {
      baseFilters.push({ clientId: query.clientId });
    }

    if (query.vehicleId) {
      baseFilters.push({ vehicleId: query.vehicleId });
    }

    const filters: Prisma.RegistrationWhereInput[] = [...baseFilters];

    if (query.status) {
      filters.push({ status: query.status });
    }

    if (query.clientType) {
      filters.push({
        client: {
          clientType: query.clientType,
        },
      });
    }

    if (q) {
      filters.push({
        OR: [
          { cardNumber: { contains: q } },
          { trSl: { contains: q } },
          {
            client: {
              OR: [
                {
                  nameNormalized: {
                    contains: normalizedQuery ?? undefined,
                  },
                },
                {
                  company: {
                    contains: q,
                  },
                },
              ],
            },
          },
          {
            vehicle: {
              plateNormalized: {
                contains: plateQuery ?? undefined,
              },
            },
          },
          {
            vehicle2: {
              plateNormalized: {
                contains: plateQuery ?? undefined,
              },
            },
          },
        ],
      });
    }

    const baseWhere =
      baseFilters.length === 1 ? baseFilters[0] : { AND: baseFilters };
    const where = filters.length === 1 ? filters[0] : { AND: filters };

    const [data, total, globalTotal] = await this.prisma.$transaction([
      this.prisma.registration.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: true,
          vehicle: true,
          vehicle2: true,
        },
      }),
      this.prisma.registration.count({ where }),
      this.prisma.registration.count({ where: baseWhere }),
    ]);

    return {
      data,
      meta: {
        ...buildPaginationMeta(total, page, pageSize),
        globalTotal,
      },
    };
  }

  async getDashboardStats() {
    const baseWhere: Prisma.RegistrationWhereInput = {
      deletedAt: null,
    };

    const [
      registrations,
      activeClientsRows,
      inactiveClientsRows,
      vehicleRows,
      vehicle2Rows,
    ] =
      await this.prisma.$transaction([
        this.prisma.registration.count({ where: baseWhere }),
        this.prisma.registration.findMany({
          where: {
            ...baseWhere,
            status: RegistrationStatus.ACTIVE,
          },
          select: { clientId: true },
          distinct: ['clientId'],
        }),
        this.prisma.registration.findMany({
          where: {
            ...baseWhere,
            status: {
              in: [RegistrationStatus.INACTIVE, RegistrationStatus.BLOCKED],
            },
          },
          select: { clientId: true },
          distinct: ['clientId'],
        }),
        this.prisma.registration.findMany({
          where: baseWhere,
          select: { vehicleId: true },
          distinct: ['vehicleId'],
        }),
        this.prisma.registration.findMany({
          where: { ...baseWhere, vehicle2Id: { not: null } },
          select: { vehicle2Id: true },
          distinct: ['vehicle2Id'],
        }),
      ]);

    const activeClientIds = new Set(
      activeClientsRows.map((item) => item.clientId),
    );
    const inactiveClientIds = new Set(
      inactiveClientsRows
        .map((item) => item.clientId)
        .filter((id) => !activeClientIds.has(id)),
    );

    const vehicleIds = new Set<string>([
      ...vehicleRows.map((item) => item.vehicleId),
      ...vehicle2Rows
        .map((item) => item.vehicle2Id)
        .filter((id): id is string => !!id),
    ]);

    return {
      activeClients: activeClientIds.size,
      inactiveClients: inactiveClientIds.size,
      vehicles: vehicleIds.size,
      registrations,
    };
  }

  async getRegistrationById(id: string) {
    return this.findActiveRegistrationOrThrow(id);
  }

  async createRegistration(dto: CreateRegistrationDto) {
    await this.ensureClientAndVehicleLink(dto.clientId, dto.vehicleId);
    if (dto.vehicle2Id) {
      await this.ensureClientAndVehicleLink(dto.clientId, dto.vehicle2Id);
    }
    const payload = this.buildCreateRegistrationData(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.registration.create({
          data: payload,
        });

        await this.auditService.record(
          {
            action: AuditAction.CREATE,
            entity: 'registration',
            entityId: created.id,
            newData: created,
          },
          tx,
        );

        return tx.registration.findUniqueOrThrow({
          where: { id: created.id },
          include: {
            client: true,
            vehicle: { include: { client: true } },
            vehicle2: true,
          },
        });
      });
    } catch (error) {
      rethrowPrismaError(error, 'Nao foi possivel criar o cadastro.');
    }
  }

  async updateRegistration(id: string, dto: UpdateRegistrationDto) {
    const current = await this.findActiveRegistrationOrThrow(id);
    const nextClientId = dto.clientId ?? current.clientId;
    const nextVehicleId = dto.vehicleId ?? current.vehicleId;
    const nextVehicle2Id = dto.vehicle2Id !== undefined ? dto.vehicle2Id : (current as any).vehicle2Id;

    await this.ensureClientAndVehicleLink(nextClientId, nextVehicleId);
    if (nextVehicle2Id) {
      await this.ensureClientAndVehicleLink(nextClientId, nextVehicle2Id);
    }
    const payload = this.buildUpdateRegistrationData(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.registration.update({
          where: { id },
          data: payload,
        });

        await this.auditService.record(
          {
            action: AuditAction.UPDATE,
            entity: 'registration',
            entityId: updated.id,
            previousData: current,
            newData: updated,
          },
          tx,
        );

        return tx.registration.findUniqueOrThrow({
          where: { id },
          include: {
            client: true,
            vehicle: { include: { client: true } },
            vehicle2: true,
          },
        });
      });
    } catch (error) {
      rethrowPrismaError(error, 'Nao foi possivel atualizar o cadastro.');
    }
  }

  async deleteRegistration(id: string) {
    const current = await this.findActiveRegistrationOrThrow(id);
    const deletedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.registration.update({
        where: { id },
        data: { deletedAt },
      });

      await this.auditService.record(
        {
          action: AuditAction.DELETE,
          entity: 'registration',
          entityId: id,
          previousData: current,
          newData: { deletedAt: deletedAt.toISOString() },
        },
        tx,
      );
    });

    return {
      message: 'Cadastro removido com sucesso.',
    };
  }

  private async findActiveRegistrationOrThrow(id: string) {
    const registration = await this.prisma.registration.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        client: true,
        vehicle: { include: { client: true } },
        vehicle2: true,
      },
    });

    if (!registration) {
      throw new NotFoundException('Cadastro nao encontrado.');
    }

    return registration;
  }

  private async ensureClientAndVehicleLink(
    clientId: string,
    vehicleId: string,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        deletedAt: null,
      },
      include: {
        client: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veiculo nao encontrado para o cadastro.');
    }

    if (vehicle.clientId !== clientId) {
      throw new BadRequestException(
        'O veiculo informado nao pertence ao cliente selecionado.',
      );
    }

    if (vehicle.client.deletedAt) {
      throw new NotFoundException(
        'Cliente vinculado ao veiculo nao encontrado.',
      );
    }
  }

  private buildCreateRegistrationData(dto: CreateRegistrationDto) {
    return {
      clientId: dto.clientId,
      vehicleId: dto.vehicleId,
      vehicle2Id: dto.vehicle2Id ?? null,
      cardNumber: normalizeCardNumber(dto.cardNumber),
      trSl: normalizeTrSl(dto.trSl),
      observations: nullableTrim(dto.observations),
      declarationUrl: nullableTrim(dto.declarationUrl),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    } satisfies Prisma.RegistrationUncheckedCreateInput;
  }

  private buildUpdateRegistrationData(dto: UpdateRegistrationDto) {
    const data: Prisma.RegistrationUncheckedUpdateInput = {};

    if (dto.clientId !== undefined) {
      data.clientId = dto.clientId;
    }

    if (dto.vehicleId !== undefined) {
      data.vehicleId = dto.vehicleId;
    }

    if (dto.cardNumber !== undefined) {
      data.cardNumber = normalizeCardNumber(dto.cardNumber);
    }

    if (dto.trSl !== undefined) {
      data.trSl = normalizeTrSl(dto.trSl);
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.observations !== undefined) {
      data.observations = nullableTrim(dto.observations);
    }

    if (dto.declarationUrl !== undefined) {
      data.declarationUrl = nullableTrim(dto.declarationUrl);
    }

    if (dto.vehicle2Id !== undefined) {
      data.vehicle2Id = dto.vehicle2Id || null;
    }

    return data;
  }
}
