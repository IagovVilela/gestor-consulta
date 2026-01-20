import { IsOptional, IsDateString, IsEnum, IsString, IsNumber, IsBoolean } from 'class-validator';
import { consultas_status } from '@prisma/client';

export class UpdateAgendaDto {
  @IsOptional()
  @IsDateString()
  dataHora?: string;

  @IsOptional()
  @IsEnum(consultas_status)
  status?: consultas_status;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsBoolean()
  porConvenio?: boolean;

  @IsOptional()
  @IsString()
  nomeConvenio?: string;
}


