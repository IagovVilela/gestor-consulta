import { IsString, Matches } from 'class-validator';

export class AcessarDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos' })
  cpf: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data de nascimento inválida' })
  dataNascimento: string;
}
