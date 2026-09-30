import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Drawer } from './Overlay';
import { Button } from './Button';
import { MeterBar } from './Charts';
import { RevealGroup, RevealItem } from './Reveal';
import { decimal, int, percent } from '../../lib/format';

/* ==========================================================================
   MetricSheet — o aprofundamento que não sai da aba
   --------------------------------------------------------------------------
   Dashboard e Indicadores tinham o mesmo defeito e ele não era visual: quase
   todo elemento clicável levava para outra rota — Fila de Atendimento,
   Radares, Base de Alunos, Governança. Era um erro de PÚBLICO. Quem lê essas
   duas telas é a gestão e a diretoria; a Fila é a ferramenta do atendente.
   Despachar um diretor para a fila operacional para explicar por que o alto
   risco subiu é responder "abra o sistema" a quem perguntou "como estamos".

   Este componente é a forma canônica do aprofundamento nas duas telas, e ele é
   só a APRESENTAÇÃO: cada tela monta o seu conteúdo a partir do modelo que já
   calculou, o que torna impossível o detalhe discordar do cartão que o abriu —
   o defeito clássico de quem vai buscar o dado de novo, por outro caminho, com
   outro arredondamento.

   Todo painel responde três perguntas na mesma ordem, e a ordem é a regra:

     1. Qual é a medida, e sobre qual denominador?
     2. Do que ela é feita? (a composição, com barra e percentual)
     3. O que ela significa? (a leitura, em uma frase, sem eufemismo)

   Nenhum painel oferece ação de atendimento, porque nenhuma pertence a estas
   telas. O que ele oferece é entendimento — e o caminho de volta.
   ========================================================================== */

export interface MetricRow {
  key: string;
  label: string;
  value: number;
  /** 0–100. Já calculado por quem monta, para o painel não repetir a divisão. */
  percent: number;
  color: string;
  meaning?: string;
  /** Escreve o valor com casas decimais e sufixo, em vez de contagem. */
  suffix?: string;
  decimals?: number;
}

export interface MetricSheetContent {
  eyebrow: string;
  title: string;
  /** O número protagonista, já formatado. */
  value: string;
  /** O denominador, por extenso. Obrigatório: medida sem denominador não sai. */
  denominator: ReactNode;
  rowsLabel: string;
  rows: MetricRow[];
  /** Mensagem quando a composição não tem linhas — nunca uma lista vazia. */
  emptyRows?: string;
  reading: ReactNode;
}

export function MetricSheet({
  content,
  onClose,
}: {
  /** `null` fecha a folha. O conteúdo e a abertura são o mesmo estado. */
  content: MetricSheetContent | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={Boolean(content)}
      onClose={onClose}
      width="md"
      label={content?.title ?? 'Detalhe do indicador'}
    >
      {content && (
        <>
          <header className="flex items-start justify-between gap-4 border-b border-hairline p-5">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-ink-3">{content.eyebrow}</p>
              <h2 className="mt-1 text-[19px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                {content.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhe"
              className="-m-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-5">
            <p className="font-mono text-[42px] leading-none font-medium tracking-tight text-ink tabular">
              {content.value}
            </p>
            <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">{content.denominator}</p>

            <section className="mt-6">
              <h3 className="border-b border-hairline pb-2 text-[12px] font-semibold text-ink-3">
                {content.rowsLabel}
              </h3>

              {content.rows.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-ink-4">
                  {content.emptyRows ?? 'Sem composição no recorte.'}
                </p>
              ) : (
                <RevealGroup as="ul" className="mt-3 space-y-3.5">
                  {content.rows.map((row) => (
                    <RevealItem as="li" key={row.key} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-[12.5px] font-medium text-ink-2">
                          {row.label}
                        </span>
                        <span className="flex shrink-0 items-center">
                          <span className="w-16 text-right font-mono text-[12.5px] font-semibold text-ink tabular">
                            {row.decimals
                              ? `${decimal(row.value, row.decimals)}${row.suffix ?? ''}`
                              : int(row.value)}
                          </span>
                          <span className="mx-2.5 h-3.5 w-px bg-hairline" aria-hidden="true" />
                          <span className="w-14 text-right font-mono text-[11.5px] text-ink-3 tabular">
                            {percent(row.percent, 1)}
                          </span>
                        </span>
                      </div>
                      <MeterBar value={row.percent} color={row.color} height={5} />
                      {row.meaning && (
                        <p className="text-[11px] leading-relaxed text-ink-4">{row.meaning}</p>
                      )}
                    </RevealItem>
                  ))}
                </RevealGroup>
              )}
            </section>

            <section className="mt-6 rounded-xl bg-surface-2 p-4">
              <h3 className="text-[12px] font-semibold text-ink-3">Como ler</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{content.reading}</p>
            </section>
          </div>

          <footer className="border-t border-hairline p-4">
            <Button variant="secondary" size="md" onClick={onClose} className="w-full">
              Voltar ao painel
            </Button>
          </footer>
        </>
      )}
    </Drawer>
  );
}
