import { IsOptional, IsString } from 'class-validator';

export class UpdateProfissionalDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsString()
  especialidadeId?: string;

  @IsOptional()
  @IsString()
  nomeCompleto?: string;

  @IsOptional()
  @IsString()
  crm?: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}




