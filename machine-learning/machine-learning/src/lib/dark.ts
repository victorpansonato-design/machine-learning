import { useSyncExternalStore } from 'react';

/* ==========================================================================
   useDark — o tema corrente, para quem pinta SVG
   --------------------------------------------------------------------------
   `useTheme()` (lib/theme.ts) é dono da troca e vive uma vez só, na sidebar.
   As telas precisam apenas SABER o tema para escolher `FAIXA_META[f].hex(dark)`
   — `<svg>` animado não resolve `var()` em todo contexto, e `hex(false)` fixo
   deixava o escuro com os acentos do claro. Este hook observa a classe `.dark`
   do <html>, então acompanha a troca sem um segundo estado de tema.
   ========================================================================== */

function subscribe(fn: () => void) {
  const observer = new MutationObserver(fn);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

const read = () => document.documentElement.classList.contains('dark');

export function useDark(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
