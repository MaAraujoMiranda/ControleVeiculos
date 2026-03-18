import { RegistrationStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRegistrationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  vehicleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cardNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  trSl?: string;

  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observations?: string;
}
