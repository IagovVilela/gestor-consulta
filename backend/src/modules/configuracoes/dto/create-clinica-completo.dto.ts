import { IsNotEmpty, IsString, IsOptional, IsEmail, Matches, MinLength } from 'class-validator';

/**
 * DTO para criar clínica completa (clínica + usuário gerente em uma operação)
 */
export class CreateClinicaCompletoDto {
  // Dados da clínica
  @IsNotEmpty()
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  corPrimaria?: string;

  @IsOptional()
  @IsString()
  corSecundaria?: string;

  // Dados do gerente (dono da clínica)
  @IsNotEmpty()
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: 'Email deve ter um formato válido',
  })
  gerenteEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  gerentePassword: string;

  @IsNotEmpty()
  @IsString()
  gerenteName: string;
}

