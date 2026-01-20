import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const url = request.url;
    
    console.log('🔐 RolesGuard - Verificando permissão:', {
      url,
      requiredRoles,
      user: user ? { id: user.id, email: user.email, role: user.role } : null,
      requestKeys: Object.keys(request),
      hasUser: !!user,
    });
    
    if (!user) {
      console.error('❌ RolesGuard - Usuário não encontrado no request!');
      console.error('❌ Request keys:', Object.keys(request));
      console.error('❌ Request.user:', request.user);
      return false;
    }
    
    if (!user.role) {
      console.error('❌ RolesGuard - Usuário sem role!', {
        user: { id: user.id, email: user.email, role: user.role },
      });
      return false;
    }

    const userRole = String(user.role).toUpperCase().trim();
    const hasPermission = requiredRoles.some((role) => 
      userRole === String(role).toUpperCase().trim()
    );
    
    console.log('🔐 RolesGuard - Resultado:', {
      userRole,
      requiredRoles,
      hasPermission,
      comparison: requiredRoles.map(r => ({
        required: String(r).toUpperCase().trim(),
        user: userRole,
        match: userRole === String(r).toUpperCase().trim(),
      })),
    });
    
    if (!hasPermission) {
      console.error('❌ RolesGuard - Acesso negado!', {
        userRole,
        requiredRoles,
      });
    }
    
    return hasPermission;
  }
}



