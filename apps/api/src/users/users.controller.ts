import { Body, Controller, Patch } from '@nestjs/common';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import type { AuthenticatedSession } from '../auth/types/auth-session.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateProfile(
    @CurrentSession() session: AuthenticatedSession,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(session.userId, dto);
  }
}
