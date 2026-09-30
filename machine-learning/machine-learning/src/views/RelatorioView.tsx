import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Badges';
import { Skeleton } from '../components/ui/Surfaces';
import { AnchietaLogo } from '../components/brand/AnchietaLogo';
import { GoldRule } from '../components/brand/GoldRule';
import { LoadError } from '../components/data/Table';
import { FaixaBadge } from '../domain/FaixaBadge';
import type { Faixa } from '../api/types';
import { toApiError } from '../api/client';
import type { ApiError } from '../api/client';
import { isTipoRelatorio, montarRelatorio } from '../export/relatorios';
import type { Celula, Coluna, Relatorio, Secao } from '../export/modelo';
import { fullDate, int } from '../lib/format';
import { useRoute } from '../lib/router';
import '../report.css';

/* ==========================================================================
   Prévia do relatório — a folha que vira PDF
   --------------------------------------------------------------------------
   Fora do shell (sem sidebar, sem header): o que se vê é o que sai. O botão
   usa a impressão do navegador ("Salvar como PDF"), que mantém o texto
   selecionável e a tipografia do sistema — um PDF desenhado em canvas sairia
   como imagem.

   A folha é papel: enquanto ela está aberta, o tema fica claro, e volta ao
   que era na saída.
   ========================================================================== */

export function RelatorioView() {
  const { route, navigate } = useRoute();
  const tipo = route.param;
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState<ApiError | null>(null);
  const [progresso, setProgresso] = useState('Preparando o relatório…');
  const [nonce, setNonce] = useState(0);
  const chave = JSON.stringify(route.query);

  useEffect(() => {
    const root = document.documentElement;
    const escuro = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    return () => {
      if (escuro) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      }
    };
  }, []);

  useEffect(() => {
    if (!isTipoRelatorio(tipo)) {
      setErro(toApiError(new Error('Relatório desconhecido.')));
      return;
    }
    const controller = new AbortController();
    setRel(null);
    setErro(null);
    montarRelatorio(tipo, undefined, route.query, controller.signal, setProgresso).then(
      (r) => !controller.signal.aborted && setRel(r),
      (e: unknown) => !controller.signal.aborted && setErro(toApiError(e)),
    );
    return () => controller.abort();
    // `chave` resume a query.
  }, [tipo, chave, nonce]);

  // O nome sugerido do PDF é o título do documento.
  useEffect(() => {
    if (!rel) return;
    const antes = document.title;
    document.title = rel.arquivo;
    return () => {
      document.title = antes;
    };
  }, [rel]);

  const voltar = () => {
    const { ra, ...resto } = route.query;
    if (tipo === 'aluno' && ra) navigate('aluno', ra, resto);
    else if (tipo === 'alunos' || tipo === 'mensagens') navigate(tipo, undefined, route.query);
    else navigate('monitoramento', undefined, route.query);
  };

  return (
    <div className="relatorio-fundo min-h-screen bg-canvas px-4 py-6 sm:px-8">
      <div className="mx-auto mb-5 flex max-w-[1080px] items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={voltar}>
          Voltar
        </Button>
        <Button
          variant="primary"
          size="md"
          icon={<Printer className="h-4 w-4" />}
          disabled={!rel}
          onClick={() => window.print()}
        >
          Imprimir ou salvar em PDF
        </Button>
      </div>

      <article className="relatorio-folha mx-auto max-w-[1080px] rounded-xl bg-surface p-6 sm:p-10">
        {erro ? (
          <LoadError error={erro} onRetry={() => setNonce((n) => n + 1)} title="Não foi possível montar o relatório" />
        ) : !rel ? (
          <Carregando texto={progresso} />
        ) : (
          <Folha rel={rel} />
        )}
      </article>
    </div>
  );
}

function Carregando({ texto }: { texto: string }) {
  return (
    <div aria-busy="true">
      <div className="flex items-center justify-between border-b border-hairline pb-5">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="mt-8 h-8 w-80" />
      <Skeleton className="mt-3 h-4 w-96" />
      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
      <p className="mt-8 text-[12px] text-ink-3">{texto}</p>
    </div>
  );
}

function Folha({ rel }: { rel: Relatorio }) {
  const gerado = `Gerado em ${rel.geradoEm.toLocaleDateString('pt-BR')} às ${rel.geradoEm.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })} por ${rel.geradoPor}`;

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <AnchietaLogo className="h-11 w-auto" />
          <div>
            <p className="text-[13.5px] font-semibold text-ink">Triagem de Evasão</p>
            <p className="text-[12px] text-ink-3">UniAnchieta · Graduação Presencial</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-[13px] font-semibold text-ink">{rel.tipoLabel}</p>
          <p className="mt-0.5 text-[11.5px] text-ink-3">{gerado}</p>
        </div>
      </header>

      <div className="mt-8">
        <h1 className="text-[24px] leading-[1.15] font-semibold text-ink sm:text-[30px]">{rel.titulo}</h1>
        <GoldRule className="mt-3" />
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-ink-2">{rel.subtitulo}</p>
        {rel.ficticio && (
          <p className="mt-2">
            <Pill tone="crit" solid>
              Dados fictícios (esboço) — nada aqui é resultado real
            </Pill>
          </p>
        )}
      </div>

      <dl className="relatorio-bloco mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        {rel.indicadores.map((ind) => (
          <div key={ind.rotulo} className="min-w-0">
            <dd
              className="font-mono text-[28px] leading-none font-medium tracking-tight text-ink"
              style={ind.cor ? { color: ind.cor } : undefined}
            >
              {ind.valor}
            </dd>
            <dt className="mt-2 text-[12px] font-medium text-ink-2">{ind.rotulo}</dt>
            {ind.detalhe && <p className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{ind.detalhe}</p>}
          </div>
        ))}
      </dl>

      {rel.secoes.map((s) => (
        <SecaoTabela key={s.aba} secao={s} />
      ))}

      <footer className="relatorio-bloco mt-10 space-y-1.5 border-t border-hairline pt-4">
        {rel.notas.map((n) => (
          <p key={n} className="text-[11.5px] leading-relaxed text-ink-3">
            {n}
          </p>
        ))}
      </footer>
    </>
  );
}

const DIREITA = new Set(['numero', 'posicao', 'percent']);

function valor(col: Coluna, v: Celula) {
  if (v === null || v === '') return <span className="text-ink-4">—</span>;
  switch (col.tipo) {
    case 'numero':
      return <span className="font-mono">{typeof v === 'number' ? int(v) : v}</span>;
    case 'posicao':
      return <span className="font-mono">#{v}</span>;
    case 'percent':
      return <span className="font-mono">{typeof v === 'number' ? `${(v * 100).toFixed(1).replace('.', ',')}%` : v}</span>;
    case 'data':
      return <span className="font-mono">{fullDate(String(v))}</span>;
    case 'datahora': {
      const d = new Date(String(v));
      return (
        <span className="font-mono">
          {Number.isNaN(d.getTime())
            ? String(v)
            : `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
        </span>
      );
    }
    case 'faixa':
      return <FaixaBadge faixa={(v as Faixa) ?? null} />;
    case 'status':
      return v === 'FALHA' ? (
        <Pill tone="crit" solid>
          Falha
        </Pill>
      ) : v === 'ENVIANDO' ? (
        <Pill tone="warn">Em andamento</Pill>
      ) : (
        <span className="text-ink-3">{v === 'ENVIADO' ? 'Enviado' : v}</span>
      );
    case 'mono':
      return <span className="font-mono">{v}</span>;
    default:
      return <span>{v}</span>;
  }
}

function SecaoTabela({ secao }: { secao: Secao }) {
  return (
    <section className="mt-10">
      <h2 className="text-[15px] leading-tight font-semibold text-ink">{secao.titulo}</h2>
      {secao.descricao && <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-3">{secao.descricao}</p>}
      <p className="mt-2 text-[11px] font-medium text-ink-3">
        {int(secao.linhas.length)} {secao.linhas.length === 1 ? 'linha' : 'linhas'}
      </p>

      {secao.linhas.length === 0 ? (
        <p className="mt-3 rounded-lg bg-surface-2 p-3 text-[12px] text-ink-3">{secao.vazio ?? 'Sem linhas neste recorte.'}</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline-strong">
                {secao.colunas.map((c) => (
                  <th
                    key={c.rotulo}
                    scope="col"
                    className={`py-2 pr-4 text-[11px] font-medium whitespace-nowrap text-ink-3 last:pr-0 ${DIREITA.has(c.tipo) ? 'text-right' : ''}`}
                  >
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {secao.linhas.map((linha, i) => (
                <tr key={i} className="border-b border-hairline">
                  {secao.colunas.map((c, j) => (
                    <td
                      key={c.rotulo}
                      className={[
                        'py-2 pr-4 align-top text-[12px] text-ink last:pr-0',
                        DIREITA.has(c.tipo) ? 'text-right' : '',
                        c.longo ? '' : 'whitespace-nowrap',
                      ].join(' ')}
                    >
                      {valor(c, linha[j])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {secao.totais && (
              <tfoot>
                <tr className="border-t border-hairline-strong">
                  {secao.colunas.map((c, j) => (
                    <td
                      key={c.rotulo}
                      className={`py-2 pr-4 text-[12px] font-semibold text-ink last:pr-0 ${DIREITA.has(c.tipo) ? 'text-right' : ''}`}
                    >
                      {secao.totais![j] === null ? '' : valor(c, secao.totais![j])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}
