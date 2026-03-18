import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentSession } from './decorators/current-session.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import type { AuthenticatedSession } from './types/auth-session.type';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });

    response.cookie(
      result.cookieName,
      result.cookieValue,
      result.cookieOptions,
    );

    return result.session;
  }

  @Get('me')
  getCurrentSession(@CurrentSession() session: AuthenticatedSession) {
    return this.authService.serializeSession(session);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentSession() session: AuthenticatedSession,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(session, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });

    response.clearCookie(
      this.authService.getCookieName(),
      this.authService.clearCookieOptions(),
    );

    return {
      message: 'Sessao encerrada com sucesso.',
    };
  }
}
