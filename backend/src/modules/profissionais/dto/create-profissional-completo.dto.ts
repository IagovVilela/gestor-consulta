import { IsNotEmpty, IsString, IsOptional, Matches, MinLength } from 'class-validator';

/**
 * DTO para criar profissional completo (usuário + profissional em uma operação)
 */
export class CreateProfissionalCompletoDto {
  // Dados do usuário
  @IsNotEmpty()
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: 'Email deve ter um formato válido',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  // Dados do profissional
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

