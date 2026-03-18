import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './auth.constants';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './types/auth-session.type';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
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

    return true;
  }
}
