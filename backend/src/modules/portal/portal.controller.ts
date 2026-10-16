import { Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { PortalService } from './portal.service';
import { AgendarDto } from './dto/agendar.dto';
import { AcessarDto } from './dto/acessar.dto';
import { AlterarConsultaDto } from './dto/alterar-consulta.dto';

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get(':slug/horarios')
  horarios(
    @Param('slug') slug: string,
    @Query('profissionalId') profissionalId: string,
    @Query('data') data: string,
    @Query('ignorar') ignorar?: string,
  ) {
    return this.portalService.horarios(slug, profissionalId, data, ignorar);
  }

  @Get(':slug/consultas')
  consultas(@Param('slug') slug: string, @Headers('authorization') authorization?: string) {
    return this.portalService.minhasConsultas(slug, authorization);
  }

  @Post(':slug/agendar')
  agendar(@Param('slug') slug: string, @Body() dto: AgendarDto) {
    return this.portalService.agendar(slug, dto);
  }

  @Post(':slug/acessar')
  acessar(@Param('slug') slug: string, @Body() dto: AcessarDto) {
    return this.portalService.acessar(slug, dto);
  }

  @Put(':slug/consultas/:id')
  alterar(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: AlterarConsultaDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.portalService.alterar(slug, id, dto, authorization);
  }

  @Post(':slug/consultas/:id/cancelar')
  cancelar(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.portalService.cancelar(slug, id, authorization);
  }

  @Get(':slug')
  getClinica(@Param('slug') slug: string) {
    return this.portalService.getClinica(slug);
  }
}
