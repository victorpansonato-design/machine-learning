import type { Faixa } from '../api/types';
import type { Tone } from '../components/ui/Badges';

/* ==========================================================================
   As faixas de chance de evasão
   --------------------------------------------------------------------------
   TUDO o que é número aqui foi publicado pelo TI (docs/api/README_API.md e
   COMO_USAR.md). Nada é régua nossa. O que é deste arquivo é só a APARÊNCIA:
   rótulo em português, tom da escala de status e cor de gráfico.

   A faixa é definida pela POSIÇÃO na fila do dia, não por probabilidade — o
   modelo não é calibrado. Por isso a interface nunca mostra "% de chance" por
   aluno: ela mostra a faixa e a posição.

   A cor segue a escala ordinal do design system — âmbar → laranja → vermelho,
   um vermelho só, no fim — e é a mesma no badge, na barra e no gráfico. Uma
   faixa que fosse vermelha na tabela e azul no gráfico ao lado seriam dois
   alfabetos para uma palavra.
   ========================================================================== */

export interface FaixaMeta {
  faixa: Faixa;
  /** Como aparece na tela. */
  label: string;
  /** Tom do `Pill` (ponto + palavra). */
  tone: Tone;
  /** Quem entra, nas palavras do TI. */
  regra: string;
  /** Tamanho típico publicado pelo TI (base de 9.429). */
  tamanhoTipico: number;
  /** Quantos evadem de fato, medido pelo TI na coorte 2025/2. */
  evadem: string;
  /** Pigmento para SVG e barras. `<svg>` animado não resolve `var()` em todo contexto. */
  hex: (dark: boolean) => string;
}

export const FAIXA_META: Record<Faixa, FaixaMeta> = {
  CRITICA: {
    faixa: 'CRITICA',
    label: 'Crítica',
    tone: 'crit',
    regra: '20% do topo da ALTA (≈ 2% da base)',
    tamanhoTipico: 189,
    evadem: '~4 em cada 10',
    hex: (d) => (d ? '#e0554b' : '#b42318'),
  },
  ALTA: {
    faixa: 'ALTA',
    label: 'Alta',
    tone: 'risk',
    regra: 'resto dos 10% do topo',
    tamanhoTipico: 754,
    evadem: '~1 em cada 4',
    hex: (d) => (d ? '#f0844a' : '#ea580c'),
  },
  MEDIA: {
    faixa: 'MEDIA',
    label: 'Média',
    tone: 'warn',
    regra: 'de 10% a 20% da base',
    tamanhoTipico: 943,
    evadem: '~1 em cada 6',
    hex: (d) => (d ? '#e0b341' : '#ca8a04'),
  },
};

/** Ordem de leitura: do mais urgente para o menos. */
export const FAIXA_ORDER: readonly Faixa[] = ['CRITICA', 'ALTA', 'MEDIA'] as const;

/** Números de referência publicados pelo TI. Usar só como contexto, nunca como meta. */
export const REFERENCIA_TI = {
  /** Alunos pontuados pelo job. */
  base: 9429,
  /** Evasão média da base, em %. */
  evasaoMediaBase: 8.2,
  /** Onde a taxa por faixa foi medida. */
  coorte: '2025/2',
  /** Dias em que o job roda (ISO: 1 = segunda … 7 = domingo). */
  diasDoJob: [1, 4],
  /** Horário aproximado de execução. */
  horaDoJob: '06:30',
} as const;

/**
 * O texto que acompanha "não está na fila". Não é "sem risco": é "não está
 * entre os 20% de maior risco, ou não é da graduação presencial". Regra 3 do
 * COMO_USAR para quem consome a API.
 */
export const FORA_DAS_FAIXAS =
  'Fora das faixas: não está entre os ~20% de maior risco na fila (ou não é da graduação presencial).';

/** Aviso que acompanha toda tela que mostra faixa de um aluno. */
export const AVISO_FAIXA =
  'A faixa é uma estimativa de risco, não uma certeza — a maioria dos alunos da Crítica não evade. Uso interno da equipe para oferecer apoio; nunca comunicar ao aluno.';
