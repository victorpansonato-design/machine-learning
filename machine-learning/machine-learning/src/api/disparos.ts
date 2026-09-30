import type { Faixa } from './types';
import { ApiError } from './client';
import {
  acharFila,
  erro,
  inteiro,
  mockBase,
  simularLatencia,
  sorteio,
  validarFaixas,
} from './mock';
import { addDays } from '../domain/fila';

/* ==========================================================================
   Fonte da tela "Mensagens enviadas"
   --------------------------------------------------------------------------
   A tabela ANC_ML_RISCO_DISPARO existe, mas o TI ainda NÃO publicou rota de
   leitura (docs/CONTEXTO.md §5). Este arquivo segue o contrato PROPOSTO em
   docs/CONTRATO_DISPAROS_PROPOSTA.md, e é o único que muda quando a rota
   existir: trocar `apiDisparos` por uma chamada a `apiGet('disparos/listar')`
   e liberar a rota em `server/evasao-proxy.ts`.

   Nunca ler pelo `POST disparos/enviar`: é rota de ENVIO — um `confirmar:
   true` por engano manda push + e-mail para alunos reais.
   ========================================================================== */

// Proposta — a confirmar com o TI. Só `ENVIANDO` e `FALHA` estão documentados;
// o valor gravado no sucesso é desconhecido (o mock usa 'ENVIADO').
export type StatusDisparo = 'ENVIADO' | 'ENVIANDO' | 'FALHA' | (string & {});

export interface Disparo {
  dt_corte: string;
  aluno: string;
  chance_evasao: Faixa;
  modalidade: string;
  status: StatusDisparo;
  external_id?: string | null;
  enviado_em?: string | null;
}

export interface PaginaDisparos {
  dt_corte: string;
  fila_atualizada: boolean;
  total: number;
  pagina: number;
  limite: number;
  /** Contagem por STATUS no filtro de data e faixa, sem paginação. */
  resumo: Record<string, number>;
  disparos: Disparo[];
}

export interface DisparosParams {
  data?: string;
  faixa?: Faixa[];
  status?: string[];
  pagina?: number;
  limite?: number;
}

export interface DisparosSource {
  disponivel: boolean;
  listar(p: DisparosParams, signal?: AbortSignal): Promise<PaginaDisparos>;
  listarAluno(ra: string, signal?: AbortSignal): Promise<Disparo[]>;
}

/* -- api: a rota ainda não existe ------------------------------------------ */

const apiDisparos: DisparosSource = {
  disponivel: false,
  listar: () =>
    Promise.reject(
      new ApiError(404, 'A leitura dos envios ainda não está disponível na API (falta a rota disparos/listar).'),
    ),
  listarAluno: () =>
    Promise.reject(new ApiError(404, 'A leitura das mensagens do aluno ainda não está disponível na API.')),
};

/* -- mock: coerente com a fila do mock --------------------------------------
   Os alunos `Ativo` de cada faixa recebem uma vez por fila, em lotes de 100
   (`externalId` = `evasao-<faixa>-<dt_corte>-<hora>-<lote>`, como o README
   documenta). ~3% `FALHA`; alguns `ENVIANDO` só na fila mais recente — é o
   único lugar em que um envio pode estar em andamento. */

const HORA: Record<Faixa, string> = { CRITICA: '06:45', ALTA: '06:52', MEDIA: '07:04' };

const memo = new Map<string, Disparo[]>();

function disparosDaFila(dt: string, maisRecente: boolean): Disparo[] {
  const pronto = memo.get(dt);
  if (pronto) return pronto;

  const base = mockBase();
  const fila = acharFila(base, dt);
  const execucao = addDays(dt, 1);
  const porFaixa: Record<Faixa, number> = { CRITICA: 0, ALTA: 0, MEDIA: 0 };
  const out: Disparo[] = [];

  for (const linha of fila.linhas) {
    if (base.alunos.get(linha.aluno)?.sit !== 'Ativo') continue;
    const faixa = linha.chance_evasao;
    const lote = Math.floor(porFaixa[faixa] / 100) + 1;
    porFaixa[faixa] += 1;

    const r = sorteio(`disparo|${linha.aluno}|${dt}`);
    const status: StatusDisparo =
      r < 0.03 ? 'FALHA' : maisRecente && r < 0.042 ? 'ENVIANDO' : 'ENVIADO';
    const hora = HORA[faixa];
    const segundos = String((lote * 7) % 60).padStart(2, '0');

    out.push({
      dt_corte: dt,
      aluno: linha.aluno,
      chance_evasao: faixa,
      modalidade: 'PRESENCIAL',
      status,
      external_id: `evasao-${faixa}-${dt}-${hora.replace(':', '')}-${lote}`,
      enviado_em: status === 'ENVIADO' ? `${execucao}T${hora}:${segundos}-03:00` : null,
    });
  }

  memo.set(dt, out);
  return out;
}

const mockDisparos: DisparosSource = {
  disponivel: true,

  async listar(p, signal) {
    await simularLatencia(
      `disparos|${p.data ?? ''}|${(p.faixa ?? []).join(',')}|${(p.status ?? []).join(',')}|${p.pagina ?? ''}|${p.limite ?? ''}`,
      signal,
    );
    const base = mockBase();
    const faixas = validarFaixas(p.faixa);
    const pagina = inteiro('pagina', p.pagina, 1, Number.MAX_SAFE_INTEGER, 1);
    const limite = inteiro('limite', p.limite, 1, 1000, 100);
    const fila = acharFila(base, p.data);
    const status = (p.status ?? []).flatMap((s) => s.split(',')).map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (status.some((s) => !/^[A-Z_]+$/.test(s))) erro(422, 'status inválido.');

    const daFaixa = disparosDaFila(fila.dt, fila.dt === base.filas[0].dt).filter(
      (d) => !faixas || faixas.includes(d.chance_evasao),
    );

    const resumo: Record<string, number> = {};
    for (const d of daFaixa) resumo[d.status] = (resumo[d.status] ?? 0) + 1;

    const filtrados = status.length ? daFaixa.filter((d) => status.includes(d.status)) : daFaixa;

    return {
      dt_corte: fila.dt,
      fila_atualizada: fila.dt === base.esperada,
      total: filtrados.length,
      pagina,
      limite,
      resumo,
      disparos: filtrados.slice((pagina - 1) * limite, pagina * limite),
    };
  },

  async listarAluno(ra, signal) {
    await simularLatencia(`disparos|aluno|${ra}`, signal);
    const base = mockBase();
    return base.filas.flatMap((fila) => {
      const disparo = disparosDaFila(fila.dt, fila.dt === base.filas[0].dt).find((item) => item.aluno === ra);
      return disparo ? [disparo] : [];
    });
  },
};

export const disparosSource: DisparosSource =
  import.meta.env.VITE_DATA_SOURCE === 'api' ? apiDisparos : mockDisparos;
