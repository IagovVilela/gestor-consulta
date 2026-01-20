import { IsOptional, IsString } from 'class-validator';

export class UpdateEspecialidadeDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}




