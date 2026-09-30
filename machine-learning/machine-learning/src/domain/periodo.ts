import { fullDate } from '../lib/format';
import { addDays, isIsoDate, parseIsoDate, toIsoDate } from './fila';
import type { DataCorte } from '../api/types';

/* ==========================================================================
   Períodos do Monitoramento
   --------------------------------------------------------------------------
   Um período escolhe FILAS pela `dt_corte` (a data que a API devolve). Como o
   job grava duas filas por semana, "hoje" não é um dia com fila — é a fila
   que vale hoje, a mais recente. Os outros períodos são de calendário:

     esta semana   de domingo até hoje (a semana começa no domingo, que é
                   também um dos dias de corte)
     este mês      do dia 1 até hoje
     3/6/12 meses  janela móvel terminando hoje
     personalizado de/até escolhidos, inclusive
   ========================================================================== */

export type PeriodoKey = 'hoje' | 'semana' | 'mes' | '3m' | '6m' | '12m' | 'custom';

export const PERIODOS: { key: PeriodoKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mês' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: '12m', label: '1 ano' },
  { key: 'custom', label: 'Personalizado' },
];

export const PERIODO_PADRAO: PeriodoKey = '3m';

export function parsePeriodo(value: string | undefined): PeriodoKey {
  return PERIODOS.some((p) => p.key === value) ? (value as PeriodoKey) : PERIODO_PADRAO;
}

function menosMeses(iso: string, meses: number): string {
  const d = parseIsoDate(iso);
  d.setMonth(d.getMonth() - meses);
  return toIsoDate(d);
}

export interface Intervalo {
  /** `null` = só a fila vigente. */
  inicio: string | null;
  fim: string;
}

export function intervalo(periodo: PeriodoKey, hoje: string, de?: string, ate?: string): Intervalo {
  switch (periodo) {
    case 'hoje':
      return { inicio: null, fim: hoje };
    case 'semana':
      return { inicio: addDays(hoje, -parseIsoDate(hoje).getDay()), fim: hoje };
    case 'mes':
      return { inicio: `${hoje.slice(0, 8)}01`, fim: hoje };
    case '3m':
      return { inicio: menosMeses(hoje, 3), fim: hoje };
    case '6m':
      return { inicio: menosMeses(hoje, 6), fim: hoje };
    case '12m':
      return { inicio: menosMeses(hoje, 12), fim: hoje };
    case 'custom': {
      const a = de && isIsoDate(de) ? de : menosMeses(hoje, 1);
      const b = ate && isIsoDate(ate) ? ate : hoje;
      return a <= b ? { inicio: a, fim: b } : { inicio: b, fim: a };
    }
  }
}

/** As filas do período, da mais ANTIGA para a mais recente. */
export function filasNoPeriodo(datasDesc: DataCorte[], iv: Intervalo): DataCorte[] {
  if (iv.inicio === null) {
    const vigente = datasDesc.find((d) => d.dt_corte <= iv.fim);
    return vigente ? [vigente] : [];
  }
  const inicio = iv.inicio;
  return datasDesc.filter((d) => d.dt_corte >= inicio && d.dt_corte <= iv.fim).reverse();
}

/** "de 01/07/2026 a 30/09/2026" — o período em palavras. */
export function descreverIntervalo(periodo: PeriodoKey, iv: Intervalo): string {
  if (iv.inicio === null) return 'a fila que vale hoje';
  const label = PERIODOS.find((p) => p.key === periodo)?.label ?? '';
  const faixa = `de ${fullDate(iv.inicio)} a ${fullDate(iv.fim)}`;
  return periodo === 'custom' ? faixa : `${label.toLowerCase()} · ${faixa}`;
}

export function hojeIso(): string {
  return toIsoDate(new Date());
}
