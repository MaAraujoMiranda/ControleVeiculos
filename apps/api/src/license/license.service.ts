import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AsaasService } from './asaas.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

const LICENSE_PRICE = 49.9;
const LICENSE_DAYS = 30;

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaasService: AsaasService,
  ) {}

  async getLicense() {
    let license = await this.prisma.license.findFirst({
      orderBy: { createdAt: 'asc' },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!license) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + LICENSE_DAYS);

      license = await this.prisma.license.create({
        data: { status: 'TRIAL', expiresAt },
        include: { payments: true },
      });
    }

    return this.serializeLicense(license);
  }

  async createPayment(dto: CreatePaymentDto) {
    const license = await this.ensureLicenseExists();

    if (license.payments.some((p: any) => p.status === 'PENDING')) {
      throw new BadRequestException(
        'Ja existe um pagamento pendente para esta licenca.',
      );
    }

    const cpfDigits = dto.holderCpf.replace(/\D/g, '');
    const method = dto.method ?? 'PIX';

    // Calcula data de vencimento (amanha)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    let asaasCustomerId = license.asaasCustomerId ?? undefined;

    try {
      asaasCustomerId = await this.asaasService.createOrUpdateCustomer({
        name: dto.holderName,
        cpfCnpj: cpfDigits,
        email: dto.holderEmail,
      });

      await this.prisma.license.update({
        where: { id: license.id },
        data: {
          holderName: dto.holderName,
          holderCpf: cpfDigits,
          holderEmail: dto.holderEmail,
          asaasCustomerId,
        },
      });
    } catch (err) {
      this.logger.error('Erro ao sincronizar cliente no Asaas', err);
      throw new BadRequestException(
        'Nao foi possivel registrar o cliente no sistema de pagamento.',
      );
    }

    const description = `Licenca Controle de Veiculos - ${LICENSE_DAYS} dias`;

    try {
      let paymentData: {
        asaasPaymentId: string;
        pixQrCode?: string;
        pixCopyPaste?: string;
        boletoUrl?: string;
      };

      if (method === 'PIX') {
        const result = await this.asaasService.createPixPayment({
          customerId: asaasCustomerId,
          value: LICENSE_PRICE,
          description,
          dueDate: dueDateStr,
        });
        paymentData = {
          asaasPaymentId: result.paymentId,
          pixQrCode: result.pixQrCode,
          pixCopyPaste: result.pixCopyPaste,
        };
      } else {
        const result = await this.asaasService.createBoletoPayment({
          customerId: asaasCustomerId,
          value: LICENSE_PRICE,
          description,
          dueDate: dueDateStr,
        });
        paymentData = {
          asaasPaymentId: result.paymentId,
          boletoUrl: result.boletoUrl,
        };
      }

      const payment = await this.prisma.licensePayment.create({
        data: {
          licenseId: license.id,
          asaasPaymentId: paymentData.asaasPaymentId,
          amount: LICENSE_PRICE,
          method,
          status: 'PENDING',
          daysAdded: LICENSE_DAYS,
          pixQrCode: paymentData.pixQrCode ?? null,
          pixCopyPaste: paymentData.pixCopyPaste ?? null,
          boletoUrl: paymentData.boletoUrl ?? null,
          dueDate,
        },
      });

      return payment;
    } catch (err) {
      this.logger.error('Erro ao criar pagamento no Asaas', err);
      throw new BadRequestException(
        'Nao foi possivel gerar o pagamento. Verifique os dados e tente novamente.',
      );
    }
  }

  async syncPayment(paymentId: string) {
    const payment = await this.prisma.licensePayment.findUnique({
      where: { id: paymentId },
      include: { license: true },
    });

    if (!payment) throw new NotFoundException('Pagamento nao encontrado.');

    const asaasStatus = await this.asaasService.getPaymentStatus(
      payment.asaasPaymentId,
    );

    if (
      asaasStatus.status === 'CONFIRMED' ||
      asaasStatus.status === 'RECEIVED' ||
      asaasStatus.status === 'RECEIVED_IN_CASH'
    ) {
      await this.confirmPayment(payment.id, payment.licenseId, payment.daysAdded);
    } else if (asaasStatus.status === 'OVERDUE') {
      await this.prisma.licensePayment.update({
        where: { id: payment.id },
        data: { status: 'OVERDUE' },
      });
    }

    return this.getLicense();
  }

  async processWebhook(body: any) {
    const { event, payment: asaasPayment } = body;

    if (!asaasPayment?.id) return;

    const payment = await this.prisma.licensePayment.findUnique({
      where: { asaasPaymentId: asaasPayment.id },
    });

    if (!payment) return;

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      await this.confirmPayment(payment.id, payment.licenseId, payment.daysAdded);
    } else if (event === 'PAYMENT_OVERDUE') {
      await this.prisma.licensePayment.update({
        where: { id: payment.id },
        data: { status: 'OVERDUE' },
      });
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      await this.prisma.licensePayment.update({
        where: { id: payment.id },
        data: { status: 'CANCELLED' },
      });
    }
  }

  private async confirmPayment(
    paymentId: string,
    licenseId: string,
    daysAdded: number,
  ) {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!license) return;

    const now = new Date();
    const currentExpiry =
      license.status === 'ACTIVE' && license.expiresAt > now
        ? license.expiresAt
        : now;

    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + daysAdded);

    await this.prisma.$transaction([
      this.prisma.licensePayment.update({
        where: { id: paymentId },
        data: { status: 'CONFIRMED', paidAt: now },
      }),
      this.prisma.license.update({
        where: { id: licenseId },
        data: { status: 'ACTIVE', expiresAt: newExpiry },
      }),
    ]);

    this.logger.log(`Licenca ativada ate ${newExpiry.toISOString()}`);
  }

  private async ensureLicenseExists() {
    let license = await this.prisma.license.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });

    if (!license) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + LICENSE_DAYS);
      license = await this.prisma.license.create({
        data: { status: 'TRIAL', expiresAt },
        include: { payments: true },
      });
    }

    return license;
  }

  private serializeLicense(license: any) {
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(license.expiresAt).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return {
      id: license.id,
      status: license.status as string,
      expiresAt: license.expiresAt,
      daysRemaining,
      holderName: license.holderName,
      holderCpf: license.holderCpf,
      holderEmail: license.holderEmail,
      price: LICENSE_PRICE,
      daysPerPayment: LICENSE_DAYS,
      payments: (license.payments ?? []).map((p: any) => ({
        id: p.id,
        status: p.status,
        method: p.method,
        amount: Number(p.amount),
        daysAdded: p.daysAdded,
        pixQrCode: p.pixQrCode,
        pixCopyPaste: p.pixCopyPaste,
        boletoUrl: p.boletoUrl,
        dueDate: p.dueDate,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    };
  }
}
