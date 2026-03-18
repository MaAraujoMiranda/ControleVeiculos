import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowPrismaError(
  error: unknown,
  fallbackMessage: string,
): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(', ')
      : 'campo unico';

    throw new ConflictException(`${fallbackMessage} Conflito em: ${target}.`);
  }

  throw error;
}
