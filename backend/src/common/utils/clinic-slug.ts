import * as crypto from 'crypto';

export function createClinicSlug(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return `${base || 'clinica'}-${crypto.randomBytes(3).toString('hex')}`;
}
