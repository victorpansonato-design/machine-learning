import type { AlunoFila, Faixa } from '../api/types';

/* ==========================================================================
   Movimento da fila — quem entrou, quem saiu, quem continua
   --------------------------------------------------------------------------
   O tamanho das faixas é quase fixo POR REGRA (posição na fila: as 189
   primeiras são Crítica, e assim por diante), então contar alunos por faixa
   dá uma linha reta. O que muda de uma fila para a outra são AS PESSOAS.

   Tudo aqui é conta sobre as linhas de `alunos/listar` — nenhum número novo:

     entraram     estão na faixa nesta fila e não estavam na anterior
     saíram       estavam na faixa na anterior e não estão nesta
     continuaram  estão nas duas
   ========================================================================== */

/** `null` = as três faixas juntas. */
export type RecorteFaixa = Faixa | null;

export interface PassoMovimento {
  dt: string;
  anterior: string | null;
  tamanho: number;
  entraram: number;
  sairam: number;
  continuaram: number;
}

export interface Permanencia {
  ra: string;
  /** Filas seguidas na faixa, contando da mais recente para trás. */
  seguidas: number;
  /** Linha da fila mais recente. */
  linha: AlunoFila;
}

export interface Movimento {
  passos: PassoMovimento[];
  /** Alunos diferentes que passaram pela faixa no período. */
  distintos: number;
  /** Estiveram na faixa em TODAS as filas do período. */
  emTodas: number;
  /** Quem está há mais filas seguidas na faixa, até a mais recente. */
  maisTempo: Permanencia[];
}

/**
 * `filas` em ordem cronológica. A primeira é a "anterior" do período — ela
 * entra só para o primeiro passo ter com o que comparar, e não é contada.
 */
export function calcularMovimento(
  filas: { dt: string; linhas: AlunoFila[] }[],
  temAnterior: boolean,
): Movimento {
  const conjuntos = filas.map((f) => new Set(f.linhas.map((l) => l.aluno)));
  const inicio = temAnterior ? 1 : 0;

  const passos: PassoMovimento[] = [];
  for (let i = inicio; i < filas.length; i += 1) {
    const atual = conjuntos[i];
    const antes = i > 0 ? conjuntos[i - 1] : null;
    let continuaram = 0;
    if (antes) for (const ra of atual) if (antes.has(ra)) continuaram += 1;
    passos.push({
      dt: filas[i].dt,
      anterior: i > 0 ? filas[i - 1].dt : null,
      tamanho: atual.size,
      continuaram: antes ? continuaram : 0,
      entraram: antes ? atual.size - continuaram : 0,
      sairam: antes ? antes.size - continuaram : 0,
    });
  }

  const doPeriodo = conjuntos.slice(inicio);
  const distintos = new Set<string>();
  for (const c of doPeriodo) for (const ra of c) distintos.add(ra);

  let emTodas = 0;
  if (doPeriodo.length) {
    for (const ra of doPeriodo[doPeriodo.length - 1]) if (doPeriodo.every((c) => c.has(ra))) emTodas += 1;
  }

  const ultima = filas[filas.length - 1];
  const maisTempo: Permanencia[] = ultima
    ? ultima.linhas
        .map((linha) => {
          let seguidas = 0;
          for (let i = conjuntos.length - 1; i >= 0 && conjuntos[i].has(linha.aluno); i -= 1) seguidas += 1;
          return { ra: linha.aluno, seguidas, linha };
        })
        .sort((a, b) => b.seguidas - a.seguidas || a.linha.posicao - b.linha.posicao)
        .slice(0, 8)
    : [];

  return { passos, distintos: distintos.size, emTodas, maisTempo };
}
