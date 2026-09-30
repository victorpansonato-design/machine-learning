import { FAIXAS } from './types';
import type {
  AlunoFila,
  ConsultarParams,
  DataCorte,
  DatasParams,
  Faixa,
  HistoricoAluno,
  ListarParams,
  PaginaAlunos,
  ResumoCurso,
  ResumoParams,
  Saude,
} from './types';
import type { DataSource } from './source';
import { ApiError, mensagemDeErro } from './client';
import { digits, searchKey } from '../lib/format';
import { addDays, diffDays, isIsoDate, parseIsoDate, toIsoDate } from '../domain/fila';

/* ==========================================================================
   Fonte fictícia — mesmo contrato, mesmos erros
   --------------------------------------------------------------------------
   Existe para o esboço ser mostrado sem tocar em dado real. Ela tem de ser
   INDISTINGUÍVEL DA API NO FORMATO e OBVIAMENTE FICTÍCIA NO CONTEÚDO:

     · Determinística. PRNG com semente (mulberry32), nunca `Math.random`: o
       mesmo RA mostra a mesma faixa em todo render e toda sessão.
     · ~1 ano de filas (110) no ritmo do job: `dt_corte` em quartas e
       domingos (a véspera das execuções de quinta e segunda, como a API real
       mostra). Um ano, para os filtros de período do Monitoramento terem o
       que mostrar.
     · ~1.886 linhas por fila, nas faixas do TI: 1–189 CRITICA, 190–943 ALTA,
       944–1.886 MEDIA. Todo total (`fila/datas`, `fila/resumo`) é SOMA DAS
       LINHAS — nenhum número escrito à mão que possa discordar.
     · Continuidade: ~2.600 RAs com um risco latente, uma tendência lenta ao
       longo do ano e um ruído que muda devagar (duas filas seguidas são
       parecidas, como na vida real). O aluno sobe, desce, entra e sai.
     · As mesmas regras de filtro e os mesmos erros (404/422) da API.

   `VITE_MOCK_FILA_ATRASADA=true` simula o job que perdeu a última execução:
   a fila esperada não é gravada e toda resposta vem com `fila_atualizada:
   false`. É como se testa o aviso de fila desatualizada.
   ========================================================================== */

/* -- PRNG ------------------------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a de 32 bits: a semente de tudo que depende de um texto (RA, data). */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Um número uniforme em [0, 1) fixo para esta chave. */
function sorteio(key: string): number {
  return mulberry32(hash(key))();
}

/* -- Cursos fictícios ------------------------------------------------------
   Código de 3 dígitos e nome em caixa alta, como o Lyceum grava. `peso` é o
   tamanho relativo do curso no grupo; `risco` desloca o risco latente, para o
   resumo por curso não sair em ordem alfabética. */

interface CursoMock {
  codigo: string;
  nome: string;
  peso: number;
  risco: number;
}

const CURSOS: CursoMock[] = [
  { codigo: '101', nome: 'BACHARELADO EM DIREITO', peso: 15, risco: 0.05 },
  { codigo: '112', nome: 'BACHARELADO EM ADMINISTRAÇÃO', peso: 12, risco: 0.12 },
  { codigo: '118', nome: 'BACHARELADO EM CIÊNCIAS CONTÁBEIS', peso: 7, risco: 0.1 },
  { codigo: '146', nome: 'SUPERIOR DE TECNOLOGIA EM LOGÍSTICA', peso: 5, risco: 0.28 },
  { codigo: '152', nome: 'SUPERIOR DE TECNOLOGIA EM ANÁLISE E DESENVOLVIMENTO DE SISTEMAS', peso: 7, risco: 0.22 },
  { codigo: '215', nome: 'BACHARELADO EM ENGENHARIA QUÍMICA', peso: 4, risco: 0.02 },
  { codigo: '231', nome: 'BACHARELADO EM ENGENHARIA CIVIL', peso: 7, risco: 0.06 },
  { codigo: '244', nome: 'BACHARELADO EM ENGENHARIA DE PRODUÇÃO', peso: 6, risco: 0.14 },
  { codigo: '258', nome: 'BACHARELADO EM ENGENHARIA MECÂNICA', peso: 6, risco: 0.16 },
  { codigo: '262', nome: 'BACHARELADO EM ENGENHARIA ELÉTRICA', peso: 5, risco: 0.09 },
  { codigo: '305', nome: 'BACHARELADO EM PSICOLOGIA', peso: 8, risco: -0.12 },
  { codigo: '311', nome: 'BACHARELADO EM ENFERMAGEM', peso: 7, risco: -0.08 },
  { codigo: '327', nome: 'BACHARELADO EM CIÊNCIA DA COMPUTAÇÃO', peso: 6, risco: 0.18 },
  { codigo: '403', nome: 'LICENCIATURA EM PEDAGOGIA', peso: 5, risco: -0.02 },
];

/* -- A base ---------------------------------------------------------------- */

const GRUPO = 2600;
const QTD_FILAS = 110;
const CRITICA_ATE = 189;
const ALTA_ATE = 943;
const FILA_TIPICA = 1886;

const ATRASADA = import.meta.env.VITE_MOCK_FILA_ATRASADA === 'true';

export interface AlunoMock {
  ra: string;
  curso: CursoMock;
  sit: string;
  latente: number;
  /** Deriva do risco ao longo da janela: uns pioram, outros melhoram. */
  tendencia: number;
  /** Índice (0 = fila mais antiga) da primeira fila em que já não aparece. */
  saida: number;
}

export interface FilaMock {
  dt: string;
  linhas: AlunoFila[];
  porRa: Map<string, AlunoFila>;
}

export interface BaseMock {
  alunos: Map<string, AlunoMock>;
  /** Da mais recente para a mais antiga, como `fila/datas`. */
  filas: FilaMock[];
  esperada: string;
}

/**
 * A fila que deveria existir agora: a véspera da última segunda ou quinta em
 * que o job já rodou. Antes das 8h de uma segunda ou quinta, vale a execução
 * anterior (COMO_USAR, "A regra mais importante").
 */
function filaEsperada(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  for (let i = 0; i < 8; i += 1) {
    const wd = d.getDay();
    if ((wd === 1 || wd === 4) && (i > 0 || now.getHours() >= 8)) break;
    d.setDate(d.getDate() - 1);
  }
  return addDays(toIsoDate(d), -1);
}

/** As `n` quartas e domingos a partir de `inicio`, para trás. */
function datasDeCorte(inicio: string, n: number): string[] {
  const out: string[] = [];
  let dt = inicio;
  while (out.length < n) {
    const wd = parseIsoDate(dt).getDay();
    if (wd === 0 || wd === 3) out.push(dt);
    dt = addDays(dt, -1);
  }
  return out;
}

function gerarAlunos(): AlunoMock[] {
  const rng = mulberry32(0x5eed_a11c);
  const pesoTotal = CURSOS.reduce((s, c) => s + c.peso, 0);
  const vistos = new Set<string>();
  const alunos: AlunoMock[] = [];

  while (alunos.length < GRUPO) {
    // RA fictício de 7 dígitos. A faixa começa em 0.100.000 para alguns terem
    // zero à esquerda — é o caso que a normalização do RA precisa cobrir.
    const ra = String(100_000 + Math.floor(rng() * 2_900_000)).padStart(7, '0');
    if (vistos.has(ra)) continue;
    vistos.add(ra);

    let alvo = rng() * pesoTotal;
    let curso = CURSOS[CURSOS.length - 1];
    for (const c of CURSOS) {
      alvo -= c.peso;
      if (alvo < 0) {
        curso = c;
        break;
      }
    }

    const cancelado = rng() < 0.05;
    const latente = rng() + rng() + rng() + rng() + curso.risco + (cancelado ? 0.55 : 0);
    // Quem cancelou sai das filas em algum ponto da janela; parte ainda está
    // na mais recente ("estava na fila de ontem e já cancelou hoje").
    const saida = cancelado ? Math.floor(QTD_FILAS * (0.35 + rng() * 0.66)) : QTD_FILAS;
    const tendencia = (rng() - 0.5) * 1.1 + (cancelado ? 0.35 : 0);

    alunos.push({ ra, curso, sit: cancelado ? 'Cancelado' : 'Ativo', latente, tendencia, saida });
  }
  return alunos;
}

/** Ruído lento por aluno e bloco — calculado uma vez, usado por ~8 filas. */
const ondas = new Map<string, number>();

function gerarFila(dt: string, indice: number, alunos: AlunoMock[]): FilaMock {
  // Tamanho com variação de poucas unidades entre filas (1.886 a 1.888).
  const tamanho = FILA_TIPICA + (hash(`tamanho|${dt}`) % 3);
  const altaAte = ALTA_ATE + (tamanho > FILA_TIPICA ? 1 : 0);

  // Ruído que muda devagar: um valor por bloco de ~1 mês (8 filas),
  // interpolado entre blocos, mais um ruído curto por fila. Duas filas
  // seguidas ficam parecidas; dois meses depois, não.
  const t = indice / (QTD_FILAS - 1);
  const bloco = indice / 8;
  const b0 = Math.floor(bloco);
  const w = bloco - b0;
  const onda = (ra: string, bl: number) => {
    const chave = `${ra}|${bl}`;
    let v = ondas.get(chave);
    if (v === undefined) {
      v = sorteio(`${ra}|bloco|${bl}`) + sorteio(`${ra}|bloco2|${bl}`) - 1;
      ondas.set(chave, v);
    }
    return v;
  };

  const pontuados = alunos
    .filter((a) => indice < a.saida)
    .map((a) => {
      const lento = onda(a.ra, b0) * (1 - w) + onda(a.ra, b0 + 1) * w;
      const curto = sorteio(`${a.ra}|${dt}`) - 0.5;
      return { a, score: a.latente + a.tendencia * (t - 0.5) + 0.42 * lento + 0.14 * curto };
    })
    .sort((x, y) => y.score - x.score || (x.a.ra < y.a.ra ? -1 : 1))
    .slice(0, tamanho);

  const linhas: AlunoFila[] = pontuados.map(({ a }, i) => {
    const posicao = i + 1;
    return {
      dt_corte: dt,
      posicao,
      aluno: a.ra,
      chance_evasao: posicao <= CRITICA_ATE ? 'CRITICA' : posicao <= altaAte ? 'ALTA' : 'MEDIA',
      curso: a.curso.codigo,
      nome_curso: a.curso.nome,
    };
  });

  return { dt, linhas, porRa: new Map(linhas.map((l) => [l.aluno, l])) };
}

let memo: BaseMock | null = null;

export function mockBase(): BaseMock {
  if (memo) return memo;

  const esperada = filaEsperada(new Date());
  // Atrasada: o job perdeu a execução que gravaria `esperada`.
  const inicio = ATRASADA ? addDays(esperada, -1) : esperada;
  const datas = datasDeCorte(inicio, QTD_FILAS);

  const lista = gerarAlunos();
  // Índice 0 = fila mais antiga, para `saida` ler como "a partir desta fila".
  const filas = datas.map((dt, i) => gerarFila(dt, QTD_FILAS - 1 - i, lista));

  memo = { alunos: new Map(lista.map((a) => [a.ra, a])), filas, esperada };
  return memo;
}

/* -- Latência e erros ------------------------------------------------------ */

/** 250–450 ms, fixo por chamada: os skeletons aparecem, e sempre igual. */
export function simularLatencia(key: string, signal?: AbortSignal): Promise<void> {
  const ms = 250 + (hash(key) % 201);
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export function erro(status: number, apiMessage: string): never {
  throw new ApiError(status, mensagemDeErro(status, apiMessage), apiMessage);
}

export function inteiro(nome: string, valor: number | undefined, min: number, max: number, padrao: number): number {
  if (valor === undefined) return padrao;
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    erro(422, `${nome} inválido: ${valor}. Use um inteiro de ${min} a ${max}.`);
  }
  return valor;
}

/** Aceita `['CRITICA','ALTA']`, `['critica,alta']` — como a API do TI. */
export function validarFaixas(faixas: readonly string[] | undefined): Faixa[] | null {
  if (!faixas || faixas.length === 0) return null;
  const out: Faixa[] = [];
  for (const raw of faixas.flatMap((f) => f.split(','))) {
    const f = raw.trim().toUpperCase();
    if (!f) continue;
    if (!(FAIXAS as readonly string[]).includes(f)) {
      erro(422, `faixa inválida: "${raw}". Use CRITICA, ALTA ou MEDIA.`);
    }
    if (!out.includes(f as Faixa)) out.push(f as Faixa);
  }
  return out.length ? out : null;
}

export function acharFila(base: BaseMock, data: string | undefined): FilaMock {
  if (data === undefined || data === '') return base.filas[0];
  if (!isIsoDate(data)) erro(422, `data inválida: "${data}". Use o formato AAAA-MM-DD.`);
  const fila = base.filas.find((f) => f.dt === data);
  if (!fila) erro(404, `Não há fila gravada para ${data}. Datas válidas em fila/datas.`);
  return fila;
}

/** `curso` = código exato ou trecho do nome, sem acento e sem caixa. */
export function filtroCurso(curso: string | undefined): ((codigo: string | null, nome: string | null) => boolean) | null {
  const termo = curso?.trim();
  if (!termo) return null;
  const chave = searchKey(termo);
  return (codigo, nome) => codigo === termo || (nome !== null && searchKey(nome).includes(chave));
}

/* -- Leitura ----------------------------------------------------------------
   Imita o formato do exemplo do COMO_USAR ("CRITICA na fila de 2026-09-27,
   posicao 11."). Em modo `api` a tela mostra a `leitura` da API, verbatim. */

function leitura(aluno: AlunoMock, dt: string, linha: AlunoFila | undefined): string {
  const base = linha
    ? `${linha.chance_evasao} na fila de ${dt}, posicao ${linha.posicao}.`
    : `Fora das faixas na fila de ${dt}: não está entre os ~20% de maior risco (ou não é da graduação presencial).`;
  return aluno.sit === 'Ativo' ? base : `Situação atual no Lyceum: ${aluno.sit}. ${base}`;
}

/* -- As cinco rotas -------------------------------------------------------- */

function contar(linhas: AlunoFila[]) {
  let critica = 0;
  let alta = 0;
  let media = 0;
  for (const l of linhas) {
    if (l.chance_evasao === 'CRITICA') critica += 1;
    else if (l.chance_evasao === 'ALTA') alta += 1;
    else media += 1;
  }
  return { critica, alta, media, total: critica + alta + media };
}

export const mockSource: DataSource = {
  kind: 'mock',

  async saude(signal?: AbortSignal): Promise<Saude> {
    await simularLatencia('saude', signal);
    const base = mockBase();
    const ultima = base.filas[0]?.dt ?? null;
    return {
      status: 'ok',
      ultima_fila: ultima,
      fila_esperada: base.esperada,
      fila_atualizada: ultima === base.esperada,
      dias_de_atraso: ultima ? Math.max(0, diffDays(ultima, base.esperada)) : null,
      dias_gravados: base.filas.length,
    };
  },

  async datas(p: DatasParams, signal?: AbortSignal): Promise<DataCorte[]> {
    await simularLatencia(`datas|${p.limite ?? ''}`, signal);
    const limite = inteiro('limite', p.limite, 1, 366, 60);
    return mockBase()
      .filas.slice(0, limite)
      .map((f) => ({ dt_corte: f.dt, ...contar(f.linhas) }));
  },

  async resumo(p: ResumoParams, signal?: AbortSignal): Promise<ResumoCurso[]> {
    await simularLatencia(`resumo|${p.data ?? ''}|${p.curso ?? ''}`, signal);
    const fila = acharFila(mockBase(), p.data);
    const passa = filtroCurso(p.curso);

    const porCurso = new Map<string, ResumoCurso>();
    for (const l of fila.linhas) {
      if (passa && !passa(l.curso, l.nome_curso)) continue;
      const chave = l.curso ?? '';
      const item =
        porCurso.get(chave) ??
        { curso: l.curso, nome_curso: l.nome_curso, critica: 0, alta: 0, media: 0, total: 0 };
      if (l.chance_evasao === 'CRITICA') item.critica += 1;
      else if (l.chance_evasao === 'ALTA') item.alta += 1;
      else item.media += 1;
      item.total += 1;
      porCurso.set(chave, item);
    }

    // "Ordenado do curso com mais alunos na CRITICA para o com menos."
    return [...porCurso.values()].sort(
      (a, b) =>
        b.critica - a.critica ||
        b.alta - a.alta ||
        b.media - a.media ||
        (a.nome_curso ?? '').localeCompare(b.nome_curso ?? ''),
    );
  },

  async listar(p: ListarParams, signal?: AbortSignal): Promise<PaginaAlunos> {
    await simularLatencia(
      `listar|${p.data ?? ''}|${p.curso ?? ''}|${(p.faixa ?? []).join(',')}|${p.pagina ?? ''}|${p.limite ?? ''}`,
      signal,
    );
    const base = mockBase();
    const faixas = validarFaixas(p.faixa);
    const pagina = inteiro('pagina', p.pagina, 1, Number.MAX_SAFE_INTEGER, 1);
    const limite = inteiro('limite', p.limite, 1, 1000, 100);
    const fila = acharFila(base, p.data);
    const passa = filtroCurso(p.curso);

    const linhas = fila.linhas.filter(
      (l) => (!faixas || faixas.includes(l.chance_evasao)) && (!passa || passa(l.curso, l.nome_curso)),
    );

    return {
      dt_corte: fila.dt,
      fila_atualizada: fila.dt === base.esperada,
      total: linhas.length,
      pagina,
      limite,
      alunos: linhas.slice((pagina - 1) * limite, pagina * limite),
    };
  },

  async consultar(p: ConsultarParams, signal?: AbortSignal): Promise<HistoricoAluno> {
    await simularLatencia(`consultar|${p.ra}|${p.dias ?? ''}`, signal);
    const base = mockBase();

    const bruto = p.ra?.trim() ?? '';
    if (!bruto) erro(422, 'Informe o RA: alunos/consultar?ra=<RA>.');
    const numeros = digits(bruto);
    if (!numeros) erro(422, `ra inválido: "${bruto}". Use só os números do RA (ponto e traço são aceitos).`);
    const dias = inteiro('dias', p.dias, 1, 366, 30);

    // Sem zero à esquerda, ou com ponto e traço: `527810` e `052.781-0` acham `0527810`.
    const ra = numeros.length <= 7 ? numeros.padStart(7, '0') : numeros;
    const aluno = base.alunos.get(ra);
    if (!aluno) erro(404, `RA ${bruto} não encontrado no Lyceum.`);

    const ultima = base.filas[0];
    const linha = ultima.porRa.get(ra);
    const historico = base.filas
      .slice(0, dias)
      .map((f) => f.porRa.get(ra))
      .filter((l): l is AlunoFila => Boolean(l));

    return {
      aluno: ra,
      sit_aluno: aluno.sit,
      curso: aluno.curso.codigo,
      nome_curso: aluno.curso.nome,
      ultima_fila: ultima.dt,
      fila_atualizada: ultima.dt === base.esperada,
      faixa_ultima_fila: linha?.chance_evasao ?? null,
      leitura: leitura(aluno, ultima.dt, linha),
      historico,
    };
  },
};

/** Para quem precisa de um número de 0 a 1 fixo por chave (disparos). */
export { sorteio };
