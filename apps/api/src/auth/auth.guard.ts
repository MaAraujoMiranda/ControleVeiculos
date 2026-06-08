import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { getEffectiveLicenseStatus } from '../license/license-policy';
import { IS_PUBLIC_KEY } from './auth.constants';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './types/auth-session.type';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieName = this.configService.get<string>(
      'SESSION_COOKIE_NAME',
      'controle_session',
    );
    const token = request.cookies?.[cookieName];

    if (!token) {
      throw new UnauthorizedException(
        'Login necessario para acessar esta rota.',
      );
    }

    request.authSession = await this.authService.resolveSession(token);

    const path = request.path ?? request.originalUrl ?? request.url ?? '';

    if (this.canAccessWithoutLicenseCheck(path)) {
      return true;
    }

    const license = await this.prisma.license.findFirst({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!license) {
      return true;
    }

    const now = new Date();
    const effectiveStatus = getEffectiveLicenseStatus(
      license.status,
      license.expiresAt,
      now,
    );

    if (effectiveStatus !== license.status) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: effectiveStatus },
      });
    }

    if (
      this.canAccessWithExpiredLicense(
        path,
        request.method ?? 'GET',
        effectiveStatus,
      )
    ) {
      return true;
    }

    if (effectiveStatus === 'SUSPENDED') {
      throw new ForbiddenException(
        'Sistema temporariamente fora do ar. Procure a administracao para regularizar a licenca.',
      );
    }

    if (effectiveStatus === 'EXPIRED') {
      throw new ForbiddenException(
        'Licenca vencida. Renove em Minha Assinatura para continuar.',
      );
    }

    return true;
  }

  private canAccessWithoutLicenseCheck(path: string) {
    return (
      path.startsWith('/api/v1/auth/me') ||
      path.startsWith('/auth/me') ||
      path.startsWith('/api/v1/auth/logout') ||
      path.startsWith('/auth/logout')
    );
  }

  private canAccessWithExpiredLicense(
    path: string,
    method: string,
    status: string,
  ) {
    const isLicensePath =
      path.startsWith('/api/v1/license') || path.startsWith('/license');

    if (!isLicensePath) {
      return false;
    }

    if (status !== 'SUSPENDED') {
      return true;
    }

    return (
      method.toUpperCase() === 'GET' &&
      (path === '/api/v1/license' || path === '/license')
    );
  }
}
