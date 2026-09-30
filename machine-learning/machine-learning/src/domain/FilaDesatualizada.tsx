import { AlertTriangle } from 'lucide-react';
import { Callout } from '../components/ui/Surfaces';
import { LinkButton } from '../components/ui/Button';
import { fullDate } from '../lib/format';
import { source } from '../api/source';
import { useApi } from '../api/useApi';

/* ==========================================================================
   FilaDesatualizada — a regra nº 1 do COMO_USAR para quem consome a API
   --------------------------------------------------------------------------
   Se o job falha, a API NÃO dá erro: continua servindo a última fila gravada.
   Por isso toda resposta traz `fila_atualizada`, e com `false` toda tela
   mostra a data da fila e avisa que ela não é a mais recente esperada.

   Dois textos, porque são duas situações diferentes para quem lê:
     · o job atrasou → "não é a mais recente esperada (esperada: …)";
     · a pessoa escolheu uma data antiga de propósito → "você está vendo a fila
       de …, não a mais recente", com o caminho de volta.
   ========================================================================== */

export function FilaDesatualizada({
  dtCorte,
  filaAtualizada,
  dataEscolhida,
  onVerMaisRecente,
}: {
  /** A fila que a resposta trouxe. */
  dtCorte: string | undefined;
  /** O `fila_atualizada` da resposta. Só `false` mostra o aviso. */
  filaAtualizada: boolean | undefined;
  /** A `data` que a pessoa pediu na URL, se pediu. */
  dataEscolhida?: string;
  onVerMaisRecente?: () => void;
}) {
  const saude = useApi('saude', (signal) => source.saude(signal));

  if (!dtCorte || filaAtualizada !== false) return null;

  const ultima = saude.data?.ultima_fila ?? undefined;
  const escolhida = Boolean(dataEscolhida) && dataEscolhida === dtCorte && dtCorte !== ultima;

  if (escolhida) {
    return (
      <Callout tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Você está vendo a fila de <span className="font-mono font-semibold text-ink">{fullDate(dtCorte)}</span>, não a
            mais recente.
          </span>
          {onVerMaisRecente && <LinkButton onClick={onVerMaisRecente}>Ver a mais recente</LinkButton>}
        </span>
      </Callout>
    );
  }

  const esperada = saude.data?.fila_esperada;
  return (
    <Callout
      tone="warn"
      icon={<AlertTriangle className="h-4 w-4" />}
      title={
        <>
          Fila de {fullDate(dtCorte)} — não é a mais recente esperada
          {esperada && esperada !== dtCorte ? ` (esperada: ${fullDate(esperada)})` : ''}.
        </>
      }
    >
      Os números abaixo são dessa data. O job roda segunda e quinta por volta das 06:30; se ele perdeu a última
      execução, a API continua servindo a fila anterior.
    </Callout>
  );
}
