import { useMemo, useState } from 'react';
import { Info, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Pill, TrendIndicator } from '../components/ui/Badges';
import { AnimatedNumber, StackedBar } from '../components/ui/Charts';
import { Segmented, SearchInput, TextInput } from '../components/ui/Fields';
import { LineChart } from '../components/ui/Plot';
import type { PlotSeries } from '../components/ui/Plot';
import { MetricSheet } from '../components/ui/MetricSheet';
import type { MetricSheetContent } from '../components/ui/MetricSheet';
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal';
import {
  Callout,
  Card,
  CardHeader,
  ChevronAffordance,
  DataList,
  EmptyState,
  PageHeader,
  Skeleton,
  StatTile,
} from '../components/ui/Surfaces';
import { DescricaoPagina } from '../components/brand/GoldRule';
import { ExportMenu } from '../components/data/ExportMenu';
import { ClickRow, LoadError, SkeletonRows, SortHeader, TableTopBar } from '../components/data/Table';
import { FaixaBadge } from '../domain/FaixaBadge';
import { FilaDesatualizada } from '../domain/FilaDesatualizada';
import { AVISO_FAIXA, FAIXA_META, FAIXA_ORDER, REFERENCIA_TI } from '../domain/faixas';
import { dias } from '../domain/fila';
import { calcularMovimento } from '../domain/movimento';
import type { RecorteFaixa } from '../domain/movimento';
import {
  PERIODO_PADRAO,
  PERIODOS,
  descreverIntervalo,
  filasNoPeriodo,
  hojeIso,
  intervalo,
  parsePeriodo,
} from '../domain/periodo';
import type { PeriodoKey } from '../domain/periodo';
import { parseRecorte, rotuloRecorte } from '../export/relatorios';
import type { Faixa, ResumoCurso } from '../api/types';
import type { ApiError } from '../api/client';
import { source } from '../api/source';
import { useApi } from '../api/useApi';
import { useFilas } from '../api/useFilas';
import { decimal, fullDate, int, percent, searchKey, shortDate } from '../lib/format';
import { useDark } from '../lib/dark';
import { useRoute } from '../lib/router';

/* ==========================================================================
   Monitoramento — "como está a fila, por faixa e por curso, no período?"
   --------------------------------------------------------------------------
   Rotas: `fila/saude`, `fila/datas?limite=120`, `fila/resumo?data=` e, para o
   movimento, `alunos/listar` de cada fila do período (uma chamada por fila).

   O PERÍODO escolhe as filas (por `dt_corte`). Os números do topo e a tabela
   de cursos são da fila MAIS RECENTE do período; o movimento cobre todas.
   Todo número da tela sai da API ou de FAIXA_META.
   ========================================================================== */

type Chave = 'critica' | 'alta' | 'media';
const CHAVE: Record<Faixa, Chave> = { CRITICA: 'critica', ALTA: 'alta', MEDIA: 'media' };

type SortKey = Chave | 'total';

const RECORTES: { value: string; label: string }[] = [
  { value: 'CRITICA', label: 'Crítica' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'TODAS', label: 'Todas' },
];

export function MonitoramentoView() {
  const { route, replace, navigate } = useRoute();
  const dark = useDark();
  const q = route.query;

  const periodo = parsePeriodo(q.periodo);
  const hoje = hojeIso();
  const iv = intervalo(periodo, hoje, q.de, q.ate);
  const recorte = parseRecorte(q.mov);

  const saude = useApi('saude', (signal) => source.saude(signal));
  const datas = useApi('datas:120', (signal) => source.datas({ limite: 120 }, signal));

  const lista = datas.data ?? [];
  const doPeriodo = filasNoPeriodo(lista, iv);
  const ultima = doPeriodo[doPeriodo.length - 1];
  const iUltima = ultima ? lista.findIndex((d) => d.dt_corte === ultima.dt_corte) : -1;
  const anterior = iUltima >= 0 ? lista[iUltima + 1] : undefined;
  const iPrimeira = doPeriodo[0] ? lista.findIndex((d) => d.dt_corte === doPeriodo[0].dt_corte) : -1;
  const antesDoPeriodo = iPrimeira >= 0 ? lista[iPrimeira + 1] : undefined;

  const resumo = useApi(ultima ? `resumo:${ultima.dt_corte}` : null, (signal) =>
    source.resumo({ data: ultima!.dt_corte }, signal),
  );

  const dts = [...(antesDoPeriodo ? [antesDoPeriodo.dt_corte] : []), ...doPeriodo.map((d) => d.dt_corte)];
  const filas = useFilas(datas.data ? dts : [], recorte);
  const mov = useMemo(
    () => (filas.filas ? calcularMovimento(filas.filas, Boolean(antesDoPeriodo)) : null),
    [filas.filas, antesDoPeriodo],
  );

  // `fila/datas` e `fila/resumo` não trazem `fila_atualizada`; a regra é a
  // mesma da API: só a última fila gravada pode estar em dia, e só se a saúde
  // disser que está.
  const ultimaGravada = saude.data?.ultima_fila ?? lista[0]?.dt_corte;
  const filaAtualizada =
    ultima && saude.data ? ultima.dt_corte === ultimaGravada && saude.data.fila_atualizada : undefined;

  const setQuery = (patch: Record<string, string | undefined>) => replace('monitoramento', undefined, { ...q, ...patch });
  const trocarPeriodo = (p: PeriodoKey) =>
    setQuery({
      periodo: p === PERIODO_PADRAO ? undefined : p,
      de: p === 'custom' ? (iv.inicio ?? hoje) : undefined,
      ate: p === 'custom' ? iv.fim : undefined,
    });

  const [sheet, setSheet] = useState<MetricSheetContent | null>(null);
  const [erroExport, setErroExport] = useState<string | null>(null);

  const abrirFaixa = (faixa: Faixa) => {
    if (!ultima) return;
    const meta = FAIXA_META[faixa];
    const chave = CHAVE[faixa];
    const valor = ultima[chave];
    const cursos = [...(resumo.data ?? [])].filter((r) => r[chave] > 0).sort((a, b) => b[chave] - a[chave]);
    const top = cursos.slice(0, 8);
    const demais = cursos.slice(8).reduce((s, r) => s + r[chave], 0);
    const rows = top.map((r) => ({
      key: r.curso ?? r.nome_curso ?? '—',
      label: nomeCurso(r),
      value: r[chave],
      percent: valor > 0 ? (r[chave] / valor) * 100 : 0,
      color: meta.hex(dark),
    }));
    if (demais > 0) {
      rows.push({
        key: '__demais',
        label: `Demais ${cursos.length - 8} cursos`,
        value: demais,
        percent: valor > 0 ? (demais / valor) * 100 : 0,
        color: 'var(--ink-4)',
      });
    }
    setSheet({
      eyebrow: `Fila de ${fullDate(ultima.dt_corte)}`,
      title: `Faixa ${meta.label}`,
      value: int(valor),
      denominator: `de ${int(ultima.total)} alunos nas três faixas da fila de ${shortDate(ultima.dt_corte)} (${percent((valor / ultima.total) * 100, 1)}).`,
      rowsLabel: 'Composição por curso',
      rows,
      emptyRows: resumo.error ? resumo.error.message : 'Sem alunos nesta faixa.',
      reading: (
        <>
          {meta.label}: {meta.regra}. Pela medição do TI (coorte {REFERENCIA_TI.coorte}), evadem de fato{' '}
          {meta.evadem} alunos desta faixa. É uma estimativa de risco, não uma certeza.
        </>
      ),
    });
  };

  const abrirTotal = () => {
    if (!ultima) return;
    setSheet({
      eyebrow: `Fila de ${fullDate(ultima.dt_corte)}`,
      title: 'Nas três faixas',
      value: int(ultima.total),
      denominator: `alunos na fila de ${shortDate(ultima.dt_corte)}, de ~${int(REFERENCIA_TI.base)} pontuados pelo job (base publicada pelo TI).`,
      rowsLabel: 'Composição por faixa',
      rows: FAIXA_ORDER.map((f) => ({
        key: f,
        label: FAIXA_META[f].label,
        value: ultima[CHAVE[f]],
        percent: ultima.total > 0 ? (ultima[CHAVE[f]] / ultima.total) * 100 : 0,
        color: FAIXA_META[f].hex(dark),
        meaning: `${FAIXA_META[f].regra} · evadem ${FAIXA_META[f].evadem}`,
      })),
      reading: (
        <>
          As faixas são definidas pela posição na fila, não por probabilidade: juntas, são os ~20% de maior risco. Quem
          não está nelas não está entre esses ~20% — o que não quer dizer risco nenhum.
        </>
      ),
    });
  };

  const dataEscolhida = ultima && ultima.dt_corte !== ultimaGravada && periodo === 'custom' ? ultima.dt_corte : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoramento"
        description={
          <DescricaoPagina>
            A fila de risco de evasão da graduação presencial, gerada pela machine learning do TI toda segunda e
            quinta.
          </DescricaoPagina>
        }
        actions={
          <ExportMenu
            tipo="monitoramento"
            query={q}
            disabled={!ultima}
            onErro={setErroExport}
          />
        }
      />

      {erroExport && (
        <Callout tone="crit" title="A exportação falhou">
          {erroExport}
        </Callout>
      )}

      {/* Período */}
      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="scroll-slim -mx-1 overflow-x-auto px-1 py-0.5">
            <Segmented<PeriodoKey>
              layoutId="periodo"
              value={periodo}
              onChange={trocarPeriodo}
              options={PERIODOS.map((p) => ({ value: p.key, label: p.label }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {periodo === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-[12px] font-medium text-ink-3">
                  De
                  <TextInput
                    type="date"
                    className="w-[150px] font-mono"
                    value={iv.inicio ?? ''}
                    max={hoje}
                    onChange={(e) => e.target.value && setQuery({ de: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-2 text-[12px] font-medium text-ink-3">
                  Até
                  <TextInput
                    type="date"
                    className="w-[150px] font-mono"
                    value={iv.fim}
                    max={hoje}
                    onChange={(e) => e.target.value && setQuery({ ate: e.target.value })}
                  />
                </label>
              </div>
            )}
            <p className="text-[12px] text-ink-3">
              {datas.data ? (
                doPeriodo.length ? (
                  <>
                    <span className="font-mono font-semibold text-ink">{int(doPeriodo.length)}</span>{' '}
                    {doPeriodo.length === 1 ? 'fila' : 'filas'} · {descreverIntervalo(periodo, iv)}
                  </>
                ) : (
                  'Nenhuma fila no período'
                )
              ) : (
                'Carregando filas…'
              )}
            </p>
          </div>
        </div>
      </Card>

      <FilaDesatualizada
        dtCorte={ultima?.dt_corte}
        filaAtualizada={filaAtualizada}
        dataEscolhida={dataEscolhida}
        onVerMaisRecente={() => replace('monitoramento', undefined, { mov: q.mov })}
      />

      {/* 1. Os quatro números da fila mais recente do período */}
      {datas.error ? (
        <Card>
          <LoadError error={datas.error} onRetry={datas.reload} compact />
        </Card>
      ) : !datas.data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-xl bg-surface p-4">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="mt-3 h-6 w-20" />
              <Skeleton className="mt-4 h-3 w-full" />
            </div>
          ))}
        </div>
      ) : !ultima ? (
        <Card>
          <EmptyState
            compact
            title="Nenhuma fila no período"
            message={
              lista.length
                ? `Não há fila gravada ${descreverIntervalo(periodo, iv)}. As filas saem às quartas e domingos.`
                : 'A API ainda não tem nenhuma fila gravada.'
            }
            action={
              <Button variant="secondary" size="sm" onClick={() => replace('monitoramento')}>
                Ver os últimos 3 meses
              </Button>
            }
          />
        </Card>
      ) : (
        <RevealGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FAIXA_ORDER.map((f) => {
            const meta = FAIXA_META[f];
            const valor = ultima[CHAVE[f]];
            const antes = anterior?.[CHAVE[f]];
            const delta = antes === undefined ? undefined : valor - antes;
            return (
              <RevealItem key={f} className="grid">
                <StatTile
                  label={meta.label}
                  value={<AnimatedNumber value={valor} />}
                  accent={meta.hex(dark)}
                  detail={ultima.total > 0 ? percent((valor / ultima.total) * 100, 1) : undefined}
                  onClick={() => abrirFaixa(f)}
                  footer={
                    <>
                      <span>evadem {meta.evadem}</span>
                      {delta !== undefined && anterior && (
                        <span title={`Contra a fila de ${fullDate(anterior.dt_corte)}`}>
                          <TrendIndicator trend={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'} delta={delta} />
                        </span>
                      )}
                    </>
                  }
                />
              </RevealItem>
            );
          })}
          <RevealItem className="grid">
            <StatTile
              label="Nas faixas"
              value={<AnimatedNumber value={ultima.total} />}
              icon={<Users className="h-4 w-4" />}
              onClick={abrirTotal}
              footer={<span>fila de {fullDate(ultima.dt_corte)}</span>}
            />
          </RevealItem>
        </RevealGroup>
      )}

      {/* 2. Movimento + há mais tempo */}
      {ultima && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Reveal>
            <MovimentoCard
              recorte={recorte}
              onRecorte={(v) => setQuery({ mov: v === 'CRITICA' ? undefined : v })}
              mov={mov}
              carregadas={filas.carregadas}
              total={filas.total}
              erro={filas.error}
              dark={dark}
              temAnterior={Boolean(antesDoPeriodo)}
            />
          </Reveal>
          <Reveal delay={0.05}>
            <MaisTempo
              mov={mov}
              recorte={recorte}
              onAbrir={(ra) => navigate('aluno', ra)}
            />
          </Reveal>
        </div>
      )}

      {/* 3. Cursos */}
      {ultima && (
        <Reveal>
          <Cursos
            titulo={`Cursos na fila de ${fullDate(ultima.dt_corte)}`}
            resumo={resumo.data}
            error={resumo.error}
            onRetry={resumo.reload}
            dark={dark}
            onVerAlunos={(r) =>
              navigate('alunos', undefined, {
                curso: r.curso ?? r.nome_curso ?? undefined,
                data: ultima.dt_corte === lista[0]?.dt_corte ? undefined : ultima.dt_corte,
              })
            }
          />
        </Reveal>
      )}

      {/* 4. Como ler + saúde */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Reveal>
          <ComoLer />
        </Reveal>
        <Reveal delay={0.05}>
          <Card className="h-full">
            <CardHeader title="Saúde da fila" subtitle="De fila/saude: a lista de hoje já saiu?" />
            <div className="mt-4">
              {saude.error ? (
                <LoadError error={saude.error} onRetry={saude.reload} compact />
              ) : !saude.data ? (
                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="mt-1.5 h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <DataList
                  columns={2}
                  items={[
                    {
                      label: 'Última fila',
                      value: saude.data.ultima_fila ? fullDate(saude.data.ultima_fila) : 'Sem fila gravada',
                      tone: saude.data.ultima_fila ? 'plain' : 'crit',
                    },
                    { label: 'Fila esperada', value: fullDate(saude.data.fila_esperada) },
                    {
                      label: 'Situação',
                      value: saude.data.fila_atualizada
                        ? 'Em dia'
                        : saude.data.dias_de_atraso
                          ? `${dias(saude.data.dias_de_atraso)} de atraso`
                          : 'Desatualizada',
                      tone: saude.data.fila_atualizada ? 'plain' : 'crit',
                    },
                    { label: 'Filas gravadas', value: int(saude.data.dias_gravados) },
                  ]}
                />
              )}
            </div>
            <div className="mt-5">
              <Callout tone="info" icon={<Info className="h-4 w-4" />}>
                O job roda segunda e quinta por volta das 06:30. Antes das 8h desses dias, a fila anterior ainda conta
                como em dia.
              </Callout>
            </div>
          </Card>
        </Reveal>
      </div>

      <MetricSheet content={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function nomeCurso(r: { nome_curso: string | null; curso: string | null }): string {
  return r.nome_curso ?? (r.curso ? `Curso ${r.curso}` : 'Curso não informado');
}

/* -- Movimento da fila --------------------------------------------------------- */

function MovimentoCard({
  recorte,
  onRecorte,
  mov,
  carregadas,
  total,
  erro,
  dark,
  temAnterior,
}: {
  recorte: RecorteFaixa;
  onRecorte: (v: string) => void;
  mov: ReturnType<typeof calcularMovimento> | null;
  carregadas: number;
  total: number;
  erro: ApiError | null;
  dark: boolean;
  temAnterior: boolean;
}) {
  const rr = rotuloRecorte(recorte);
  const [ocultas, setOcultas] = useState<Set<string>>(() => new Set());
  const cor = recorte ? FAIXA_META[recorte].hex(dark) : 'var(--ink-2)';

  const passos = (mov?.passos ?? []).filter((p) => p.anterior !== null);
  /* Uma série só. O tamanho da faixa é fixo pela regra (posição), então a
     cada aluno que entra, um sai: "entraram" e "saíram" seriam duas linhas
     exatamente uma sobre a outra. As saídas e quem continuou vão no tooltip. */
  const series: PlotSeries[] = [
    { key: 'entraram', label: 'Entraram', color: cor, values: passos.map((p) => p.entraram) },
  ];
  const ultimo = passos[passos.length - 1];
  const toggle = (k: string) =>
    setOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <Card className="h-full">
      <CardHeader
        title="Movimento da fila"
        subtitle={`Quantos alunos entraram ${rr} a cada fila. O tamanho da faixa é fixo pela regra do TI — para cada um que entra, um sai —, então o que esta linha mostra é quanto a faixa se renova.`}
      />
      <div className="mt-4">
        <Segmented size="xs" layoutId="recorte-mov" value={recorte ?? 'TODAS'} onChange={onRecorte} options={RECORTES} />
      </div>

      <div className="mt-5">
        {erro ? (
          <LoadError error={erro} compact title="Sem movimento" />
        ) : !mov ? (
          <div>
            <Skeleton className="h-[220px] w-full" />
            <p className="mt-3 text-[11.5px] text-ink-3" aria-live="polite">
              Lendo as filas do período: <span className="font-mono">{carregadas}</span> de{' '}
              <span className="font-mono">{total}</span>
            </p>
          </div>
        ) : passos.length === 0 ? (
          <EmptyState
            compact
            title="Sem fila anterior para comparar"
            message="O movimento aparece a partir da segunda fila gravada."
          />
        ) : (
          <LineChart
            series={series}
            labels={passos.map((p) => shortDate(p.dt))}
            fullLabels={passos.map(
              (p) => `${shortDate(p.dt)} · saíram ${int(p.sairam)} · continuaram ${int(p.continuaram)}`,
            )}
            hidden={ocultas}
            onToggleSeries={toggle}
            height={220}
            footnote={
              temAnterior
                ? `alunos por fila, contra a fila anterior`
                : 'a primeira fila do período não tem com o que comparar'
            }
          />
        )}
      </div>

      {mov && ultimo && (
        <div className="mt-5 border-t border-hairline pt-4">
          <DataList
            columns={4}
            items={[
              { label: `Entraram na última fila`, value: <span className="font-mono">{int(ultimo.entraram)}</span> },
              { label: `Saíram na última fila`, value: <span className="font-mono">{int(ultimo.sairam)}</span> },
              {
                label: 'Em todas as filas do período',
                value: <span className="font-mono">{int(mov.emTodas)}</span>,
              },
              {
                label: `Passaram ${rr}`,
                value: (
                  <span>
                    <span className="font-mono">{int(mov.distintos)}</span>{' '}
                    <span className="text-[11px] text-ink-3">alunos diferentes</span>
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}
    </Card>
  );
}

function MaisTempo({
  mov,
  recorte,
  onAbrir,
}: {
  mov: ReturnType<typeof calcularMovimento> | null;
  recorte: RecorteFaixa;
  onAbrir: (ra: string) => void;
}) {
  const rr = rotuloRecorte(recorte);
  return (
    <Card padded={false} className="h-full overflow-hidden">
      <div className="p-5 pb-3">
        <CardHeader
          title={`Há mais tempo ${rr}`}
          subtitle="Filas seguidas até a mais recente, contadas dentro do período escolhido."
        />
      </div>
      {!mov ? (
        <SkeletonRows rows={6}>{() => <Skeleton className="h-4 w-full" />}</SkeletonRows>
      ) : mov.maisTempo.length === 0 ? (
        <EmptyState compact title="Ninguém nesta faixa" message="A fila mais recente do período não tem alunos aqui." />
      ) : (
        <div className="divide-y divide-hairline border-t border-hairline">
          {mov.maisTempo.map((m) => (
            <ClickRow key={m.ra} onClick={() => onAbrir(m.ra)} tone={m.linha.chance_evasao === 'CRITICA' ? 'crit' : 'plain'}>
              <div className="flex items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold text-ink">{m.ra}</span>
                    <FaixaBadge faixa={m.linha.chance_evasao} />
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
                    {m.linha.nome_curso ?? 'Curso não informado'}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[13px] font-medium text-ink">{int(m.seguidas)}</span>
                  <span className="block text-[10.5px] text-ink-4">{m.seguidas === 1 ? 'fila' : 'filas'}</span>
                </span>
                <ChevronAffordance />
              </div>
            </ClickRow>
          ))}
        </div>
      )}
    </Card>
  );
}

/* -- Cursos ------------------------------------------------------------------ */

function Cursos({
  titulo,
  resumo,
  error,
  onRetry,
  dark,
  onVerAlunos,
}: {
  titulo: string;
  resumo: ResumoCurso[] | null;
  error: ApiError | null;
  onRetry: () => void;
  dark: boolean;
  onVerAlunos: (r: ResumoCurso) => void;
}) {
  const [busca, setBusca] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean } | null>(null);

  const linhas = useMemo(() => {
    const chave = searchKey(busca.trim());
    const filtradas = (resumo ?? []).filter(
      (r) => !chave || searchKey(r.nome_curso ?? '').includes(chave) || (r.curso ?? '') === busca.trim(),
    );
    if (!sort) return filtradas; // a ordem da API: mais alunos na Crítica primeiro
    return [...filtradas].sort((a, b) => (sort.asc ? a[sort.key] - b[sort.key] : b[sort.key] - a[sort.key]));
  }, [resumo, busca, sort]);

  const ordenar = (key: SortKey) =>
    setSort((s) => (s?.key === key ? { key, asc: !s.asc } : { key, asc: false }));

  const colunas: { key: SortKey; label: string }[] = [
    { key: 'critica', label: 'Crítica' },
    { key: 'alta', label: 'Alta' },
    { key: 'media', label: 'Média' },
    { key: 'total', label: 'Total' },
  ];

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <CardHeader
          title={titulo}
          subtitle="Quantos alunos de cada curso estão em cada faixa, de fila/resumo. A ordem inicial é a da API: mais alunos na Crítica primeiro."
        />
      </div>

      <TableTopBar>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 lg:w-auto lg:flex-1">
          <span className="text-[11px] font-medium text-ink-3">
            {resumo ? `${int(linhas.length)} ${linhas.length === 1 ? 'curso' : 'cursos'}` : 'Cursos'}
          </span>
          <SearchInput
            value={busca}
            onValueChange={setBusca}
            placeholder="Buscar curso…"
            className="w-full min-w-0 sm:w-64"
          />
        </div>
        <div className="flex items-center gap-4 lg:gap-0">
          {colunas.map((c) => (
            <SortHeader
              key={c.key}
              label={c.label}
              active={sort?.key === c.key}
              asc={sort?.asc ?? false}
              onClick={() => ordenar(c.key)}
              className="lg:w-16"
            />
          ))}
          <span className="hidden w-[208px] lg:block" aria-hidden="true" />
        </div>
      </TableTopBar>

      {error ? (
        <LoadError error={error} onRetry={onRetry} />
      ) : !resumo ? (
        <SkeletonRows rows={8}>
          {() => (
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-56 lg:block" />
              <Skeleton className="h-2 w-24" />
            </div>
          )}
        </SkeletonRows>
      ) : linhas.length === 0 ? (
        <EmptyState
          compact
          title="Nenhum curso encontrado"
          message={busca ? `Nenhum curso com "${busca}" nesta fila.` : 'Esta fila não tem alunos nas faixas.'}
          action={
            busca ? (
              <Button variant="ghost" size="sm" onClick={() => setBusca('')}>
                Limpar busca
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {linhas.map((r) => (
            <li key={r.curso ?? r.nome_curso ?? 'sem-curso'} className="px-5 py-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-0">
                <div className="flex min-w-0 flex-1 items-center gap-2 lg:pr-4">
                  <span className="min-w-0 truncate text-[13px] font-semibold text-ink" title={nomeCurso(r)}>
                    {nomeCurso(r)}
                  </span>
                  {r.curso && (
                    <Pill dot={false} mono>
                      {r.curso}
                    </Pill>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:flex-nowrap lg:gap-0">
                  <Numero valor={r.critica} rotulo="Crítica" destaque />
                  <Numero valor={r.alta} rotulo="Alta" />
                  <Numero valor={r.media} rotulo="Média" />
                  <Numero valor={r.total} rotulo="Total" forte />
                  <div className="w-full lg:ml-6 lg:w-24">
                    <StackedBar
                      height={6}
                      segments={FAIXA_ORDER.map((f) => ({
                        key: f,
                        label: FAIXA_META[f].label,
                        value: r[CHAVE[f]],
                        color: FAIXA_META[f].hex(dark),
                      }))}
                    />
                  </div>
                  <div className="hidden lg:ml-3 lg:block">
                    <Button variant="ghost" size="xs" onClick={() => onVerAlunos(r)}>
                      Ver alunos
                    </Button>
                  </div>
                </div>
                <div className="lg:hidden">
                  <Button variant="ghost" size="xs" className="-ml-3" onClick={() => onVerAlunos(r)}>
                    Ver alunos
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Um número da linha: mono, alinhado à direita, com o rótulo só abaixo de `lg`. */
function Numero({
  valor,
  rotulo,
  destaque = false,
  forte = false,
}: {
  valor: number;
  rotulo: string;
  destaque?: boolean;
  forte?: boolean;
}) {
  // Sem trilho vermelho nesta tabela: "curso crítico" exigiria um limiar, e
  // limiar seria régua inventada. A Crítica > 0 fica em tinta crítica, e só.
  const tinta =
    destaque && valor > 0 ? 'font-semibold text-crit-ink' : forte ? 'font-medium text-ink' : 'text-ink-2';
  return (
    <span className="flex items-baseline gap-1 lg:block lg:w-16 lg:text-right">
      <span className="text-[11px] text-ink-4 lg:hidden">{rotulo}</span>
      <span className={`font-mono text-[13px] ${tinta}`}>{int(valor)}</span>
    </span>
  );
}

/* -- Como ler as faixas ------------------------------------------------------ */

function ComoLer() {
  return (
    <Card>
      <CardHeader
        title="Como ler as faixas"
        subtitle="As regras e os números publicados pelo TI. A faixa é definida pela posição na fila do dia, não por probabilidade."
      />
      <div className="mt-4 divide-y divide-hairline">
        <div className="hidden grid-cols-[120px_minmax(0,1fr)_120px_140px] gap-4 pb-2 text-[11px] font-medium text-ink-4 md:grid">
          <span>Faixa</span>
          <span>Quem entra</span>
          <span className="text-right">Tamanho típico</span>
          <span className="text-right">Evadem de fato*</span>
        </div>
        {FAIXA_ORDER.map((f) => {
          const meta = FAIXA_META[f];
          return (
            <div
              key={f}
              className="grid grid-cols-2 gap-x-4 gap-y-1 py-3 md:grid-cols-[120px_minmax(0,1fr)_120px_140px] md:items-center"
            >
              <FaixaBadge faixa={f} />
              <span className="text-right text-[12px] text-ink-2 md:text-left md:text-[13px]">{meta.regra}</span>
              <span className="text-[12px] text-ink-3 md:text-right">
                <span className="md:hidden">Tamanho típico </span>
                <span className="font-mono text-ink">{int(meta.tamanhoTipico)}</span>
              </span>
              <span className="text-right text-[12px] text-ink-3">
                <span className="md:hidden">Evadem </span>
                <span className="font-medium text-ink">{meta.evadem}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-2 border-t border-hairline pt-4 text-[12px] leading-relaxed text-ink-3">
        <p>
          * Média de evasão da base: {decimal(REFERENCIA_TI.evasaoMediaBase, 1)}% (coorte {REFERENCIA_TI.coorte},
          medição do TI).
        </p>
        <p>{AVISO_FAIXA}</p>
      </div>
    </Card>
  );
}
