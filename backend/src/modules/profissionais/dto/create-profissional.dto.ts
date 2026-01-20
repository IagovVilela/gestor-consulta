import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateProfissionalDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  clinicaId: string;

  @IsNotEmpty()
  @IsString()
  especialidadeId: string;

  @IsNotEmpty()
  @IsString()
  nomeCompleto: string;

  @IsOptional()
  @IsString()
  crm?: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}




