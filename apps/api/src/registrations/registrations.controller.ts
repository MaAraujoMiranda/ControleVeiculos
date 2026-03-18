import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { QueryRegistrationsDto } from './dto/query-registrations.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { RegistrationsService } from './registrations.service';

@ApiTags('Registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  listRegistrations(@Query() query: QueryRegistrationsDto) {
    return this.registrationsService.listRegistrations(query);
  }

  @Get(':id')
  getRegistrationById(@Param('id') id: string) {
    return this.registrationsService.getRegistrationById(id);
  }

  @Post()
  createRegistration(@Body() dto: CreateRegistrationDto) {
    return this.registrationsService.createRegistration(dto);
  }

  @Patch(':id')
  updateRegistration(
    @Param('id') id: string,
    @Body() dto: UpdateRegistrationDto,
  ) {
    return this.registrationsService.updateRegistration(id, dto);
  }

  @Delete(':id')
  deleteRegistration(@Param('id') id: string) {
    return this.registrationsService.deleteRegistration(id);
  }
}
