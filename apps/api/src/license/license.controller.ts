import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedSession } from '../auth/types/auth-session.type';
import { AsaasService } from './asaas.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SuspendLicenseDto } from './dto/suspend-license.dto';
import { UpdateLicenseAdminDto } from './dto/update-license-admin.dto';
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

  @Get('admin')
  getAdminLicense(@CurrentSession() session: AuthenticatedSession) {
    return this.licenseService.getAdminLicense(session);
  }

  @Patch('admin/settings')
  updateAdminSettings(
    @CurrentSession() session: AuthenticatedSession,
    @Body() dto: UpdateLicenseAdminDto,
  ) {
    return this.licenseService.updateAdminSettings(session, dto);
  }

  @Post('admin/suspend')
  suspendManually(
    @CurrentSession() session: AuthenticatedSession,
    @Body() dto: SuspendLicenseDto,
  ) {
    return this.licenseService.suspendManually(session, dto);
  }

  @Post('admin/unsuspend')
  unsuspendManually(@CurrentSession() session: AuthenticatedSession) {
    return this.licenseService.unsuspendManually(session);
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
