import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ClinicaFilterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Se não há usuário autenticado, passar adiante
    if (!user) {
      return next.handle();
    }

    // ADMIN pode ver todas as clínicas (a menos que especifique um filtro)
    if (user.role?.toUpperCase() === 'ADMIN') {
      // Se ADMIN especificou um clinicaId na query, usar ele
      if (request.query?.clinicaId) {
        request.clinicaFilter = request.query.clinicaId;
      }
      // Caso contrário, não aplicar filtro (ver todas)
      return next.handle();
    }

    // Para outros usuários, sempre filtrar por sua clínica
    if (user.clinicaId) {
      request.clinicaFilter = user.clinicaId;
    }

    return next.handle();
  }
}


