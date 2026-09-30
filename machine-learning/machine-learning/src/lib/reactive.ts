import { useEffect, useState } from 'react';

/* ==========================================================================
   Reduced motion em JavaScript
   --------------------------------------------------------------------------
   A camada base do CSS já zera `animation-duration` e `transition-duration`
   quando o sistema pede menos movimento. O que ela não alcança é o que não é
   CSS: o count-up dos números (roda em `requestAnimationFrame`) e as entradas
   por rolagem do Motion. Esses leem este hook.

   Versão enxuta do `lib/reactive.ts` do Sucesso ao Aluno: o tilt e o brilho que
   segue o ponteiro existem lá para o vidro e o aparelho 3D, que este sistema
   não usa.
   ========================================================================== */

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * `true` quando o sistema pede menos movimento. Reavalia se o usuário trocar a
 * preferência com a aba aberta — no Windows isso acontece sem recarregar.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
