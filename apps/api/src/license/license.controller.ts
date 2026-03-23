import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { AsaasService } from './asaas.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { LicenseService } from './license.service';

@Controller('license')
export class LicenseController {
  constructor(
    private readonly licenseService: LicenseService,
    private readonly asaasService: AsaasService,
  ) {}

  @Get()
  getLicense() {
    return this.licenseService.getLicense();
  }

  @Post('payment')
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.licenseService.createPayment(dto);
  }

  @Post('payment/:id/sync')
  syncPayment(@Param('id') id: string) {
    return this.licenseService.syncPayment(id);
  }

  @Public()
  @HttpCode(200)
  @Post('webhook')
  async webhook(
    @Headers('asaas-access-token') token: string,
    @Body() body: any,
  ) {
    if (!this.asaasService.validateWebhookToken(token)) {
      throw new UnauthorizedException('Token de webhook invalido.');
    }

    void this.licenseService.processWebhook(body).catch((err) => {
      console.error('[LicenseWebhook] Erro:', err);
    });

    return { received: true };
  }
}
