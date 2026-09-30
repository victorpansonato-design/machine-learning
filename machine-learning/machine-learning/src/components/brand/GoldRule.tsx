import type { ReactNode } from 'react';

/* ==========================================================================
   GoldRule — o traço amarelo sob um título (ver `src/brand.css`)
   ========================================================================== */

export function GoldRule({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block h-0.75 w-10 rounded-full bg-[var(--brand-gold)] ${className}`} />;
}

/**
 * A descrição de um `PageHeader` com o traço entre o título e o texto. Mora
 * dentro do `<p>` do primitivo, então é feita só de `span`.
 */
export function DescricaoPagina({ children }: { children: ReactNode }) {
  return (
    <>
      <GoldRule className="mt-1 mb-3" />
      <span>{children}</span>
    </>
  );
}
