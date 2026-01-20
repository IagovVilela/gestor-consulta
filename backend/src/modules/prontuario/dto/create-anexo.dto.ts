import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateAnexoDto {
  @IsNotEmpty()
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  tamanho?: number;
}

