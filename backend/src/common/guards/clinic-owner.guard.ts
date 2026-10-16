import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Permite ADMIN do sistema ou proprietário da clínica (ownerId).
 * Médicos comuns (sem ser dono) são bloqueados.
 */
@Injectable()
export class ClinicOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (String(user.role).toUpperCase() === 'ADMIN') {
      return true;
    }

    if (user.isClinicOwner === true) {
      return true;
    }

    const owned = await this.prisma.clinicas.findFirst({
      where: {
        ownerId: user.id,
        active: true,
      },
      select: { id: true },
    });

    if (owned) {
      request.user = { ...user, isClinicOwner: true };
      return true;
    }

    throw new ForbiddenException(
      'Apenas o administrador do sistema ou o proprietário da clínica podem realizar esta ação',
    );
  }
}
