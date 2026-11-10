import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export class CreatePacienteDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser um texto' })
  nome: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString({ message: 'CPF deve ser um texto' })
  cpf?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString({ message: 'RG deve ser um texto' })
  rg?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString({}, { message: 'Data de nascimento inválida' })
  dataNascimento?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString({ message: 'Telefone deve ser um texto' })
  telefone?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString({ message: 'Email deve ser um texto' })
  email?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString({ message: 'Endereço deve ser um texto' })
  endereco?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  observacoes?: string;

  @Transform(emptyToUndefined)
  @IsUUID('4', { message: 'Clínica inválida' })
  @IsOptional()
  clinicaId?: string;

  @Transform(emptyToUndefined)
  @IsUUID('4', { message: 'Médico preferencial inválido' })
  @IsOptional()
  medicoPreferencialId?: string;
}
