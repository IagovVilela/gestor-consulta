import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePrescricaoDto {
  @IsNotEmpty()
  @IsString()
  medicamento: string;

  @IsNotEmpty()
  @IsString()
  dosagem: string;

  @IsNotEmpty()
  @IsString()
  posologia: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}




