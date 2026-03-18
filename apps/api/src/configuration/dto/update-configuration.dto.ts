import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateConfigurationDto {
  @IsOptional()
  @IsBoolean()
  allowMultipleVehiclesPerClient?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(365)
  sessionDurationDays?: number;
}
