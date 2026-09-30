import { useEffect, useState } from 'react';
import type { AlunoFila, Faixa } from './types';
import { source } from './source';
import { isAbort, toApiError } from './client';
import type { ApiError } from './client';

/* ==========================================================================
   useFilas — as linhas completas de várias filas, para o movimento
   --------------------------------------------------------------------------
   O movimento (quem entrou, saiu, continuou) precisa das PESSOAS de cada
   fila, e só `alunos/listar` as devolve. Uma faixa cabe numa página de 1.000
   (a maior, Média, tem ~943), então é UMA chamada por fila; "as três juntas"
   são duas. As chamadas saem em paralelo, com teto de concorrência, e cada
   fila fica em cache: trocar de período reaproveita o que já veio.
   ========================================================================== */

const CONCORRENCIA = 8;
const TTL = 5 * 60_000;
const cache = new Map<string, { linhas: AlunoFila[]; at: number }>();

export interface FilaCompleta {
  dt: string;
  linhas: AlunoFila[];
}

export async function carregarFila(dt: string, faixa: Faixa | null, signal?: AbortSignal): Promise<AlunoFila[]> {
  const chave = `${dt}|${faixa ?? 'todas'}`;
  const hit = cache.get(chave);
  if (hit && Date.now() - hit.at < TTL) return hit.linhas;

  const linhas: AlunoFila[] = [];
  for (let pagina = 1; ; pagina += 1) {
    const r = await source.listar({ data: dt, faixa: faixa ? [faixa] : undefined, pagina, limite: 1000 }, signal);
    linhas.push(...r.alunos);
    if (linhas.length >= r.total || r.alunos.length === 0) break;
  }
  cache.set(chave, { linhas, at: Date.now() });
  return linhas;
}

/** Várias filas em paralelo (teto de `CONCORRENCIA`), na ordem de `dts`. */
export async function carregarFilas(
  dts: string[],
  faixa: Faixa | null,
  signal?: AbortSignal,
  onProgress?: (feitas: number) => void,
): Promise<FilaCompleta[]> {
  const resultado: AlunoFila[][] = new Array(dts.length);
  let proxima = 0;
  let feitas = 0;
  const trabalhador = async () => {
    while (proxima < dts.length) {
      const i = proxima;
      proxima += 1;
      resultado[i] = await carregarFila(dts[i], faixa, signal);
      feitas += 1;
      onProgress?.(feitas);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, dts.length) }, trabalhador));
  return dts.map((dt, i) => ({ dt, linhas: resultado[i] }));
}

export interface FilasState {
  filas: FilaCompleta[] | null;
  carregadas: number;
  total: number;
  error: ApiError | null;
}

export function useFilas(dts: string[], faixa: Faixa | null): FilasState {
  // `chave` resume `dts` e `faixa`: é a única dependência do efeito.
  const chave = `${faixa ?? 'todas'}|${dts.join(',')}`;
  const [state, setState] = useState<FilasState & { chave: string }>({
    chave: '',
    filas: null,
    carregadas: 0,
    total: 0,
    error: null,
  });

  useEffect(() => {
    const lista = chave.split('|')[1] ? chave.split('|')[1].split(',') : [];
    const recorte = chave.split('|')[0] === 'todas' ? null : (chave.split('|')[0] as Faixa);
    if (lista.length === 0) {
      setState({ chave, filas: [], carregadas: 0, total: 0, error: null });
      return;
    }
    const controller = new AbortController();
    setState({ chave, filas: null, carregadas: 0, total: lista.length, error: null });

    carregarFilas(lista, recorte, controller.signal, (feitas) => {
      if (!controller.signal.aborted) setState((s) => (s.chave === chave ? { ...s, carregadas: feitas } : s));
    }).then(
      (filas) => {
        if (!controller.signal.aborted) {
          setState({ chave, filas, carregadas: lista.length, total: lista.length, error: null });
        }
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbort(err)) return;
        setState((s) => ({ ...s, chave, filas: null, error: toApiError(err) }));
      },
    );

    return () => controller.abort();
  }, [chave]);

  if (state.chave !== chave) return { filas: null, carregadas: 0, total: dts.length, error: null };
  return state;
}
