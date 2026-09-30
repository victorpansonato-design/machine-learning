import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { emphasis, press } from '../../lib/motion';
import { decimal, int } from '../../lib/format';

/* ==========================================================================
   Plot — séries temporais e listas ordenadas
   --------------------------------------------------------------------------
   As três formas que o Cockpit precisa e que os primitivos de `Charts.tsx` não
   cobriam: linha multissérie, coluna empilhada e barra horizontal ranqueada.

   O que elas têm em comum, e por isso vivem juntas:

     · MEDEM O CONTÊINER antes de desenhar. Um SVG com viewBox esticado deforma
       a espessura do traço e desalinha o texto do eixo; medir custa um
       ResizeObserver e devolve um gráfico nítido em qualquer largura.
     · UM ÚNICO ÍNDICE DE HOVER controla guia, marcadores e tooltip. O ponteiro
       nunca precisa acertar um alvo de 3px: a faixa vertical mais próxima ganha
       o foco, que é como um gráfico denso fica utilizável com o mouse.
     · TECLADO FUNCIONA. Setas caminham pelos pontos e o tooltip acompanha. Um
       gráfico que só responde ao mouse é um gráfico que a diretoria não lê no
       projetor.
     · A ESCALA VEM SÓ DAS SÉRIES VISÍVEIS. Ocultar uma série tem de ser útil:
       esconder "Estável" (13.006) é o que permite ver "Crítico" (467) se mover.
   ========================================================================== */

/* -- Medição -------------------------------------------------------------- */

function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      // Arredonda para evitar um loop de re-render em larguras fracionárias.
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      /* Um zero transitório é DESCARTADO, e isto não é paranoia: o gráfico só
         é montado quando a largura é conhecida, então uma medição de 0 no meio
         de um reflow desmontava o <svg> e a remontagem reiniciava o desenho da
         linha do zero. O sintoma era uma curva pela metade meio segundo depois
         de trocar um filtro, e uma redesenhada completa a cada vez que a janela
         mudava de tamanho — exatamente a animação que chama atenção para si
         mesma. Manter a última largura boa mantém o elemento montado, e a linha
         apenas atualiza. */
      setWidth((prev) => (next > 0 ? next : prev));
    });
    observer.observe(node);
    setWidth(Math.round(node.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/* -- Escala --------------------------------------------------------------- */

/**
 * Ticks "redondos" acima do máximo. Um eixo terminando em 3.678 obriga a ler
 * cada rótulo; terminando em 4.000, a posição já diz o valor.
 */
function niceScale(max: number, ticks = 4): { top: number; values: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { top: 1, values: [0, 1] };
  const raw = max / ticks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalised = raw / magnitude;
  const step =
    (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10) *
    magnitude;
  const top = Math.ceil(max / step) * step;
  const values: number[] = [];
  for (let v = 0; v <= top + step * 0.001; v += step) values.push(Math.round(v * 1000) / 1000);
  return { top, values };
}

/**
 * Índices dos rótulos que cabem no eixo x, sempre incluindo o primeiro e o
 * último.
 *
 * A caminhada é DE TRÁS PARA FRENTE, ancorada no último ponto. Andar para a
 * frente e depois forçar `count - 1` no fim deixava o penúltimo rótulo a um
 * passo do último, e "19/08" imprimia colado em "20/08". O último ponto é
 * "hoje" e é o que não pode faltar, então é dele que a régua sai; o primeiro
 * entra substituindo o índice mais baixo, para não abrir a mesma colisão na
 * outra ponta.
 */
function thin(count: number, maxLabels: number): Set<number> {
  const keep = new Set<number>();
  if (count === 0) return keep;
  if (count <= maxLabels) {
    for (let i = 0; i < count; i += 1) keep.add(i);
    return keep;
  }

  const stride = Math.max(1, Math.ceil((count - 1) / (maxLabels - 1)));
  for (let i = count - 1; i >= 0; i -= stride) keep.add(i);

  const smallest = Math.min(...keep);
  if (smallest !== 0) {
    keep.delete(smallest);
    keep.add(0);
  }
  return keep;
}

/* -- Tooltip -------------------------------------------------------------- */

function Tooltip({
  x,
  containerWidth,
  title,
  rows,
  footer,
}: {
  x: number;
  containerWidth: number;
  title: string;
  rows: { key: string; label: string; value: string; color?: string; muted?: boolean }[];
  footer?: ReactNode;
}) {
  const WIDTH = 196;
  // Prende o card dentro do contêiner: um tooltip cortado na borda direita é
  // pior que um tooltip deslocado.
  const left = Math.max(4, Math.min(containerWidth - WIDTH - 4, x - WIDTH / 2));

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 2 }}
      transition={{ duration: 0.14, ease: emphasis }}
      className="pointer-events-none absolute top-1 z-20 rounded-lg bg-surface p-2.5 shadow-overlay"
      style={{ left, width: WIDTH }}
    >
      <p className="text-[11px] font-semibold text-ink">{title}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-1.5">
            {row.color && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            )}
            <span
              className={`min-w-0 flex-1 truncate text-[11px] ${row.muted ? 'text-ink-4' : 'text-ink-2'}`}
            >
              {row.label}
            </span>
            <span className="shrink-0 font-mono text-[11px] font-medium text-ink">{row.value}</span>
          </div>
        ))}
      </div>
      {footer && (
        <div className="mt-2 border-t border-hairline pt-1.5 text-[10.5px] leading-relaxed text-ink-4">
          {footer}
        </div>
      )}
    </motion.div>
  );
}

/* -- Linha multissérie ---------------------------------------------------- */

export interface PlotSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export function LineChart({
  series,
  labels,
  fullLabels,
  hidden,
  onToggleSeries,
  height = 260,
  formatValue = int,
  emptyMessage = 'Sem dados no período.',
  footnote,
}: {
  series: PlotSeries[];
  /** Rótulos curtos do eixo x, um por ponto. */
  labels: string[];
  /** Rótulos completos, usados no tooltip. */
  fullLabels: string[];
  /** Chaves ocultas. A escala do eixo y ignora o que está oculto. */
  hidden: Set<string>;
  onToggleSeries: (key: string) => void;
  height?: number;
  formatValue?: (v: number) => string;
  emptyMessage?: string;
  footnote?: ReactNode;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);

  const visible = useMemo(() => series.filter((s) => !hidden.has(s.key)), [series, hidden]);
  const count = labels.length;

  const PAD = { top: 14, right: 10, bottom: 26, left: 46 };
  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = Math.max(0, height - PAD.top - PAD.bottom);

  const scale = useMemo(() => {
    const max = visible.reduce(
      (acc, s) => Math.max(acc, s.values.reduce((m, v) => Math.max(m, v), 0)),
      0,
    );
    return niceScale(max);
  }, [visible]);

  const xAt = useCallback(
    (i: number) => (count <= 1 ? PAD.left + plotWidth / 2 : PAD.left + (i / (count - 1)) * plotWidth),
    [count, plotWidth, PAD.left],
  );
  const yAt = useCallback(
    (v: number) => PAD.top + plotHeight - (v / scale.top) * plotHeight,
    [plotHeight, scale.top, PAD.top],
  );

  const paths = useMemo(
    () =>
      visible.map((s) => ({
        key: s.key,
        color: s.color,
        d: s.values.map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i) + ',' + yAt(v)).join(' '),
      })),
    [visible, xAt, yAt],
  );

  const labelIndices = useMemo(
    () => thin(count, Math.max(2, Math.floor(plotWidth / 62))),
    [count, plotWidth],
  );

  const indexFromX = useCallback(
    (clientX: number, rect: DOMRect) => {
      if (count <= 1) return 0;
      const local = clientX - rect.left - PAD.left;
      const ratio = plotWidth > 0 ? local / plotWidth : 0;
      return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
    },
    [count, plotWidth, PAD.left],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (count === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      setHover((h) => {
        const next = (h ?? count - 1) + step;
        return Math.max(0, Math.min(count - 1, next));
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHover(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHover(count - 1);
    } else if (e.key === 'Escape') {
      setHover(null);
    }
  };

  const total = series.reduce((sum, s) => sum + s.values.reduce((a, b) => a + b, 0), 0);

  return (
    <div>
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && count > 0 && total > 0 ? (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              tabIndex={0}
              aria-label={
                'Evolução de ' +
                series.map((s) => s.label).join(', ') +
                ' em ' +
                count +
                ' pontos. Use as setas para percorrer.'
              }
              className="touch-none outline-none"
              onPointerMove={(e) =>
                setHover(indexFromX(e.clientX, e.currentTarget.getBoundingClientRect()))
              }
              onPointerLeave={() => !focused && setHover(null)}
              onFocus={() => {
                setFocused(true);
                setHover((h) => h ?? count - 1);
              }}
              onBlur={() => {
                setFocused(false);
                setHover(null);
              }}
              onKeyDown={onKeyDown}
            >
              {/* Grade: só horizontal. Linha vertical em grade é ruído — a guia
                  do hover já diz onde o ponteiro está. */}
              {scale.values.map((v) => (
                <g key={v}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={yAt(v)}
                    y2={yAt(v)}
                    stroke="var(--hairline)"
                    strokeWidth={1}
                    strokeDasharray={v === 0 ? undefined : '3 4'}
                  />
                  <text
                    x={PAD.left - 8}
                    y={yAt(v) + 3.5}
                    textAnchor="end"
                    className="fill-ink-4 font-mono text-[10px]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatValue(v)}
                  </text>
                </g>
              ))}

              {/* Guia do hover, atrás das linhas */}
              {hover !== null && (
                <line
                  x1={xAt(hover)}
                  x2={xAt(hover)}
                  y1={PAD.top}
                  y2={PAD.top + plotHeight}
                  stroke="var(--hairline-strong)"
                  strokeWidth={1}
                />
              )}

              {/* Séries */}
              {paths.map((p, i) => (
                <motion.path
                  key={p.key}
                  d={p.d}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.85, ease: emphasis, delay: i * 0.06 }}
                />
              ))}

              {/* Marcadores do ponto sob o ponteiro */}
              {hover !== null &&
                visible.map((s) => (
                  <circle
                    key={s.key}
                    cx={xAt(hover)}
                    cy={yAt(s.values[hover] ?? 0)}
                    r={3.4}
                    fill="var(--surface)"
                    stroke={s.color}
                    strokeWidth={2}
                  />
                ))}

              {/* Eixo x */}
              {labels.map((label, i) =>
                labelIndices.has(i) ? (
                  <text
                    key={i}
                    x={xAt(i)}
                    y={height - 8}
                    textAnchor={i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'}
                    className="fill-ink-4 font-mono text-[10px]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {label}
                  </text>
                ) : null,
              )}
            </svg>

            <AnimatePresence>
              {hover !== null && (
                <Tooltip
                  x={xAt(hover)}
                  containerWidth={width}
                  title={fullLabels[hover] ?? labels[hover] ?? ''}
                  rows={series.map((s) => ({
                    key: s.key,
                    label: s.label,
                    value: hidden.has(s.key) ? '—' : formatValue(s.values[hover] ?? 0),
                    color: s.color,
                    muted: hidden.has(s.key),
                  }))}
                />
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-ink-4">
            {emptyMessage}
          </div>
        )}
      </div>

      {/* Legenda: cada item liga e desliga a sua série. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5 border-t border-hairline pt-3">
        {series.map((s) => {
          const off = hidden.has(s.key);
          const last = s.values[s.values.length - 1] ?? 0;
          return (
            <motion.button
              key={s.key}
              whileTap={press}
              onClick={() => onToggleSeries(s.key)}
              aria-pressed={!off}
              title={off ? 'Mostrar ' + s.label : 'Ocultar ' + s.label}
              className={[
                'flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors',
                off ? 'opacity-45 hover:opacity-70' : 'hover:bg-surface-2',
              ].join(' ')}
            >
              <span
                className="h-1.5 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: off ? 'var(--ink-4)' : s.color }}
              />
              <span className="text-[12px] font-medium text-ink-2">{s.label}</span>
              <span className="font-mono text-[11px] text-ink-4">{formatValue(last)}</span>
            </motion.button>
          );
        })}
        {footnote && <span className="ml-auto text-[11px] text-ink-4">{footnote}</span>}
      </div>
    </div>
  );
}

/* -- Coluna empilhada ----------------------------------------------------- */

export interface StackBucket {
  label: string;
  full: string;
  segments: { key: string; label: string; value: number; color: string }[];
}

export function StackedColumns({
  buckets,
  height = 132,
  emptyMessage = 'Sem intervenções no período.',
  totalLabel = 'Total',
}: {
  buckets: StackBucket[];
  height?: number;
  emptyMessage?: string;
  totalLabel?: string;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const totals = useMemo(
    () => buckets.map((b) => b.segments.reduce((sum, s) => sum + s.value, 0)),
    [buckets],
  );
  const max = totals.reduce((m, v) => Math.max(m, v), 0);
  const labelIndices = useMemo(
    () => thin(buckets.length, Math.max(2, Math.floor(width / 44))),
    [buckets.length, width],
  );

  if (max === 0) {
    return (
      <div
        className="flex items-center justify-center text-[12px] text-ink-4"
        style={{ height: height + 22 }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative w-full">
      <div className="flex items-end gap-0.75" style={{ height }}>
        {buckets.map((bucket, i) => {
          const total = totals[i];
          const active = hover === i;
          return (
            <button
              key={i}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => setHover(i)}
              onBlur={() => setHover((h) => (h === i ? null : h))}
              aria-label={bucket.full + ': ' + int(total)}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end outline-none"
            >
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-[3px] transition-opacity"
                style={{
                  height: Math.max(2, (total / max) * height),
                  opacity: hover === null || active ? 1 : 0.45,
                }}
              >
                {bucket.segments.map((segment, s) => (
                  <motion.div
                    key={segment.key}
                    style={{ backgroundColor: segment.color }}
                    initial={{ height: 0 }}
                    animate={{
                      height: total > 0 ? (segment.value / total) * 100 + '%' : '0%',
                    }}
                    transition={{ duration: 0.6, ease: emphasis, delay: i * 0.012 + s * 0.04 }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Os rótulos ralos transbordam para as células vazias ao lado de
          propósito: com 30 barras cada célula tem 24px e "22/07" truncava em
          "22/…". Como as vizinhas estão vazias, deixar o texto sair da caixa é
          o que devolve a data inteira sem apertar as barras. */}
      <div className="mt-1.5 flex gap-0.75 border-t border-hairline pt-1.5">
        {buckets.map((bucket, i) => (
          <span
            key={i}
            className={[
              'min-w-0 flex-1 overflow-visible text-center font-mono text-[9.5px] whitespace-nowrap transition-colors',
              hover === i ? 'font-semibold text-ink-2' : 'text-ink-4',
            ].join(' ')}
          >
            {labelIndices.has(i) ? bucket.label : ''}
          </span>
        ))}
      </div>

      <AnimatePresence>
        {hover !== null && width > 0 && (
          <Tooltip
            x={((hover + 0.5) / buckets.length) * width}
            containerWidth={width}
            title={buckets[hover].full}
            rows={[
              ...buckets[hover].segments.map((s) => ({
                key: s.key,
                label: s.label,
                value: int(s.value),
                color: s.color,
              })),
              {
                key: '__total',
                label: totalLabel,
                value: int(totals[hover]),
              },
            ]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* -- Barra horizontal ranqueada ------------------------------------------- */

export interface BarRow {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
  /** Segunda linha, para o contexto que o número sozinho não dá. */
  detail?: ReactNode;
  title?: string;
}

export function BarList({
  rows,
  activeKey,
  onSelect,
  emptyMessage = 'Nenhum sinal ativo no escopo.',
}: {
  rows: BarRow[];
  activeKey?: string | null;
  onSelect?: (key: string) => void;
  emptyMessage?: string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);

  if (rows.length === 0 || max === 0) {
    return <p className="py-8 text-center text-[12px] text-ink-4">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-0.5">
      {rows.map((row, i) => {
        const active = activeKey === row.key;
        const dimmed = activeKey != null && !active;
        const Tag = onSelect ? 'button' : 'div';

        return (
          <li key={row.key}>
            <Tag
              {...(onSelect
                ? {
                    onClick: () => onSelect(row.key),
                    'aria-pressed': active,
                    title: row.title ?? 'Filtrar por ' + row.label,
                  }
                : {})}
              className={[
                'block w-full rounded-md px-2 py-2 text-left transition-colors',
                onSelect ? 'cursor-pointer hover:bg-surface-2' : '',
                active ? 'bg-surface-2' : '',
                dimmed ? 'opacity-55' : '',
              ].join(' ')}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={[
                    'min-w-0 flex-1 truncate text-[13px]',
                    active ? 'font-semibold text-ink' : 'font-medium text-ink-2',
                  ].join(' ')}
                >
                  {row.label}
                </span>
                <span className="shrink-0 font-mono text-[13px] font-medium text-ink">
                  {int(row.value)}
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] text-ink-4">
                  {decimal(row.percent, 0)}%
                </span>
              </div>

              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-track">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: row.color }}
                  initial={{ width: 0 }}
                  animate={{ width: (row.value / max) * 100 + '%' }}
                  transition={{ duration: 0.7, ease: emphasis, delay: i * 0.05 }}
                />
              </div>

              {row.detail && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-4">{row.detail}</p>
              )}
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}
