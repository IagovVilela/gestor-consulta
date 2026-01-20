import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateEspecialidadeDto {
  @IsNotEmpty()
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}




