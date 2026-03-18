import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryClientsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  q?: string;
}
