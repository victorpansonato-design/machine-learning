import { useState, useSyncExternalStore } from 'react';
import { Pill } from '../ui/Badges';
import { SearchInput } from '../ui/Fields';
import { FilaStatus } from '../../domain/FilaStatus';
import { source } from '../../api/source';

/* ==========================================================================
   Header — 74px, sticky, a mesma altura da zona da marca na sidebar.
   --------------------------------------------------------------------------
   À esquerda, "Consultar RA": Enter leva a `#/alunos/<ra>`. À direita, a saúde
   da fila e — em modo mock — a tag "Dados fictícios", para ninguém fotografar
   o esboço e apresentar como resultado.
   ========================================================================== */

const SM = '(min-width: 640px)';
const subscribeSm = (fn: () => void) => {
  const mql = window.matchMedia(SM);
  mql.addEventListener('change', fn);
  return () => mql.removeEventListener('change', fn);
};
const readSm = () => window.matchMedia(SM).matches;

export function Header({ onConsultar }: { onConsultar: (ra: string) => void }) {
  const [ra, setRa] = useState('');
  // Em 360px o campo divide o header com a tag e a saúde da fila: o rótulo
  // encurta para caber, em vez de truncar em "C…".
  const largo = useSyncExternalStore(subscribeSm, readSm, () => true);

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-surface/85 backdrop-blur-xl print:hidden">
      <div className="flex h-[74px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <form
          role="search"
          className="min-w-0 flex-1 sm:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            const valor = ra.trim();
            if (!valor) return;
            onConsultar(valor);
            setRa('');
          }}
        >
          <SearchInput value={ra} onValueChange={setRa} placeholder={largo ? 'Consultar RA…' : 'RA…'} />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {source.kind === 'mock' && (
            <Pill dot={false} title="Esboço com dados fictícios, no formato da API. Nada aqui é resultado real.">
              Dados fictícios
            </Pill>
          )}
          <span className="mx-0.5 hidden h-6 w-px bg-hairline lg:block" />
          <FilaStatus />
        </div>
      </div>
    </header>
  );
}
