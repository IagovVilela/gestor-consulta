import { IsNotEmpty, IsString, IsDateString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { consultas_status } from '@prisma/client';

export class CreateAgendaDto {
  @IsNotEmpty()
  @IsString()
  pacienteId: string;

  @IsNotEmpty()
  @IsString()
  profissionalId: string;

  @IsNotEmpty()
  @IsString()
  clinicaId: string;

  @IsNotEmpty()
  @IsDateString()
  dataHora: string;

  @IsOptional()
  @IsEnum(consultas_status)
  status?: consultas_status;

  @IsOptional()
  observacoes?: string;

  @IsOptional()
  valor?: number;

  @IsOptional()
  @IsBoolean()
  porConvenio?: boolean;

  @IsOptional()
  @IsString()
  nomeConvenio?: string;
}


