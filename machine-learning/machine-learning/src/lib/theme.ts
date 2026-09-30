import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/* ==========================================================================
   Tema claro / escuro
   --------------------------------------------------------------------------
   Claro é o padrão; escuro é opt-in e nunca herdado do sistema operacional.
   O tema é a classe `.dark` no <html> — os tokens de `index.css` fazem o resto.

   A troca é revelada por um círculo que cresce a partir do botão, com o tema
   novo pintado por cima do antigo (View Transitions API). Onde a API não existe,
   ou quando o usuário pediu menos movimento, a troca é seca.

   A CHAVE PRECISA BATER COM O `index.html`. O script de pré-pintura lê
   `ml.v1.theme` antes do React existir; se a chave daqui mudar e a de lá não,
   o app pisca a paleta errada no primeiro render. O valor é gravado em JSON
   (`'"dark"'`, com aspas) — o script aceita as duas formas.
   ========================================================================== */

export const THEME_KEY = 'ml.v1.theme';

export type Theme = 'light' | 'dark';

function readTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    return raw === 'dark' || raw === '"dark"' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    } catch {
      /* storage indisponível — o tema vale só para esta aba */
    }
  }, [theme]);

  const toggleTheme = useCallback((origin?: { x: number; y: number }) => {
    const root = document.documentElement;
    const next: Theme = root.classList.contains('dark') ? 'light' : 'dark';

    const apply = () => {
      setTheme(next);
      root.classList.toggle('dark', next === 'dark');
      root.style.colorScheme = next;
    };

    const start = document.startViewTransition?.bind(document);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!start || reduced) {
      apply();
      return;
    }

    const x = origin?.x ?? window.innerWidth - 48;
    const y = origin?.y ?? window.innerHeight - 48;
    // Raio até o canto mais distante: o círculo tem de cobrir a tela inteira.
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = start(() => {
      flushSync(apply);
    });

    void transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 700,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  }, []);

  return { theme, dark: theme === 'dark', toggleTheme };
}
