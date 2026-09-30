import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { EmptyState, Row, Skeleton } from '../ui/Surfaces';
import { int } from '../../lib/format';
import { press, pressSubtle } from '../../lib/motion';
import type { ApiError } from '../../api/client';

/* ==========================================================================
   Peças da tabela operacional (DESIGN_SYSTEM §10.14, padrão "Base de Alunos")
   --------------------------------------------------------------------------
   Compostas sobre os primitivos do kit, sem alterá-los. Não é um <table> com
   bordas: é um card com linhas, barra de topo em `surface-2` e paginação no
   rodapé. Vivem aqui porque as três telas de lista usam as mesmas.
   ========================================================================== */

/** Barra de topo: contagem à esquerda, controles à direita. */
export function TableTopBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline bg-surface-2 px-4 py-2.5">
      {children}
    </div>
  );
}

/** Cabeçalho ordenável: a coluna diz o nome; a seta, o sentido. */
export function SortHeader({
  label,
  active,
  asc,
  onClick,
  className = '',
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={press}
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center justify-end gap-1 text-[11px] font-medium transition-colors',
        active ? 'text-ink' : 'text-ink-4 hover:text-ink-2',
        className,
      ].join(' ')}
    >
      {label}
      {active && (asc ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />)}
    </motion.button>
  );
}

/** Linha clicável com o feedback de toque do sistema. */
export function ClickRow({
  onClick,
  tone = 'plain',
  children,
}: {
  onClick: () => void;
  tone?: 'plain' | 'crit';
  children: ReactNode;
}) {
  return (
    <motion.div whileTap={pressSubtle}>
      <Row onClick={onClick} tone={tone} className="group">
        {children}
      </Row>
    </motion.div>
  );
}

/** Linhas de skeleton com a MESMA geometria da linha real. */
export function SkeletonRows({ rows = 8, children }: { rows?: number; children: () => ReactNode }) {
  return (
    <div className="divide-y divide-hairline" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="px-5 py-3">
          {children()}
        </div>
      ))}
    </div>
  );
}

/** Um bloco de skeleton, reexportado para as telas não importarem do kit por dois caminhos. */
export { Skeleton };

/** Paginação do servidor: primeira, última e vizinhas da atual; reticências nos saltos. */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const shown: (number | 'gap')[] = [];
  for (let p = 1; p <= pages; p += 1) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) shown.push(p);
    else if (shown[shown.length - 1] !== 'gap') shown.push('gap');
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-hairline bg-surface-2 px-4 py-2.5">
      <span className="font-mono text-[10.5px] text-ink-4">
        {int(from)}–{int(to)} de {int(total)}
      </span>
      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Paginação">
          <Button
            variant="ghost"
            size="xs"
            square
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
          />
          {shown.map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 font-mono text-[11px] text-ink-4">
                …
              </span>
            ) : (
              <motion.button
                key={p}
                whileTap={press}
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={[
                  'h-7 min-w-7 rounded-md px-2 font-mono text-[11px] font-semibold transition-colors',
                  p === page ? 'bg-brand text-on-brand' : 'bg-surface text-ink-3 hover:text-ink',
                ].join(' ')}
              >
                {p}
              </motion.button>
            ),
          )}
          <Button
            variant="ghost"
            size="xs"
            square
            aria-label="Próxima página"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
            icon={<ChevronRight className="h-3.5 w-3.5" />}
          />
        </nav>
      )}
    </div>
  );
}

/** Erro de carregamento: a mensagem da fonte, e "tentar de novo". */
export function LoadError({
  error,
  onRetry,
  compact = false,
  title = 'Não foi possível carregar',
}: {
  error: ApiError;
  onRetry?: () => void;
  compact?: boolean;
  title?: string;
}) {
  return (
    <EmptyState
      compact={compact}
      icon={<AlertTriangle className="h-5 w-5" />}
      title={title}
      message={error.message}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" icon={<RotateCw className="h-3.5 w-3.5" />} onClick={onRetry}>
            Tentar de novo
          </Button>
        )
      }
    />
  );
}
