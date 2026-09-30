import type { AlunoFila, Faixa } from '../api/types';
import { FAIXAS } from '../api/types';
import { ApiError } from '../api/client';
import { source } from '../api/source';
import { carregarFilas } from '../api/useFilas';
import { disparosSource } from '../api/disparos';
import type { Disparo } from '../api/disparos';
import { mensagemPushDemo } from '../domain/mensagemDemo';
import { AVISO_FAIXA, FAIXA_META, FAIXA_ORDER, REFERENCIA_TI } from '../domain/faixas';
import { calcularMovimento } from '../domain/movimento';
import type { RecorteFaixa } from '../domain/movimento';
import { descreverIntervalo, filasNoPeriodo, hojeIso, intervalo, parsePeriodo } from '../domain/periodo';
import { diaDaSemana } from '../domain/fila';
import { decimal, fullDate, int, percent } from '../lib/format';
import { listParam } from '../lib/router';
import type { Query } from '../lib/router';
import { USUARIO } from '../config';
import type { Indicador, Relatorio, Secao } from './modelo';

/* ==========================================================================
   Os relatórios de cada tela
   --------------------------------------------------------------------------
   Cada função recebe a QUERY da tela (a mesma da URL) e devolve o relatório
   completo: todas as páginas, todas as filas do período. A planilha e a
   prévia em PDF chamam a mesma função — por isso um link de relatório
   (`#/relatorio/alunos?faixa=CRITICA`) reproduz exatamente o que se exportou.
   ========================================================================== */

export type TipoRelatorio = 'monitoramento' | 'alunos' | 'mensagens' | 'aluno';

export function isTipoRelatorio(v: string | undefined): v is TipoRelatorio {
  return v === 'monitoramento' || v === 'alunos' || v === 'mensagens' || v === 'aluno';
}

export type Progresso = (texto: string) => void;

const FICTICIO = source.kind === 'mock';

const NOTA_POSICAO = 'Posição = lugar na fila geral da escola, contando todos os cursos (1 = maior risco).';
const NOTA_FICTICIO = 'Dados fictícios (esboço): gerados no formato da API, nada aqui é resultado real.';

function base(parcial: Omit<Relatorio, 'ficticio' | 'geradoEm' | 'geradoPor'>): Relatorio {
  return {
    ...parcial,
    notas: FICTICIO ? [NOTA_FICTICIO, ...parcial.notas] : parcial.notas,
    ficticio: FICTICIO,
    geradoEm: new Date(),
    geradoPor: USUARIO.nome,
  };
}

function faixasDaQuery(q: Query): Faixa[] {
  return listParam(q, 'faixa').filter((f): f is Faixa => (FAIXAS as readonly string[]).includes(f));
}

function avisoFila(dt: string, atualizada: boolean): string[] {
  return atualizada
    ? []
    : [`Atenção: a fila de ${fullDate(dt)} não é a mais recente esperada. Os números são dessa data.`];
}

export function parseRecorte(v: string | undefined): RecorteFaixa {
  if (v === 'TODAS') return null;
  return (FAIXAS as readonly string[]).includes(v ?? '') ? (v as Faixa) : 'CRITICA';
}

export function rotuloRecorte(r: RecorteFaixa): string {
  return r ? `na ${FAIXA_META[r].label}` : 'nas faixas';
}

function tabelaFaixas(): Secao {
  return {
    aba: 'Como ler as faixas',
    titulo: 'Como ler as faixas',
    descricao: `Regras e números publicados pelo TI. Média de evasão da base: ${decimal(REFERENCIA_TI.evasaoMediaBase, 1)}% (coorte ${REFERENCIA_TI.coorte}).`,
    colunas: [
      { rotulo: 'Faixa', tipo: 'faixa' },
      { rotulo: 'Quem entra', tipo: 'texto', longo: true },
      { rotulo: 'Tamanho típico', tipo: 'numero' },
      { rotulo: 'Evadem de fato', tipo: 'texto' },
    ],
    linhas: FAIXA_ORDER.map((f) => [f, FAIXA_META[f].regra, FAIXA_META[f].tamanhoTipico, FAIXA_META[f].evadem]),
  };
}

/* -- Monitoramento ---------------------------------------------------------- */

async function monitoramento(q: Query, signal?: AbortSignal, progresso?: Progresso): Promise<Relatorio> {
  const [saude, datas] = await Promise.all([source.saude(signal), source.datas({ limite: 120 }, signal)]);
  const periodo = parsePeriodo(q.periodo);
  const iv = intervalo(periodo, hojeIso(), q.de, q.ate);
  const doPeriodo = filasNoPeriodo(datas, iv);
  if (!doPeriodo.length) throw new ApiError(404, `Nenhuma fila gravada ${descreverIntervalo(periodo, iv)}.`);

  const ultima = doPeriodo[doPeriodo.length - 1];
  const iPrimeira = datas.findIndex((d) => d.dt_corte === doPeriodo[0].dt_corte);
  const antes = datas[iPrimeira + 1];
  const recorte = parseRecorte(q.mov);

  const dts = [...(antes ? [antes.dt_corte] : []), ...doPeriodo.map((d) => d.dt_corte)];
  const filas = await carregarFilas(dts, recorte, signal, (n) => progresso?.(`Lendo filas: ${n} de ${dts.length}`));
  const mov = calcularMovimento(filas, Boolean(antes));
  const resumo = await source.resumo({ data: ultima.dt_corte }, signal);
  const atualizada = ultima.dt_corte === saude.ultima_fila && saude.fila_atualizada;

  const passo = new Map(mov.passos.map((p) => [p.dt, p]));
  const ultimoPasso = mov.passos[mov.passos.length - 1];
  const rr = rotuloRecorte(recorte);

  const indicadores: Indicador[] = [
    ...FAIXA_ORDER.map((f) => {
      const v = ultima[f === 'CRITICA' ? 'critica' : f === 'ALTA' ? 'alta' : 'media'];
      return {
        rotulo: FAIXA_META[f].label,
        valor: int(v),
        detalhe: `${percent((v / ultima.total) * 100, 1)} · evadem ${FAIXA_META[f].evadem}`,
        cor: FAIXA_META[f].hex(false),
      };
    }),
    { rotulo: 'Nas faixas', valor: int(ultima.total), detalhe: `fila de ${fullDate(ultima.dt_corte)}` },
    { rotulo: 'Filas no período', valor: int(doPeriodo.length), detalhe: descreverIntervalo(periodo, iv) },
  ];
  if (ultimoPasso?.anterior) {
    indicadores.push(
      { rotulo: `Entraram ${rr}`, valor: int(ultimoPasso.entraram), detalhe: `desde a fila de ${fullDate(ultimoPasso.anterior)}` },
      { rotulo: `Saíram ${rr}`, valor: int(ultimoPasso.sairam), detalhe: `desde a fila de ${fullDate(ultimoPasso.anterior)}` },
    );
  }
  indicadores.push({ rotulo: `Passaram ${rr}`, valor: int(mov.distintos), detalhe: 'alunos diferentes no período' });

  const secoes: Secao[] = [
    {
      aba: 'Filas do período',
      titulo: 'Filas do período',
      descricao: `Tamanho de cada faixa e o movimento ${rr}, fila a fila. "Entraram" e "saíram" comparam com a fila anterior.`,
      colunas: [
        { rotulo: 'Fila', tipo: 'data' },
        { rotulo: 'Dia', tipo: 'texto' },
        { rotulo: 'Crítica', tipo: 'numero' },
        { rotulo: 'Alta', tipo: 'numero' },
        { rotulo: 'Média', tipo: 'numero' },
        { rotulo: 'Nas faixas', tipo: 'numero' },
        { rotulo: `Entraram ${rr}`, tipo: 'numero' },
        { rotulo: `Saíram ${rr}`, tipo: 'numero' },
        { rotulo: `Continuaram ${rr}`, tipo: 'numero' },
      ],
      linhas: [...doPeriodo].reverse().map((d) => {
        const p = passo.get(d.dt_corte);
        const tem = Boolean(p?.anterior);
        return [
          d.dt_corte,
          diaDaSemana(d.dt_corte),
          d.critica,
          d.alta,
          d.media,
          d.total,
          tem ? p!.entraram : null,
          tem ? p!.sairam : null,
          tem ? p!.continuaram : null,
        ];
      }),
    },
    {
      aba: 'Cursos',
      titulo: `Cursos na fila de ${fullDate(ultima.dt_corte)}`,
      descricao: 'Quantos alunos de cada curso estão em cada faixa. Ordem da API: mais alunos na Crítica primeiro.',
      colunas: [
        { rotulo: 'Código', tipo: 'mono' },
        { rotulo: 'Curso', tipo: 'texto', longo: true },
        { rotulo: 'Crítica', tipo: 'numero' },
        { rotulo: 'Alta', tipo: 'numero' },
        { rotulo: 'Média', tipo: 'numero' },
        { rotulo: 'Total', tipo: 'numero' },
      ],
      linhas: resumo.map((r) => [r.curso, r.nome_curso ?? 'Curso não informado', r.critica, r.alta, r.media, r.total]),
      totais: [
        null,
        'Total',
        resumo.reduce((s, r) => s + r.critica, 0),
        resumo.reduce((s, r) => s + r.alta, 0),
        resumo.reduce((s, r) => s + r.media, 0),
        resumo.reduce((s, r) => s + r.total, 0),
      ],
    },
    {
      aba: 'Há mais tempo',
      titulo: `Há mais filas seguidas ${rr}`,
      descricao: `Os alunos que estão ${rr} há mais filas seguidas, até a fila de ${fullDate(ultima.dt_corte)}.`,
      colunas: [
        { rotulo: 'RA', tipo: 'mono' },
        { rotulo: 'Curso', tipo: 'texto', longo: true },
        { rotulo: 'Faixa', tipo: 'faixa' },
        { rotulo: 'Posição na fila geral', tipo: 'posicao' },
        { rotulo: 'Filas seguidas', tipo: 'numero' },
      ],
      linhas: mov.maisTempo.map((m) => [
        m.ra,
        m.linha.nome_curso ?? 'Curso não informado',
        m.linha.chance_evasao,
        m.linha.posicao,
        m.seguidas,
      ]),
    },
    tabelaFaixas(),
  ];

  return base({
    titulo: 'Monitoramento da fila',
    tipoLabel: 'Relatório de monitoramento',
    subtitulo: `Fila de ${fullDate(ultima.dt_corte)} · período: ${descreverIntervalo(periodo, iv)}. Movimento ${rr}.`,
    arquivo: `monitoramento-${ultima.dt_corte}`,
    indicadores,
    secoes,
    notas: [
      ...avisoFila(ultima.dt_corte, atualizada),
      NOTA_POSICAO,
      AVISO_FAIXA,
      'Fonte: API de risco de evasão do TI (fila/saude, fila/datas, fila/resumo, alunos/listar).',
    ],
  });
}

/* -- Alunos ----------------------------------------------------------------- */

async function alunos(q: Query, signal?: AbortSignal, progresso?: Progresso): Promise<Relatorio> {
  const faixas = faixasDaQuery(q);
  const params = { faixa: faixas.length ? faixas : undefined, curso: q.curso || undefined, data: q.data };

  const todos: AlunoFila[] = [];
  let dt = '';
  let atualizada = true;
  for (let pagina = 1; ; pagina += 1) {
    const r = await source.listar({ ...params, pagina, limite: 1000 }, signal);
    dt = r.dt_corte;
    atualizada = r.fila_atualizada;
    todos.push(...r.alunos);
    progresso?.(`Lendo alunos: ${int(todos.length)} de ${int(r.total)}`);
    if (todos.length >= r.total || r.alunos.length === 0) break;
  }

  const filtros = [
    faixas.length ? `faixa ${faixas.map((f) => FAIXA_META[f].label).join(', ')}` : 'as três faixas',
    q.curso ? `curso “${q.curso}”` : 'todos os cursos',
  ].join(' · ');

  const conta = (f: Faixa) => todos.filter((a) => a.chance_evasao === f).length;

  return base({
    titulo: 'Alunos em risco',
    tipoLabel: 'Relatório de alunos',
    subtitulo: `Fila de ${fullDate(dt)} · ${filtros}.`,
    arquivo: `alunos-em-risco-${dt}`,
    indicadores: [
      { rotulo: 'Alunos no filtro', valor: int(todos.length), detalhe: `fila de ${fullDate(dt)}` },
      ...FAIXA_ORDER.filter((f) => !faixas.length || faixas.includes(f)).map((f) => ({
        rotulo: FAIXA_META[f].label,
        valor: int(conta(f)),
        detalhe: `evadem ${FAIXA_META[f].evadem}`,
        cor: FAIXA_META[f].hex(false),
      })),
    ],
    secoes: [
      {
        aba: 'Alunos',
        titulo: 'Alunos',
        descricao: 'Em ordem de posição na fila geral (1 = maior risco).',
        colunas: [
          { rotulo: 'Posição na fila geral', tipo: 'posicao' },
          { rotulo: 'RA', tipo: 'mono' },
          { rotulo: 'Faixa', tipo: 'faixa' },
          { rotulo: 'Código', tipo: 'mono' },
          { rotulo: 'Curso', tipo: 'texto', longo: true },
        ],
        linhas: todos.map((a) => [a.posicao, a.aluno, a.chance_evasao, a.curso, a.nome_curso ?? 'Curso não informado']),
        vazio: 'Nenhum aluno nas faixas com esses filtros.',
      },
    ],
    notas: [
      ...avisoFila(dt, atualizada),
      NOTA_POSICAO,
      'Quem não aparece aqui não está entre os ~20% de maior risco (ou não é da graduação presencial) — o que não quer dizer risco nenhum.',
      AVISO_FAIXA,
      'Fonte: API de risco de evasão do TI (alunos/listar).',
    ],
  });
}

/* -- Mensagens --------------------------------------------------------------- */

function rotuloStatus(s: string): string {
  return s === 'ENVIADO' ? 'Envio registrado' : s === 'ENVIANDO' ? 'Em andamento' : s === 'FALHA' ? 'Falha' : s;
}

async function mensagens(q: Query, signal?: AbortSignal, progresso?: Progresso): Promise<Relatorio> {
  if (!disparosSource.disponivel) {
    throw new ApiError(404, 'A leitura dos envios ainda não está disponível na API.');
  }
  const faixas = faixasDaQuery(q);
  const status = listParam(q, 'status').map((s) => s.toUpperCase());
  const params = { data: q.data, faixa: faixas.length ? faixas : undefined, status: status.length ? status : undefined };

  const todos: Disparo[] = [];
  let dt = '';
  let atualizada = true;
  let resumo: Record<string, number> = {};
  for (let pagina = 1; ; pagina += 1) {
    const r = await disparosSource.listar({ ...params, pagina, limite: 1000 }, signal);
    dt = r.dt_corte;
    atualizada = r.fila_atualizada;
    resumo = r.resumo;
    todos.push(...r.disparos);
    progresso?.(`Lendo envios: ${int(todos.length)} de ${int(r.total)}`);
    if (todos.length >= r.total || r.disparos.length === 0) break;
  }
  const falhas = resumo.FALHA ?? 0;
  const andamento = resumo.ENVIANDO ?? 0;
  const enviados = resumo.ENVIADO ?? 0;

  const filtros = [
    faixas.length ? `faixa ${faixas.map((f) => FAIXA_META[f].label).join(', ')}` : 'as três faixas',
    status.length ? `status ${status.map(rotuloStatus).join(', ')}` : 'todos os status',
  ].join(' · ');

  return base({
    titulo: 'Mensagens enviadas',
    tipoLabel: 'Relatório de envios',
    subtitulo: `Fila de ${fullDate(dt)} · ${filtros}.`,
    arquivo: `mensagens-enviadas-${dt}`,
    indicadores: [
      { rotulo: 'Envios registrados', valor: int(enviados) },
      { rotulo: 'Falhas', valor: int(falhas), cor: falhas > 0 ? FAIXA_META.CRITICA.hex(false) : undefined },
      { rotulo: 'Em andamento', valor: int(andamento) },
      { rotulo: 'Nesta lista', valor: int(todos.length), detalhe: 'envios que atendem o filtro' },
    ],
    secoes: [
      {
        aba: 'Envios',
        titulo: 'Envios',
        descricao: 'Disparos de triagem por fila. O texto do push abaixo é apenas demonstrativo.',
        colunas: [
          { rotulo: 'RA', tipo: 'mono' },
          { rotulo: 'Faixa', tipo: 'faixa' },
          { rotulo: 'Status', tipo: 'status' },
          { rotulo: 'Enviado em', tipo: 'datahora' },
          { rotulo: 'Lote', tipo: 'mono' },
          { rotulo: 'Título do push (demo)', tipo: 'texto' },
          { rotulo: 'Texto do push (demo)', tipo: 'texto' },
        ],
        linhas: todos.map((d) => {
          const conteudo = mensagemPushDemo(d.chance_evasao);
          return [d.aluno, d.chance_evasao, d.status, d.enviado_em ?? null, d.external_id ?? null, conteudo.titulo, conteudo.corpo];
        }),
        vazio: 'Nenhum envio com esses filtros.',
      },
    ],
    notas: [
      'Dados e conteúdo fictícios. Formato proposto ao TI — ainda não é a API real (docs/CONTRATO_DISPAROS_PROPOSTA.md).',
      ...avisoFila(dt, atualizada),
      'Só leitura: este sistema não envia mensagens.',
    ],
  });
}

/* -- Dossiê do aluno --------------------------------------------------------- */

export const DIAS_DOSSIE = 120;

async function aluno(ra: string, signal?: AbortSignal): Promise<Relatorio> {
  const [d, datas] = await Promise.all([
    source.consultar({ ra, dias: DIAS_DOSSIE }, signal),
    source.datas({ limite: DIAS_DOSSIE }, signal),
  ]);
  const linha = d.historico.find((h) => h.dt_corte === d.ultima_fila);
  const meta = d.faixa_ultima_fila ? FAIXA_META[d.faixa_ultima_fila] : null;
  const ativo = d.sit_aluno?.trim().toLowerCase() === 'ativo';
  const consultadas = Math.min(DIAS_DOSSIE, datas.length);
  const demoMensagens = source.kind === 'mock' && disparosSource.disponivel;
  const disparos = demoMensagens ? await disparosSource.listarAluno(d.aluno, signal) : [];

  return base({
    titulo: `Dossiê do aluno · RA ${d.aluno}`,
    tipoLabel: 'Dossiê do aluno',
    subtitulo: `${d.nome_curso ?? 'Curso não informado'}${d.curso ? ` (${d.curso})` : ''} · fila de ${fullDate(d.ultima_fila)}.`,
    arquivo: `dossie-${d.aluno}-${d.ultima_fila}`,
    indicadores: [
      {
        rotulo: 'Situação atual no Lyceum',
        valor: d.sit_aluno ?? 'Não informada',
        cor: d.sit_aluno && !ativo ? FAIXA_META.CRITICA.hex(false) : undefined,
      },
      {
        rotulo: 'Faixa na última fila',
        valor: meta ? meta.label : 'Fora das faixas',
        detalhe: meta ? `evadem ${meta.evadem}` : 'não está entre os ~20% de maior risco',
        cor: meta?.hex(false),
      },
      { rotulo: 'Posição na fila geral', valor: linha ? `#${linha.posicao}` : '—', detalhe: 'todos os cursos' },
      { rotulo: 'Filas em que apareceu', valor: int(d.historico.length), detalhe: `das últimas ${consultadas} filas` },
    ],
    secoes: [
      {
        aba: 'Histórico',
        titulo: 'Histórico nas filas',
        descricao: 'As filas em que o aluno apareceu, da mais recente para a mais antiga.',
        colunas: [
          { rotulo: 'Fila', tipo: 'data' },
          { rotulo: 'Faixa', tipo: 'faixa' },
          { rotulo: 'Posição na fila geral', tipo: 'posicao' },
          { rotulo: 'Variação', tipo: 'texto' },
        ],
        linhas: d.historico.map((h, i) => {
          const antes = d.historico[i + 1];
          const diff = antes ? antes.posicao - h.posicao : null;
          const v =
            diff === null ? '—' : diff > 0 ? `subiu ${int(diff)}` : diff < 0 ? `desceu ${int(-diff)}` : 'mesma posição';
          return [h.dt_corte, h.chance_evasao, h.posicao, v];
        }),
        vazio: `Não apareceu em nenhuma das últimas ${consultadas} filas.`,
      },
      ...(demoMensagens ? [{
        aba: 'Mensagens',
        titulo: 'Pushes de triagem (demonstração)',
        descricao: 'Conteúdo e registros fictícios; o status de envio não confirma entrega no aparelho.',
        colunas: [
          { rotulo: 'Fila', tipo: 'data' as const },
          { rotulo: 'Faixa', tipo: 'faixa' as const },
          { rotulo: 'Status', tipo: 'status' as const },
          { rotulo: 'Enviado em', tipo: 'datahora' as const },
          { rotulo: 'Título do push', tipo: 'texto' as const },
          { rotulo: 'Texto do push', tipo: 'texto' as const },
        ],
        linhas: disparos.map((item) => {
          const conteudo = mensagemPushDemo(item.chance_evasao);
          return [item.dt_corte, item.chance_evasao, item.status, item.enviado_em ?? null, conteudo.titulo, conteudo.corpo];
        }),
        vazio: 'Nenhuma mensagem de triagem neste período.',
      }] : []),
    ],
    notas: [
      `Leitura da API: ${d.leitura}`,
      ...(d.sit_aluno && !ativo ? [`Situação atual no Lyceum: ${d.sit_aluno}. O aluno já saiu — não há o que reter.`] : []),
      ...avisoFila(d.ultima_fila, d.fila_atualizada),
      NOTA_POSICAO,
      AVISO_FAIXA,
      ...(demoMensagens ? ['Mensagens: conteúdo e envios fictícios nesta demonstração.'] : []),
      'Fonte: API de risco de evasão do TI (alunos/consultar).',
    ],
  });
}

/* -- Entrada única ------------------------------------------------------------ */

export function montarRelatorio(
  tipo: TipoRelatorio,
  param: string | undefined,
  q: Query,
  signal?: AbortSignal,
  progresso?: Progresso,
): Promise<Relatorio> {
  switch (tipo) {
    case 'monitoramento':
      return monitoramento(q, signal, progresso);
    case 'alunos':
      return alunos(q, signal, progresso);
    case 'mensagens':
      return mensagens(q, signal, progresso);
    case 'aluno':
      return aluno(param ?? q.ra ?? '', signal);
  }
}
