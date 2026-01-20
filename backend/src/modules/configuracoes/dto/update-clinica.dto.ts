import { IsOptional, IsString, IsEmail, Matches, MinLength } from 'class-validator';

export class UpdateClinicaDto {
  @IsOptional()
  @IsString()
  nome?: string;

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

  // Campos para atualizar o gerente
  @IsOptional()
  @IsString()
  gerenteId?: string; // ID do novo gerente (se quiser trocar)

  @IsOptional()
  @IsString()
  gerenteName?: string; // Nome do gerente (se quiser atualizar)

  @IsOptional()
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: 'Email deve ter um formato válido',
  })
  gerenteEmail?: string; // Email do gerente (se quiser atualizar)

  @IsOptional()
  @IsString()
  @MinLength(6)
  gerentePassword?: string; // Nova senha do gerente (opcional)
}

