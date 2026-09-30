/* ==========================================================================
   O modelo de um relatório — a planilha e o PDF saem do MESMO objeto
   --------------------------------------------------------------------------
   Cada tela monta um `Relatorio` (números, seções, notas) a partir da API.
   `xlsx.ts` o escreve como planilha; `RelatorioView` o desenha como folha A4
   para imprimir ou salvar em PDF. Um modelo, dois formatos: é o que impede o
   Excel de discordar do PDF.

   As células guardam o valor CRU (número, data ISO, código de faixa); quem
   formata é cada saída — a planilha grava número como número e data como data,
   para a pessoa poder somar e filtrar.
   ========================================================================== */

export type TipoColuna =
  | 'texto'
  | 'mono' // RA, código: texto que alinha em coluna
  | 'numero'
  | 'posicao' // número exibido como #11
  | 'percent' // fração 0–1
  | 'data' // AAAA-MM-DD
  | 'datahora' // instante ISO
  | 'faixa' // CRITICA | ALTA | MEDIA | null
  | 'status'; // status de envio

export interface Coluna {
  rotulo: string;
  tipo: TipoColuna;
  /** Texto longo que pode quebrar linha (nome de curso). */
  longo?: boolean;
}

export type Celula = string | number | null;

export interface Secao {
  /** Nome da aba na planilha (≤ 31 caracteres). */
  aba: string;
  titulo: string;
  descricao?: string;
  colunas: Coluna[];
  linhas: Celula[][];
  /** Linha de totais, alinhada às colunas. */
  totais?: Celula[];
  /** Mensagem quando não há linhas. */
  vazio?: string;
}

export interface Indicador {
  rotulo: string;
  valor: string;
  detalhe?: string;
  /** Pigmento do número (hex de FAIXA_META no claro), quando carrega veredito. */
  cor?: string;
}

export interface Relatorio {
  /** "Monitoramento da fila" */
  titulo: string;
  /** "Relatório de monitoramento" — o canto superior direito da folha. */
  tipoLabel: string;
  /** O recorte em palavras: fila, período, filtros. */
  subtitulo: string;
  /** Nome de arquivo, sem extensão. */
  arquivo: string;
  indicadores: Indicador[];
  secoes: Secao[];
  /** Rodapé: fonte do dado, avisos. */
  notas: string[];
  ficticio: boolean;
  geradoEm: Date;
  geradoPor: string;
}
