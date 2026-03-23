import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    const data: { name?: string; passwordHash?: string } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.newPassword !== undefined) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Informe a senha atual para alterar a senha.',
        );
      }

      if (!verifyPassword(dto.currentPassword, user.passwordHash)) {
        throw new UnauthorizedException('Senha atual incorreta.');
      }

      data.passwordHash = hashPassword(dto.newPassword);
    }

    if (Object.keys(data).length === 0) {
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return { id: updated.id, name: updated.name, email: updated.email, role: updated.role };
  }
}
