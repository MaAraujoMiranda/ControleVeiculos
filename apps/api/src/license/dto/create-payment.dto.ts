import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  holderName!: string;

  @IsString()
  @MinLength(11)
  @MaxLength(14)
  holderCpf!: string;

  @IsString()
  @MaxLength(191)
  holderEmail!: string;

  @IsOptional()
  @IsEnum(['PIX', 'BOLETO'])
  method?: 'PIX' | 'BOLETO';
}
