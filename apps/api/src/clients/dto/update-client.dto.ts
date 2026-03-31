import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const CLIENT_TYPES = [
  'Proprietario',
  'Socio',
  'Funcionario',
] as const;

const CLIENT_MODALITIES = [
  'Mensalista',
  'Sala',
] as const;

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  cpf?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(CLIENT_TYPES)
  @MaxLength(30)
  clientType?: string;

  @IsOptional()
  @IsString()
  @IsIn(CLIENT_MODALITIES)
  @MaxLength(30)
  clientModality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
