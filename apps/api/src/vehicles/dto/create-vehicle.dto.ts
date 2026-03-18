import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  clientId!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(8)
  plate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  brandModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
