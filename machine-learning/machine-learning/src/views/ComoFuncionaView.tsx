import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Ban,
  CalendarClock,
  EyeOff,
  HelpCircle,
  ListOrdered,
  Percent,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { StackedBar } from '../components/ui/Charts';
import { Card, CardHeader, PageHeader } from '../components/ui/Surfaces';
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal';
import { DescricaoPagina } from '../components/brand/GoldRule';
import { FaixaBadge } from '../domain/FaixaBadge';
import { AVISO_FAIXA, FAIXA_META, FAIXA_ORDER, REFERENCIA_TI } from '../domain/faixas';
import type { Faixa } from '../api/types';
import { decimal, int } from '../lib/format';
import { press } from '../lib/motion';
import { useDark } from '../lib/dark';
import { useRoute } from '../lib/router';
import type { RouteName } from '../lib/router';

/* ==========================================================================
   Como funciona — o sistema explicado para qualquer pessoa
   --------------------------------------------------------------------------
   Frases curtas, sem sigla, uma ideia por bloco. TUDO o que é regra ou número
   aqui vem da documentação do TI (FAIXA_META, REFERENCIA_TI); o que ela não
   diz — por exemplo, quais dados o modelo usa — a página diz que não sabe,
   em vez de inventar.
   ========================================================================== */

/** "~4 em cada 10" → [4, 10]. O número vem do texto publicado pelo TI. */
function proporcao(evadem: string): [number, number] | null {
  const m = /(\d+)\s+em\s+cada\s+(\d+)/.exec(evadem);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function ComoFuncionaView() {
  const dark = useDark();
  const { navigate } = useRoute();
  const base = REFERENCIA_TI.base;
  const pc = proporcao(FAIXA_META.CRITICA.evadem);
  const vezesCritica = pc ? Math.round(((pc[0] / pc[1]) * 100) / REFERENCIA_TI.evasaoMediaBase) : null;

  // A régua da escola: 2% Crítica, 8% Alta, 10% Média, 80% fora (regra do TI).
  const regua = [
    { key: 'CRITICA', label: 'Crítica', value: FAIXA_META.CRITICA.tamanhoTipico, color: FAIXA_META.CRITICA.hex(dark) },
    { key: 'ALTA', label: 'Alta', value: FAIXA_META.ALTA.tamanhoTipico, color: FAIXA_META.ALTA.hex(dark) },
    { key: 'MEDIA', label: 'Média', value: FAIXA_META.MEDIA.tamanhoTipico, color: FAIXA_META.MEDIA.hex(dark) },
    {
      key: 'FORA',
      label: 'Fora das faixas',
      value: base - FAIXA_ORDER.reduce((s, f) => s + FAIXA_META[f].tamanhoTipico, 0),
      color: 'var(--track)',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Como funciona"
        description={
          <DescricaoPagina>
            O que este sistema mostra, de onde vem cada número e como ler — sem precisar entender de estatística.
          </DescricaoPagina>
        }
      />

      {/* 1. Em uma frase */}
      <Reveal>
        <Card>
          <div className="flex items-start gap-4">
            <Icone>
              <Sparkles className="h-4 w-4" />
            </Icone>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-ink">Em uma frase</h2>
              <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-ink-2">
                Duas vezes por semana, um programa do TI olha todos os ~{int(base)} alunos da graduação presencial e
                aponta os que têm <strong className="font-semibold text-ink">maior risco de deixar a faculdade</strong>,
                para a equipe oferecer apoio <strong className="font-semibold text-ink">antes</strong> que isso
                aconteça.
              </p>
            </div>
          </div>
        </Card>
      </Reveal>

      {/* 2. Como a fila é montada */}
      <Reveal>
        <Card>
          <CardHeader title="Como a lista é montada" subtitle="Quatro passos, sempre iguais. Ninguém escolhe os alunos à mão." />
          <RevealGroup as="ul" className="mt-5 grid gap-3 md:grid-cols-4">
            <Passo n={1} icon={<CalendarClock className="h-4 w-4" />} titulo="Segunda e quinta, ~06:30">
              O programa do TI roda sozinho, com os dados até a véspera.
            </Passo>
            <Passo n={2} icon={<Users className="h-4 w-4" />} titulo="Dá uma nota a cada aluno">
              Todos os ~{int(base)} alunos recebem uma nota de risco.
            </Passo>
            <Passo n={3} icon={<ListOrdered className="h-4 w-4" />} titulo="Coloca em ordem">
              Do maior risco para o menor. Essa ordem é a <b className="font-semibold text-ink">fila</b>; o lugar de
              cada um é a <b className="font-semibold text-ink">posição</b>.
            </Passo>
            <Passo n={4} icon={<ArrowRight className="h-4 w-4" />} titulo="Separa os ~20% do topo">
              Eles entram na fila em três faixas. Os outros ~80% não aparecem na lista.
            </Passo>
          </RevealGroup>

          <div className="mt-6 rounded-lg bg-surface-2 p-4">
            <p className="text-[12px] font-semibold text-ink-3">A escola inteira, do maior risco para o menor</p>
            <div className="mt-3">
              <StackedBar segments={regua} height={14} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {regua.map((r) => (
                <span key={r.key} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.label}
                  <span className="font-mono text-[11px] text-ink-4">~{int(r.value)}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
              Tamanhos típicos publicados pelo TI, numa base de {int(base)} alunos. Como a faixa depende só do lugar na
              fila, o tamanho de cada faixa quase não muda de uma semana para outra — o que muda são as pessoas.
            </p>
          </div>
        </Card>
      </Reveal>

      {/* 3. As três faixas */}
      <Reveal>
        <Card>
          <CardHeader
            title="As três faixas"
            subtitle={`Quanto mais perto do topo da fila, mais alta a faixa. Os números de "quantos evadem" foram medidos pelo TI com alunos da turma de ${REFERENCIA_TI.coorte}.`}
          />
          <RevealGroup as="ul" className="mt-5 grid gap-3 md:grid-cols-3">
            {FAIXA_ORDER.map((f) => (
              <RevealItem as="li" key={f} className="rounded-lg bg-surface-2 p-4">
                <FaixaCard faixa={f} dark={dark} />
              </RevealItem>
            ))}
          </RevealGroup>
          <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
            Para comparar: na escola toda, em média{' '}
            <span className="font-semibold text-ink">{decimal(REFERENCIA_TI.evasaoMediaBase, 1)}%</span> dos alunos
            evadem (cerca de 8 em cada 100)
            {vezesCritica ? `. Na faixa Crítica, a proporção é cerca de ${vezesCritica} vezes maior.` : '.'}
          </p>
        </Card>
      </Reveal>

      {/* 4. O que a faixa NÃO é */}
      <Reveal>
        <Card>
          <CardHeader title="O que a faixa não é" subtitle="As quatro leituras erradas mais comuns." />
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            <Nao icon={<Ban className="h-4 w-4" />} titulo="Não é uma sentença">
              A maioria dos alunos da Crítica <b className="font-semibold text-ink">não</b> evade. A faixa é um sinal
              para oferecer apoio, não um rótulo.
            </Nao>
            <Nao icon={<Percent className="h-4 w-4" />} titulo="Não é “% de chance”">
              O programa coloca os alunos em ordem; ele não calcula uma porcentagem para cada pessoa. Por isso o
              sistema mostra faixa e posição, nunca um percentual por aluno.
            </Nao>
            <Nao icon={<HelpCircle className="h-4 w-4" />} titulo="“Fora das faixas” não é “tudo bem”">
              Só quer dizer que o aluno não está entre os ~20% de maior risco (ou não é da graduação presencial).
              Qualquer RA pode ser consultado.
            </Nao>
            <Nao icon={<EyeOff className="h-4 w-4" />} titulo="Nunca é dita ao aluno">
              É uso interno da equipe. A faixa é dado pessoal (LGPD) e não deve ser comunicada ao próprio aluno.
            </Nao>
          </ul>
        </Card>
      </Reveal>

      {/* 5. Glossário */}
      <Reveal>
        <Card>
          <CardHeader title="Palavras que aparecem nas telas" />
          <dl className="mt-4 divide-y divide-hairline">
            <Termo t="Fila">A lista de uma data, com os alunos das três faixas. Sai uma nova toda segunda e quinta.</Termo>
            <Termo t="Data da fila">
              O dia de corte dos dados: a véspera da execução. A fila de domingo é a que o programa montou na
              segunda de manhã.
            </Termo>
            <Termo t="Posição">
              O lugar do aluno na fila da escola inteira (1 = maior risco), contando todos os cursos — não é o lugar
              dentro do curso.
            </Termo>
            <Termo t="Fila em dia / atrasada">
              Se o programa não rodar, a lista anterior continua valendo. O sistema avisa em amarelo quando a fila não
              é a mais recente esperada.
            </Termo>
            <Termo t="Situação no Lyceum">
              A situação do aluno hoje. Se não for “Ativo” (por exemplo, “Cancelado”), o aluno já saiu — não há o que
              reter.
            </Termo>
            <Termo t="Movimento">Quem entrou, saiu ou continuou numa faixa de uma fila para a seguinte.</Termo>
            <Termo t="Mensagem de triagem">
              Push e e-mail que o TI envia aos alunos ativos de uma faixa. Cada aluno recebe no máximo uma vez por fila.
            </Termo>
          </dl>
        </Card>
      </Reveal>

      {/* 6. O que o modelo usa */}
      <Reveal>
        <Card>
          <div className="flex items-start gap-4">
            <Icone>
              <ShieldCheck className="h-4 w-4" />
            </Icone>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-ink">E o que o programa usa para dar a nota?</h2>
              <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-ink-2">
                Isso é definido pelo TI, que construiu e mantém o modelo — este sistema só mostra o resultado, não
                calcula nada. O que o TI publicou: o modelo foi avaliado com alunos da turma de{' '}
                {REFERENCIA_TI.coorte}, e foi assim que se mediu quantos evadem em cada faixa. Dúvidas sobre o modelo
                vão para o TI.
              </p>
            </div>
          </div>
        </Card>
      </Reveal>

      {/* 7. Onde ver cada coisa */}
      <Reveal>
        <Card>
          <CardHeader title="Onde ver cada coisa" />
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            <Atalho rota="monitoramento" titulo="Monitoramento" onNavigate={navigate}>
              Como está a fila: quantos em cada faixa, por curso, e quem entrou e saiu no período.
            </Atalho>
            <Atalho rota="alunos" titulo="Alunos" onNavigate={navigate}>
              Quem está em cada faixa, com filtro por curso — e a consulta de qualquer RA.
            </Atalho>
            <Atalho rota="mensagens" titulo="Mensagens enviadas" onNavigate={navigate}>
              Disparos de triagem registrados em cada fila e histórico por aluno.
            </Atalho>
            <Atalho rota="alunos" titulo="Dossiê do aluno" onNavigate={navigate}>
              Clique num aluno para ver a situação, a faixa e o caminho dele nas filas.
            </Atalho>
          </ul>
        </Card>
      </Reveal>

      <p className="text-[11.5px] leading-relaxed text-ink-4">{AVISO_FAIXA}</p>
    </div>
  );
}

function Icone({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
      {children}
    </span>
  );
}

function Passo({ n, icon, titulo, children }: { n: number; icon: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <RevealItem as="li" className="rounded-lg bg-surface-2 p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface font-mono text-[11px] font-semibold text-ink-2">
          {n}
        </span>
        <span className="text-ink-4">{icon}</span>
      </div>
      <p className="mt-3 text-[13px] font-semibold text-ink">{titulo}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{children}</p>
    </RevealItem>
  );
}

function FaixaCard({ faixa, dark }: { faixa: Faixa; dark: boolean }) {
  const meta = FAIXA_META[faixa];
  const p = proporcao(meta.evadem);
  return (
    <>
      <FaixaBadge faixa={faixa} />
      <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
        <span className="font-medium text-ink">Quem entra:</span> {meta.regra}.
      </p>
      <p className="mt-0.5 text-[12px] text-ink-3">
        Cerca de <span className="font-mono text-ink">{int(meta.tamanhoTipico)}</span> alunos por fila.
      </p>
      {p && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-1.5" role="img" aria-label={`Evadem ${meta.evadem}`}>
            {Array.from({ length: p[1] }, (_, i) => (
              <span
                key={i}
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: i < p[0] ? meta.hex(dark) : 'var(--track)' }}
              />
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-2">
            De cada <span className="font-semibold text-ink">{p[1]}</span> alunos desta faixa, cerca de{' '}
            <span className="font-semibold text-ink">{p[0]}</span> {p[0] === 1 ? 'evadiu' : 'evadiram'}.
          </p>
        </div>
      )}
    </>
  );
}

function Nao({ icon, titulo, children }: { icon: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-surface-2 p-4">
      <span className="mt-0.5 text-ink-3">{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{titulo}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{children}</p>
      </div>
    </li>
  );
}

function Termo({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[13px] font-semibold text-ink">{t}</dt>
      <dd className="text-[13px] leading-relaxed text-ink-2">{children}</dd>
    </div>
  );
}

function Atalho({
  rota,
  titulo,
  children,
  onNavigate,
}: {
  rota: RouteName;
  titulo: string;
  children: ReactNode;
  onNavigate: (r: RouteName) => void;
}) {
  return (
    <li>
      <motion.button
        whileTap={press}
        onClick={() => onNavigate(rota)}
        className="group flex w-full items-start gap-3 rounded-lg bg-surface-2 p-4 text-left transition-colors hover:bg-surface-3"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">{titulo}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{children}</p>
        </div>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
      </motion.button>
    </li>
  );
}
