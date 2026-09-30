/* Formatting helpers. Portuguese (Brazil) throughout — this is an internal
   tool for a Brazilian institution, so the locale is not a preference. */

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const dateFullFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const currencyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});
const intFmt = new Intl.NumberFormat('pt-BR');

export function money(value: number): string {
  return currencyFmt.format(value);
}

export function int(value: number): string {
  return intFmt.format(Math.round(value));
}

export function decimal(value: number, places = 1): string {
  return value.toFixed(places).replace('.', ',');
}

export function percent(value: number, places = 0): string {
  return `${decimal(value, places)}%`;
}

/** Signed delta, e.g. "+8" / "−12". Uses a real minus sign, not a hyphen. */
export function signed(value: number): string {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

/**
 * Aceita as duas formas de data que existem no sistema.
 *
 * "2026-09-11T14:30:00" é um INSTANTE e `new Date` resolve certo. "2026-09-11"
 * é uma DATA DE CALENDÁRIO e não tem fuso — mas `new Date` a lê como meia-noite
 * UTC, que em Brasília é 21h do dia anterior. Formatada, saía um dia antes:
 * `fullDate('2026-01-01')` devolvia 31/12/2025, atravessando o ano.
 *
 * Ancorar ao meio-dia local é o mesmo remédio que `dateInputToIso` já aplica
 * logo abaixo — doze horas de folga cobrem qualquer fuso do planeta em que a
 * instituição seja lida.
 *
 * Isto é aditivo: quem já passava timestamp completo não muda de resultado,
 * porque a forma só-data é reconhecida pelo padrão e mais nada.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function asDate(iso: string): Date {
  return new Date(DATE_ONLY.test(iso) ? `${iso}T12:00:00` : iso);
}

export function shortDate(iso: string): string {
  const d = asDate(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export function fullDate(iso: string): string {
  const d = asDate(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFullFmt.format(d);
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : timeFmt.format(d);
}

/** "Hoje, 14:32" · "Ontem, 09:10" · "14/08, 16:45" · "14/08/2025". */
export function stamp(iso: string, now = Date.now()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const startOfDay = (t: number) => {
    const x = new Date(t);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const days = Math.round((startOfDay(now) - startOfDay(d.getTime())) / 86_400_000);

  if (days === 0) return `Hoje, ${timeFmt.format(d)}`;
  if (days === 1) return `Ontem, ${timeFmt.format(d)}`;
  if (days > 1 && days < 365) return `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
  return dateFullFmt.format(d);
}

/** "há 12 min" · "há 3 h" · "há 5 d". Used for feeds and notifications. */
export function relative(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} d`;
  return fullDate(iso);
}

/** "2 h 15 min" · "48 min" · "3 d 4 h". Never a bare number of seconds. */
export function duration(ms: number): string {
  const abs = Math.abs(ms);
  const totalMinutes = Math.floor(abs / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days} d` : `${days} d ${restHours} h`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 2);
  const first = parts[0] ?? name.slice(0, 1);
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  return (first.slice(0, 1) + last.slice(0, 1)).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Digits only — for RA / CPF / phone matching in search. */
export function digits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Accent- and case-insensitive comparison key for search. */
export function searchKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoPlusDays(days: number, from = Date.now()): string {
  return new Date(from + days * 86_400_000).toISOString();
}

export function isoMinusMinutes(minutes: number, from = Date.now()): string {
  return new Date(from - minutes * 60_000).toISOString();
}

/** Converts an `<input type="date">` value to an ISO timestamp at 12:00 local. */
export function dateInputToIso(value: string): string {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

/** Converts an ISO timestamp back to an `<input type="date">` value. */
export function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
