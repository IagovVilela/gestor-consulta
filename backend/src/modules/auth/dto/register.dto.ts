import { IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, Matches, IsUUID } from 'class-validator';
import { users_role } from '@prisma/client';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: 'Email deve ter um formato válido (ex: usuario@dominio)',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(users_role)
  @IsOptional()
  role?: users_role;

  @IsUUID()
  @IsOptional()
  clinicaId?: string;
}

