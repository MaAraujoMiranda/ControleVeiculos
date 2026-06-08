import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SuspendLicenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
