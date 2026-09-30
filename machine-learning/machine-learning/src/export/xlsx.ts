import type { Borders, Cell, Fill, Font, Workbook, Worksheet } from 'exceljs';
import type { Faixa } from '../api/types';
import { FAIXA_META } from '../domain/faixas';
import { fileStamp } from '../lib/csv';
import { logoPng, tracoPng } from './imagens';
import type { Celula, Coluna, Relatorio, Secao } from './modelo';

/* ==========================================================================
   A planilha (.xlsx)
   --------------------------------------------------------------------------
   Regras que este arquivo segue, uma por problema que planilha exportada
   costuma ter:

     · NADA CORTADO. A largura de cada coluna é calculada pelo texto mais
       largo que ela recebe (com peso maior para maiúscula, que é mais larga);
       texto longo (nome de curso) ganha teto e quebra de linha, e a altura da
       linha acompanha.
     · NADA SOBREPOSTO. Título, descrição e notas são mesclados na largura da
       tabela e quebram linha dentro dela, em vez de vazar por cima de células.
     · DADO É DADO. Número é número (soma e ordena), data é data (filtra por
       mês), posição é número com formato "#11", RA é TEXTO (preserva o zero
       à esquerda). Nada vira texto só para ficar bonito.
     · SÓ O QUE IMPORTA. A data da fila vai no cabeçalho, não repetida em
       cada linha; coluna que não ajuda a decidir nada não entra.
     · PRONTA PARA IMPRIMIR. Paisagem quando a tabela é larga, ajuste à
       largura da folha, cabeçalho da tabela repetido em toda página, rodapé
       com página "x de y".

   Cores são as do design system (claro), escritas aqui em ARGB porque o
   Excel não lê variável CSS.
   ========================================================================== */

const COR = {
  ink: 'FF101317',
  ink2: 'FF414852',
  ink3: 'FF6B7280',
  ink4: 'FF9AA1AC',
  hairline: 'FFE6E8EB',
  zebra: 'FFF7F8FA',
  surface2: 'FFEEF0F2',
  brand: 'FF00509D',
  branco: 'FFFFFFFF',
  crit: 'FFB42318',
  warn: 'FF7D5C1F',
  ouro: '#F2B200',
};

const FONTE = 'Calibri';

function argb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`;
}

function fonte(extra: Partial<Font> = {}): Partial<Font> {
  return { name: FONTE, size: 10, color: { argb: COR.ink }, ...extra };
}

const solido = (cor: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: cor } });

/* -- Largura de texto -------------------------------------------------------
   Unidade de coluna do Excel ≈ um "0" na fonte padrão. Maiúscula e acento
   ocupam mais; espaço e pontuação, menos. */

function larguraTexto(texto: string, negrito = false): number {
  let w = 0;
  for (const ch of texto) {
    if (/[A-ZÁÉÍÓÚÂÊÔÃÕÇÀ]/.test(ch)) w += ch === 'I' ? 0.5 : 1.08;
    else if (/[mwMW]/.test(ch)) w += 1.3;
    else if (/[a-zá-úç]/.test(ch)) w += /[ijlt]/.test(ch) ? 0.5 : 0.95;
    else if (/[0-9]/.test(ch)) w += 1;
    else if (ch === ' ') w += 0.5;
    else w += 0.7;
  }
  // A tabela usa corpo 10, menor que o 11 que define a unidade de coluna.
  return w * 0.92 * (negrito ? 1.08 : 1);
}

/* -- Formatação por tipo ----------------------------------------------------- */

function dataDeCalendario(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  // UTC: o Excel não tem fuso, e meia-noite UTC é o dia certo no arquivo.
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

function dataHora(iso: string): Date | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // O Excel grava "hora de parede": leva a hora LOCAL para o arquivo.
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()));
}

function rotuloFaixa(v: Celula): string {
  return v && v in FAIXA_META ? FAIXA_META[v as Faixa].label : 'Fora das faixas';
}

function rotuloStatus(v: Celula): string {
  return v === 'ENVIADO' ? 'Enviado' : v === 'ENVIANDO' ? 'Em andamento' : v === 'FALHA' ? 'Falha' : String(v ?? '');
}

/** O texto como vai aparecer — usado para medir a coluna. */
function textoExibido(col: Coluna, v: Celula): string {
  if (v === null || v === undefined || v === '') return '—';
  switch (col.tipo) {
    case 'numero':
      return typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v);
    case 'posicao':
      return `#${v}`;
    case 'percent':
      return typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : String(v);
    case 'data':
      return '00/00/0000';
    case 'datahora':
      return '00/00/0000 00:00';
    case 'faixa':
      return `● ${rotuloFaixa(v)}`;
    case 'status':
      return rotuloStatus(v);
    default:
      return String(v);
  }
}

const NUMERICO = new Set(['numero', 'posicao', 'percent']);

function escreverCelula(cell: Cell, col: Coluna, v: Celula) {
  const direita = NUMERICO.has(col.tipo);
  const centro = col.tipo === 'data' || col.tipo === 'datahora';
  // Recuo de um caractere dos dois lados: um número alinhado à direita não
  // encosta no texto alinhado à esquerda da coluna seguinte.
  cell.alignment = {
    vertical: 'middle',
    horizontal: direita ? 'right' : centro ? 'center' : 'left',
    wrapText: Boolean(col.longo),
    indent: centro ? 0 : 1,
  };
  cell.font = fonte();

  if (v === null || v === undefined || v === '') {
    cell.value = '—';
    cell.font = fonte({ color: { argb: COR.ink4 } });
    cell.alignment = { ...cell.alignment, horizontal: direita ? 'right' : 'left', indent: 1 };
    return;
  }

  switch (col.tipo) {
    case 'numero':
      cell.value = typeof v === 'number' ? v : Number(v);
      cell.numFmt = '#,##0';
      return;
    case 'posicao':
      cell.value = typeof v === 'number' ? v : Number(v);
      cell.numFmt = '"#"0';
      return;
    case 'percent':
      cell.value = typeof v === 'number' ? v : Number(v);
      cell.numFmt = '0.0%';
      return;
    case 'data': {
      const d = dataDeCalendario(String(v));
      cell.value = d ?? String(v);
      if (d) cell.numFmt = 'dd/mm/yyyy';
      return;
    }
    case 'datahora': {
      const d = dataHora(String(v));
      cell.value = d ?? String(v);
      if (d) cell.numFmt = 'dd/mm/yyyy hh:mm';
      return;
    }
    case 'faixa': {
      const f = v as Faixa;
      const meta = FAIXA_META[f];
      cell.value = `● ${rotuloFaixa(v)}`;
      cell.font = fonte({
        color: { argb: meta ? argb(meta.hex(false)) : COR.ink3 },
        bold: f === 'CRITICA',
      });
      return;
    }
    case 'status':
      cell.value = rotuloStatus(v);
      cell.font = fonte(
        v === 'FALHA'
          ? { color: { argb: COR.crit }, bold: true }
          : v === 'ENVIANDO'
            ? { color: { argb: COR.warn } }
            : { color: { argb: COR.ink3 } },
      );
      return;
    case 'mono':
      cell.value = String(v);
      cell.font = fonte({ name: 'Consolas' });
      return;
    default:
      cell.value = String(v);
  }
}

/* -- Larguras ------------------------------------------------------------------ */

const TETO_LONGO = 62;

function larguras(secao: Secao): number[] {
  return secao.colunas.map((col, i) => {
    let w = larguraTexto(col.rotulo, true) + 4;
    const amostra = [...secao.linhas, ...(secao.totais ? [secao.totais] : [])];
    for (const linha of amostra) w = Math.max(w, larguraTexto(textoExibido(col, linha[i]), col.tipo === 'faixa') + 4);
    const minimo = NUMERICO.has(col.tipo) ? 10 : col.tipo === 'data' ? 12 : col.tipo === 'datahora' ? 17 : 8;
    return Math.min(Math.max(w, minimo), col.longo ? TETO_LONGO : 40);
  });
}

/** Linhas que um texto ocupa numa largura (em unidades de coluna). */
function linhasPara(texto: string, largura: number): number {
  return Math.max(1, Math.ceil(larguraTexto(texto) / Math.max(1, largura - 1.5)));
}

/* -- Blocos comuns ------------------------------------------------------------- */

interface Imagens {
  logo: number;
  logoAlt: number;
  logoLarg: number;
  traco: number;
}

const MARGEM = 1; // coluna A: respiro à esquerda

function linhaMesclada(ws: Worksheet, linha: number, ultimaCol: number, larguraTotal: number, texto: string, f: Partial<Font>) {
  ws.mergeCells(linha, MARGEM + 1, linha, ultimaCol);
  const cell = ws.getCell(linha, MARGEM + 1);
  cell.value = texto;
  cell.font = fonte(f);
  cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  ws.getRow(linha).height = Math.max(15, linhasPara(texto, larguraTotal) * ((f.size ?? 10) + 4.5));
}

/** Logo, tipo e "gerado em", título com o traço amarelo, subtítulo. Devolve a próxima linha livre. */
function cabecalho(
  ws: Worksheet,
  rel: Relatorio,
  titulo: string,
  subtitulo: string,
  ultimaCol: number,
  larguraTotal: number,
  img: Imagens,
  grande: boolean,
): number {
  ws.getRow(1).height = 8;
  ws.getRow(2).height = grande ? 26 : 22;
  ws.getRow(3).height = grande ? 18 : 14;

  const escala = grande ? 1 : 0.78;
  ws.addImage(img.logo, {
    tl: { col: MARGEM, row: 1.15 },
    ext: { width: img.logoLarg * escala, height: img.logoAlt * escala },
    editAs: 'oneCell',
  });

  const tipo = ws.getCell(2, ultimaCol);
  tipo.value = rel.tipoLabel;
  tipo.font = fonte({ bold: true, size: 10.5 });
  tipo.alignment = { horizontal: 'right', vertical: 'bottom' };
  // "Gerado em" NÃO fica ao lado do logo: numa tabela estreita ele
  // invadiria a imagem. Vai numa linha própria, abaixo do subtítulo.
  const gerado = `Gerado em ${rel.geradoEm.toLocaleDateString('pt-BR')} às ${rel.geradoEm.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })} por ${rel.geradoPor}.`;

  // Hairline sob o cabeçalho, como na folha do PDF.
  for (let c = MARGEM + 1; c <= ultimaCol; c += 1) {
    ws.getCell(3, c).border = { bottom: { style: 'thin', color: { argb: COR.hairline } } };
  }

  ws.getRow(4).height = 10;
  ws.mergeCells(5, MARGEM + 1, 5, ultimaCol);
  const t = ws.getCell(5, MARGEM + 1);
  t.value = titulo;
  t.font = fonte({ bold: true, size: grande ? 18 : 14 });
  t.alignment = { vertical: 'bottom' };
  ws.getRow(5).height = grande ? 28 : 22;

  ws.getRow(6).height = 9;
  ws.addImage(img.traco, { tl: { col: MARGEM, row: 5.35 }, ext: { width: 40, height: 3 }, editAs: 'oneCell' });

  let linha = 7;
  linhaMesclada(ws, linha, ultimaCol, larguraTotal, subtitulo, { size: 10, color: { argb: COR.ink2 } });
  linha += 1;
  linhaMesclada(ws, linha, ultimaCol, larguraTotal, gerado, { size: 9, color: { argb: COR.ink3 } });
  linha += 1;

  if (rel.ficticio) {
    linhaMesclada(ws, linha, ultimaCol, larguraTotal, 'Dados fictícios (esboço) — nada aqui é resultado real.', {
      size: 9.5,
      bold: true,
      color: { argb: COR.crit },
    });
    linha += 1;
  }
  return linha;
}

function rodape(ws: Worksheet, titulo: string) {
  ws.headerFooter.oddFooter = `&L&8&K6B7280Triagem de Evasão · UniAnchieta&C&8&K6B7280${titulo}&R&8&K6B7280Página &P de &N`;
}

/* -- A aba de resumo ------------------------------------------------------------ */

function abaResumo(wb: Workbook, rel: Relatorio, img: Imagens) {
  const ws = wb.addWorksheet('Resumo', {
    properties: { tabColor: { argb: COR.brand } },
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.7, header: 0.3, footer: 0.3 },
    },
  });

  const W = [2, 34, 20, 50];
  ws.columns = W.map((width) => ({ width }));
  const ultima = W.length;
  const total = W.slice(1).reduce((s, w) => s + w, 0);

  let r = cabecalho(ws, rel, rel.titulo, rel.subtitulo, ultima, total, img, true);
  r += 1;

  const rotuloSecao = (texto: string) => {
    ws.getRow(r).height = 22;
    for (let c = 2; c <= ultima; c += 1) {
      ws.getCell(r, c).border = { bottom: { style: 'thin', color: { argb: COR.hairline } } };
    }
    const cell = ws.getCell(r, 2);
    cell.value = texto;
    cell.font = fonte({ bold: true, size: 10.5, color: { argb: COR.ink3 } });
    cell.alignment = { vertical: 'bottom' };
    r += 1;
  };

  rotuloSecao('Indicadores');
  for (const ind of rel.indicadores) {
    const row = ws.getRow(r);
    const detalheLinhas = ind.detalhe ? linhasPara(ind.detalhe, W[3]) : 1;
    row.height = Math.max(24, detalheLinhas * 14 + 6);
    const a = ws.getCell(r, 2);
    a.value = ind.rotulo;
    a.font = fonte({ size: 10.5, color: { argb: COR.ink2 } });
    a.alignment = { vertical: 'middle', wrapText: true };
    const b = ws.getCell(r, 3);
    b.value = ind.valor;
    b.font = fonte({ size: 14, bold: true, color: { argb: ind.cor ? argb(ind.cor) : COR.ink } });
    b.alignment = { vertical: 'middle', horizontal: 'right' };
    const c = ws.getCell(r, 4);
    c.value = ind.detalhe ?? '';
    c.font = fonte({ size: 9.5, color: { argb: COR.ink3 } });
    c.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
    const borda: Partial<Borders> = { bottom: { style: 'hair', color: { argb: COR.hairline } } };
    a.border = borda;
    b.border = borda;
    c.border = borda;
    r += 1;
  }

  r += 1;
  rotuloSecao('Nesta planilha');
  for (const s of rel.secoes) {
    ws.getRow(r).height = 20;
    const a = ws.getCell(r, 2);
    a.value = { text: s.aba, hyperlink: `#'${s.aba}'!A1` };
    a.font = fonte({ color: { argb: COR.brand }, underline: true });
    a.alignment = { vertical: 'middle' };
    ws.mergeCells(r, 3, r, 4);
    const d = ws.getCell(r, 3);
    d.value = s.linhas.length ? `${s.linhas.length.toLocaleString('pt-BR')} ${s.linhas.length === 1 ? 'linha' : 'linhas'} · ${s.titulo}` : s.titulo;
    d.font = fonte({ size: 9.5, color: { argb: COR.ink3 } });
    d.alignment = { vertical: 'middle', wrapText: true };
    ws.getRow(r).height = Math.max(20, linhasPara(String(d.value), W[2] + W[3]) * 14 + 4);
    r += 1;
  }

  r += 1;
  rotuloSecao('Notas');
  for (const nota of rel.notas) {
    linhaMesclada(ws, r, ultima, total, nota, { size: 9.5, color: { argb: COR.ink2 } });
    r += 1;
  }

  rodape(ws, rel.titulo);
}

/* -- Uma aba por seção ------------------------------------------------------------ */

/** Largura mínima da tabela: o logo e o tipo do relatório dividem a linha de cima. */
const LARGURA_MINIMA = 56;

function abaSecao(wb: Workbook, rel: Relatorio, secao: Secao, img: Imagens) {
  const W = larguras(secao);
  const soma = W.reduce((s, w) => s + w, 0);
  if (soma < LARGURA_MINIMA) {
    // Sobra vai para a coluna mais larga (em geral, o texto).
    const i = W.indexOf(Math.max(...W));
    W[i] += LARGURA_MINIMA - soma;
  }
  const larga = W.reduce((s, w) => s + w, 0) > 95 || secao.colunas.length > 6;
  const ws = wb.addWorksheet(secao.aba.slice(0, 31), {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: larga ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  ws.columns = [{ width: 2 }, ...W.map((width) => ({ width }))];
  const ultima = MARGEM + secao.colunas.length;
  const total = W.reduce((s, w) => s + w, 0);

  const sub = [secao.descricao, rel.subtitulo].filter(Boolean).join(' ');
  let r = cabecalho(ws, rel, secao.titulo, sub, ultima, total, img, false);
  ws.getRow(r).height = 8;
  r += 1;

  // Cabeçalho da tabela
  const header = r;
  const hrow = ws.getRow(header);
  hrow.height = 24;
  secao.colunas.forEach((col, i) => {
    const cell = ws.getCell(header, MARGEM + 1 + i);
    cell.value = col.rotulo;
    cell.font = fonte({ bold: true, color: { argb: COR.branco } });
    cell.fill = solido(COR.brand);
    const centro = col.tipo === 'data' || col.tipo === 'datahora';
    cell.alignment = {
      vertical: 'middle',
      horizontal: NUMERICO.has(col.tipo) ? 'right' : centro ? 'center' : 'left',
      indent: centro ? 0 : 1,
    };
  });
  r += 1;

  if (secao.linhas.length === 0) {
    linhaMesclada(ws, r, ultima, total, secao.vazio ?? 'Sem linhas neste recorte.', {
      italic: true,
      color: { argb: COR.ink3 },
    });
    r += 1;
  }

  secao.linhas.forEach((linha, n) => {
    const row = ws.getRow(r);
    let alturas = 1;
    secao.colunas.forEach((col, i) => {
      const cell = ws.getCell(r, MARGEM + 1 + i);
      escreverCelula(cell, col, linha[i]);
      if (n % 2 === 1) cell.fill = solido(COR.zebra);
      cell.border = { bottom: { style: 'hair', color: { argb: COR.hairline } } };
      if (col.longo) alturas = Math.max(alturas, linhasPara(textoExibido(col, linha[i]), W[i]));
    });
    row.height = Math.max(18, alturas * 13.5 + 4);
    r += 1;
  });

  if (secao.totais && secao.linhas.length) {
    const row = ws.getRow(r);
    row.height = 20;
    secao.colunas.forEach((col, i) => {
      const cell = ws.getCell(r, MARGEM + 1 + i);
      const v = secao.totais![i];
      if (v === null) cell.value = '';
      else escreverCelula(cell, col, v);
      cell.font = fonte({ bold: true });
      cell.fill = solido(COR.surface2);
      cell.border = { top: { style: 'thin', color: { argb: COR.ink3 } } };
    });
    r += 1;
  }

  if (secao.linhas.length) {
    ws.autoFilter = {
      from: { row: header, column: MARGEM + 1 },
      to: { row: header + secao.linhas.length, column: ultima },
    };
  }
  ws.views = [{ state: 'frozen', ySplit: header, xSplit: 0, showGridLines: false }];
  ws.pageSetup.printTitlesRow = `${header}:${header}`;
  rodape(ws, secao.titulo);
}

/* -- Entrada ------------------------------------------------------------------------ */

export async function baixarXlsx(rel: Relatorio): Promise<void> {
  const [{ default: ExcelJS }, logo, traco] = await Promise.all([
    import('exceljs'),
    logoPng(150),
    tracoPng(COR.ouro),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = rel.geradoPor;
  wb.created = rel.geradoEm;
  wb.title = rel.titulo;
  wb.company = 'UniAnchieta';

  const img: Imagens = {
    logo: wb.addImage({ base64: logo.base64, extension: 'png' }),
    logoLarg: logo.largura,
    logoAlt: logo.altura,
    traco: wb.addImage({ base64: traco.base64, extension: 'png' }),
  };

  abaResumo(wb, rel, img);
  for (const s of rel.secoes) abaSecao(wb, rel, s, img);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${rel.arquivo}-${fileStamp()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
