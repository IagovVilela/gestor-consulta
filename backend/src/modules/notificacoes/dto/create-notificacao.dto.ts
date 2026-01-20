import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { notificacoes_tipo } from '@prisma/client';

export class CreateNotificacaoDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsEnum(notificacoes_tipo)
  tipo: notificacoes_tipo;

  @IsNotEmpty()
  @IsString()
  titulo: string;

  @IsNotEmpty()
  @IsString()
  mensagem: string;

  @IsOptional()
  @IsString()
  link?: string;
}


