import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProntuarioService } from './prontuario.service';
import { CreateProntuarioDto } from './dto/create-prontuario.dto';
import { UpdateProntuarioDto } from './dto/update-prontuario.dto';
import { CreateEvolucaoDto } from './dto/create-evolucao.dto';
import { CreatePrescricaoDto } from './dto/create-prescricao.dto';
import { CreateAnexoDto } from './dto/create-anexo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import * as crypto from 'crypto';

@UseGuards(JwtAuthGuard)
@Controller('prontuario')
export class ProntuarioController {
  constructor(private readonly prontuarioService: ProntuarioService) {}

  @Get('consulta/:consultaId')
  async findByConsulta(@Param('consultaId') consultaId: string) {
    return this.prontuarioService.findByConsulta(consultaId);
  }

  @Post()
  async create(@Body() createDto: CreateProntuarioDto) {
    return this.prontuarioService.create(createDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProntuarioDto,
  ) {
    return this.prontuarioService.update(id, updateDto);
  }

  @Get('paciente/:pacienteId')
  async getHistoricoCompleto(@Param('pacienteId') pacienteId: string) {
    return this.prontuarioService.getHistoricoCompleto(pacienteId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prontuarioService.findOne(id);
  }

  @Post(':id/evolucao')
  async addEvolucao(
    @Param('id') id: string,
    @Body() createDto: CreateEvolucaoDto,
  ) {
    return this.prontuarioService.addEvolucao(id, createDto);
  }

  @Post(':id/prescricao')
  async addPrescricao(
    @Param('id') id: string,
    @Body() createDto: CreatePrescricaoDto,
  ) {
    return this.prontuarioService.addPrescricao(id, createDto);
  }

  @Post(':id/anexo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const fs = require('fs');
          const path = require('path');
          const uploadPath = path.join(process.cwd(), 'uploads', 'prontuarios');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = crypto.randomUUID();
          const ext = extname(file.originalname);
          cb(null, `${randomName}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadAnexo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('descricao') descricao?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const createDto: CreateAnexoDto = {
      nome: file.originalname,
      descricao: descricao || '',
      url: `/api/uploads/prontuarios/${file.filename}`,
      tipo: file.mimetype,
      tamanho: file.size,
    };

    return this.prontuarioService.addAnexo(id, createDto);
  }

  @Get(':id/anexos')
  async getAnexos(@Param('id') id: string) {
    return this.prontuarioService.getAnexos(id);
  }

  @Delete('anexo/:anexoId')
  async removeAnexo(@Param('anexoId') anexoId: string) {
    return this.prontuarioService.removeAnexo(anexoId);
  }
}




