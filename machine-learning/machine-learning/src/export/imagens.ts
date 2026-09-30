/* ==========================================================================
   Imagens da planilha: o logo e o traço amarelo, em PNG
   --------------------------------------------------------------------------
   O Excel não desenha SVG nem lê variável CSS. O logo é o MESMO componente
   da sidebar (`AnchietaLogo`), renderizado para texto, com a cor da marca
   resolvida para o hex registrado, e rasterizado num canvas em 3×, para sair
   nítido em tela retina e na impressão.
   ========================================================================== */

export interface Png {
  base64: string;
  largura: number;
  altura: number;
}

const ESCALA = 3;

async function svgParaPng(svg: string, largura: number, altura: number): Promise<Png> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(largura * ESCALA);
  canvas.height = Math.round(altura * ESCALA);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível para gerar a imagem da planilha.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { base64: canvas.toDataURL('image/png'), largura, altura };
}

let logoMemo: Promise<Png> | null = null;

/** O wordmark UniAnchieta com `largura` px de tela. */
export function logoPng(largura = 150): Promise<Png> {
  if (!logoMemo) {
    logoMemo = (async () => {
      const [{ createRoot }, { flushSync }, { createElement }, { AnchietaLogo }] = await Promise.all([
        import('react-dom/client'),
        import('react-dom'),
        import('react'),
        import('../components/brand/AnchietaLogo'),
      ]);
      // Renderiza o componente num nó solto (fora da página) e lê o SVG.
      const host = document.createElement('div');
      const root = createRoot(host);
      flushSync(() => root.render(createElement(AnchietaLogo)));
      let svg = host.innerHTML;
      root.unmount();
      svg = svg.replace(/var\(--brand-mark,\s*(#[0-9a-fA-F]{6})\)/g, '$1');
      if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      // Tamanho intrínseco explícito: sem ele, o <img> de SVG cai em 300×150.
      svg = svg.replace('<svg', '<svg width="1577" height="485"');
      const altura = (largura * 485) / 1577;
      return svgParaPng(svg, largura, altura);
    })();
  }
  return logoMemo;
}

/** O traço amarelo sob o título (o mesmo de `brand.css`). */
export function tracoPng(cor: string): Promise<Png> {
  const largura = 40;
  const altura = 3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}"><rect width="${largura}" height="${altura}" rx="1.5" fill="${cor}"/></svg>`;
  return svgParaPng(svg, largura, altura);
}
