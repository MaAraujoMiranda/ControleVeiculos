import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLoginAt: string | null;
}

export interface AuthenticatedSession {
  sessionId: string;
  userId: string;
  expiresAt: Date;
  user: AuthenticatedUser;
}

export interface AuthSessionResponse {
  sessionId: string;
  expiresAt: string;
  user: AuthenticatedUser;
}

export interface AuthenticatedRequest {
  authSession?: AuthenticatedSession;
  cookies?: Record<string, string>;
  ip?: string;
  path?: string;
  url?: string;
  originalUrl?: string;
  headers: {
    'user-agent'?: string;
  };
}
