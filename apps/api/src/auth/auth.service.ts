import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction } from '@prisma/client';
import type { CookieOptions } from 'express';
import { AuditService } from '../audit/audit.service';
import {
  generateSessionToken,
  hashSessionToken,
} from '../common/utils/session.util';
import { verifyPassword } from '../common/utils/password.util';
import { ConfigurationService } from '../configuration/configuration.service';
import { PrismaService } from '../database/prisma.service';
import {
  AuthenticatedSession,
  AuthSessionResponse,
  AuthenticatedUser,
} from './types/auth-session.type';

interface SessionMetadata {
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configurationService: ConfigurationService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string, metadata: SessionMetadata = {}) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      !user.isActive ||
      !verifyPassword(password, user.passwordHash)
    ) {
      throw new UnauthorizedException('Email ou senha invalidos.');
    }

    const configuration = await this.configurationService.ensureConfiguration();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + configuration.sessionDurationDays * 24 * 60 * 60 * 1000,
    );
    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          lastUsedAt: now,
          ip: metadata.ip ?? null,
          userAgent: metadata.userAgent ?? null,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: now,
        },
      });

      await this.auditService.record(
        {
          action: AuditAction.LOGIN,
          entity: 'session',
          entityId: created.id,
          userId: user.id,
          newData: {
            expiresAt: expiresAt.toISOString(),
          },
          ip: metadata.ip ?? null,
          userAgent: metadata.userAgent ?? null,
        },
        tx,
      );

      return created;
    });

    return {
      cookieName: this.getCookieName(),
      cookieValue: sessionToken,
      cookieOptions: this.buildCookieOptions(expiresAt),
      session: this.serializeSession({
        sessionId: session.id,
        userId: user.id,
        expiresAt,
        user: this.serializeUser({
          ...user,
          lastLoginAt: now,
        }),
      }),
    };
  }

  async resolveSession(token: string) {
    const now = new Date();
    const session = await this.prisma.session.findFirst({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        user: true,
      },
    });

    if (!session || !session.user.isActive) {
      throw new UnauthorizedException('Sessao invalida ou expirada.');
    }

    if (
      !session.lastUsedAt ||
      now.getTime() - session.lastUsedAt.getTime() > 15 * 60 * 1000
    ) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: now },
      });
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
      user: this.serializeUser(session.user),
    } satisfies AuthenticatedSession;
  }

  async logout(session: AuthenticatedSession, metadata: SessionMetadata = {}) {
    const revokedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.sessionId },
        data: { revokedAt },
      });

      await this.auditService.record(
        {
          action: AuditAction.LOGOUT,
          entity: 'session',
          entityId: session.sessionId,
          userId: session.userId,
          newData: {
            revokedAt: revokedAt.toISOString(),
          },
          ip: metadata.ip ?? null,
          userAgent: metadata.userAgent ?? null,
        },
        tx,
      );
    });
  }

  getCookieName() {
    return this.configService.get<string>(
      'SESSION_COOKIE_NAME',
      'controle_session',
    );
  }

  clearCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction(),
      path: '/',
    };
  }

  serializeSession(session: AuthenticatedSession): AuthSessionResponse {
    return {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt.toISOString(),
      user: session.user,
    };
  }

  private buildCookieOptions(expiresAt: Date): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction(),
      expires: expiresAt,
      path: '/',
    };
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private serializeUser(user: {
    id: string;
    name: string;
    email: string;
    role: AuthenticatedUser['role'];
    lastLoginAt: Date | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    } satisfies AuthenticatedUser;
  }
}
