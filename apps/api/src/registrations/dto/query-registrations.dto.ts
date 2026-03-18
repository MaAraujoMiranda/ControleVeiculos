import { RegistrationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

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
}
