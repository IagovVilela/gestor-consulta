import { IsNotEmpty, IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreatePacienteDto {
  @IsNotEmpty()
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsUUID()
  @IsOptional()
  clinicaId?: string;

  @IsUUID()
  @IsOptional()
  medicoPreferencialId?: string;
}


