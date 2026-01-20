import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEvolucaoDto {
  @IsNotEmpty()
  @IsString()
  descricao: string;
}




