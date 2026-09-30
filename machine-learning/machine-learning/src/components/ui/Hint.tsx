import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info } from 'lucide-react';
import { popoverVariants } from '../../lib/motion';

/* ==========================================================================
   Hint — a definição e o denominador, sob demanda
   --------------------------------------------------------------------------
   O `title` nativo resolveria o hover e falharia em tudo o mais: não abre por
   teclado, não é lido de forma confiável por leitor de tela, não aceita duas
   linhas e demora meio segundo para aparecer. Numa tela cujo problema declarado
   é "taxas sem denominador visível", o controle que explica a taxa não pode ser
   o controle menos acessível da página.

   Este componente é a válvula do progressive disclosure da primeira dobra:
   nenhuma métrica ambígua fica sem definição, e nenhuma definição ocupa espaço
   permanente. Abre no hover e no foco, fecha no Escape e ao sair, e o conteúdo
   é ligado ao gatilho por `aria-describedby` — então quem navega por teclado
   ouve a explicação junto do número, não depois de procurá-la.
   ========================================================================== */

export function Hint({
  label,
  children,
  align = 'left',
  className = '',
}: {
  /** Nome do que está sendo explicado. Vai no `aria-label` do gatilho. */
  label: string;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
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

  return (
    <span
      ref={wrap}
      className={`relative inline-flex align-middle ${className}`}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Como ${label} é calculado`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="flex h-4 w-4 items-center justify-center rounded-full text-ink-4 transition-colors hover:text-ink-2"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={[
              'absolute top-6 z-40 block w-[268px] rounded-xl bg-surface p-3 text-left',
              'text-[11.5px] leading-relaxed font-normal text-ink-2 shadow-overlay',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            ].join(' ')}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * Um número com o seu denominador, na forma em que ele deve sempre aparecer.
 *
 * A regra que este componente carrega: uma taxa institucional nunca é publicada
 * sozinha. `24 ÷ 34 apurados` é auditável; `70,6%` sozinho é uma opinião com
 * uma vírgula. O símbolo de divisão fica visível de propósito — foi a ausência
 * de um separador entre contagem e percentual que produziu `2648,1%`.
 */
export function Denominator({
  numerator,
  numeratorLabel,
  denominator,
  denominatorLabel,
  className = '',
}: {
  numerator: ReactNode;
  numeratorLabel: string;
  denominator: ReactNode;
  denominatorLabel: string;
  className?: string;
}) {
  return (
    <span className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 ${className}`}>
      <span className="font-mono text-[12.5px] font-semibold text-ink tabular">{numerator}</span>
      <span className="text-[11.5px] text-ink-2">{numeratorLabel}</span>
      <span className="px-0.5 text-[12px] text-ink-4" aria-label="divididos por">
        ÷
      </span>
      <span className="font-mono text-[12.5px] font-semibold text-ink tabular">{denominator}</span>
      <span className="text-[11.5px] text-ink-2">{denominatorLabel}</span>
    </span>
  );
}
