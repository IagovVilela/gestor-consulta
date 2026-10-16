import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { clinicas_status_plataforma } from '@prisma/client';

export class UpdateClinicaAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(clinicas_status_plataforma)
  statusPlataforma?: clinicas_status_plataforma;

  @IsOptional()
  @IsString()
  planoId?: string | null;

  @IsOptional()
  @IsDateString()
  trialAte?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoesAdmin?: string | null;
}
