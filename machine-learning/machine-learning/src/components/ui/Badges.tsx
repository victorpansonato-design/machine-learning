import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { signed } from '../../lib/format';

/* ==========================================================================
   Status vocabulary
   --------------------------------------------------------------------------
   There are two kinds of small label in this app and they must not look alike:

     STATUS  — a verdict you may have to act on. Rendered as a coloured dot
               plus a word. No fill, no outline. Ten rows of tinted balloons
               with borders is a bag of sweets; ten rows of dotted words scan
               in one pass and still let a critical row jump out.

     TAG     — a fact about the record (course, code, date). Rendered as a
               quiet filled chip in ink-3. It carries no urgency, so it gets no
               colour and no dot.

   `solid` used to mean "tinted background + border". It now means "this
   verdict is the point of the row", and spends ink weight instead of fill.

   Esta é a parte GENÉRICA do `Badges.tsx` do Sucesso ao Aluno. Os badges de
   domínio de lá (Health Score, prioridade, caso, radar, coorte, modalidade)
   ficaram de fora de propósito: são réguas daquele sistema. O badge de faixa
   deste sistema mora em `domain/FaixaBadge.tsx` e é construído sobre `Pill`.
   ========================================================================== */

export type Tone = 'ok' | 'warn' | 'risk' | 'crit' | 'info' | 'neutral' | 'muted';

const DOT: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  risk: 'bg-risk',
  crit: 'bg-crit',
  info: 'bg-brand-2',
  neutral: 'bg-ink-4',
  muted: 'bg-ink-4',
};

/** Ink for an emphasised verdict. Only `crit` gets red. */
const EMPHASIS_INK: Record<Tone, string> = {
  ok: 'text-ink-2',
  warn: 'text-warn-ink',
  risk: 'text-risk-ink',
  crit: 'text-crit-ink',
  info: 'text-brand-text',
  neutral: 'text-ink-2',
  muted: 'text-ink-3',
};

export function Pill({
  tone = 'neutral',
  children,
  dot = true,
  solid = false,
  mono = false,
  className = '',
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  /** A dot makes this a status. Without it, it is a tag. */
  dot?: boolean;
  /** Emphasise the verdict: status ink instead of neutral ink. */
  solid?: boolean;
  mono?: boolean;
  className?: string;
  title?: string;
}) {
  // Status: bare dot + word, sitting directly on the surface.
  if (dot) {
    return (
      <span
        title={title}
        className={[
          'inline-flex shrink-0 items-center gap-1.5 text-[12px] whitespace-nowrap',
          solid ? `font-semibold ${EMPHASIS_INK[tone]}` : 'font-medium text-ink-2',
          mono ? 'font-mono' : '',
          className,
        ].join(' ')}
      >
        <span className={`h-1.25 w-1.25 shrink-0 rounded-full ${DOT[tone]}`} />
        {children}
      </span>
    );
  }

  // Tag: a quiet chip. Filled, never outlined.
  return (
    <span
      title={title}
      className={[
        'inline-flex shrink-0 items-center rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11px] whitespace-nowrap',
        solid ? `font-semibold ${EMPHASIS_INK[tone]}` : 'font-medium text-ink-3',
        mono ? 'font-mono' : '',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

/* -- Trend ---------------------------------------------------------------- */

export type Trend = 'up' | 'down' | 'flat';

export function TrendIndicator({
  trend,
  delta,
  className = '',
}: {
  trend: Trend;
  delta?: number;
  className?: string;
}) {
  const config = {
    up: { Icon: ArrowUpRight, color: 'text-ink-2' },
    down: { Icon: ArrowDownRight, color: 'text-crit-ink' },
    flat: { Icon: Minus, color: 'text-ink-4' },
  }[trend];

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-[11.5px] font-medium ${config.color} ${className}`}
    >
      <config.Icon className="h-3 w-3" />
      {delta !== undefined && delta !== 0 ? signed(delta) : null}
    </span>
  );
}

/* -- Avatar: initials, not stock photography ------------------------------
   Real internal tools show initials. Stock portraits of strangers standing in
   for actual students read as a mockup and, with real data, as a privacy leak.

   The tone is a step of fill, not a hue. */

const AVATAR_SIZE = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-[12px]',
  lg: 'h-12 w-12 text-[15px]',
} as const;

export function Avatar({
  initials,
  size = 'sm',
  tone = 'neutral',
  className = '',
}: {
  initials: string;
  size?: keyof typeof AVATAR_SIZE;
  /** `onBrand` é para quando o avatar já está *sobre* uma superfície azul. */
  tone?: 'neutral' | 'strong' | 'brand' | 'onBrand';
  className?: string;
}) {
  const toneClass =
    tone === 'brand'
      ? 'bg-brand text-on-brand'
      : tone === 'onBrand'
        ? 'bg-white/15 text-on-brand'
        : tone === 'strong'
          ? 'bg-surface-3 text-ink'
          : 'bg-surface-2 text-ink-2';

  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none',
        AVATAR_SIZE[size],
        toneClass,
        className,
      ].join(' ')}
    >
      {initials}
    </span>
  );
}
