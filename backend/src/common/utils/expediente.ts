export type JanelaExpediente = {
  inicio: string;
  fim: string;
  step: number;
};

export function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function horaFromMinutos(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function janelasPadrao(diaSemana: number): JanelaExpediente[] {
  if (diaSemana === 0) return [];
  if (diaSemana === 6) return [{ inicio: '08:00', fim: '12:00', step: 30 }];
  return [{ inicio: '08:00', fim: '18:00', step: 30 }];
}

/** Interseção de duas janelas; retorna null se não houver overlap. */
export function intersectJanelas(
  a: JanelaExpediente,
  b: JanelaExpediente,
): JanelaExpediente | null {
  const inicio = Math.max(minutos(a.inicio), minutos(b.inicio));
  const fim = Math.min(minutos(a.fim), minutos(b.fim));
  if (inicio >= fim) return null;
  return {
    inicio: horaFromMinutos(inicio),
    fim: horaFromMinutos(fim),
    step: Math.min(a.step || 30, b.step || 30),
  };
}

export function intersectListas(
  clinica: JanelaExpediente[],
  profissional: JanelaExpediente[],
): JanelaExpediente[] {
  if (!clinica.length) return [];
  if (!profissional.length) return clinica;
  const result: JanelaExpediente[] = [];
  for (const c of clinica) {
    for (const p of profissional) {
      const overlap = intersectJanelas(c, p);
      if (overlap) result.push(overlap);
    }
  }
  return result;
}

export function gerarSlots(
  janelas: JanelaExpediente[],
  dia: Date,
  ocupados: Array<{ inicio: number; fim: number }>,
): string[] {
  const slots: string[] = [];
  const agora = Date.now();

  for (const janela of janelas) {
    const step = janela.step > 0 ? janela.step : 30;
    let cursor = minutos(janela.inicio);
    const limite = minutos(janela.fim);

    while (cursor + step <= limite) {
      const hora = horaFromMinutos(cursor);
      const quando = new Date(dia);
      quando.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
      const slotEnd = quando.getTime() + step * 60 * 1000;
      const ocupado = ocupados.some(
        (o) => quando.getTime() < o.fim && slotEnd > o.inicio,
      );
      if (!ocupado && quando.getTime() > agora) {
        slots.push(hora);
      }
      cursor += step;
    }
  }

  return slots;
}

export function validarHora(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}
