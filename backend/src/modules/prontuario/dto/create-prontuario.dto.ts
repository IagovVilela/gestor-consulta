import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateProntuarioDto {
  @IsNotEmpty()
  @IsString()
  consultaId: string;

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




