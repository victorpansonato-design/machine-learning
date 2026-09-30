import { fullDate } from '../lib/format';

/* ==========================================================================
   Datas de fila
   --------------------------------------------------------------------------
   `dt_corte` é uma DATA DE CALENDÁRIO (`AAAA-MM-DD`), sem fuso. Toda conta
   aqui ancora ao meio-dia local, pelo mesmo motivo de `lib/format.ts`:
   `new Date('2026-09-27')` é meia-noite UTC, que em Brasília é o dia anterior.

   A data é mostrada como a API devolve — a véspera da execução do job (quarta
   e domingo para as execuções de quinta e segunda). Não "corrija" para o dia
   da execução (docs/CONTEXTO.md §3).
   ========================================================================== */

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const m = DATA.exec(value);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}

export function parseIsoDate(value: string): Date {
  const m = DATA.exec(value);
  if (!m) return new Date(Number.NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Dias inteiros de `from` até `to` (positivo se `to` é depois). */
export function diffDays(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
}

const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });

export function diaDaSemana(iso: string): string {
  const d = parseIsoDate(iso);
  return Number.isNaN(d.getTime()) ? '' : weekdayFmt.format(d);
}

/** `27/09/2026 · domingo` — o rótulo de uma fila num seletor. */
export function rotuloFila(iso: string): string {
  const dia = diaDaSemana(iso);
  return dia ? `${fullDate(iso)} · ${dia}` : fullDate(iso);
}

/** `1 dia` · `4 dias`. */
export function dias(n: number): string {
  return `${n} ${Math.abs(n) === 1 ? 'dia' : 'dias'}`;
}
