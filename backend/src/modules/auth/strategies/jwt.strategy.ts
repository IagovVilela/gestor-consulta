import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
    console.log('🔐 JwtStrategy inicializado com secret:', process.env.JWT_SECRET ? '***configurado***' : '***padrão***');
  }

  async validate(payload: any) {
    console.log('🔐 JwtStrategy.validate - Payload recebido:', {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      clinicaId: payload.clinicaId,
    });
    
    if (!payload || !payload.sub) {
      console.error('❌ JwtStrategy.validate - Payload inválido ou sem sub');
      throw new UnauthorizedException('Token inválido');
    }
    
    const user = await this.authService.validateUser(payload.sub);
    
    if (!user) {
      console.error('❌ JwtStrategy.validate - Usuário não encontrado ou inativo:', payload.sub);
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }
    
    console.log('✅ JwtStrategy.validate - Usuário validado:', {
      id: user.id,
      email: user.email,
      role: user.role,
      active: user.active,
      clinicaId: user.clinicaId,
    });
    
    const isClinicOwner =
      user.role !== 'ADMIN' &&
      !!(await this.authService.isClinicOwner(user.id));

    // IMPORTANTE: Retornar o usuário do banco, não do payload do token
    // Isso garante que sempre temos os dados mais atualizados
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role, // Role do banco, não do token
      active: user.active,
      clinicaId: user.role === 'ADMIN' ? null : (user.clinicaId || null),
      isClinicOwner,
    };
  }
}



