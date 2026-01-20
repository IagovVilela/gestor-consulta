import { IsOptional, IsString } from 'class-validator';

export class UpdateProntuarioDto {
  @IsOptional()
  @IsString()
  queixaPrincipal?: string;

  @IsOptional()
  @IsString()
  historico?: string;

  @IsOptional()
  @IsString()
  exameFisico?: string;

  @IsOptional()
  @IsString()
  diagnostico?: string;

  @IsOptional()
  @IsString()
  conduta?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}




