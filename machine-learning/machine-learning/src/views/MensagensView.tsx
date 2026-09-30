import { useRef, useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Badges';
import { AnimatedNumber } from '../components/ui/Charts';
import { Chip, Select } from '../components/ui/Fields';
import { Callout, Card, ChevronAffordance, EmptyState, PageHeader, StatTile } from '../components/ui/Surfaces';
import { DescricaoPagina } from '../components/brand/GoldRule';
import { ExportMenu } from '../components/data/ExportMenu';
import { ClickRow, LoadError, Pagination, Skeleton, SkeletonRows, TableTopBar } from '../components/data/Table';
import { FaixaBadge } from '../domain/FaixaBadge';
import { FilaDesatualizada } from '../domain/FilaDesatualizada';
import { FAIXA_META, FAIXA_ORDER } from '../domain/faixas';
import { rotuloFila } from '../domain/fila';
import { FAIXAS } from '../api/types';
import type { Faixa } from '../api/types';
import { mensagemPushDemo } from '../domain/mensagemDemo';
import { disparosSource } from '../api/disparos';
import type { Disparo, DisparosParams, StatusDisparo } from '../api/disparos';
import { source } from '../api/source';
import { useApi } from '../api/useApi';
import { fullDate, int, stamp } from '../lib/format';
import { listParam, pageParam, useRoute } from '../lib/router';

/* ==========================================================================
   Mensagens enviadas — "quem recebeu a mensagem de triagem desta fila?"
   --------------------------------------------------------------------------
   SÓ LEITURA. Não há botão de envio e nada aqui chama `disparos/enviar` —
   aquela rota manda push + e-mail de verdade para alunos.

   A tabela ANC_ML_RISCO_DISPARO existe, mas o TI ainda não publicou a rota de
   leitura: a tela roda sobre o contrato PROPOSTO (api/disparos.ts). Em modo
   `api`, ela diz isso e mais nada.
   ========================================================================== */

const POR_PAGINA = 50;
const ORDEM_STATUS = ['ENVIADO', 'ENVIANDO', 'FALHA'];

function rotuloStatus(s: StatusDisparo): string {
  if (s === 'ENVIADO') return 'Envio registrado';
  if (s === 'ENVIANDO') return 'Em andamento';
  if (s === 'FALHA') return 'Falha';
  return s;
}

function StatusBadge({ status }: { status: StatusDisparo }) {
  if (status === 'FALHA')
    return (
      <Pill tone="crit" solid>
        Falha
      </Pill>
    );
  if (status === 'ENVIANDO') return <Pill tone="warn">Em andamento</Pill>;
  // O estado saudável não tem ponto: só a palavra, quieta.
  return <span className="text-[12px] font-medium whitespace-nowrap text-ink-3">{rotuloStatus(status)}</span>;
}

const DESCRICAO =
  'Acompanhe os disparos de triagem por fila e abra o histórico de mensagens de cada aluno.';

export function MensagensView() {
  if (!disparosSource.disponivel) {
    return (
      <div className="space-y-5">
        <PageHeader title="Mensagens enviadas" description={<DescricaoPagina>{DESCRICAO}</DescricaoPagina>} />
        <Card>
          <EmptyState
            icon={<Send className="h-5 w-5" />}
            title="Leitura dos envios indisponível"
            message="A leitura dos envios ainda não está disponível na API. O TI registra quem recebeu a mensagem na tabela ANC_ML_RISCO_DISPARO; falta a rota de consulta."
          />
        </Card>
      </div>
    );
  }
  return <MensagensDisponiveis />;
}

function MensagensDisponiveis() {
  const { route, navigate, replace } = useRoute();
  const q = route.query;

  const faixas = listParam(q, 'faixa').filter((f): f is Faixa => (FAIXAS as readonly string[]).includes(f));
  const status = listParam(q, 'status').map((s) => s.toUpperCase());
  const data = q.data;
  const pagina = pageParam(q);

  const params: DisparosParams = {
    data,
    faixa: faixas.length ? faixas : undefined,
    status: status.length ? status : undefined,
    pagina,
    limite: POR_PAGINA,
  };

  const datas = useApi('datas:60', (signal) => source.datas({ limite: 60 }, signal));
  const disp = useApi(`disparos:${JSON.stringify(params)}`, (signal) => disparosSource.listar(params, signal));

  const setFiltro = (patch: Record<string, string | undefined>) =>
    replace('mensagens', undefined, { ...q, ...patch, pagina: undefined });

  const toggle = (key: 'faixa' | 'status', valor: string, atuais: string[], ordem: readonly string[]) => {
    const next = atuais.includes(valor) ? atuais.filter((x) => x !== valor) : [...atuais, valor];
    const ordenados = [...next].sort((a, b) => {
      const ia = ordem.indexOf(a);
      const ib = ordem.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    setFiltro({ [key]: ordenados.join(',') || undefined });
  };

  const lista = datas.data ?? [];
  const resp = disp.data;
  const dtCorte = resp?.dt_corte ?? data ?? lista[0]?.dt_corte;
  const temFiltro = faixas.length > 0 || status.length > 0 || Boolean(data);

  const resumo = resp?.resumo ?? {};
  const falhas = resumo.FALHA ?? 0;
  const andamento = resumo.ENVIANDO ?? 0;
  // Só o mock usa ENVIADO. Status desconhecido não deve contar como sucesso.
  const enviados = resumo.ENVIADO ?? 0;
  const statusDisponiveis = [
    ...ORDEM_STATUS.filter((s) => s in resumo || status.includes(s)),
    ...Object.keys(resumo).filter((s) => !ORDEM_STATUS.includes(s)),
  ];

  const [erroExport, setErroExport] = useState<string | null>(null);

  const tabelaRef = useRef<HTMLDivElement>(null);
  const irParaPagina = (p: number) => {
    navigate('mensagens', undefined, { ...q, pagina: p > 1 ? p : undefined });
    const top = tabelaRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) tabelaRef.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mensagens enviadas"
        description={<DescricaoPagina>{DESCRICAO}</DescricaoPagina>}
        actions={
          <>
            <div className="w-[236px]">
              <Select
                aria-label="Fila"
                value={dtCorte ?? ''}
                disabled={!lista.length}
                onChange={(e) => setFiltro({ data: e.target.value === lista[0]?.dt_corte ? undefined : e.target.value })}
              >
                {!lista.length && <option value="">Carregando filas…</option>}
                {data && lista.length > 0 && !lista.some((d) => d.dt_corte === data) && (
                  <option value={data}>{rotuloFila(data)}</option>
                )}
                {lista.map((d) => (
                  <option key={d.dt_corte} value={d.dt_corte}>
                    {rotuloFila(d.dt_corte)}
                  </option>
                ))}
              </Select>
            </div>
            <ExportMenu tipo="mensagens" query={q} disabled={!resp || resp.total === 0} onErro={setErroExport} />
          </>
        }
      />

      <Callout tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
        <span className="font-semibold text-warn-ink">Demonstração com dados fictícios.</span> O conteúdo dos
        pushes é ilustrativo. O status de envio não confirma entrega no aparelho.
      </Callout>

      {erroExport && <Callout tone="crit" title="A exportação falhou">{erroExport}</Callout>}

      <FilaDesatualizada
        dtCorte={resp?.dt_corte}
        filaAtualizada={resp?.fila_atualizada}
        dataEscolhida={data}
        onVerMaisRecente={() => setFiltro({ data: undefined })}
      />

      {/* Números do envio */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {!resp ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl bg-surface p-4">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="mt-3 h-6 w-16" />
              <Skeleton className="mt-4 h-3 w-full" />
            </div>
          ))
        ) : (
          <>
            <StatTile
              label="Envios registrados"
              value={<AnimatedNumber value={enviados} />}
              footer={<span>fila de {fullDate(resp.dt_corte)}</span>}
            />
            <StatTile
              label="Falhas"
              value={<AnimatedNumber value={falhas} />}
              accent={falhas > 0 ? 'var(--crit)' : undefined}
              footer={<span>quem falhou pode receber se o envio da fila for repetido</span>}
            />
            <StatTile
              label="Em andamento"
              value={<AnimatedNumber value={andamento} />}
              footer={<span>status ENVIANDO</span>}
            />
          </>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Faixa">
            <span className="mr-1 text-[12px] font-medium text-ink-3">Faixa</span>
            {FAIXA_ORDER.map((f) => (
              <Chip
                key={f}
                active={faixas.includes(f)}
                tone={f === 'CRITICA' ? 'crit' : 'neutral'}
                onClick={() => toggle('faixa', f, faixas, FAIXA_ORDER)}
              >
                {FAIXA_META[f].label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status">
            <span className="mr-1 text-[12px] font-medium text-ink-3">Status</span>
            {statusDisponiveis.map((s) => (
              <Chip
                key={s}
                active={status.includes(s)}
                tone={s === 'FALHA' ? 'crit' : 'neutral'}
                count={resumo[s]}
                onClick={() => toggle('status', s, status, ORDEM_STATUS)}
              >
                {rotuloStatus(s)}
              </Chip>
            ))}
          </div>
          {temFiltro && (
            <Button variant="ghost" size="sm" className="lg:ml-auto" onClick={() => replace('mensagens')}>
              Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Tabela */}
      <div ref={tabelaRef} className="scroll-mt-24">
        <Card padded={false} className="overflow-hidden">
          <TableTopBar>
            <span className="text-[11px] font-medium text-ink-3">
              {resp ? `${int(resp.total)} ${resp.total === 1 ? 'registro' : 'registros'}` : 'Registros'}
            </span>
            <span className="text-[11px] text-ink-3">Abra um RA para ver o texto do push na linha do tempo</span>
          </TableTopBar>

          {disp.error ? (
            <LoadError error={disp.error} onRetry={disp.reload} />
          ) : !resp ? (
            <SkeletonRows rows={8}>
              {() => (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-1.5 h-3.5 w-48 lg:mt-0 lg:h-4 lg:w-16" />
                    <Skeleton className="hidden h-4 w-24 lg:block" />
                    <Skeleton className="hidden h-4 flex-1 lg:block" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              )}
            </SkeletonRows>
          ) : resp.disparos.length === 0 ? (
            <EmptyState
              title="Nenhum envio com esses filtros."
              message="Não há registros de disparo com a faixa e o status escolhidos."
              action={
                temFiltro ? (
                  <Button variant="secondary" size="sm" onClick={() => replace('mensagens')}>
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="divide-y divide-hairline">
                {resp.disparos.map((d) => (
                  <LinhaDisparo key={`${d.dt_corte}-${d.aluno}`} d={d} onAbrir={() => navigate('aluno', d.aluno, { ...q, origem: 'mensagens', aba: 'mensagens' })} />
                ))}
              </div>
              <Pagination page={pagina} pageSize={POR_PAGINA} total={resp.total} onPage={irParaPagina} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function LinhaDisparo({ d, onAbrir }: { d: Disparo; onAbrir: () => void }) {
  const conteudo = source.kind === 'mock' ? mensagemPushDemo(d.chance_evasao) : null;
  return (
    <ClickRow onClick={onAbrir} tone={d.status === 'FALHA' ? 'crit' : 'plain'}>
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-5">
          <div className="flex items-center gap-3 lg:contents">
            <span className="shrink-0 font-mono text-[13.5px] font-semibold text-ink lg:w-24">{d.aluno}</span>
            <span className="hidden w-24 shrink-0 lg:block">
              <FaixaBadge faixa={d.chance_evasao} />
            </span>
            <span className="ml-auto shrink-0 lg:ml-0 lg:w-32">
              <StatusBadge status={d.status} />
            </span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-3 lg:mt-0 lg:flex-1">
            <span className="lg:hidden">
              <FaixaBadge faixa={d.chance_evasao} />
            </span>
            <span className="shrink-0 font-mono text-[10.5px] text-ink-4 lg:w-28">
              {d.enviado_em ? stamp(d.enviado_em) : '—'}
            </span>
            {d.external_id && (
              <span className="hidden min-w-0 truncate font-mono text-[10.5px] text-ink-4 sm:block" title={d.external_id}>
                {d.external_id}
              </span>
            )}
          </div>
          {conteudo && <p className="mt-1.5 truncate text-[11px] text-ink-3 lg:mt-1">Push no app · {conteudo.titulo}</p>}
        </div>
        <ChevronAffordance />
      </div>
    </ClickRow>
  );
}
