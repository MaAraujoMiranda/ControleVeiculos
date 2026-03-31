import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  cleanString,
  formatCpf,
  isValidBrazilianPhone,
  isValidCpf,
  normalizeDigits,
  normalizeForSearch,
  nullableTrim,
} from '../common/utils/normalization.util';
import { buildPaginationMeta } from '../common/utils/pagination.util';
import { rethrowPrismaError } from '../common/utils/prisma-error.util';
import { PrismaService } from '../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const CLIENT_TYPES = [
  'Proprietario',
  'Socio',
  'Funcionario',
  'Mensalista',
  'Sala',
] as const;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listClients(query: QueryClientsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const q = query.q ? cleanString(query.q) : null;
    const normalizedQuery = q ? normalizeForSearch(q) : null;
    const digitsQuery = q ? normalizeDigits(q) : null;

    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { nameNormalized: { contains: normalizedQuery ?? undefined } },
              ...(digitsQuery
                ? [
                    { cpfDigits: { contains: digitsQuery } },
                    { phoneNormalized: { contains: digitsQuery } },
                  ]
                : []),
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          vehicles: {
            where: { deletedAt: null },
            orderBy: [{ createdAt: 'desc' }],
          },
          _count: {
            select: {
              registrations: true,
              vehicles: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, pageSize),
    };
  }

  async getClientById(id: string) {
    return this.findActiveClientOrThrow(id);
  }

  async createClient(dto: CreateClientDto) {
    const payload = this.buildCreateClientData(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.client.create({
          data: payload,
        });

        await this.auditService.record(
          {
            action: AuditAction.CREATE,
            entity: 'client',
            entityId: created.id,
            newData: created,
          },
          tx,
        );

        return tx.client.findUniqueOrThrow({
          where: { id: created.id },
          include: {
            vehicles: {
              where: { deletedAt: null },
              orderBy: [{ createdAt: 'desc' }],
            },
            _count: {
              select: {
                registrations: true,
                vehicles: true,
              },
            },
          },
        });
      });
    } catch (error) {
      rethrowPrismaError(error, 'Nao foi possivel criar o cliente.');
    }
  }

  async updateClient(id: string, dto: UpdateClientDto) {
    const current = await this.findActiveClientOrThrow(id);
    const payload = this.buildUpdateClientData(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.client.update({
          where: { id },
          data: payload,
        });

        await this.auditService.record(
          {
            action: AuditAction.UPDATE,
            entity: 'client',
            entityId: updated.id,
            previousData: current,
            newData: updated,
          },
          tx,
        );

        return tx.client.findUniqueOrThrow({
          where: { id },
          include: {
            vehicles: {
              where: { deletedAt: null },
              orderBy: [{ createdAt: 'desc' }],
            },
            _count: {
              select: {
                registrations: true,
                vehicles: true,
              },
            },
          },
        });
      });
    } catch (error) {
      rethrowPrismaError(error, 'Nao foi possivel atualizar o cliente.');
    }
  }

  async deleteClient(id: string) {
    const current = await this.findActiveClientOrThrow(id);
    const deletedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.registration.updateMany({
        where: {
          clientId: id,
          deletedAt: null,
        },
        data: { deletedAt },
      });

      await tx.vehicle.updateMany({
        where: {
          clientId: id,
          deletedAt: null,
        },
        data: { deletedAt },
      });

      await tx.client.update({
        where: { id },
        data: { deletedAt },
      });

      await this.auditService.record(
        {
          action: AuditAction.DELETE,
          entity: 'client',
          entityId: id,
          previousData: current,
          newData: { deletedAt: deletedAt.toISOString() },
        },
        tx,
      );
    });

    return {
      message: 'Cliente removido com sucesso.',
    };
  }

  private async findActiveClientOrThrow(id: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        vehicles: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: 'desc' }],
        },
        _count: {
          select: {
            registrations: true,
            vehicles: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    return client;
  }

  private buildCreateClientData(dto: CreateClientDto) {
    const name = cleanString(dto.name ?? '');
    const phone = cleanString(dto.phone ?? '');
    const cpf = cleanString(dto.cpf ?? '');

    if (phone.length > 0 && !isValidBrazilianPhone(phone)) {
      throw new BadRequestException(
        'Telefone invalido. Informe um numero brasileiro com DDD.',
      );
    }

    if (cpf.length > 0 && !isValidCpf(cpf)) {
      throw new BadRequestException('CPF invalido.');
    }

    const cpfDigits = cpf.length > 0 ? normalizeDigits(cpf) : '';
    const clientType = this.normalizeClientType(dto.clientType);

    return {
      name,
      nameNormalized: normalizeForSearch(name),
      company: nullableTrim(dto.company),
      phone,
      phoneNormalized: normalizeDigits(phone),
      cpf: cpfDigits ? formatCpf(cpfDigits) : '',
      cpfDigits,
      photoUrl: nullableTrim(dto.photoUrl),
      clientType,
      notes: nullableTrim(dto.notes),
    } satisfies Prisma.ClientUncheckedCreateInput;
  }

  private buildUpdateClientData(dto: UpdateClientDto) {
    const data: Prisma.ClientUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      const name = cleanString(dto.name);
      data.name = name;
      data.nameNormalized = normalizeForSearch(name);
    }

    if (dto.phone !== undefined) {
      const phone = cleanString(dto.phone);

      if (phone.length > 0 && !isValidBrazilianPhone(phone)) {
        throw new BadRequestException(
          'Telefone invalido. Informe um numero brasileiro com DDD.',
        );
      }

      data.phone = phone;
      data.phoneNormalized = normalizeDigits(phone);
    }

    if (dto.cpf !== undefined) {
      const cpf = cleanString(dto.cpf);

      if (cpf.length > 0 && !isValidCpf(cpf)) {
        throw new BadRequestException('CPF invalido.');
      }

      const cpfDigits = cpf.length > 0 ? normalizeDigits(cpf) : '';
      data.cpf = cpfDigits ? formatCpf(cpfDigits) : '';
      data.cpfDigits = cpfDigits;
    }

    if (dto.company !== undefined) {
      data.company = nullableTrim(dto.company);
    }

    if (dto.photoUrl !== undefined) {
      data.photoUrl = nullableTrim(dto.photoUrl);
    }

    if (dto.clientType !== undefined) {
      data.clientType = this.normalizeClientType(dto.clientType);
    }

    if (dto.notes !== undefined) {
      data.notes = nullableTrim(dto.notes);
    }

    return data;
  }

  private normalizeClientType(value?: string | null) {
    const raw = cleanString(value ?? '');

    if (!raw) {
      return null;
    }

    const matched = CLIENT_TYPES.find(
      (item) => item.toLowerCase() === raw.toLowerCase(),
    );

    if (!matched) {
      throw new BadRequestException(
        'Tipo de cliente invalido. Use: Proprietario, Socio, Funcionario, Mensalista ou Sala.',
      );
    }

    return matched;
  }
}
