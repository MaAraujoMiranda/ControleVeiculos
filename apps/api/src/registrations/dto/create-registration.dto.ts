import { RegistrationStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  clientId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(191)
  vehicleId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  vehicle2Id?: string;

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

  @IsOptional()
  @IsString()
  declarationUrl?: string;
}
