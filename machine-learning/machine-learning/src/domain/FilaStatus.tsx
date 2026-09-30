import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pill } from '../components/ui/Badges';
import { DataList, Skeleton } from '../components/ui/Surfaces';
import { fullDate, int, shortDate } from '../lib/format';
import { popoverVariants, press } from '../lib/motion';
import { source } from '../api/source';
import { useApi } from '../api/useApi';
import { dias } from './fila';

/* ==========================================================================
   FilaStatus — "a lista de hoje já saiu?", no header
   --------------------------------------------------------------------------
   Um STATUS (ponto + palavra) lido de `fila/saude`:

     · em dia            → neutro      `Fila de 27/09 · em dia`
     · fila_atualizada=f → âmbar solid `Fila de 23/09 · 4 dias de atraso`
     · sem ultima_fila   → vermelho    `Sem fila gravada`

   Clique abre a saúde completa. É o único número do header — ele muda o que
   a pessoa faz a seguir (confiar ou não nos números da tela).
   ========================================================================== */

export function FilaStatus() {
  const saude = useApi('saude', (signal) => source.saude(signal));
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  if (saude.loading && !saude.data) return <Skeleton className="h-4 w-32" />;

  const s = saude.data;
  let pill;
  if (!s) {
    pill = (
      <Pill tone="crit" solid>
        Fila indisponível
      </Pill>
    );
  } else if (!s.ultima_fila) {
    pill = (
      <Pill tone="crit" solid>
        Sem fila gravada
      </Pill>
    );
  } else if (!s.fila_atualizada) {
    pill = (
      <Pill tone="warn" solid>
        <span className="hidden sm:inline">Fila de </span>
        {shortDate(s.ultima_fila)}
        {s.dias_de_atraso ? <span className="hidden sm:inline"> · {dias(s.dias_de_atraso)} de atraso</span> : null}
      </Pill>
    );
  } else {
    pill = (
      <Pill tone="neutral">
        <span className="hidden sm:inline">Fila de </span>
        {shortDate(s.ultima_fila)}
        <span className="hidden sm:inline"> · em dia</span>
      </Pill>
    );
  }

  return (
    <div ref={wrap} className="relative">
      <motion.button
        whileTap={press}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Saúde da fila"
        className="flex h-8 items-center rounded-full px-1.5 transition-colors hover:bg-surface-2 sm:px-2.5"
      >
        {pill}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Saúde da fila"
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute right-0 z-50 mt-2 w-[320px] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-xl bg-surface shadow-overlay"
          >
            <div className="border-b border-hairline bg-surface-2 px-4 py-2.5">
              <p className="text-[12px] font-semibold text-ink">Saúde da fila</p>
              <p className="text-[11px] text-ink-3">de fila/saude</p>
            </div>
            <div className="p-4">
              {s ? (
                <DataList
                  columns={2}
                  items={[
                    { label: 'Última fila', value: s.ultima_fila ? fullDate(s.ultima_fila) : '—' },
                    { label: 'Fila esperada', value: fullDate(s.fila_esperada) },
                    {
                      label: 'Dias de atraso',
                      value: s.dias_de_atraso === null ? '—' : int(s.dias_de_atraso),
                      tone: s.fila_atualizada ? 'plain' : 'crit',
                    },
                    { label: 'Filas gravadas', value: int(s.dias_gravados) },
                  ]}
                />
              ) : (
                <p className="text-[12px] leading-relaxed text-crit-ink">
                  {saude.error?.message ?? 'Não foi possível ler a saúde da fila.'}
                </p>
              )}
              <p className="mt-4 border-t border-hairline pt-3 text-[11.5px] leading-relaxed text-ink-3">
                O job roda segunda e quinta, ~06:30. Antes das 8h desses dias, a fila anterior ainda conta como em
                dia.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
