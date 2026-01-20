import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class LoginDto {
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
}

