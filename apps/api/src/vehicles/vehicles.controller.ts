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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  listVehicles(@Query() query: QueryVehiclesDto) {
    return this.vehiclesService.listVehicles(query);
  }

  @Get('lookup/by-plate')
  findVehicleByPlate(
    @Query('plate') plate: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.vehiclesService.findVehicleByPlate(plate, excludeId);
  }

  @Get(':id')
  getVehicleById(@Param('id') id: string) {
    return this.vehiclesService.getVehicleById(id);
  }

  @Post()
  createVehicle(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.createVehicle(dto);
  }

  @Patch(':id')
  updateVehicle(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.updateVehicle(id, dto);
  }

  @Delete(':id')
  deleteVehicle(@Param('id') id: string) {
    return this.vehiclesService.deleteVehicle(id);
  }
}
