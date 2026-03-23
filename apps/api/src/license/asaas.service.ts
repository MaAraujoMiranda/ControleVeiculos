import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  constructor(private readonly configService: ConfigService) {}

  private get baseUrl() {
    const env = this.configService.get<string>('ASAAS_ENVIRONMENT', 'sandbox');
    return env === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';
  }

  private get apiKey() {
    return this.configService.get<string>('ASAAS_API_KEY', '');
  }

  validateWebhookToken(token: string): boolean {
    const expected = this.configService.get<string>('ASAAS_WEBHOOK_TOKEN', '');
    return Boolean(expected) && token === expected;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Asaas API error ${response.status}: ${body}`);
      throw new Error(`Asaas API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async createOrUpdateCustomer(data: {
    name: string;
    cpfCnpj: string;
    email: string;
  }): Promise<string> {
    // Busca cliente existente
    const existing = await this.request<{ data: Array<{ id: string }> }>(
      `/customers?cpfCnpj=${data.cpfCnpj.replace(/\D/g, '')}`,
    );

    if (existing.data.length > 0) {
      const customerId = existing.data[0].id;
      await this.request(`/customers/${customerId}`, {
        method: 'POST',
        body: JSON.stringify({ name: data.name, email: data.email }),
      });
      return customerId;
    }

    const created = await this.request<{ id: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
        email: data.email,
      }),
    });

    return created.id;
  }

  async createPixPayment(data: {
    customerId: string;
    value: number;
    description: string;
    dueDate: string;
  }) {
    const payment = await this.request<{
      id: string;
      status: string;
      invoiceUrl: string;
    }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: data.customerId,
        billingType: 'PIX',
        value: data.value,
        dueDate: data.dueDate,
        description: data.description,
      }),
    });

    const qr = await this.request<{
      encodedImage: string;
      payload: string;
    }>(`/payments/${payment.id}/pixQrCode`);

    return {
      paymentId: payment.id,
      pixQrCode: qr.encodedImage,
      pixCopyPaste: qr.payload,
    };
  }

  async createBoletoPayment(data: {
    customerId: string;
    value: number;
    description: string;
    dueDate: string;
  }) {
    const payment = await this.request<{
      id: string;
      status: string;
      bankSlipUrl: string;
    }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: data.customerId,
        billingType: 'BOLETO',
        value: data.value,
        dueDate: data.dueDate,
        description: data.description,
      }),
    });

    return {
      paymentId: payment.id,
      boletoUrl: payment.bankSlipUrl,
    };
  }

  async getPaymentStatus(asaasPaymentId: string) {
    return this.request<{ id: string; status: string }>(
      `/payments/${asaasPaymentId}`,
    );
  }
}
