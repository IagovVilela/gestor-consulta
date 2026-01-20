import { IsNotEmpty, IsString, IsOptional, IsEmail, IsUUID } from 'class-validator';

export class CreateClinicaDto {
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
}

