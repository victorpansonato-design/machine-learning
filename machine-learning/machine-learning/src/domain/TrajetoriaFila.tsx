import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { AlunoFila } from '../api/types';
import { FAIXA_META, FAIXA_ORDER } from './faixas';
import { rotuloFila } from './fila';
import { int, shortDate } from '../lib/format';
import { emphasis } from '../lib/motion';

/* ==========================================================================
   TrajetoriaFila — o caminho de UM aluno pelas filas
   --------------------------------------------------------------------------
   Eixo x: as filas consultadas, da mais antiga para a mais recente. Eixo y:
   a posição na fila geral, com o TOPO (posição 1, maior risco) em cima, em
   escala por faixa (ver `y`). Ao fundo, as três zonas nos limites típicos
   publicados pelo TI; cada ponto
   leva a cor da faixa QUE A API DEVOLVEU naquela fila (a zona é só guia).
   Fila em que o aluno não apareceu = marcador vazio na raia "fora das faixas",
   e a linha se interrompe — ausência não é interpolada.

   Segue os invariantes do `Plot.tsx`: mede o contêiner, um índice de hover
   para guia e tooltip, teclado (←/→, Home/End, Esc).
   ========================================================================== */

interface Ponto {
  dt: string;
  linha: AlunoFila | null;
}

const ALTURA = 230;
const PAD = { top: 12, right: 12, bottom: 26, left: 58 };
const RAIA_FORA = 26;

export function TrajetoriaFila({
  filas,
  historico,
  dark,
}: {
  /** As filas consultadas, da mais recente para a mais antiga (como `fila/datas`). */
  filas: string[];
  historico: AlunoFila[];
  dark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new ResizeObserver((e) => {
      const next = Math.round(e[0]?.contentRect.width ?? 0);
      setWidth((prev) => (next > 0 ? next : prev));
    });
    obs.observe(node);
    setWidth(Math.round(node.getBoundingClientRect().width));
    return () => obs.disconnect();
  }, []);

  const pontos: Ponto[] = useMemo(() => {
    const porDt = new Map(historico.map((h) => [h.dt_corte, h]));
    return [...filas].reverse().map((dt) => ({ dt, linha: porDt.get(dt) ?? null }));
  }, [filas, historico]);

  // Limites típicos (cumulativos) das faixas: 189, 943, 1.886.
  const limites = FAIXA_ORDER.reduce<number[]>((acc, f) => [...acc, (acc[acc.length - 1] ?? 0) + FAIXA_META[f].tamanhoTipico], []);
  const fundo = Math.max(limites[limites.length - 1], ...historico.map((h) => h.posicao));

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = ALTURA - PAD.top - PAD.bottom - RAIA_FORA;
  const n = pontos.length;
  const x = (i: number) => (n <= 1 ? PAD.left + plotW / 2 : PAD.left + (i / (n - 1)) * plotW);
  /* Escala POR FAIXA: cada zona ganha a mesma altura, linear dentro dela.
     Linear na fila inteira, a Crítica (1–189) seria 10% da altura e o
     movimento de quem está nela sumiria. Os limites ficam marcados no eixo,
     então a régua não esconde que é por trechos. */
  const cortes = [1, ...limites.slice(0, -1).map((l) => l + 1), fundo];
  const zonaH = plotH / FAIXA_ORDER.length;
  const y = (pos: number) => {
    for (let z = 0; z < FAIXA_ORDER.length; z += 1) {
      const de = cortes[z];
      const ate = z === FAIXA_ORDER.length - 1 ? fundo : cortes[z + 1] - 1;
      if (pos <= ate || z === FAIXA_ORDER.length - 1) {
        const t = ate > de ? (Math.min(pos, ate) - de) / (ate - de) : 0;
        return PAD.top + z * zonaH + t * zonaH;
      }
    }
    return PAD.top + plotH;
  };
  const yFora = PAD.top + plotH + RAIA_FORA / 2 + 2;

  // Segmentos só entre filas CONSECUTIVAS em que ele apareceu.
  const segmentos: string[] = [];
  let atual = '';
  pontos.forEach((p, i) => {
    if (p.linha) atual += `${atual ? 'L' : 'M'}${x(i)},${y(p.linha.posicao)}`;
    else if (atual) {
      segmentos.push(atual);
      atual = '';
    }
    if (i === n - 1 && atual) segmentos.push(atual);
  });

  const rotulos = useMemo(() => {
    const max = Math.max(2, Math.floor(plotW / 64));
    const keep = new Set<number>();
    if (n <= max) for (let i = 0; i < n; i += 1) keep.add(i);
    else {
      const passo = Math.ceil((n - 1) / (max - 1));
      for (let i = n - 1; i >= 0; i -= passo) keep.add(i);
      const menor = Math.min(...keep);
      if (menor !== 0) {
        keep.delete(menor);
        keep.add(0);
      }
    }
    return keep;
  }, [n, plotW]);

  const onKey = (e: KeyboardEvent) => {
    if (!n) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      setHover((h) => Math.max(0, Math.min(n - 1, (h ?? n - 1) + d)));
    } else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(n - 1);
    else if (e.key === 'Escape') setHover(null);
  };

  const presentes = historico.length;
  const h = hover !== null ? pontos[hover] : null;

  return (
    <div>
      <div ref={ref} className="relative w-full" style={{ height: ALTURA }}>
        {width > 0 && n > 0 && (
          <svg
            width={width}
            height={ALTURA}
            role="img"
            tabIndex={0}
            aria-label={`Posição do aluno na fila geral em ${n} filas; apareceu em ${presentes}. Use as setas para percorrer.`}
            className="touch-none outline-none"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const local = e.clientX - r.left - PAD.left;
              setHover(n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((local / plotW) * (n - 1)))));
            }}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover((v) => v ?? n - 1)}
            onBlur={() => setHover(null)}
            onKeyDown={onKey}
          >
            {/* Zonas das faixas (limites típicos) */}
            {FAIXA_ORDER.map((f, i) => {
              const de = i === 0 ? 1 : limites[i - 1] + 1;
              const y0 = PAD.top + i * zonaH;
              const y1 = PAD.top + (i + 1) * zonaH;
              return (
                <g key={f}>
                  <rect
                    x={PAD.left}
                    y={y0}
                    width={plotW}
                    height={Math.max(1, y1 - y0)}
                    fill={FAIXA_META[f].hex(dark)}
                    opacity={dark ? 0.1 : 0.07}
                  />
                  <text x={PAD.left + plotW - 6} y={y1 - 6} textAnchor="end" className="fill-ink-4 text-[10px]">
                    {FAIXA_META[f].label}
                  </text>
                  <text
                    x={PAD.left - 8}
                    y={y0 + 3.5}
                    textAnchor="end"
                    className="fill-ink-4 font-mono text-[10px]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    #{int(de)}
                  </text>
                </g>
              );
            })}
            <text
              x={PAD.left - 8}
              y={PAD.top + plotH + 3.5}
              textAnchor="end"
              className="fill-ink-4 font-mono text-[10px]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              #{int(fundo)}
            </text>
            {/* Raia "fora das faixas" */}
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={yFora}
              y2={yFora}
              stroke="var(--hairline)"
              strokeDasharray="3 4"
            />
            <text x={PAD.left - 8} y={yFora + 3.5} textAnchor="end" className="fill-ink-4 text-[10px]">
              fora
            </text>

            {hover !== null && (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={yFora + 6}
                stroke="var(--hairline-strong)"
              />
            )}

            {segmentos.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                fill="none"
                stroke="var(--ink-3)"
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.85, ease: emphasis }}
              />
            ))}

            {pontos.map((p, i) =>
              p.linha ? (
                <circle
                  key={p.dt}
                  cx={x(i)}
                  cy={y(p.linha.posicao)}
                  r={hover === i ? 4.6 : 3.2}
                  fill={FAIXA_META[p.linha.chance_evasao].hex(dark)}
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                />
              ) : (
                <circle
                  key={p.dt}
                  cx={x(i)}
                  cy={yFora}
                  r={hover === i ? 3.6 : 2.4}
                  fill="var(--surface)"
                  stroke="var(--ink-4)"
                  strokeWidth={1.2}
                />
              ),
            )}

            {pontos.map((p, i) =>
              rotulos.has(i) ? (
                <text
                  key={`l-${p.dt}`}
                  x={x(i)}
                  y={ALTURA - 8}
                  textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                  className="fill-ink-4 font-mono text-[10px]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {shortDate(p.dt)}
                </text>
              ) : null,
            )}
          </svg>
        )}

        <AnimatePresence>
          {h && hover !== null && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              transition={{ duration: 0.14, ease: emphasis }}
              className="pointer-events-none absolute top-1 z-20 w-[200px] rounded-lg bg-surface p-2.5 shadow-overlay"
              style={{ left: Math.max(4, Math.min(width - 204, x(hover) - 100)) }}
            >
              <p className="text-[11px] font-semibold text-ink">Fila de {rotuloFila(h.dt)}</p>
              {h.linha ? (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: FAIXA_META[h.linha.chance_evasao].hex(dark) }}
                  />
                  <span className="flex-1">{FAIXA_META[h.linha.chance_evasao].label}</span>
                  <span className="font-mono font-medium text-ink">#{int(h.linha.posicao)}</span>
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-ink-3">Fora das faixas nesta fila</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-hairline pt-3">
        {FAIXA_ORDER.map((f) => (
          <span key={f} className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FAIXA_META[f].hex(dark) }} />
            {FAIXA_META[f].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
          <span className="h-2 w-2 rounded-full border border-ink-4" />
          Fora das faixas
        </span>
        <span className="ml-auto text-[11px] text-ink-4">
          Topo = posição 1 (maior risco). Uma zona por faixa, nos limites típicos do TI.
        </span>
      </div>
    </div>
  );
}
