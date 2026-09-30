import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Badges';
import { Chip, SearchInput, Select } from '../components/ui/Fields';
import { Hint } from '../components/ui/Hint';
import { Callout, Card, ChevronAffordance, EmptyState, PageHeader } from '../components/ui/Surfaces';
import { DescricaoPagina } from '../components/brand/GoldRule';
import { ExportMenu } from '../components/data/ExportMenu';
import { ClickRow, LoadError, Pagination, Skeleton, SkeletonRows, TableTopBar } from '../components/data/Table';
import { ConsultaRa } from '../domain/ConsultaRa';
import { FaixaBadge } from '../domain/FaixaBadge';
import { FilaDesatualizada } from '../domain/FilaDesatualizada';
import { FAIXA_META, FAIXA_ORDER } from '../domain/faixas';
import { rotuloFila } from '../domain/fila';
import { FAIXAS } from '../api/types';
import type { AlunoFila, Faixa, ListarParams } from '../api/types';
import { source } from '../api/source';
import { useApi } from '../api/useApi';
import { fullDate, int } from '../lib/format';
import { listParam, pageParam, useRoute } from '../lib/router';

/* ==========================================================================
   Alunos em risco — "quem está em cada faixa?"
   --------------------------------------------------------------------------
   A lista é `alunos/listar` com os filtros da URL (faixa, curso, data,
   pagina). Todo filtro reinicia a página e é escrito na URL com `replace`, então
   um link reproduz exatamente a tela. A consulta por RA no topo é o que atende
   "ver a chance de evasão de TODOS os alunos": a lista tem os ~1.886 das faixas,
   a consulta responde por qualquer um da graduação presencial.
   ========================================================================== */

const POR_PAGINA = 50;

export function AlunosView() {
  const { route, navigate, replace } = useRoute();
  const q = route.query;

  const faixas = listParam(q, 'faixa').filter((f): f is Faixa => (FAIXAS as readonly string[]).includes(f));
  const curso = q.curso ?? '';
  const data = q.data;
  const pagina = pageParam(q);

  const params: ListarParams = {
    faixa: faixas.length ? faixas : undefined,
    curso: curso || undefined,
    data,
    pagina,
    limite: POR_PAGINA,
  };

  const datas = useApi('datas:60', (signal) => source.datas({ limite: 60 }, signal));
  const listar = useApi(`listar:${JSON.stringify(params)}`, (signal) => source.listar(params, signal));

  const setFiltro = (patch: Record<string, string | undefined>) =>
    replace('alunos', undefined, { ...q, ...patch, pagina: undefined });

  /* Curso: campo livre com debounce de 350 ms, enviado à API como `curso`.
     O timeout lê a query MAIS RECENTE (ref): um chip clicado durante a espera
     não pode ser desfeito quando o curso for gravado. */
  const [cursoTexto, setCursoTexto] = useState(curso);
  const qRef = useRef(q);
  qRef.current = q;
  const cursoTextoRef = useRef(cursoTexto);
  cursoTextoRef.current = cursoTexto;
  useEffect(() => {
    // Só sincroniza de fora (Limpar filtros, link) — nunca apaga o espaço que
    // a pessoa acabou de digitar.
    if (cursoTextoRef.current.trim() !== curso) setCursoTexto(curso);
  }, [curso]);
  useEffect(() => {
    const valor = cursoTexto.trim();
    if (valor === (qRef.current.curso ?? '')) return;
    const t = setTimeout(
      () => replace('alunos', undefined, { ...qRef.current, curso: valor || undefined, pagina: undefined }),
      350,
    );
    return () => clearTimeout(t);
  }, [cursoTexto, replace]);

  const temFiltro = faixas.length > 0 || Boolean(curso) || Boolean(data);
  const limpar = () => {
    setCursoTexto('');
    replace('alunos');
  };

  const toggleFaixa = (f: Faixa) => {
    const next = faixas.includes(f) ? faixas.filter((x) => x !== f) : [...faixas, f];
    setFiltro({ faixa: FAIXA_ORDER.filter((x) => next.includes(x)).join(',') || undefined });
  };

  const lista = datas.data ?? [];
  const resp = listar.data;
  const dtCorte = resp?.dt_corte ?? data ?? lista[0]?.dt_corte;
  const contagem = lista.find((d) => d.dt_corte === dtCorte);

  const [erroExport, setErroExport] = useState<string | null>(null);

  const tabelaRef = useRef<HTMLDivElement>(null);
  const irParaPagina = (p: number) => {
    navigate('alunos', undefined, { ...q, pagina: p > 1 ? p : undefined });
    const top = tabelaRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) tabelaRef.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alunos em risco"
        description={
          <DescricaoPagina>
            Os alunos nas três faixas da fila {dtCorte ? `de ${fullDate(dtCorte)}` : 'mais recente'}. Quem não aparece
            aqui não está entre os ~20% de maior risco — consulte qualquer RA pela busca.
          </DescricaoPagina>
        }
        actions={
          <ExportMenu
            tipo="alunos"
            query={q}
            disabled={!resp || resp.total === 0}
            label={resp ? `Exportar ${int(resp.total)} ${resp.total === 1 ? 'aluno' : 'alunos'}` : 'Exportar'}
            onErro={setErroExport}
          />
        }
      />

      {erroExport && <Callout tone="crit" title="A exportação falhou">{erroExport}</Callout>}

      <FilaDesatualizada
        dtCorte={resp?.dt_corte}
        filaAtualizada={resp?.fila_atualizada}
        dataEscolhida={data}
        onVerMaisRecente={() => setFiltro({ data: undefined })}
      />

      {/* Consulta por RA — a única primary da tela */}
      <Card>
        <p className="text-[13px] font-semibold text-ink">Consultar um aluno</p>
        <p className="mt-1 mb-3 text-[12px] leading-relaxed text-ink-3">
          A situação de qualquer aluno da graduação presencial, esteja ou não nas faixas. Aceita o RA sem o zero à
          esquerda ou com ponto e traço.
        </p>
        <ConsultaRa onConsultar={(ra) => navigate('aluno', ra, q)} />
      </Card>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Faixa">
            {FAIXA_ORDER.map((f) => (
              <Chip
                key={f}
                active={faixas.includes(f)}
                onClick={() => toggleFaixa(f)}
                tone={f === 'CRITICA' ? 'crit' : 'neutral'}
                count={contagem ? contagem[f === 'CRITICA' ? 'critica' : f === 'ALTA' ? 'alta' : 'media'] : undefined}
              >
                {FAIXA_META[f].label}
              </Chip>
            ))}
          </div>
          <SearchInput
            value={cursoTexto}
            onValueChange={setCursoTexto}
            placeholder="Curso: código ou trecho do nome"
            className="min-w-[240px] flex-1"
          />
          <div className="w-full lg:w-[236px]">
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
          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={limpar}>
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
              {resp ? `${int(resp.total)} ${resp.total === 1 ? 'aluno' : 'alunos'}` : 'Alunos'}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
              Posição = lugar na fila geral da escola, todos os cursos
              <Hint label="a posição" align="right">
                A posição conta todos os cursos da graduação presencial, não só o filtrado. Se o primeiro aluno de um
                curso é o nº 11, há 10 alunos de outros cursos com risco maior na fila.
              </Hint>
            </span>
          </TableTopBar>

          {listar.error ? (
            <LoadError error={listar.error} onRetry={listar.reload} />
          ) : !resp ? (
            <SkeletonRows rows={8}>
              {() => (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-5">
                    <Skeleton className="hidden h-4 w-10 lg:block" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-1.5 h-3.5 w-56 lg:mt-0 lg:h-4 lg:flex-1" />
                    <Skeleton className="hidden h-4 w-16 lg:block" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              )}
            </SkeletonRows>
          ) : resp.alunos.length === 0 ? (
            <EmptyState
              title="Nenhum aluno nas faixas com esses filtros."
              message={
                resp.total > 0
                  ? 'Esta página não existe para o filtro atual.'
                  : 'Quem não está nas faixas pode ser consultado pelo RA, no topo da tela.'
              }
              action={
                temFiltro || pagina > 1 ? (
                  <Button variant="secondary" size="sm" onClick={limpar}>
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="divide-y divide-hairline">
                {resp.alunos.map((a) => (
                  <LinhaAluno key={a.aluno} aluno={a} onAbrir={() => navigate('aluno', a.aluno, q)} />
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

function LinhaAluno({ aluno: a, onAbrir }: { aluno: AlunoFila; onAbrir: () => void }) {
  const nome = a.nome_curso ?? 'Curso não informado';
  return (
    <ClickRow onClick={onAbrir} tone={a.chance_evasao === 'CRITICA' ? 'crit' : 'plain'}>
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-5">
          <div className="flex items-center gap-3 lg:contents">
            <span className="hidden w-14 shrink-0 font-mono text-[12px] text-ink-3 lg:block">#{a.posicao}</span>
            <span className="shrink-0 font-mono text-[13.5px] font-semibold text-ink lg:w-24">{a.aluno}</span>
            <span className="ml-auto lg:hidden">
              <FaixaBadge faixa={a.chance_evasao} />
            </span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 lg:mt-0 lg:flex-1">
            <span className="shrink-0 font-mono text-[11px] text-ink-4 lg:hidden">#{a.posicao}</span>
            <span className="min-w-0 truncate text-[12px] text-ink-3 lg:text-[13px] lg:text-ink-2" title={nome}>
              {nome}
            </span>
            {a.curso && (
              <Pill dot={false} mono>
                {a.curso}
              </Pill>
            )}
          </div>
          <span className="hidden w-24 shrink-0 lg:block">
            <FaixaBadge faixa={a.chance_evasao} />
          </span>
        </div>
        <ChevronAffordance />
      </div>
    </ClickRow>
  );
}
