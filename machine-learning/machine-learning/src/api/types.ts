/* ==========================================================================
   Contrato da API de risco de evasão — Graduação Presencial
   --------------------------------------------------------------------------
   Transcrição 1:1 de `components.schemas` da especificação OpenAPI publicada
   pelo TI em `…/api_evasao_grad_presencial/api/openapi` (baixada em
   29/09/2026, cópia em `docs/api/openapi.json`).

   REGRA: este arquivo não inventa campo. Se a API mudar, a mudança nasce na
   especificação do TI e é copiada para cá — nunca o contrário. Campo que a tela
   "gostaria de ter" (nome do aluno, telefone, motivo) não entra aqui: a API não
   devolve, e o front não fabrica.
   ========================================================================== */

/** As três faixas que o job grava. Aluno fora delas não está na tabela. */
export type Faixa = 'CRITICA' | 'ALTA' | 'MEDIA';

export const FAIXAS: readonly Faixa[] = ['CRITICA', 'ALTA', 'MEDIA'] as const;

/** Uma linha da fila (schema `Aluno`). */
export interface AlunoFila {
  /** DT_CORTE, `AAAA-MM-DD`. */
  dt_corte: string;
  /** Posição na fila do dia (1 = maior risco), contando TODOS os cursos. */
  posicao: number;
  /** RA, como o Lyceum grava (com zero à esquerda). */
  aluno: string;
  chance_evasao: Faixa;
  curso: string | null;
  nome_curso: string | null;
}

/** `GET alunos/listar` (schema `PaginaAlunos`). */
export interface PaginaAlunos {
  dt_corte: string;
  /** false = não é a fila mais recente esperada (job atrasado ou data antiga pedida). */
  fila_atualizada: boolean;
  /** Quantos atendem o filtro, sem paginação. */
  total: number;
  pagina: number;
  limite: number;
  alunos: AlunoFila[];
}

/** `GET alunos/consultar?ra=` (schema `HistoricoAluno`). */
export interface HistoricoAluno {
  aluno: string;
  /** Situação ATUAL no Lyceum (Ativo, Cancelado…) — pode ter mudado depois da fila. */
  sit_aluno: string | null;
  curso: string | null;
  nome_curso: string | null;
  ultima_fila: string;
  fila_atualizada: boolean;
  /** null = fora das faixas na fila mais recente. */
  faixa_ultima_fila: Faixa | null;
  /** O resultado em uma frase — pronta para mostrar. */
  leitura: string;
  /** Filas recentes em que apareceu, da mais recente para a mais antiga. */
  historico: AlunoFila[];
}

/** `GET fila/resumo` — um item por curso (schema `ResumoCurso`). */
export interface ResumoCurso {
  curso: string | null;
  nome_curso: string | null;
  critica: number;
  alta: number;
  media: number;
  total: number;
}

/** `GET fila/datas` — uma fila gravada (schema `DataCorte`). */
export interface DataCorte {
  dt_corte: string;
  critica: number;
  alta: number;
  media: number;
  total: number;
}

/** `GET fila/saude` (schema `Saude`). */
export interface Saude {
  status: string;
  ultima_fila: string | null;
  fila_esperada: string;
  fila_atualizada: boolean;
  dias_de_atraso: number | null;
  dias_gravados: number;
}

/** Todo erro da API (schema `Erro`). */
export interface ErroApi {
  error: string;
}

/* -- Parâmetros ------------------------------------------------------------ */

export interface ListarParams {
  /** Código (`258`) ou trecho do nome (`engenharia`); acento e maiúscula não importam. */
  curso?: string;
  faixa?: Faixa[];
  /** `AAAA-MM-DD`. Sem ela, a fila mais recente. */
  data?: string;
  /** ≥ 1, padrão 1. */
  pagina?: number;
  /** 1–1000, padrão 100. */
  limite?: number;
}

export interface ConsultarParams {
  ra: string;
  /** Quantas filas mais recentes olhar no histórico. 1–366, padrão 30. */
  dias?: number;
}

export interface ResumoParams {
  curso?: string;
  data?: string;
}

export interface DatasParams {
  /** 1–366, padrão 60. */
  limite?: number;
}
