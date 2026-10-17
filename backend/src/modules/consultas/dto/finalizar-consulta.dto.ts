import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { consultas_forma_pagamento } from '@prisma/client';

export class FinalizarConsultaDto {
  @IsEnum(consultas_forma_pagamento)
  formaPagamento: consultas_forma_pagamento;

  @ValidateIf((o) => o.formaPagamento === 'CONVENIO')
  @IsString()
  nomeConvenio?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
