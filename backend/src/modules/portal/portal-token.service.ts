import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export interface PortalTokenPayload {
  pacienteId: string;
  clinicaId: string;
  exp: number;
}

@Injectable()
export class PortalTokenService {
  private readonly ttlMs = 12 * 60 * 60 * 1000;

  sign(pacienteId: string, clinicaId: string): string {
    const payload: PortalTokenPayload = {
      pacienteId,
      clinicaId,
      exp: Date.now() + this.ttlMs,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.signature(body);
    return `${body}.${signature}`;
  }

  verify(authorization?: string): PortalTokenPayload {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!token || !token.includes('.')) {
      throw new UnauthorizedException('Acesso do paciente expirado. Entre novamente com CPF e data de nascimento.');
    }

    const [body, signature] = token.split('.');
    const expected = this.signature(body);
    const valid =
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!valid) {
      throw new UnauthorizedException('Acesso do paciente inválido.');
    }

    let payload: PortalTokenPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Acesso do paciente inválido.');
    }

    if (!payload?.pacienteId || !payload?.clinicaId || payload.exp < Date.now()) {
      throw new UnauthorizedException('Acesso do paciente expirado. Entre novamente com CPF e data de nascimento.');
    }

    return payload;
  }

  private signature(body: string): string {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return createHmac('sha256', secret).update(body).digest('base64url');
  }
}
