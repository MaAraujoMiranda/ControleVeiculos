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

    if (this.canAccessWithExpiredLicense(path)) {
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
    const expiredByDate = new Date(license.expiresAt).getTime() <= now.getTime();
    const blockedByStatus =
      license.status === 'EXPIRED' || license.status === 'SUSPENDED';

    if (
      expiredByDate &&
      license.status !== 'EXPIRED' &&
      license.status !== 'SUSPENDED'
    ) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: 'EXPIRED' },
      });
    }

    if (expiredByDate || blockedByStatus) {
      throw new ForbiddenException(
        'Licenca vencida. Renove em Minha Assinatura para continuar.',
      );
    }

    return true;
  }

  private canAccessWithExpiredLicense(path: string) {
    return (
      path.startsWith('/api/v1/license') ||
      path.startsWith('/license') ||
      path.startsWith('/api/v1/auth/me') ||
      path.startsWith('/auth/me') ||
      path.startsWith('/api/v1/auth/logout') ||
      path.startsWith('/auth/logout')
    );
  }
}
