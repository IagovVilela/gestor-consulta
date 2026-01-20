import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  async findAll(@Request() req, @Query('lida') lida?: string) {
    return this.notificacoesService.findAll(
      req.user.id,
      lida === 'true' ? true : lida === 'false' ? false : undefined,
    );
  }

  @Post()
  async create(@Body() createDto: CreateNotificacaoDto) {
    return this.notificacoesService.create(createDto);
  }

  @Put(':id/lida')
  async marcarComoLida(@Param('id') id: string) {
    return this.notificacoesService.marcarComoLida(id);
  }

  @Get('nao-lidas')
  async getNaoLidas(@Request() req) {
    return {
      count: await this.notificacoesService.getNaoLidas(req.user.id),
    };
  }
}




