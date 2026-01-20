import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ClinicaGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // ADMIN pode acessar qualquer clínica
    if (user.role?.toUpperCase() === 'ADMIN') {
      return true;
    }

    // Verificar se o usuário tem clínica
    if (!user.clinicaId) {
      throw new ForbiddenException('Usuário não vinculado a uma clínica');
    }

    // Verificar se há um clinicaId na query/params/body
    const requestedClinicaId =
      request.query?.clinicaId ||
      request.params?.clinicaId ||
      request.body?.clinicaId;

    // Se não há clinicaId solicitado, permitir acesso (será filtrado pelo interceptor)
    if (!requestedClinicaId) {
      return true;
    }

    // Se há clinicaId solicitado, verificar se é o mesmo do usuário
    if (requestedClinicaId !== user.clinicaId) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para acessar esta clínica',
      );
    }

    return true;
  }
}


