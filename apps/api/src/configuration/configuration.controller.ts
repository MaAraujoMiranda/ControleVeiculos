import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigurationService } from './configuration.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@ApiTags('Configuration')
@Controller('configuration')
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Get()
  getConfiguration() {
    return this.configurationService.getConfiguration();
  }

  @Patch()
  updateConfiguration(@Body() dto: UpdateConfigurationDto) {
    return this.configurationService.updateConfiguration(dto);
  }
}
