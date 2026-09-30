import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Flag,
  Info,
  LogIn,
  LogOut,
  Send,
  SearchX,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Badges';
import { Hint } from '../components/ui/Hint';
import {
  Callout,
  Card,
  CardHeader,
  DataList,
  EmptyState,
  Skeleton,
  StatTile,
  Tabs,
} from '../components/ui/Surfaces';
import { ExportMenu } from '../components/data/ExportMenu';
import { LoadError } from '../components/data/Table';
import { ConsultaRa } from '../domain/ConsultaRa';
import { FaixaBadge } from '../domain/FaixaBadge';
import { FilaDesatualizada } from '../domain/FilaDesatualizada';
import { TrajetoriaFila } from '../domain/TrajetoriaFila';
import { AVISO_FAIXA, FAIXA_META, FAIXA_ORDER, FORA_DAS_FAIXAS, REFERENCIA_TI } from '../domain/faixas';
import { rotuloFila } from '../domain/fila';
import type { AlunoFila, Faixa, HistoricoAluno } from '../api/types';
import { source } from '../api/source';
import { disparosSource } from '../api/disparos';
import type { Disparo } from '../api/disparos';
import { primeCache, useApi } from '../api/useApi';
import { mensagemPushDemo } from '../domain/mensagemDemo';
import { DIAS_DOSSIE } from '../export/relatorios';
import { fullDate, int, stamp } from '../lib/format';
import { useDark } from '../lib/dark';
import { useRoute } from '../lib/router';

/* ==========================================================================
   Dossiê do aluno — "qual a situação deste RA, e como ele chegou aqui?"
   --------------------------------------------------------------------------
   No molde do Dossiê 360° do Sucesso ao Aluno, com SÓ o que a API devolve:
   `alunos/consultar?ra=&dias=120` (situação, curso, faixa, leitura, histórico)
   e `fila/datas` (para saber em que filas ele NÃO apareceu). Tudo o mais —
   trajetória, jornada, contagens — é conta sobre esses dois.

   A ordem de leitura é a regra:
     1. quem é (RA e curso, na faixa azul — "você está olhando uma pessoa");
     2. se `sit_aluno` não é `Ativo`, isso ANTES da faixa: o aluno já saiu;
     3. a `leitura` da API, verbatim — o front nunca gera a sua;
     4. números-chave, e o caminho dele nas filas.

   Sem nome e sem avatar de iniciais: a API não devolve nome, e o front não
   inventa. A identidade é o RA.
   ========================================================================== */

type Aba = 'trajetoria' | 'jornada' | 'mensagens' | 'historico' | 'faixa';
const ABAS: { value: Aba; label: string }[] = [
  { value: 'trajetoria', label: 'Trajetória' },
  { value: 'jornada', label: 'Jornada' },
  { value: 'mensagens', label: 'Mensagens' },
  { value: 'historico', label: 'Histórico' },
  { value: 'faixa', label: 'Sobre a faixa' },
];

const ORDEM: Record<Faixa, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2 };

function ativo(sit: string | null): boolean {
  return sit?.trim().toLowerCase() === 'ativo';
}

export function AlunoView() {
  const { route, navigate, replace } = useRoute();
  const dark = useDark();
  const ra = route.param ?? '';
  const { aba: abaQ, origem, ...queryLista } = route.query;
  const aba: Aba = ABAS.some((a) => a.value === abaQ) ? (abaQ as Aba) : 'trajetoria';
  const veioDeMensagens = origem === 'mensagens';

  const consulta = useApi(ra ? `consultar:${ra}:${DIAS_DOSSIE}` : null, (signal) =>
    source.consultar({ ra, dias: DIAS_DOSSIE }, signal),
  );
  const datas = useApi(`datas:${DIAS_DOSSIE}`, (signal) => source.datas({ limite: DIAS_DOSSIE }, signal));

  // A URL passa a mostrar o RA canônico (com zero à esquerda), sem nova busca.
  useEffect(() => {
    const d = consulta.data;
    if (d && d.aluno && d.aluno !== ra) {
      primeCache(`consultar:${d.aluno}:${DIAS_DOSSIE}`, d);
      replace('aluno', d.aluno, route.query);
    }
  }, [consulta.data, ra, replace, route.query]);

  const voltar = (
    <Button
      variant="ghost"
      size="sm"
      icon={<ArrowLeft className="h-3.5 w-3.5" />}
      onClick={() => navigate(veioDeMensagens ? 'mensagens' : 'alunos', undefined, queryLista)}
    >
      {veioDeMensagens ? 'Mensagens' : 'Alunos'}
    </Button>
  );

  if (consulta.error) {
    const e = consulta.error;
    return (
      <div className="space-y-5">
        <div>{voltar}</div>
        <Card>
          {e.status === 404 || e.status === 422 ? (
            <EmptyState
              icon={e.status === 404 ? <SearchX className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              title={e.status === 404 ? 'RA não encontrado no Lyceum.' : 'RA inválido'}
              message={e.status === 404 ? `Nenhum aluno com o RA ${ra}. Confira o número e consulte de novo.` : e.message}
              action={
                <div className="w-full max-w-md">
                  <ConsultaRa onConsultar={(novo) => navigate('aluno', novo, queryLista)} />
                </div>
              }
            />
          ) : (
            <LoadError error={e} onRetry={consulta.reload} />
          )}
        </Card>
      </div>
    );
  }

  const d = consulta.data;
  // As filas consultadas: as `DIAS_DOSSIE` mais recentes que existem.
  const filas = (datas.data ?? []).map((x) => x.dt_corte).slice(0, DIAS_DOSSIE);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {voltar}
        {d && <ExportMenu tipo="aluno" query={{ ra: d.aluno }} label="Exportar dossiê" />}
      </div>

      {d && <FilaDesatualizada dtCorte={d.ultima_fila} filaAtualizada={d.fila_atualizada} />}

      <Identidade d={d} ra={ra} filas={filas} dark={dark} />

      {/* Leitura da API, verbatim */}
      {d ? (
        <Callout tone="info" icon={<Info className="h-4 w-4" />} title="Leitura da API">
          {d.leitura}
        </Callout>
      ) : (
        <Skeleton className="h-14 w-full" />
      )}

      <Card>
        <Tabs<Aba>
          tabs={ABAS.map((a) => ({
            ...a,
            count: a.value === 'historico' && d ? d.historico.length : undefined,
          }))}
          value={aba}
          onChange={(v) => replace('aluno', ra, { ...route.query, aba: v === 'trajetoria' ? undefined : v })}
          layoutId="dossie-abas"
        />
        <div className="pt-5">
          {!d || !datas.data ? (
            <Skeleton className="h-[230px] w-full" />
          ) : aba === 'trajetoria' ? (
            <>
              <p className="mb-4 max-w-3xl text-[12px] leading-relaxed text-ink-3">
                A posição do aluno na fila geral em cada uma das últimas {filas.length} filas. Quanto mais alto o
                ponto, maior o risco estimado naquela fila.
              </p>
              <TrajetoriaFila filas={filas} historico={d.historico} dark={dark} />
            </>
          ) : aba === 'jornada' ? (
            <Jornada filas={filas} historico={d.historico} />
          ) : aba === 'mensagens' ? (
            <MensagensAluno ra={d.aluno} />
          ) : aba === 'historico' ? (
            <Historico itens={d.historico} filasConsultadas={filas.length} />
          ) : (
            <SobreFaixa faixa={d.faixa_ultima_fila} dark={dark} />
          )}
        </div>
      </Card>

      <p className="text-[11.5px] leading-relaxed text-ink-4">{AVISO_FAIXA}</p>
    </div>
  );
}

/* -- Mensagens: histórico demonstrativo da etapa de triagem ------------------ */

function MensagensAluno({ ra }: { ra: string }) {
  if (source.kind !== 'mock' || !disparosSource.disponivel) {
    return (
      <EmptyState
        compact
        icon={<Send className="h-5 w-5" />}
        title="Histórico de mensagens indisponível"
        message="O TI ainda precisa publicar uma consulta de envios por RA, com o conteúdo e o resultado de cada push."
      />
    );
  }
  return <MensagensAlunoDemo ra={ra} />;
}

function MensagensAlunoDemo({ ra }: { ra: string }) {
  const consulta = useApi(`disparos:aluno:${ra}`, (signal) => disparosSource.listarAluno(ra, signal));
  const [todas, setTodas] = useState(false);
  const lista = consulta.data ?? [];
  const visiveis = todas ? lista : lista.slice(0, 8);

  if (consulta.error) return <LoadError error={consulta.error} onRetry={consulta.reload} />;
  if (!consulta.data) return <Skeleton className="h-48 w-full" />;
  if (lista.length === 0) {
    return <EmptyState compact title="Nenhuma mensagem de triagem" message="Não há disparos simulados para este RA nas filas do período." />;
  }

  return (
    <div>
      <p className="mb-4 max-w-3xl text-[12px] leading-relaxed text-ink-3">
        Linha do tempo dos pushes de triagem por fila. Conteúdo e envios fictícios; “envio registrado” não confirma entrega no aparelho.
      </p>
      <ol className="divide-y divide-hairline">
        {visiveis.map((disparo) => <MensagemNaLinha key={disparo.dt_corte} disparo={disparo} />)}
      </ol>
      {lista.length > 8 && (
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => setTodas((valor) => !valor)}>
            {todas ? 'Mostrar menos' : `Mostrar as ${int(lista.length)} mensagens`}
          </Button>
        </div>
      )}
    </div>
  );
}

function MensagemNaLinha({ disparo }: { disparo: Disparo }) {
  const conteudo = mensagemPushDemo(disparo.chance_evasao);
  const status = disparo.status === 'ENVIADO' ? 'Envio registrado' : disparo.status === 'FALHA' ? 'Falha' : disparo.status === 'ENVIANDO' ? 'Em andamento' : disparo.status;
  const tone = disparo.status === 'FALHA' ? 'crit' : disparo.status === 'ENVIANDO' ? 'warn' : 'neutral';

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Send className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          <p className="text-[13px] font-semibold text-ink">Push no app · Triagem da fila</p>
        </div>
        <Pill tone={tone} solid={disparo.status === 'FALHA'}>{status}</Pill>
      </div>
      <p className="mt-1.5 text-[11.5px] text-ink-3">
        Fila de {fullDate(disparo.dt_corte)} · Faixa {disparo.chance_evasao.toLowerCase()}
        {disparo.enviado_em ? ` · ${stamp(disparo.enviado_em)}` : ''}
      </p>
      <div className="mt-3 rounded-lg bg-surface-2 p-3.5">
        <p className="text-[11px] font-medium text-ink-3">Exemplo do conteúdo do push</p>
        <p className="mt-1 text-[13px] font-semibold text-ink">{conteudo.titulo}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{conteudo.corpo}</p>
      </div>
    </li>
  );
}

/* -- Identidade + números-chave ------------------------------------------------ */

function Identidade({
  d,
  ra,
  filas,
  dark,
}: {
  d: HistoricoAluno | null;
  ra: string;
  filas: string[];
  dark: boolean;
}) {
  const stats = useMemo(() => (d ? estatisticas(d, filas) : null), [d, filas]);
  const meta = d?.faixa_ultima_fila ? FAIXA_META[d.faixa_ultima_fila] : null;

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="bg-brand px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-tight font-semibold text-on-brand">
              RA <span className="font-mono">{d?.aluno ?? ra}</span>
            </h1>
            <p className="mt-1 truncate text-[13px] text-on-brand/80">
              {d ? (
                <>
                  {d.nome_curso ?? 'Curso não informado'}
                  {d.curso ? ` · ${d.curso}` : ''} · Graduação presencial
                </>
              ) : (
                'Consultando…'
              )}
            </p>
          </div>
          {d && <p className="text-[12px] text-on-brand/80">Fila de {fullDate(d.ultima_fila)}</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5 p-5 sm:p-6">
          {!d ? (
            <div className="flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ) : (
            <>
              {/* Situação ANTES da faixa: se o aluno saiu, é isso que importa. */}
              {!ativo(d.sit_aluno) && d.sit_aluno !== null && (
                <Callout tone="crit" icon={<AlertTriangle className="h-4 w-4" />}>
                  <span className="font-semibold text-crit-ink">Situação atual no Lyceum: {d.sit_aluno}.</span> O aluno
                  já saiu — não há o que reter.
                </Callout>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  Situação
                  {d.sit_aluno === null ? (
                    <Pill tone="muted">Não informada</Pill>
                  ) : ativo(d.sit_aluno) ? (
                    <Pill tone="neutral">{d.sit_aluno}</Pill>
                  ) : (
                    <Pill tone="crit" solid>
                      {d.sit_aluno}
                    </Pill>
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  Faixa
                  <FaixaBadge faixa={d.faixa_ultima_fila} />
                </span>
                <Pill dot={false}>Graduação presencial</Pill>
                {d.curso && (
                  <Pill dot={false} mono>
                    Curso {d.curso}
                  </Pill>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {!stats || !d ? (
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="rounded-xl bg-surface-2 p-4">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="mt-3 h-6 w-14" />
                  <Skeleton className="mt-4 h-3 w-full" />
                </div>
              ))
            ) : (
              <>
                <StatTile
                  tone="band"
                  label="Posição na fila geral"
                  value={stats.linhaAtual ? `#${int(stats.linhaAtual.posicao)}` : '—'}
                  footer={
                    <span className="flex items-center gap-1.5">
                      {stats.linhaAtual ? 'escola inteira, todos os cursos' : 'fora das faixas'}
                      <Hint label="a posição" align="left">
                        A posição é na fila geral da graduação presencial, contando todos os cursos (1 = maior risco).
                        Não é a posição dentro do curso.
                      </Hint>
                    </span>
                  }
                />
                <StatTile
                  tone="band"
                  label="Filas em que apareceu"
                  value={int(d.historico.length)}
                  detail={`de ${int(stats.consultadas)}`}
                  footer={<span>nas últimas {int(stats.consultadas)} filas</span>}
                />
                <StatTile
                  tone="band"
                  label="Filas na Crítica"
                  value={int(stats.naCritica)}
                  accent={stats.naCritica > 0 ? FAIXA_META.CRITICA.hex(dark) : undefined}
                  footer={<span>no mesmo período</span>}
                />
                <StatTile
                  tone="band"
                  label="Seguidas nas faixas"
                  value={int(stats.seguidas)}
                  footer={<span>{stats.seguidas === 1 ? 'fila' : 'filas'}, até a mais recente</span>}
                />
              </>
            )}
          </div>
        </div>

        {/* Síntese: a faixa na última fila e o que ela significa */}
        <aside className="border-t border-hairline bg-surface-2 p-5 lg:border-t-0 lg:border-l">
          {!d || !stats ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <p className="text-[12px] font-medium text-ink-3">Faixa na última fila</p>
              <p
                className={`mt-1.5 text-[30px] leading-none font-semibold tracking-tight ${meta ? '' : 'text-ink-3'}`}
                style={meta ? { color: meta.hex(dark) } : undefined}
              >
                {meta ? meta.label : 'Fora das faixas'}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
                {meta ? `${meta.regra}. Evadem de fato ${meta.evadem} (TI, coorte ${REFERENCIA_TI.coorte}).` : FORA_DAS_FAIXAS}
              </p>
              <div className="mt-5 border-t border-hairline pt-4">
                <DataList
                  columns={2}
                  items={[
                    {
                      label: 'Primeira vez na fila',
                      value: stats.primeira ? <span className="font-mono">{fullDate(stats.primeira)}</span> : '—',
                    },
                    {
                      label: 'Última vez na fila',
                      value: stats.ultimaVez ? <span className="font-mono">{fullDate(stats.ultimaVez)}</span> : '—',
                    },
                    {
                      label: 'Posição mais alta',
                      value: stats.maisAlta ? <span className="font-mono">#{int(stats.maisAlta.posicao)}</span> : '—',
                      tone: stats.maisAlta?.chance_evasao === 'CRITICA' ? 'crit' : 'plain',
                    },
                    {
                      label: 'Em',
                      value: stats.maisAlta ? <span className="font-mono">{fullDate(stats.maisAlta.dt_corte)}</span> : '—',
                    },
                  ]}
                />
                <p className="mt-3 text-[11px] leading-relaxed text-ink-4">
                  "Posição mais alta" = a mais perto do topo da fila, ou seja, o maior risco estimado no período.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </Card>
  );
}

function estatisticas(d: HistoricoAluno, filas: string[]) {
  const presentes = new Set(d.historico.map((h) => h.dt_corte));
  let seguidas = 0;
  for (const dt of filas) {
    if (!presentes.has(dt)) break;
    seguidas += 1;
  }
  const maisAlta = d.historico.reduce<AlunoFila | null>((m, h) => (!m || h.posicao < m.posicao ? h : m), null);
  return {
    consultadas: filas.length || d.historico.length,
    linhaAtual: d.historico.find((h) => h.dt_corte === d.ultima_fila) ?? null,
    naCritica: d.historico.filter((h) => h.chance_evasao === 'CRITICA').length,
    seguidas,
    primeira: d.historico[d.historico.length - 1]?.dt_corte ?? null,
    ultimaVez: d.historico[0]?.dt_corte ?? null,
    maisAlta,
  };
}

/* -- Jornada: só as mudanças --------------------------------------------------- */

interface Evento {
  dt: string;
  titulo: string;
  detalhe: string;
  icon: ReactNode;
  alerta: boolean;
}

function eventos(filas: string[], historico: AlunoFila[]): Evento[] {
  const porDt = new Map(historico.map((h) => [h.dt_corte, h]));
  const cron = [...filas].reverse();
  const out: Evento[] = [];

  cron.forEach((dt, i) => {
    const agora = porDt.get(dt) ?? null;
    const antes = i > 0 ? (porDt.get(cron[i - 1]) ?? null) : null;
    const pos = agora ? `#${int(agora.posicao)} na fila geral` : '';

    if (i === 0) {
      if (agora) {
        out.push({
          dt,
          titulo: `Já estava na faixa ${FAIXA_META[agora.chance_evasao].label}`,
          detalhe: `Na primeira fila consultada, ${pos}.`,
          icon: <Flag className="h-3.5 w-3.5" />,
          alerta: agora.chance_evasao === 'CRITICA',
        });
      }
      return;
    }
    if (agora && !antes) {
      out.push({
        dt,
        titulo: `Entrou na fila, na faixa ${FAIXA_META[agora.chance_evasao].label}`,
        detalhe: `${pos[0].toUpperCase()}${pos.slice(1)}.`,
        icon: <LogIn className="h-3.5 w-3.5" />,
        alerta: agora.chance_evasao === 'CRITICA',
      });
    } else if (!agora && antes) {
      out.push({
        dt,
        titulo: 'Saiu das faixas',
        detalhe: `Na fila anterior estava na ${FAIXA_META[antes.chance_evasao].label}, #${int(antes.posicao)}.`,
        icon: <LogOut className="h-3.5 w-3.5" />,
        alerta: false,
      });
    } else if (agora && antes && agora.chance_evasao !== antes.chance_evasao) {
      const subiu = ORDEM[agora.chance_evasao] < ORDEM[antes.chance_evasao];
      out.push({
        dt,
        titulo: `${subiu ? 'Subiu' : 'Desceu'} para a faixa ${FAIXA_META[agora.chance_evasao].label}`,
        detalhe: `De #${int(antes.posicao)} (${FAIXA_META[antes.chance_evasao].label}) para ${pos}.`,
        icon: subiu ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />,
        alerta: subiu && agora.chance_evasao === 'CRITICA',
      });
    }
  });

  return out.reverse();
}

function Jornada({ filas, historico }: { filas: string[]; historico: AlunoFila[] }) {
  const lista = useMemo(() => eventos(filas, historico), [filas, historico]);
  const [todos, setTodos] = useState(false);
  const visiveis = todos ? lista : lista.slice(0, 12);

  if (lista.length === 0) {
    return (
      <EmptyState
        compact
        title="Sem mudanças no período"
        message={`O aluno não apareceu em nenhuma das últimas ${filas.length} filas.`}
      />
    );
  }

  return (
    <div>
      <p className="mb-4 max-w-3xl text-[12px] leading-relaxed text-ink-3">
        Só as mudanças: quando o aluno entrou na fila, trocou de faixa ou saiu. Da mais recente para a mais antiga.
      </p>
      <ol className="relative">
        <span className="absolute top-4 left-[13px] w-px bg-hairline" style={{ height: 'calc(100% - 2rem)' }} />
        {visiveis.map((ev) => (
          <li key={ev.dt + ev.titulo} className="relative flex gap-3 pb-5 last:pb-0">
            <span
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ev.alerta ? 'bg-crit-soft text-crit-ink' : 'bg-surface-2 text-ink-3'}`}
            >
              {ev.icon}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-[12.5px] leading-snug font-semibold text-ink">{ev.titulo}</p>
                <span className="shrink-0 font-mono text-[10.5px] text-ink-4">{rotuloFila(ev.dt)}</span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{ev.detalhe}</p>
            </div>
          </li>
        ))}
      </ol>
      {lista.length > 12 && (
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => setTodos((v) => !v)}>
            {todos ? 'Mostrar menos' : `Mostrar as ${lista.length} mudanças`}
          </Button>
        </div>
      )}
    </div>
  );
}

/* -- Histórico: fila a fila --------------------------------------------------- */

function Historico({ itens, filasConsultadas }: { itens: AlunoFila[]; filasConsultadas: number }) {
  const [todos, setTodos] = useState(false);
  if (itens.length === 0) {
    return (
      <EmptyState
        compact
        title="Sem histórico nas faixas"
        message={`Não apareceu em nenhuma das últimas ${filasConsultadas} filas.`}
      />
    );
  }
  const visiveis = todos ? itens : itens.slice(0, 20);
  return (
    <div>
      <p className="mb-2 text-[12px] leading-relaxed text-ink-3">
        As filas em que o aluno apareceu, da mais recente para a mais antiga.
      </p>
      <ul className="divide-y divide-hairline">
        {visiveis.map((h, i) => {
          const antes = itens[i + 1];
          // Posição menor = mais perto do topo = maior risco.
          const diff = antes ? antes.posicao - h.posicao : null;
          const variacao =
            diff === null
              ? null
              : diff > 0
                ? `subiu ${int(diff)} ${diff === 1 ? 'posição' : 'posições'}`
                : diff < 0
                  ? `desceu ${int(-diff)}`
                  : 'mesma posição';
          return (
            <li
              key={h.dt_corte}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[110px_90px_150px_minmax(0,1fr)]"
            >
              <span className="font-mono text-[12px] text-ink">{fullDate(h.dt_corte)}</span>
              <span className="justify-self-end sm:justify-self-start">
                <FaixaBadge faixa={h.chance_evasao} />
              </span>
              <span className="font-mono text-[12px] text-ink-2">
                #{int(h.posicao)} <span className="font-sans text-[11px] text-ink-4">na fila geral</span>
              </span>
              <span className="justify-self-end text-[12px] text-ink-3">
                {variacao ?? <span className="text-ink-4">primeira da lista</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {itens.length > 20 && (
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={() => setTodos((v) => !v)}>
            {todos ? 'Mostrar menos' : `Mostrar as ${itens.length} filas`}
          </Button>
        </div>
      )}
    </div>
  );
}

/* -- Sobre a faixa --------------------------------------------------------------- */

function SobreFaixa({ faixa, dark }: { faixa: Faixa | null; dark: boolean }) {
  return (
    <div className="space-y-4">
      <CardHeader
        title="O que a faixa quer dizer"
        subtitle="Regras e números publicados pelo TI. A faixa vem da posição na fila, não de uma porcentagem por aluno."
      />
      <ul className="grid gap-3 md:grid-cols-3">
        {FAIXA_ORDER.map((f) => {
          const meta = FAIXA_META[f];
          const atual = f === faixa;
          return (
            <li key={f} className={`relative overflow-hidden rounded-lg p-4 ${atual ? 'bg-surface-2' : 'bg-surface-2/60'}`}>
              {atual && <span className="absolute inset-y-0 left-0 w-0.5" style={{ backgroundColor: meta.hex(dark) }} />}
              <div className="flex items-center justify-between gap-2">
                <FaixaBadge faixa={f} />
                {atual && <span className="text-[11px] font-medium text-ink-3">faixa deste aluno</span>}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{meta.regra}.</p>
              <p className="mt-1 text-[12px] text-ink-3">
                Evadem de fato <span className="font-medium text-ink">{meta.evadem}</span>.
              </p>
            </li>
          );
        })}
      </ul>
      {faixa === null && (
        <Callout tone="ok" title="Fora das faixas">
          {FORA_DAS_FAIXAS} Não quer dizer risco nenhum.
        </Callout>
      )}
      <Callout tone="warn" title="Uso interno">
        {AVISO_FAIXA}
      </Callout>
    </div>
  );
}
