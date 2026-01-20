import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import * as crypto from 'crypto';

@Injectable()
export class NotificacoesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, lida?: boolean) {
    return this.prisma.notificacoes.findMany({
      where: {
        userId,
        ...(lida !== undefined && { lida }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(createDto: CreateNotificacaoDto) {
    return this.prisma.notificacoes.create({
      data: {
        id: crypto.randomUUID(),
        ...createDto,
        updatedAt: new Date(),
      } as any,
    });
  }

  async marcarComoLida(id: string) {
    return this.prisma.notificacoes.update({
      where: { id },
      data: { lida: true },
    });
  }

  async getNaoLidas(userId: string) {
    return this.prisma.notificacoes.count({
      where: {
        userId,
        lida: false,
      },
    });
  }
}


