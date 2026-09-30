import type { Faixa } from '../api/types';
import { Pill } from '../components/ui/Badges';
import { FAIXA_META, FORA_DAS_FAIXAS } from './faixas';

/* ==========================================================================
   FaixaBadge — o status de chance de evasão
   --------------------------------------------------------------------------
   Um STATUS do vocabulário do design system: ponto colorido + palavra, sem
   preenchimento. `CRITICA` sai `solid` sempre — é o veredito que a linha
   existe para mostrar.

   `null` (fora das faixas) renderiza só a palavra em `ink-3`, sem ponto — a
   mesma regra do "Estável" no Sucesso ao Aluno: não há nada a fazer, então a
   linha fica em silêncio, e é isso que deixa o ponto vermelho visível três
   linhas abaixo.
   ========================================================================== */

export function FaixaBadge({
  faixa,
  solid = false,
  className = '',
}: {
  faixa: Faixa | null;
  solid?: boolean;
  className?: string;
}) {
  if (faixa === null) {
    return (
      <span
        title={FORA_DAS_FAIXAS}
        className={`inline-flex shrink-0 items-center text-[12px] font-medium whitespace-nowrap text-ink-3 ${className}`}
      >
        Fora das faixas
      </span>
    );
  }

  const meta = FAIXA_META[faixa];
  return (
    <Pill
      tone={meta.tone}
      solid={solid || faixa === 'CRITICA'}
      className={className}
      title={`${meta.label}: ${meta.regra}. Evadem de fato ${meta.evadem} (medido pelo TI na coorte 2025/2).`}
    >
      {meta.label}
    </Pill>
  );
}
