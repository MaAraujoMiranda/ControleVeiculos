import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateLicenseAdminDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  maintenanceGraceDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  maintenanceHour?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  maintenanceTimeZone?: string;
}
