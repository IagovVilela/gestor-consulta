import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Admin da clínica: ADMIN do sistema, proprietário (owner) ou SECRETARIA.
 * Médico comum (sem ser dono) não passa.
 */
@Injectable()
export class ClinicAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const role = String(user.role || '').toUpperCase();

    if (role === 'ADMIN') {
      return true;
    }

    if (role === 'SECRETARIA' && user.clinicaId) {
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
      'Apenas o administrador do sistema, o proprietário ou a secretária da clínica podem realizar esta ação',
    );
  }
}
