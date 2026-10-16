import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class AlterarConsultaDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida' })
  data: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Horário inválido' })
  hora: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  profissionalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}
