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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  listClients(@Query() query: QueryClientsDto) {
    return this.clientsService.listClients(query);
  }

  @Get(':id')
  getClientById(@Param('id') id: string) {
    return this.clientsService.getClientById(id);
  }

  @Post()
  createClient(@Body() dto: CreateClientDto) {
    return this.clientsService.createClient(dto);
  }

  @Patch(':id')
  updateClient(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.updateClient(id, dto);
  }

  @Delete(':id')
  deleteClient(@Param('id') id: string) {
    return this.clientsService.deleteClient(id);
  }
}
