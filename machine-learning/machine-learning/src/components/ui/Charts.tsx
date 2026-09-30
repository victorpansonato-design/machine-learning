import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { emphasis } from '../../lib/motion';
import { int } from '../../lib/format';
import { useReducedMotion } from '../../lib/reactive';

/* ==========================================================================
   Data visualisation
   --------------------------------------------------------------------------
   Charts here obey three rules:
     1. A chart must answer a question the number alone cannot. Otherwise it is
        a number, and we render a number.
     2. Colour encodes the status scale (estável → crítico) and nothing else.
        No categorical rainbow, because every series in this app is ordinal.
     3. Axes, labels and values live in the mono face with tabular figures, so
        values line up down the column and can be compared by eye.
   ========================================================================== */

/* -- Animated counter ----------------------------------------------------- */

export function AnimatedNumber({
  value,
  duration = 620,
  format = true,
  decimals = 0,
  resetOnChange = false,
  countUp = true,
}: {
  value: number;
  duration?: number;
  format?: boolean;
  decimals?: number;
  /** Recount from zero on every change instead of tweening from the last
   *  shown value — for counters where each update should read as a fresh
   *  count-up (e.g. the donut re-scoping to a new filter), not a drift. */
  resetOnChange?: boolean;
  /**
   * `false` renders the value with no count-up at all.
   *
   * A contagem a partir do zero é honesta para VOLUME — "41 intervenções"
   * realmente foi de 0 a 41 ao longo do dia. Para um ÍNDICE limitado (um Health
   * Score de 0 a 100, uma taxa) ela mente por um instante: durante os primeiros
   * quadros a tela exibe `0`, e `Health Score médio 0/100` é uma frase que
   * alguém pode fotografar, imprimir ou simplesmente acreditar. Índice não
   * conta: ele preenche. Quem mostra um índice passa `countUp={false}` e anima
   * o calibre, não os dígitos.
   */
  countUp?: boolean;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const firstRun = useRef(true);

  useEffect(() => {
    // Count up from zero on mount, then tween between values on updates so a
    // score changing 78 → 86 reads as movement rather than a jump cut.
    const animate = countUp && !reduced;
    const from = animate ? (firstRun.current || resetOnChange ? 0 : fromRef.current) : value;
    firstRun.current = false;
    fromRef.current = value;

    if (from === value) {
      setShown(value);
      return;
    }

    let raf = 0;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else setShown(value);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, countUp, reduced, resetOnChange]);

  const text =
    decimals > 0
      ? shown.toFixed(decimals).replace('.', ',')
      : format
        ? int(shown)
        : String(Math.round(shown));

  return <span className="tabular">{text}</span>;
}

/* -- Score ring ----------------------------------------------------------- */

export function ScoreRing({
  score,
  size = 132,
  thickness = 9,
  color,
  label,
  sublabel,
  children,
}: {
  score: number;
  size?: number;
  thickness?: number;
  /** Any CSS colour; callers pass the status token for this score. */
  color: string;
  label?: string;
  sublabel?: string;
  children?: ReactNode;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={thickness}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 1.1, ease: emphasis }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <span
              className="font-mono leading-none font-medium"
              style={{ fontSize: size * 0.28, color }}
            >
              <AnimatedNumber value={score} format={false} />
            </span>
            {label && (
              <span className="mt-1 text-[11px] font-medium text-ink-4">
                {label}
              </span>
            )}
            {sublabel && <span className="mt-0.5 text-[11px] font-semibold text-ink-2">{sublabel}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/* -- Donut with interactive segments -------------------------------------- */

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  size = 168,
  thickness = 20,
  centerValue,
  centerLabel,
  centerScale = 'md',
  activeKey,
  onSegmentClick,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerValue: number;
  centerLabel: string;
  /** `sm` para os donuts pequenos, onde 30px de número estoura o furo. */
  centerScale?: 'sm' | 'md';
  activeKey?: string | null;
  onSegmentClick?: (key: string) => void;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  const arcs = useMemo(() => {
    let offset = 0;
    return segments.map((s) => {
      const fraction = s.value / total;
      const arc = { ...s, dash: fraction * circumference, offset: -offset * circumference };
      offset += fraction;
      return arc;
    });
  }, [segments, total, circumference]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={thickness}
        />
        {arcs.map((arc, i) => {
          const dimmed = activeKey != null && activeKey !== arc.key;
          return (
            <motion.circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={activeKey === arc.key ? thickness + 4 : thickness}
              strokeDasharray={`${arc.dash} ${circumference}`}
              strokeDashoffset={arc.offset}
              initial={{ opacity: 0, strokeDasharray: `0 ${circumference}` }}
              animate={{
                opacity: dimmed ? 0.24 : 1,
                strokeDasharray: `${arc.dash} ${circumference}`,
              }}
              transition={{ duration: 0.9, ease: emphasis, delay: i * 0.07 }}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
              onClick={() => onSegmentClick?.(arc.key)}
            >
              {/* Tooltip nativo: a fatia isolada não diz o que é, e o SVG é
                  girado −90°, o que torna um tooltip próprio caro por nada. */}
              <title>{`${arc.label}: ${int(arc.value)} (${((arc.value / total) * 100).toFixed(1)}%)`}</title>
            </motion.circle>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span
          className={[
            'font-mono leading-none font-medium tracking-tight text-ink',
            centerScale === 'sm' ? 'text-[21px]' : 'text-[30px]',
          ].join(' ')}
        >
          <AnimatedNumber value={centerValue} duration={520} resetOnChange />
        </span>
        <span
          className={[
            'font-medium text-ink-4',
            centerScale === 'sm' ? 'mt-0.5 text-[10px]' : 'mt-1 text-[11px]',
          ].join(' ')}
        >
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

/* -- Horizontal bar ------------------------------------------------------- */

export function MeterBar({
  value,
  max = 100,
  color = 'var(--brand)',
  height = 6,
  delay = 0,
  track = 'var(--track)',
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  delay?: number;
  track?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ height, backgroundColor: track }}
      role="presentation"
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: emphasis, delay }}
      />
    </div>
  );
}

/* -- Stacked bar (a full distribution inside one row) --------------------- */

export function StackedBar({
  segments,
  height = 8,
}: {
  segments: { key: string; value: number; color: string; label: string }[];
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex w-full overflow-hidden rounded-full" style={{ height }}>
      {segments.map((s, i) => (
        <motion.div
          key={s.key}
          title={`${s.label}: ${int(s.value)}`}
          style={{ backgroundColor: s.color }}
          initial={{ width: 0 }}
          animate={{ width: `${(s.value / total) * 100}%` }}
          transition={{ duration: 0.7, ease: emphasis, delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}

/* -- Sparkline ------------------------------------------------------------ */

export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = 'var(--brand-2)',
  showArea = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}) {
  if (data.length < 2) return <div style={{ width, height }} />;

  const max = Math.max(...data, 1);
  const stepX = width / (data.length - 1);
  const y = (v: number) => height - 2 - (v / max) * (height - 4);
  const points = data.map((v, i) => `${i * stepX},${y(v)}`).join(' ');
  const areaPath = `M 0,${height} L ${points.split(' ').join('L')} L ${width},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      {showArea && <path d={areaPath} fill={color} opacity={0.12} />}
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: emphasis }}
      />
      <circle cx={width} cy={y(data[data.length - 1])} r={2.2} fill={color} />
    </svg>
  );
}

/* -- Column chart with axis ---------------------------------------------- */

export function ColumnChart({
  data,
  height = 148,
  formatValue = (v: number) => int(v),
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="font-mono text-[11px] font-medium text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">
              {formatValue(d.value)}
            </span>
            <motion.div
              className="w-full rounded-t-[3px]"
              style={{ backgroundColor: d.color ?? 'var(--brand-2)' }}
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * (height - 22)}px` }}
              transition={{ duration: 0.7, ease: emphasis, delay: i * 0.04 }}
              title={`${d.label}: ${formatValue(d.value)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 border-t border-hairline pt-1.5">
        {data.map((d) => (
          <span
            key={d.label}
            className="min-w-0 flex-1 truncate text-center font-mono text-[9.5px] font-semibold text-ink-4"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -- Heatmap cell -------------------------------------------------------- */

/**
 * Sequential ramp for the risk heatmap: transparent brand-blue through to
 * crit. Deliberately not a rainbow — the variable is ordinal, so the encoding
 * must be too.
 */
export function heatColor(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio));
  if (t < 0.25) return `color-mix(in oklab, var(--ok) ${t * 4 * 45}%, var(--surface-2))`;
  if (t < 0.5) return `color-mix(in oklab, var(--warn) ${(t - 0.25) * 4 * 55 + 20}%, var(--surface-2))`;
  if (t < 0.75) return `color-mix(in oklab, var(--risk) ${(t - 0.5) * 4 * 60 + 25}%, var(--surface-2))`;
  return `color-mix(in oklab, var(--crit) ${(t - 0.75) * 4 * 60 + 35}%, var(--surface-2))`;
}
