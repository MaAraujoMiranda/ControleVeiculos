import { RegistrationStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const CLIENT_TYPES = [
  'Proprietario',
  'Socio',
  'Funcionario',
  'Mensalista',
  'Sala',
] as const;

export class QueryRegistrationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  vehicleId?: string;

  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

  @IsOptional()
  @IsString()
  @IsIn(CLIENT_TYPES)
  @MaxLength(30)
  clientType?: string;
}
