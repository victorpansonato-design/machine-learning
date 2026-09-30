import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { SearchInput } from '../components/ui/Fields';
import { Button } from '../components/ui/Button';

/* ==========================================================================
   ConsultaRa — "ver a chance de evasão de TODOS os alunos"
   --------------------------------------------------------------------------
   A lista mostra os ~1.886 das três faixas; a consulta responde por qualquer
   um dos ~9.400 da graduação presencial. O RA vai como foi digitado — a API
   aceita sem zero à esquerda e com ponto e traço, e devolve o canônico.
   ========================================================================== */

export function ConsultaRa({
  onConsultar,
  variant = 'primary',
  autoFocus,
}: {
  onConsultar: (ra: string) => void;
  /** `primary` só onde ela é A ação da tela. */
  variant?: 'primary' | 'secondary';
  autoFocus?: boolean;
}) {
  const [ra, setRa] = useState('');

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const valor = ra.trim();
        if (valor) onConsultar(valor);
      }}
    >
      <SearchInput
        value={ra}
        onValueChange={setRa}
        placeholder="RA do aluno"
        className="min-w-0 flex-1"
        autoFocus={autoFocus}
      />
      <Button type="submit" variant={variant} size="md" iconRight={<ArrowRight className="h-4 w-4" />} disabled={!ra.trim()}>
        Consultar
      </Button>
    </form>
  );
}
