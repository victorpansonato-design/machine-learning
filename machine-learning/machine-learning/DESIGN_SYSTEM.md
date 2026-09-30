# DESIGN SYSTEM — UniAnchieta · Centro de Sucesso ao Aluno

> **Documento portátil.** Descreve, com valores exatos extraídos do código, o sistema visual do
> `sucesso-ao-aluno`. Qualquer sistema novo que copie os tokens, a tipografia, o motion spec e os
> primitivos deste arquivo sai visualmente idêntico — sem precisar olhar este repositório.
>
> **Repositório de origem:** https://github.com/victorpansonato-design/sucesso-ao-aluno
> **Versão:** 3.0 · 29/09/2026 · **Stack:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4 + motion/react 12 + lucide-react
>
> **O que mudou desde a 2.0 (29/08):** regra 6 (material é conquistado), tokens de vidro, slab e
> `--vital`, segmented físico, `Hint`/`Denominator`, `MetricSheet`, `Reveal`, `Plot`, `Toaster`,
> troca de tema com revelação circular, os padrões de tabela operacional e de página de uma pessoa,
> as regras de honestidade de dado e o **perfil simples** (§18) para sistemas derivados. Lista
> completa na §19.

---

## 0. Índice

1. [As seis regras](#1-as-seis-regras)
2. [Stack e dependências exatas](#2-stack-e-dependências-exatas)
3. [Tokens de cor — light e dark completos](#3-tokens-de-cor--light-e-dark-completos)
4. [Ponte Tailwind (`@theme inline`)](#4-ponte-tailwind-theme-inline)
5. [Tipografia](#5-tipografia)
6. [Forma: raios, sombras, espaçamento](#6-forma-raios-sombras-espaçamento)
7. [Camada base e utilitários](#7-camada-base-e-utilitários)
8. [Motion spec](#8-motion-spec)
9. [Layout do shell](#9-layout-do-shell)
10. [Componentes — API e classes exatas](#10-componentes--api-e-classes-exatas)
11. [Visualização de dados e honestidade de dado](#11-visualização-de-dados-e-honestidade-de-dado)
12. [Vocabulário de status](#12-vocabulário-de-status)
13. [Acessibilidade](#13-acessibilidade)
14. [Anti-padrões (zero "AI slop")](#14-anti-padrões-zero-ai-slop)
15. [Boilerplate: começar um sistema novo](#15-boilerplate-começar-um-sistema-novo)
16. [Checklist de revisão](#16-checklist-de-revisão)
17. [Skills e referências](#17-skills-e-referências)
18. [Perfil simples — para sistemas derivados](#18-perfil-simples--para-sistemas-derivados)
19. [Changelog](#19-changelog)

---

## 1. As seis regras

Toda decisão visual do sistema decorre destas seis. Se uma escolha nova não puder ser justificada
por uma delas, ela não entra.

### Regra 1 — Separação é contraste, não linha

Um card é uma **superfície mais clara sobre um canvas mais escuro**. Não existe borda em volta de
caixa. Uma tela com quarenta retângulos de 1px lidos como moldura vira wireframe, não software — o
olho tem de decodificar a moldura antes de ler o conteúdo.

```tsx
/* ✅ */ <div className="rounded-xl bg-surface p-5">
/* ❌ */ <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
```

### Regra 2 — Hairline é divisor, nunca moldura

`--hairline` existe para **separar linhas de uma lista** e **seções de um card**. Ele nunca fecha uma
forma.

```tsx
/* ✅ */ <div className="divide-y divide-hairline">…</div>
/* ✅ */ <footer className="border-t border-hairline pt-2.5">…</footer>
/* ❌ */ <div className="border border-hairline">…</div>
```

### Regra 3 — Um raio de superfície (12px) e uma pílula

Seis raios eram seis decisões que ninguém lembrava. Agora **a silhueta diz o que a coisa é**:

| Forma | Raio | Significa |
|---|---|---|
| Retângulo 12px | `rounded-xl` / `rounded-lg` / `rounded-md` (todos = 12px) | é um **lugar** (card, painel, modal) |
| Pílula | `rounded-full` | é uma **ação** (botão, chip, segmented) |
| 6–8px | `rounded-xs` / `rounded-sm` | chip inline e controle que ficaria absurdo em 12px |
| **Exceções nomeadas** | `--radius-glass` 18px · `--radius-crystal` 26px · `--radius-device` 42px | um **objeto** (slab, placa de vidro, aparelho) — não um card |

Por isso um botão **não precisa de contorno** para ser lido como botão. As exceções são tokens com
nome, nunca um `rounded-[20px]` avulso.

### Regra 4 — Cor é conquistada

Estrutura é monocromática. O azul institucional aparece **só** onde significa algo:

1. o botão primário (**um por tela**),
2. o item de menu ativo,
3. o arco principal do donut e o número-resposta (`Metric tone="brand"`, um por fileira),
4. a **faixa de identidade de uma pessoa** — azul preenchido significa "você está olhando um
   aluno" (Dossiê 360°, painel do caso). Aparece nas telas que tratam de um indivíduo e em
   nenhuma que trata de um conjunto,
5. o slab editorial que abre um painel de gestão (um por tela),
6. a página ativa de uma paginação.

Vermelho é reservado para **o nível mais urgente** (SLA estourado, caso crítico, faixa crítica).
Âmbar para "atenção". Todo o resto é tinta (`--ink`, `--ink-2`, `--ink-3`, `--ink-4`).

**Nas telas de gestão, os cards levam o azul do sistema, e só ele.** Quatro KPIs com
preenchimentos por semântica (azul/âmbar/vermelho/verde) numa linha leem como arco-íris, não como
hierarquia — foi tentado e rejeitado.

### Regra 5 — Sem sombra no que não flutua

`--shadow-raised: none`. Nada na página está flutuando — está diagramado. **Só overlays** (modal,
drawer, popover, toast, tooltip de gráfico), que genuinamente estão acima do app, projetam
`--shadow-overlay`. A única outra sombra do sistema é a de contato da pastilha do segmented físico
(§7), que é espessura de um controle, não elevação de uma superfície.

### Regra 6 — Material é conquistado

É a regra 4 em outra dimensão. Assim como o azul aparece em poucos lugares para continuar
significando algo, **o vidro aparece em UM objeto protagonista por dobra** (`CrystalGlassCard`,
§10.22). Um sistema todo de vidro não é luxuoso — é ilegível, e custa duas camadas de composição
por card. O resto da página é superfície limpa.

`--vital` (verde) significa exatamente uma coisa: **progresso medido**. Nunca é a cor de um card
genérico e nunca pinta um risco de verde.

**Efeito que não carrega dado é rejeitado.** O critério do sistema é beleza unida a utilidade.

---

## 2. Stack e dependências exatas

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port=3000",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@types/node": "^22.14.0",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.4",
    "@vitejs/plugin-react": "^5.0.4",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

**Regras de stack:**

- Tailwind **v4** via plugin Vite (`@tailwindcss/vite`) — **sem** `tailwind.config.js`. Os tokens vivem
  em CSS puro dentro de `@theme inline`.
- `motion/react` (o pacote `motion`, não `framer-motion`).
- **Ícones: exclusivamente `lucide-react`**, sempre em `h-3 w-3`, `h-3.5 w-3.5`, `h-4 w-4` ou `h-5 w-5`.
  Nunca emoji na UI. Nunca outra biblioteca de ícones misturada.
- Nenhuma biblioteca de gráficos. Os charts são SVG próprio (§11).
- Nenhum componente de UI de terceiros. Os primitivos são os deste documento.
- Nenhuma biblioteca de data fetching, de roteador ou de estado global: roteador por hash (§9),
  estado no React, persistência versionada em `localStorage`.
- `vite.config.ts` separa `react`, `motion` e `lucide-react` em chunks próprios (`manualChunks`),
  para uma mudança de tela invalidar só o chunk do app.
- TypeScript `strict` com `noUnusedLocals` e `noUnusedParameters`. `npm run lint` = `tsc --noEmit`.

---

## 3. Tokens de cor — light e dark completos

**Contrato inegociável:** nenhum componente escreve hex. Toda cor resolve por um token semântico, e o
dark mode é uma **troca de tokens**, não um segundo conjunto de classes.

O tema é **opt-in por classe** (`.dark` no `<html>`), nunca herdado do SO. Light é o padrão.

### 3.1 Núcleo (todo sistema usa)

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  /* -- Superfícies: a hierarquia visual inteira, feita de quatro cinzas ---- */
  --canvas: #f3f4f6;
  --canvas-subtle: #eef0f2;
  --surface: #ffffff;
  --surface-2: #eef0f2;
  --surface-3: #e6e8eb;
  --surface-hover: #f3f4f6;

  /* -- Divisores (nunca molduras) ----------------------------------------- */
  --hairline: #e6e8eb;
  --hairline-strong: #d8dbe0;

  /* -- Escada de texto ---------------------------------------------------- */
  --ink: #101317;
  --ink-2: #414852;
  --ink-3: #6b7280;
  --ink-4: #9aa1ac;

  /* -- Marca: cirúrgica ----------------------------------------------------- */
  --brand: #00509d;
  --brand-hover: #003f7d;
  --brand-2: #00509d;
  --brand-3: #0f6fc4;
  --brand-soft: #e8eef5;
  --brand-soft-2: #dce7f1;
  --brand-border: #e8eef5;
  --brand-text: #00457f;
  --on-brand: #ffffff;
  /* Azul do wordmark registrado — nunca re-tingido. */
  --brand-mark: #1567b8;

  /* -- Status: cinza → âmbar → âmbar → vermelho. Um vermelho, no fim. ----- */
  --ok: #6b7280;
  --ok-ink: #414852;
  --ok-soft: #eef0f2;
  --ok-border: #e6e8eb;
  --warn: #9a7128;
  --warn-ink: #7d5c1f;
  --warn-soft: #f5f1e8;
  --warn-border: #ece3d1;
  --risk: #a15c07;
  --risk-ink: #874d05;
  --risk-soft: #f6f0e7;
  --risk-border: #eddfc9;
  --crit: #b42318;
  --crit-ink: #971d14;
  --crit-soft: #f8eceb;
  --crit-border: #f0d5d2;
  --info: #00509d;
  --info-soft: #e8eef5;
  --info-border: #dce7f1;

  /* -- Chrome ------------------------------------------------------------- */
  --focus: #00509d;
  --scrim: rgb(16 19 23 / 0.4);
  --track: #e6e8eb;
  --skeleton: #eaecf0;

  /* -- Elevação: só overlays ---------------------------------------------- */
  --shadow-raised: none;
  --shadow-overlay:
    0 1px 2px rgb(16 19 23 / 0.06), 0 8px 24px -6px rgb(16 19 23 / 0.12),
    0 24px 56px -12px rgb(16 19 23 / 0.14);

  color-scheme: light;
}

.dark {
  --canvas: #0c0d0f;
  --canvas-subtle: #101215;
  --surface: #16181b;
  --surface-2: #1d1f23;
  --surface-3: #24272c;
  --surface-hover: #1f2226;

  --hairline: #262a2f;
  --hairline-strong: #343941;

  --ink: #f2f4f6;
  --ink-2: #c3c9d1;
  --ink-3: #8b929c;
  --ink-4: #626973;

  --brand: #2b7cc9;
  --brand-hover: #3b8cd9;
  --brand-2: #4d9ae0;
  --brand-3: #35b6ec;
  --brand-soft: #16222f;
  --brand-soft-2: #1a2c3d;
  --brand-border: #16222f;
  --brand-text: #7fb6e6;
  --on-brand: #ffffff;
  --brand-mark: #2b83d4;

  --ok: #8b929c;
  --ok-ink: #c3c9d1;
  --ok-soft: #1d1f23;
  --ok-border: #262a2f;
  --warn: #b99552;
  --warn-ink: #d0b17a;
  --warn-soft: #201c14;
  --warn-border: #3a3222;
  --risk: #cd8a45;
  --risk-ink: #e0a970;
  --risk-soft: #231a12;
  --risk-border: #40301f;
  --crit: #e0554b;
  --crit-ink: #f08a82;
  --crit-soft: #241614;
  --crit-border: #452421;
  --info: #4d9ae0;
  --info-soft: #16222f;
  --info-border: #1a2c3d;

  --focus: #4d9ae0;
  --scrim: rgb(4 5 7 / 0.66);
  --track: #262a2f;
  --skeleton: #1c1f23;

  --shadow-raised: none;
  --shadow-overlay:
    0 1px 2px rgb(0 0 0 / 0.5), 0 12px 32px -8px rgb(0 0 0 / 0.6),
    0 32px 64px -16px rgb(0 0 0 / 0.7);

  color-scheme: dark;
}
```

> **Legado inerte.** `index.css` do Sucesso ao Aluno ainda declara `--band`, `--band-2`,
> `--band-ink*`, `--band-line`, `--band-inset` e `--shadow-band: none`, e as classes `.band-surface`
> / `.band-grid` continuam válidas para ~19 pontos de chamada antigos. `--band` hoje é só
> `surface-2` (um passo de contraste, sem matiz). **Sistema novo não usa `band`.**

### 3.2 Material (só no perfil completo — gestão)

Estes tokens alimentam o vidro cristalino (§10.22), o slab editorial (§10.23) e as colunas verdes do
gráfico de fundo. Um sistema no perfil simples (§18) **não** os declara.

```css
:root {
  /* Verde vital: PROGRESSO MEDIDO, e só. Verde de TEXTO e de fio — fechado o
     suficiente para passar contraste sobre superfície clara. */
  --vital: #17a355;
  --vital-2: #0f8a45;
  --vital-ink: #0b6a35;
  --vital-soft: #eaf6ef;

  /* Slab editorial: a abertura de um painel. Azul próprio porque é superfície
     de tipografia grande em branco — branco passa 10:1 aqui. */
  --slab: #00427f;

  /* Exceções NOMEADAS ao raio único. */
  --radius-glass: 18px;
  --radius-device: 42px;
  --radius-crystal: 26px;

  /* Geometria do objeto de vidro — grade, colunas e placa leem os MESMOS valores. */
  --cg-pad-x: 20px;
  --cg-pad-r: 34px;
  --cg-pad-y: 18px;
  --cg-gap: 11px;
  --cg-col-max: 16px;
  --cg-lens-inset: 12px;
  --cg-lens-radius: 20px;

  /* Vidro cristalino. 26% de tinte é o piso: abaixo, `--ink-2` cai de 4,5:1
     sobre o pé verde escuro de uma coluna. */
  --cg-tint-hi: rgb(255 255 255 / 0.26);
  --cg-tint-lo: rgb(255 255 255 / 0.18);
  --cg-bright: 1.02;
  --cg-edge-w: 16px;
  --cg-rim-top: rgb(255 255 255 / 0.85);
  /* Fio escuro OBRIGATÓRIO no claro: sem ele o vidro não termina sobre branco. */
  --cg-rim-hair: rgb(16 19 23 / 0.11);
  --cg-rim-bottom: rgb(255 255 255 / 0.4);
  --cg-rim-inner: rgb(16 19 23 / 0.26);
  --cg-spec-hot: rgb(255 255 255 / 0.5);
  --cg-spec-sweep: rgb(255 255 255 / 0.2);
  --cg-pill-bg: rgb(255 255 255 / 0.34);
  --cg-pill-bg-hover: rgb(255 255 255 / 0.5);
  --cg-pill-hair: rgb(255 255 255 / 0.7);
  --cg-floor: #eceff2;
  --cg-grid: rgb(16 19 23 / 0.1);
  --cg-grid-base: rgb(16 19 23 / 0.16);
  --cg-dot: rgb(16 19 23 / 0.11);

  /* Pigmento das colunas: a versão CLARA e SATURADA do verde, porque é vista
     através de vidro, que rouba saturação. Uma coluna de 120px pintada com o
     verde de texto fica escura e morta. */
  --plot-1: #0a7f45;
  --plot-2: #1fb864;
  --plot-crest: #45d98a;
  --plot-tip: rgb(255 255 255 / 0.45);
  --plot-glow-strong: rgb(31 184 100 / 0.5);
}

.dark {
  --vital: #35d67f;
  --vital-2: #2bbd6d;
  --vital-ink: #7ce8ac;
  --vital-soft: #12241a;

  /* No escuro o slab FECHA: um azul da mesma intensidade seria a peça mais
     clara da página — um retângulo aceso numa tela apagada. */
  --slab: #012f5c;

  /* No escuro a placa ESCURECE em vez de clarear, e a aresta volta a ser luz. */
  --cg-tint-hi: rgb(14 17 21 / 0.42);
  --cg-tint-lo: rgb(14 17 21 / 0.3);
  --cg-bright: 1.06;
  --cg-rim-top: rgb(255 255 255 / 0.28);
  --cg-rim-hair: rgb(255 255 255 / 0.13);
  --cg-rim-bottom: rgb(0 0 0 / 0.45);
  --cg-rim-inner: rgb(0 0 0 / 0.6);
  --cg-spec-hot: rgb(255 255 255 / 0.18);
  --cg-spec-sweep: rgb(255 255 255 / 0.08);
  --cg-pill-bg: rgb(255 255 255 / 0.08);
  --cg-pill-bg-hover: rgb(255 255 255 / 0.16);
  --cg-pill-hair: rgb(255 255 255 / 0.16);
  --cg-floor: #101216;
  --cg-grid: rgb(255 255 255 / 0.09);
  --cg-grid-base: rgb(255 255 255 / 0.16);
  --cg-dot: rgb(255 255 255 / 0.1);

  --plot-1: #0f9a52;
  --plot-2: #2fd07a;
  --plot-crest: #62eda4;
  --plot-tip: rgb(255 255 255 / 0.4);
  --plot-glow-strong: rgb(47 208 122 / 0.42);
}
```

### 3.3 Como escolher a superfície

| Token | Onde | Classe |
|---|---|---|
| `--canvas` | fundo da página, atrás de tudo | `bg-canvas` |
| `--surface` | card, sidebar, header, modal, drawer, pastilha ativa do segmented | `bg-surface` |
| `--surface-2` | card recuado, campo de formulário, chip/tag, avatar, trilho do segmented, barra de topo de tabela | `bg-surface-2` |
| `--surface-3` | hover de campo, contador ativo, trilho do segmented sobre `surface-2` | `bg-surface-3` |
| `--surface-hover` | hover de linha e de card clicável | `hover:bg-surface-hover` |

### 3.4 Como escolher a tinta

| Token | Uso |
|---|---|
| `--ink` | título, valor, texto ativo |
| `--ink-2` | corpo de texto, ícone de nav inativo, botão ghost |
| `--ink-3` | label, legenda, subtítulo, texto secundário |
| `--ink-4` | placeholder, ícone decorativo, valor desligado, eixo de gráfico |

### 3.5 Trocar a marca (para um sistema novo)

Substitua **apenas** estes tokens e todo o resto acompanha:

```css
:root {
  --brand: #00509d;      --brand-hover: #003f7d;  --brand-2: #00509d;
  --brand-3: #0f6fc4;    --brand-text: #00457f;   --brand-soft: #e8eef5;
  --brand-soft-2: #dce7f1; --brand-border: #e8eef5; --brand-mark: #1567b8;
  --focus: #00509d;      --info: #00509d;
}
.dark {
  --brand: #2b7cc9;      --brand-hover: #3b8cd9;  --brand-2: #4d9ae0;
  --brand-3: #35b6ec;    --brand-text: #7fb6e6;   --brand-soft: #16222f;
  --brand-soft-2: #1a2c3d; --brand-border: #16222f; --brand-mark: #2b83d4;
  --focus: #4d9ae0;      --info: #4d9ae0;
}
```

Regra do `--focus`: é sempre o `--brand` do tema. Regra do `--on-brand`: sempre `#fff` — se o brand
novo não passar 4.5:1 com branco, escureça o brand, não clareie o texto.

**Sistema da UniAnchieta não troca a marca.** Todo sistema do Grupo Anchieta usa estes azuis.

---

## 4. Ponte Tailwind (`@theme inline`)

Tailwind v4 gera as utilidades a partir daqui. Cada `--color-x` cria `bg-x`, `text-x`, `border-x`,
`fill-x`, `ring-x`.

```css
@theme inline {
  --color-canvas: var(--canvas);
  --color-canvas-subtle: var(--canvas-subtle);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-surface-hover: var(--surface-hover);

  --color-hairline: var(--hairline);
  --color-hairline-strong: var(--hairline-strong);

  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-ink-4: var(--ink-4);

  --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover);
  --color-brand-2: var(--brand-2);
  --color-brand-3: var(--brand-3);
  --color-brand-soft: var(--brand-soft);
  --color-brand-soft-2: var(--brand-soft-2);
  --color-brand-border: var(--brand-border);
  --color-brand-text: var(--brand-text);
  --color-on-brand: var(--on-brand);

  --color-ok: var(--ok);
  --color-ok-ink: var(--ok-ink);
  --color-ok-soft: var(--ok-soft);
  --color-ok-border: var(--ok-border);
  --color-warn: var(--warn);
  --color-warn-ink: var(--warn-ink);
  --color-warn-soft: var(--warn-soft);
  --color-warn-border: var(--warn-border);
  --color-risk: var(--risk);
  --color-risk-ink: var(--risk-ink);
  --color-risk-soft: var(--risk-soft);
  --color-risk-border: var(--risk-border);
  --color-crit: var(--crit);
  --color-crit-ink: var(--crit-ink);
  --color-crit-soft: var(--crit-soft);
  --color-crit-border: var(--crit-border);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-info-border: var(--info-border);

  --color-track: var(--track);
  --color-skeleton: var(--skeleton);
  --color-focus: var(--focus);

  /* Perfil completo apenas: */
  --color-vital: var(--vital);
  --color-vital-2: var(--vital-2);
  --color-vital-ink: var(--vital-ink);
  --color-vital-soft: var(--vital-soft);
  --radius-glass: var(--radius-glass);
  --radius-device: var(--radius-device);
  --radius-crystal: var(--radius-crystal);

  --font-sans: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* Dois raios de verdade. `xs`/`sm` só para chip inline e controle miúdo;
     tudo que é superfície usa 12px — inclusive `lg`, `xl` e `2xl`. */
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 12px;
  --radius-xl: 12px;
  --radius-2xl: 12px;

  --shadow-raised: var(--shadow-raised);
  --shadow-overlay: var(--shadow-overlay);
}
```

> **Detalhe crítico:** `rounded-lg`, `rounded-xl` e `rounded-2xl` são **todos 12px** de propósito. Um
> dev pode escrever `rounded-2xl` num modal e `rounded-lg` num callout — o resultado é o mesmo. O
> sistema torna impossível errar o raio de uma superfície.

---

## 5. Tipografia

### Famílias

Uma família, uma voz, duas larguras. **Geist** (a face que os dashboards shadcn/Vercel usam) e a mono
irmã, **Geist Mono**.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

**Só três pesos existem: 400, 500, 600.** Nunca `font-bold` (700), nunca `font-light`. O único 700+ no
app é o "A" do logotipo, que é ativo de marca e não tipografia de UI.

### Quando usar mono

Mono é para **valores que precisam alinhar numa coluna**: RA, protocolo, código de curso, dinheiro,
contagem regressiva de SLA, KPI, posição numa fila, data em tabela, eixo de gráfico, contador de badge,
tecla `⌘K`. **Mono não é estilo de label.**

```css
.font-mono, [class*='font-mono'] {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;   /* mono cancela o tracking negativo do corpo */
}
```

### Escala real (todos os tamanhos usados no app)

| Papel | Classe | Peso | Cor |
|---|---|---|---|
| Título de página | `text-[24px] leading-[1.15] sm:text-[30px]` | `font-semibold` | `text-ink` |
| Identidade de pessoa (faixa azul) | `text-[24px] leading-tight` | `font-semibold` | `text-on-brand` |
| Valor protagonista (vidro) | `font-mono text-[44px] leading-[0.9] sm:text-[52px] tracking-tight` | `font-medium` | `text-ink` |
| Valor de MetricSheet | `font-mono text-[42px] leading-none tracking-tight` | `font-medium` | `text-ink` |
| Métrica solta | `font-mono text-[30px] leading-none tracking-tight` | `font-medium` | `text-ink` |
| Valor de StatTile | `font-mono text-[24px] leading-none tracking-tight` | `font-medium` | `text-ink` ou accent |
| Título de drawer | `text-[19px] leading-tight tracking-[-0.02em]` | `font-semibold` | `text-ink` |
| Título de card / modal | `text-[15px] leading-tight` | `font-semibold` | `text-ink` |
| Nome numa linha de tabela | `text-[13.5px]` | `font-semibold` | `text-ink` |
| Corpo, item de lista, label forte | `text-[13px]` | `font-medium` | `text-ink` |
| Aba / opção de segmented `sm` | `text-[13px]` / `text-[12.5px]` | `medium` → `semibold` no ativo | `text-ink-3` → `text-ink` |
| Label, legenda, eyebrow, subtítulo | `text-[12px]` | `font-medium` | `text-ink-3` |
| Erro / ajuda de campo, tooltip | `text-[11.5px]` | `medium` / normal | `text-crit` / `text-ink-4` / `text-ink-2` |
| Tag, chip, `dt`, rodapé de tile | `text-[11px]` | `font-medium` | `text-ink-3` / `text-ink-4` |
| Carimbo de data em lista | `font-mono text-[10.5px]` | normal | `text-ink-4` |
| Contador dentro de aba/badge, eixo | `font-mono text-[10px]`…`text-[11px]` | `font-medium` | `text-ink-2` / `text-ink-4` |

Não invente tamanhos fora desta lista. Se precisar de algo entre dois, use o menor.

### Tracking

```css
body        { letter-spacing: -0.006em; }  /* corpo: sutilmente apertado */
h1, h2, h3  { letter-spacing: -0.02em;  }  /* display: apertado, dá a confiança do sistema */
.font-mono  { letter-spacing: 0;        }  /* mono nunca aperta */
```

### Sentence case, sempre

Rótulos de seção são **sentence case em `text-[12px] font-semibold text-ink-3`**, nunca eyebrow mono
em caixa alta. Caixa alta repetida doze vezes por tela vira textura, e textura é o que torna uma
ferramenta densa cansativa de olhar por oito horas. A **única** caixa alta do sistema é a linha da
unidade sob o wordmark (`text-[10.5px] font-semibold tracking-[0.1em] uppercase`).

---

## 6. Forma: raios, sombras, espaçamento

### Raios

```
rounded-xs          6px   chip inline minúsculo
rounded-sm          8px   tag, contador de aba
rounded-md         12px   campo, item de nav, botão quadrado de ícone
rounded-lg         12px   callout, container do switch, ícone de header de modal
rounded-xl         12px   card, stat tile, popover, empty state
rounded-2xl        12px   modal
rounded-full         —    botão, chip toggle, segmented, avatar, dot, thumb do switch
--radius-glass     18px   slab editorial
--cg-lens-radius   20px   placa de vidro
--radius-crystal   26px   casca do objeto de vidro
--radius-device    42px   aparelho 3D
```

### Sombras

```
shadow-raised   none                      ← nunca use; existe só para provar a regra
shadow-overlay  var(--shadow-overlay)     ← modal, drawer, popover, toast, tooltip. E só.
```

### Espaçamento — grade de 4px

| Contexto | Valor |
|---|---|
| Padding de card | `p-5` (20px) |
| Padding de stat tile / callout | `p-4` / `p-3.5` |
| Padding de header/footer de modal | `px-5 py-4` / `px-5 py-3.5` |
| Padding de linha de tabela | `px-5 py-3` |
| Barra de topo / paginação de tabela | `px-4 py-2.5` |
| Padding de `main` | `px-4 py-6 sm:px-6 lg:px-8` |
| Gap entre cards de uma grade | `gap-4` (16px) · `gap-3` em fileira de tiles |
| Gap entre seções de uma página | `space-y-5` / `space-y-6` |
| Gap de ícone→texto num botão | `gap-1.5` (xs/sm) · `gap-2` (md) |
| Gap de barra de ações | `gap-2` |

### Alturas de controle

```
h-7   (28px)  botão xs, chip, segmented xs, página da paginação
h-8   (32px)  botão sm, segmented sm, botão de ícone de modal
h-9   (36px)  input, select, textarea, trigger de busca, avatar md
h-9.5 (38px)  botão md
h-5 w-9       switch (thumb h-4 w-4)
h-1.25        dot de status (5px)
w-0.5         trilho lateral de linha ativa / crítica / callout
h-[74px]      header E zona da marca na sidebar — a linha do topo fecha
```

### Largura de conteúdo

```
max-w-[1440px]   container do main
max-w-3xl        descrição de PageHeader
max-w-2xl        subtítulo de CardHeader
max-w-sm         mensagem de EmptyState
max-w-md         trigger de busca no header
```

---

## 7. Camada base e utilitários

```css
@layer base {
  /* Toda borda que alguém desenhar já nasce hairline — não precisa dizer a cor. */
  * { border-color: var(--hairline); }

  html {
    background-color: var(--canvas);
    -webkit-text-size-adjust: 100%;
    scrollbar-gutter: stable;   /* a página não pula quando o scroll aparece */
  }

  body {
    margin: 0;
    min-height: 100vh;
    background-color: var(--canvas);
    color: var(--ink);
    font-family: var(--font-sans);
    font-optical-sizing: auto;
    letter-spacing: -0.006em;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3 { letter-spacing: -0.02em; }

  .font-mono, [class*='font-mono'] {
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }

  button, input, select, textarea {
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
  }

  button:not(:disabled) { cursor: pointer; }

  :focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
    border-radius: var(--radius-xs);
  }
  :focus:not(:focus-visible) { outline: none; }

  ::selection { background-color: var(--brand-2); color: #fff; }
  ::placeholder { color: var(--ink-4); }

  /* Ícone nativo de date/time some no dark — inverte. */
  .dark input[type='date']::-webkit-calendar-picker-indicator,
  .dark input[type='time']::-webkit-calendar-picker-indicator {
    filter: invert(1) opacity(0.55);
  }
}

@layer utilities {
  .tabular { font-variant-numeric: tabular-nums; }

  /* Scrollbar: presente, mas quieta. */
  .scroll-slim { scrollbar-width: thin; scrollbar-color: var(--hairline-strong) transparent; }
  .scroll-slim::-webkit-scrollbar { width: 8px; height: 8px; }
  .scroll-slim::-webkit-scrollbar-track { background: transparent; }
  .scroll-slim::-webkit-scrollbar-thumb {
    background: var(--hairline-strong);
    border: 2px solid transparent;
    background-clip: content-box;
    border-radius: 9999px;
  }
  .scroll-slim::-webkit-scrollbar-thumb:hover { background: var(--ink-4); background-clip: content-box; }

  /* O scrim: borra e dessatura o app atrás do overlay. */
  .scrim {
    background-color: var(--scrim);
    backdrop-filter: blur(14px) saturate(115%);
    -webkit-backdrop-filter: blur(14px) saturate(115%);
  }

  /* Indicador "ao vivo": uma pulsação calma, nunca uma festa. */
  .pulse-dot { position: relative; }
  .pulse-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 9999px;
    border: 1.5px solid currentColor;
    opacity: 0;
    animation: csa-pulse 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
  }
  @keyframes csa-pulse {
    0%        { transform: scale(0.7);  opacity: 0.55; }
    70%, 100% { transform: scale(1.45); opacity: 0; }
  }

  /* Skeleton */
  .shimmer {
    background-image: linear-gradient(90deg, var(--skeleton) 0%, var(--surface-3) 40%, var(--skeleton) 80%);
    background-size: 200% 100%;
    animation: csa-shimmer 1.4s ease-in-out infinite;
  }
  @keyframes csa-shimmer { to { background-position: -200% 0; } }

  /* Segmentado FÍSICO: a pastilha selecionada tem espessura — luz na aresta de
     cima, sombra de contato embaixo, halo que a levanta do trilho. Ela mora
     DENTRO do botão ativo (`inset: 0`) e é um nó do Motion com `layoutId`. */
  .seg-track {
    position: relative;
    display: inline-flex;
    padding: 3px;
    border-radius: 9999px;
    background-color: var(--surface-2);
    box-shadow: inset 0 1px 2px rgb(16 19 23 / 0.07);
  }
  .dark .seg-track { box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.45); }
  .seg-thumb {
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background-color: var(--surface);
    box-shadow:
      0 0 0 0.5px rgb(16 19 23 / 0.06),
      0 1px 1px rgb(16 19 23 / 0.05),
      0 3px 8px -2px rgb(16 19 23 / 0.16),
      inset 0 1px 0 0 rgb(255 255 255 / 0.9);
  }
  .dark .seg-thumb {
    background-color: var(--surface-3);
    box-shadow:
      0 0 0 0.5px rgb(0 0 0 / 0.5),
      0 2px 6px -1px rgb(0 0 0 / 0.5),
      inset 0 1px 0 0 rgb(255 255 255 / 0.12);
  }

  @media (prefers-reduced-motion: reduce) {
    .pulse-dot::after { animation: none !important; opacity: 0 !important; }
  }

  /* Impressão. `[data-reveal]` nasce em opacidade 0 e sobe ao entrar no
     viewport; numa impressão nada entra em viewport, e sem esta regra o
     relatório sai com as dobras em branco. `!important` vence o style inline
     que o Motion escreve. */
  @media print {
    .print\:hidden { display: none !important; }
    .print-report { background: #fff !important; color: #000 !important; }
    [data-reveal] { opacity: 1 !important; transform: none !important; }
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Troca de tema: revelação circular (§10.21). O cross-fade padrão da View
   Transitions API é desligado — a borda do círculo tem de ser limpa. */
::view-transition-old(root),
::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
::view-transition-old(root) { z-index: 0; }
::view-transition-new(root) { z-index: 1; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(root),
  ::view-transition-old(root),
  ::view-transition-new(root) { animation: none !important; }
}
```

As camadas de material (`.cg-*` do vidro, `.editorial-slab`, `.device-*` e `.ios-*` do aparelho, e a
impressão isolada da folha da trilha com `body:has(.trilha-sheet)`) estão em `src/index.css` do
Sucesso ao Aluno, com a história de cada decisão nos comentários. Elas são do perfil completo; §10.22
e §10.23 resumem o que é preciso saber para usá-las.

---

## 8. Motion spec

Três curvas, sem improviso.

- **spring** — o que se move **entre duas posições conhecidas** (pastilha do segmented, sublinhado de
  aba, reordenação de linhas, thumb do switch, largura da sidebar).
- **emphasis** — o que **chega** (modal, drawer, toast, revelação de página).
- **exit** — o que **sai**. Sempre mais rápido que a entrada, porque uma UI que demora a sumir parece
  lenta.

```ts
// src/lib/motion.ts
import type { Transition, Variants } from 'motion/react';

/** Spring rápido, sem overshoot, para transição de layout. */
export const spring: Transition = { type: 'spring', stiffness: 460, damping: 38, mass: 0.7 };

/** Spring mais macio para superfícies grandes (drawers, painéis). */
export const springSoft: Transition = { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 };

/** Curva de desaceleração assinatura da Apple. */
export const emphasis = [0.16, 1, 0.3, 1] as const;
/** Curva de aceleração — só em saída. */
export const exitCurve = [0.4, 0, 1, 1] as const;

export const enterFast: Transition = { duration: 0.22, ease: emphasis };
export const exitFast: Transition = { duration: 0.13, ease: exitCurve };

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: emphasis } },
  exit: { opacity: 0, y: -6, transition: exitFast },
};

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: emphasis } },
};

export const scrimVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: emphasis } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: exitCurve } },
};
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.975, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, scale: 0.985, y: 6, transition: exitFast },
};
export const drawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: springSoft },
  exit: { x: '100%', transition: { duration: 0.2, ease: exitCurve } },
};
export const popoverVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.1 } },
};
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springSoft },
  exit: { opacity: 0, x: 24, scale: 0.97, transition: exitFast },
};
export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.26, ease: emphasis } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.18, ease: exitCurve } },
};

/** Feedback de toque uniforme em todo o app. */
export const press = { scale: 0.975 } as const;
export const pressSubtle = { scale: 0.99 } as const;
```

### Durações que existem no sistema

| O quê | Duração | Curva |
|---|---|---|
| Tooltip de gráfico | 140 ms | emphasis |
| Transição de cor (hover) | 150 ms | `transition-colors` |
| Aba (sublinhado) | 220 ms | emphasis |
| Entrada de página | 260 ms | emphasis · saída 130 ms |
| Entrada por rolagem (`Reveal`) | 520 ms, y 14px, escalonamento 60 ms | emphasis |
| Contador (`AnimatedNumber`) | 620 ms | `1 - (1-p)³` |
| Barra / meter | 700–800 ms | emphasis |
| Linha de gráfico (`pathLength`) | 850 ms | emphasis, +60 ms por série |
| Donut / score ring | 900 ms / 1,1 s | emphasis |
| Revelação circular do tema | 700 ms | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Colunas do vidro subindo | 1,15 s, escalonamento 55 ms | emphasis — lento de propósito: o olho acompanha a série |

### Regras de motion

1. **Todo controle clicável recebe `whileTap={press}`.** Nada mais. Sem hover-lift, sem
   `hover:scale`, sem `translate-y` no hover de card.
2. **Transição de cor é sempre `transition-colors duration-150`** (ou `transition-colors` puro).
   Nunca `transition-all`.
3. **`layoutId` para o indicador ativo** — pastilha do segmented, sublinhado de aba, fundo do item de
   nav. O `layoutId` precisa ser **único por instância** (passe como prop).
4. **Volume conta; índice preenche.** `AnimatedNumber` conta do zero na montagem e faz tween nas
   atualizações — honesto para volume ("41 intervenções" foi de 0 a 41). Para um **índice limitado**
   (score 0–100, taxa), passe `countUp={false}`: durante os primeiros quadros a tela diria "0/100",
   e é uma frase que alguém fotografa. Índice anima o calibre, não os dígitos.
5. **A saída é sempre mais rápida que a entrada.**
6. **Entrada por rolagem é pontuação, não enfeite**: uma vez só (`once: true`), dispara antes de
   aparecer (margem −12%), deslocamento curto (14px), e `prefers-reduced-motion` desliga de verdade
   (o conteúdo nasce no lugar, sem movimento curto).
7. `prefers-reduced-motion` já está tratado na camada base para CSS. O que **não** é CSS (count-up,
   `Reveal`, tilt, brilho que segue o ponteiro) lê `useReducedMotion()` de `lib/reactive.ts`.

---

## 9. Layout do shell

```
┌────────────┬────────────────────────────────────────────────┐
│  Sidebar   │  Header  sticky top-0 z-20  h-[74px]           │
│  sticky    │  bg-surface/85 backdrop-blur-xl                │
│  top-0     │  border-b border-hairline                      │
│  z-30      ├────────────────────────────────────────────────┤
│  h-screen  │  main  px-4 py-6 sm:px-6 lg:px-8               │
│  bg-surface│    div  mx-auto w-full max-w-[1440px]          │
│  244px     │      <AnimatePresence mode="wait">             │
│  ou 68px   │        {view}   ← pageVariants                 │
│  colapsada │      </AnimatePresence>                        │
└────────────┴────────────────────────────────────────────────┘
```

```tsx
<div className="flex min-h-screen bg-canvas">
  <Sidebar … />
  <div className="flex min-w-0 flex-1 flex-col">
    <Header … />
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
      </div>
    </main>
  </div>
  {/* overlays no fim, fora do fluxo */}
</div>
```

O shell é dono do roteamento **e** de todos os overlays: um modal aberto da fila, de um dossiê ou de
uma notificação é o mesmo componente com o mesmo comportamento. As views recebem callbacks
(`actions`) e não guardam estado de overlay.

### Sidebar

```tsx
<motion.aside
  animate={{ width: collapsed ? 68 : 244 }}
  transition={spring}
  className="sticky top-0 z-30 flex h-screen shrink-0 flex-col bg-surface select-none print:hidden"
>
```

- Zona da marca: `flex h-[74px] shrink-0 items-center px-4` — **mesma altura do header**, então a
  linha do topo fecha. Expandida: `<BrandLockup />`. Recolhida: um quadrado
  `h-9 w-9 rounded-md bg-[var(--brand-mark)] font-mono text-[15px] font-semibold text-white` com "A".
- Navegação: `<nav className="scroll-slim min-h-0 flex-1 overflow-y-auto px-2.5 py-2">`, itens em
  `space-y-0.5`.
- Item: `relative flex w-full items-center gap-2.5 rounded-md py-2 text-left transition-colors` +
  `px-2.5` (ou `justify-center` recolhida, ou `pr-2.5 pl-8` aninhado). Inativo
  `text-ink-2 hover:bg-surface-2 hover:text-ink`; ativo `text-on-brand` + um
  `<motion.span layoutId="sidebar-active" transition={spring} className="absolute inset-0 rounded-md bg-brand" />`.
  Ícone `relative z-10 h-4 w-4 shrink-0`, `text-ink-4` inativo / `text-on-brand` ativo. Rótulo
  `relative z-10 min-w-0 flex-1 truncate text-[13px]`, `font-semibold` no ativo. Recolhida, o
  rótulo vira `title`.
- **Um único número na navegação** — o badge do que muda o que você faz a seguir (no Sucesso ao
  Aluno, a fila): `rounded-sm px-1.5 py-px font-mono text-[11px] font-medium`, `bg-crit text-white`
  quando urgente, `bg-white/20 text-on-brand` no item ativo, `bg-surface-2 text-ink-3` no resto.
  Recolhida, vira um ponto `h-1.5 w-1.5` no canto.
- **Hierarquia:** o que se usa todo dia fica plano e visível; o que é de gestão vive atrás de **um**
  grupo colapsado (`ChevronDown` que gira `-rotate-90`), que abre sozinho quando você está numa das
  telas dele e mostra um ponto `bg-brand` quando fechado com uma tela dele ativa. Sem sub-cabeçalho
  acima de três itens, sem seção segurando um único link.
- Rodapé `shrink-0 space-y-2 p-2.5`: identidade/função, e a fileira de dois botões pílula
  `h-8 rounded-full bg-surface-2 text-[12px] font-medium text-ink-3 hover:bg-surface-3 hover:text-ink`
  — tema (`Sun`/`Moon`, rótulo "Claro"/"Escuro") e recolher (`ChevronsLeft`/`ChevronsRight`, `w-8`).

### Header

```tsx
<header className="sticky top-0 z-20 border-b border-hairline bg-surface/85 backdrop-blur-xl print:hidden">
  <div className="flex h-[74px] items-center gap-3 px-4 sm:px-6">
```

O trigger da command palette (⌘K):

```tsx
<button className="group flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg bg-surface-2 px-3 text-left transition-colors sm:max-w-md">
  <Search className="h-3.5 w-3.5 shrink-0 text-ink-4 transition-colors group-hover:text-brand-2" />
  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-4">Buscar…</span>
  <kbd className="hidden shrink-0 rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-4 sm:block">⌘K</kbd>
</button>
```

- O lado direito é `ml-auto flex items-center gap-2`. Separador vertical: `mx-0.5 hidden h-6 w-px bg-hairline lg:block`.
- **Recortes globais** (modalidade, coorte) moram no header porque re-escopam todas as telas de uma
  vez — é a única forma de os números de telas diferentes concordarem. Uma tela com barra de
  recortes própria esconde os do header (`hideScopeControls`): dois controles idênticos na mesma
  tela fazem o usuário procurar a diferença.
- **Faixa de escopo**: com um recorte ativo, uma linha
  `flex items-center gap-2 border-t border-hairline bg-brand-soft px-4 py-1.5 sm:px-6` diz o
  escopo em palavras (`Escopo ativo · Presencial·Veteranos` + `Limpar`), para nenhum gráfico ser
  lido fora de contexto.
- Seletor compacto dentro do header (ciclo letivo):
  `flex h-8 items-center gap-1.5 rounded-lg bg-surface-2 px-2.5` com rótulo `text-[11px] font-medium text-ink-4`
  e `<select className="cursor-pointer bg-transparent font-mono text-[11.5px] font-semibold text-ink focus:outline-none">`.
- **Popover de notificações**: `absolute right-0 z-50 mt-2 w-[368px] origin-top-right overflow-hidden rounded-xl bg-surface shadow-overlay`
  com `popoverVariants`; cabeçalho `border-b border-hairline bg-surface-2 px-4 py-2.5`; lista
  `scroll-slim max-h-[400px] divide-y divide-hairline overflow-y-auto`; item não lido com
  `bg-brand-soft/40` e ponto `h-1.5 w-1.5 bg-brand-2`. Fecha em clique fora e Escape. Contador no
  sino: `absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-crit px-1 font-mono text-[9.5px] font-semibold text-white`.

### Roteamento por hash

Uma ferramenta operacional tem de sobreviver ao botão **voltar**. Sem histórico real, "voltar para a
fila" é mentira e nenhuma tela pode ser mandada para um colega. Roteamento por hash dá os dois sem
dependência e sem regra de reescrita no servidor — o app é servido como bundle estático.

```
#/<rota>            #/<rota>/<param>
```

`parseHash` normaliza (`#/` opcional, rota desconhecida → padrão), `buildHash` codifica o param com
`encodeURIComponent`, `useRoute()` devolve `{ route, navigate, replace, back, href }` e uma URL sem
hash é normalizada com `location.replace` para o primeiro item do histórico ser uma rota real.

### Escala de z-index

```
z-20  header sticky
z-30  sidebar sticky
z-40  tooltip do Hint
z-50  scrim + modal/drawer, popover do header
z-60  toasts
```

### Pré-pintura do tema (obrigatório no `index.html`)

Sem isto, o app pisca a paleta errada no primeiro render.

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('app.v1.theme');
      // O store serializa em JSON — a entrada crua é '"dark"', com aspas.
      var theme = stored === 'dark' || stored === '"dark"' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.style.colorScheme = theme;
    } catch (e) {
      /* storage indisponível — cai no claro */
    }
  })();
</script>
```

> **Duas armadilhas que custaram bug real neste projeto:**
> 1. O store serializa em JSON, então a entrada crua é `'"dark"'`, aspas incluídas. Comparar a string
>    crua com `'dark'` silenciosamente nunca casava.
> 2. Se a chave carrega prefixo de schema (`csa.v4.theme`) e o schema sobe de versão, **esta linha
>    sobe junto**. Uma chave defasada faz o passe pré-pintura ler algo que não existe, cair no claro,
>    e o app trocar a paleta no primeiro render — exatamente o flash que este bloco existe para evitar.

Meta tags de cor do sistema:

```html
<meta name="theme-color" content="#f3f4f6" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0c0d0f" media="(prefers-color-scheme: dark)" />
```

### Persistência

Estado local em `localStorage` com **prefixo de schema** (`csa.v4.*`). Subir a versão descarta o
namespace antigo e re-semeia — sem isso, uma mudança de forma reidrata objetos velhos e o app quebra
de um jeito que parece bug do código novo. `load`/`save` engolem erro (quota, modo privado): o app
continua funcionando da memória.

---

## 10. Componentes — API e classes exatas

Estrutura de arquivos:

```
src/components/ui/
  Button.tsx       Button, LinkButton
  Surfaces.tsx     Card, CardHeader, PageHeader, SectionLabel, StatTile, Metric,
                   Row, EmptyState, Skeleton, DataList, Callout, Tabs, ChevronAffordance
  Badges.tsx       Pill, Avatar, TrendIndicator (+ badges de domínio)
  Fields.tsx       Label, Field, TextInput, TextArea, Select, SearchInput,
                   Segmented, Switch, Chip
  Overlay.tsx      Modal, Drawer
  Charts.tsx       AnimatedNumber, ScoreRing, Donut, MeterBar, StackedBar,
                   Sparkline, ColumnChart, heatColor
  Plot.tsx         LineChart, StackedColumns, BarList
  Hint.tsx         Hint, Denominator
  MetricSheet.tsx  MetricSheet
  Reveal.tsx       Reveal, RevealGroup, RevealItem, useEnter
  CrystalGlass.tsx CrystalGlassCard, GlassLabel, GlassValue, GlassPill   (perfil completo)
src/components/layout/
  Sidebar.tsx  Header.tsx  CommandPalette.tsx  Toaster.tsx
src/components/brand/
  AnchietaLogo.tsx AnchietaLogo, BrandLockup
```

Todo arquivo de primitivo abre com um **cabeçalho de comentário explicando o porquê** das suas regras.
É o comentário que impede o sistema de derivar de volta para bordas e sombras seis meses depois — ao
copiar um primitivo, copie o cabeçalho junto.

### 10.1 Button

Botões são **pílulas**; superfícies são retângulos de 12px. Duas silhuetas para o app inteiro, então a
silhueta sozinha diz se a coisa é um lugar ou uma ação.

| Variante | Classes | Quando |
|---|---|---|
| `primary` | `bg-brand text-on-brand hover:bg-brand-hover` | **a** ação mais importante da tela. **Uma por view.** |
| `secondary` | `bg-surface-2 text-ink hover:bg-surface-3` | alternativa real à primária. Preenchida, nunca contornada. *(padrão)* |
| `ghost` | `text-ink-2 hover:bg-surface-2 hover:text-ink` | terciária; vive em linha densa e toolbar |
| `danger` | `bg-crit text-white hover:brightness-110` | destrutivo ou irreversível |

```ts
const SIZE = {
  xs: 'h-7   text-[12px] gap-1.5 rounded-full',
  sm: 'h-8   text-[13px] gap-1.5 rounded-full',
  md: 'h-9.5 text-[13px] gap-2   rounded-full',
};
const PAD    = { xs: 'px-3',  sm: 'px-3.5', md: 'px-4.5' };
const SQUARE = { xs: 'w-7',   sm: 'w-8',    md: 'w-9.5'  };
```

> **Armadilha resolvida no código:** geometria e padding são **listas separadas**. Emitir `px-3.5` e
> `px-0` juntos e torcer para o segundo vencer não funciona — o Tailwind decide pela ordem na folha
> de estilo, não no atributo `class`. Um botão quadrado **nunca recebe padding horizontal**.

Classes fixas: `inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap
transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-45` +
`whileTap={press}` (suprimido quando `disabled`). Props: `variant`, `size` (padrão `sm`), `icon`,
`iconRight`, `square`, `full`. `forwardRef` para o botão poder ancorar popover.

> **React 19 + motion:** os handlers nativos `onDrag*` / `onAnimation*` colidem com os do Motion.
> **Omita-os do tipo** em vez de silenciar com `any`:
> ```ts
> type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>,
>   'onDrag'|'onDragStart'|'onDragEnd'|'onAnimationStart'|'onAnimationEnd'|'onAnimationIteration'>;
> ```

**LinkButton** — ação inline no rodapé de card:
`inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink disabled:opacity-45`.

### 10.2 Card

Um card é uma superfície mais clara e um raio de 12px. **É a receita inteira.**

```tsx
<Tag className={['rounded-xl', tone === 'plain' ? 'bg-surface' : 'bg-surface-2', padded ? 'p-5' : '', className]}>
```

Props: `padded` (padrão `true`), `tone: 'plain' | 'inset' | 'band'` (`inset` e `band` são o mesmo: um
passo de contraste), `as: 'section' | 'div' | 'article' | 'aside'`.

### 10.3 CardHeader

```tsx
<div className="relative flex items-start justify-between gap-4">
  <div className="min-w-0">
    {eyebrow && <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-3">{eyebrow}</div>}
    <h2 className="text-[15px] leading-tight font-semibold text-ink">{title}</h2>
    {subtitle && <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-3">{subtitle}</p>}
  </div>
  {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
</div>
```

`eyebrow` só quando nomeia uma seção real. **Não em todo card.**

### 10.4 PageHeader

```tsx
<header className="space-y-4">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      {eyebrow && <div className="mb-1.5 flex items-center gap-2 text-[12px] font-medium text-ink-3">{eyebrow}</div>}
      <h1 className="text-[24px] leading-[1.15] font-semibold text-ink sm:text-[30px]">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-3">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
  {children /* barra de filtros ou segmented desta página */}
</header>
```

### 10.5 SectionLabel

```tsx
<div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2">
  <h2 className="text-[12px] font-semibold text-ink-3">{children}</h2>
  {action}
</div>
```

### 10.6 StatTile

```tsx
<div className="flex flex-col rounded-xl p-4 bg-surface">   {/* tone 'band' → bg-surface-2 */}
  <div className="relative flex items-start justify-between gap-3">
    <span className="text-[12px] font-medium text-ink-3">{label}</span>
    {icon && <span className="text-ink-4">{icon}</span>}
  </div>
  <div className="relative mt-2 flex items-baseline gap-2">
    <span className="font-mono text-[24px] leading-none font-medium tracking-tight" style={accent ? { color: accent } : undefined}>
      <span className={accent ? '' : 'text-ink'}>{value}</span>
    </span>
    {detail && <span className="text-[12px] text-ink-3">{detail}</span>}
  </div>
  {footer && (
    <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2.5 text-[11px] text-ink-3">{footer}</div>
  )}
</div>
```

Com `onClick`, vira `motion.button` com `whileTap={press}` + `text-left transition-colors hover:bg-surface-hover`.
`accent` recebe **uma cor de status** quando o número carrega veredito (ex.: `var(--crit)` quando a
frequência está abaixo do mínimo). **Um tile que filtra a tabela ao lado mostra `filtrado`
(`font-mono font-semibold text-brand-text`) no rodapé** enquanto o filtro dele está ativo — um número
que não filtra nada é decoração.

### 10.7 Metric — um número sem caixa em volta

Para os poucos números que **abrem** uma tela, separados por espaço em branco.

```tsx
<span className="block font-mono text-[30px] leading-none font-medium tracking-tight
                 {tone==='crit' ? 'text-crit-ink' : tone==='brand' ? 'text-brand-text' : 'text-ink'}">{value}</span>
<span className="mt-2 block text-[12px] font-medium {tone==='brand' ? 'text-ink-2' : 'text-ink-3'}">{label}</span>
```

`tone="brand"` marca **o** número que responde "e agora?". **Um por fileira.** Clicável:
`motion.button` com `transition-opacity hover:opacity-60`.

### 10.8 Row — o item de lista clicável

```tsx
<Tag className={['relative block w-full text-left transition-colors',
  onClick ? 'cursor-pointer' : '',
  active ? 'bg-surface-2' : onClick ? 'hover:bg-surface-hover' : '']}>
  {(active || tone === 'crit') && <span className={`absolute inset-y-0 left-0 w-0.5 ${active ? 'bg-brand' : 'bg-crit'}`} />}
  {children}
</Tag>
```

**Trilho de 2px na borda esquerda** marca a linha ativa (azul) e a crítica (vermelha). Nunca fundo
tingido na linha inteira.

### 10.9 Callout

O tom vive num **trilho de 2px na esquerda**; a caixa é só a superfície recuada.

```tsx
<div className="relative flex gap-2.5 overflow-hidden rounded-lg bg-surface-2 p-3.5 pl-4">
  <span className={`absolute inset-y-0 left-0 w-0.5 ${rail}`} />
  {icon && <span className={`mt-px shrink-0 ${textClass}`}>{icon}</span>}
  <div className="min-w-0 text-[12px] leading-relaxed">
    {title && <p className={`font-semibold ${textClass}`}>{title}</p>}
    {children && <div className={`${title ? 'mt-1' : ''} text-ink-2`}>{children}</div>}
  </div>
</div>
```

```
rail:  info bg-brand · warn bg-warn · crit bg-crit · ok bg-ink-4
text:  info text-ink · warn text-warn-ink · crit text-crit-ink · ok text-ink
```

Duas variações de caixa usadas dentro de cards (não são Callout): **fato** `rounded-lg bg-surface-2 p-3`
e **ação sugerida** `rounded-lg bg-brand-soft p-3` com título `text-[11px] font-medium text-brand-text`.

### 10.10 Tabs (sublinhado)

```tsx
<div role="tablist" className="scroll-slim -mb-px flex gap-1 overflow-x-auto border-b border-hairline">
  <button role="tab" aria-selected={active}
    className="relative shrink-0 px-3.5 py-2.5 text-[13px] transition-colors
               {active ? 'font-semibold text-ink' : 'font-medium text-ink-3 hover:text-ink'}">
    <span className="flex items-center gap-1.5">
      {label}
      {count !== undefined && (
        <span className="rounded-sm px-1.5 py-px font-mono text-[10px] font-medium {active ? 'bg-surface-3 text-ink-2' : 'bg-surface-2 text-ink-4'}">{count}</span>
      )}
    </span>
    {active && (
      <motion.span layoutId={layoutId} transition={{ duration: 0.22, ease: emphasis }}
        className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
    )}
  </button>
</div>
```

O conteúdo da aba entra em `pt-5` logo abaixo.

### 10.11 EmptyState · Skeleton · DataList · ChevronAffordance

```tsx
/* EmptyState — compact: 'gap-2 px-6 py-10' */
<div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink-4">{icon ?? <Inbox className="h-5 w-5" />}</div>
  <div>
    <p className="text-[13px] font-semibold text-ink">{title}</p>
    <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-ink-3">{message}</p>
  </div>
  {action}
</div>

/* Skeleton — com a MESMA geometria do conteúdo que ele substitui */
<div className="shimmer rounded-md {className}" />

/* DataList — dt/dd em grade 1|2|3|4 (4 = 'grid-cols-2 sm:grid-cols-4'), gap-x-5 gap-y-3 */
<dt className="text-[11px] font-medium text-ink-4">{label}</dt>
<dd className="mt-0.5 text-[13px] font-medium {tone==='crit' ? 'text-crit-ink' : 'text-ink'}">{value}</dd>

/* ChevronAffordance — dentro de um pai `group` */
<ChevronRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
```

Um vazio **sempre explica por quê e oferece a saída** ("Os filtros não retornaram resultados" +
`Limpar filtros`). Nunca uma lista vazia sem frase.

### 10.12 Formulários

**Controles são preenchidos, não contornados.**

```ts
const CONTROL =
  'w-full rounded-md bg-surface-2 px-3 text-[13px] text-ink ' +
  'transition-colors placeholder:text-ink-4 hover:bg-surface-3 ' +
  'focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-focus ' +
  'disabled:opacity-50';
```

- `TextInput` → `${CONTROL} h-9`
- `TextArea` → `${CONTROL} resize-y py-2 leading-relaxed` (rows padrão 3)
- `Select` → `${CONTROL} h-9 cursor-pointer appearance-none pr-8` + `ChevronDown` absoluto à direita
  (`pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-4`)
- `SearchInput` → `${CONTROL} h-9 pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden` + `Search` à
  esquerda + botão `X` de limpar (`aria-label="Limpar busca"`). Aceita `inputRef` para devolver o
  cursor ao campo depois de uma ação.

**A única linha que um controle desenha é o anel de foco.**

**Label / Field** — o obrigatório é marcado **uma vez**, ao lado do rótulo; a dica fica **sob** o
controle:

```tsx
<div className="mb-1.5 flex items-baseline justify-between gap-3">
  <label className="text-[12px] font-medium text-ink">{children}{required && <span className="ml-1 text-crit">*</span>}</label>
  {hint && <span className="text-[11px] text-ink-4">{hint}</span>}
</div>
{/* controle */}
<p className="mt-1.5 text-[11.5px] font-medium text-crit">{error}</p>
<p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-4">{help}</p>
```

`Field` gera o `id` com `useId()` e o entrega ao filho como função: `children: (id: string) => ReactNode`.

**Segmented** — controle **físico** (§7): trilho afundado, pastilha com espessura que desliza:

```tsx
<div role="tablist" className="seg-track shrink-0 items-center {tone==='band' ? 'bg-surface-3' : ''} {full ? 'flex w-full' : ''}">
  <button role="tab" aria-selected={active}
    className="relative flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-colors
               {size==='xs' ? 'h-7 px-2.5 text-[11.5px]' : 'h-8 px-3 text-[12.5px]'}
               {active ? 'font-semibold text-ink' : 'font-medium text-ink-3 hover:text-ink'}">
    {active && <motion.span layoutId={layoutId} transition={spring} className="seg-thumb" />}
    <span className="relative z-10 flex items-center gap-1.5">
      {icon}{label}
      {count !== undefined && <span className="font-mono text-[10.5px] font-medium {active ? 'text-ink-3' : 'text-ink-4'}">{count}</span>}
    </span>
  </button>
</div>
```

`layoutId` **único por instância** — dois segmenteds com o mesmo id fazem a pastilha voar entre eles.

**Switch** — dentro de uma linha explicativa:

```tsx
<div className="flex items-start justify-between gap-4 rounded-lg bg-surface-2 p-3.5">
  <div className="min-w-0">
    <label className="block text-[13px] font-medium text-ink">{label}</label>
    <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{description}</p>
  </div>
  <button role="switch" aria-checked={checked} aria-label={label}
    className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 {checked ? 'bg-brand' : 'bg-hairline-strong'}">
    <motion.span layout transition={spring} className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm" style={{ left: checked ? 18 : 2 }} />
  </button>
</div>
```

**Chip** (filtro multi-seleção) — o ativo é **tinta sólida**, não azul:

```tsx
<button aria-pressed={active}
  className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors
    {active ? (tone==='crit' ? 'bg-crit font-semibold text-white' : 'bg-ink font-semibold text-canvas')
            : 'bg-surface-2 font-medium text-ink-3 hover:bg-surface-3 hover:text-ink'}">
  {children}
  {count !== undefined && <span className="font-mono text-[10.5px] opacity-70">{count}</span>}
</button>
```

### 10.13 Modal e Drawer

**Uma implementação de overlay** (`useOverlayBehaviour`), para todo diálogo se comportar igual:

- O app atrás é **borrado e dessaturado** (`.scrim`), não só escurecido.
- **Escape fecha. Clique no scrim fecha. O botão fecha.** O `keydown` é registrado em **fase de
  captura** para o Escape do diálogo vencer o de qualquer coisa embaixo.
- **Foco** entra na folha (60ms depois, para não brigar com a entrada), procurando
  `[data-autofocus]` → primeiro focável → a própria folha; fica **preso** dentro; **volta ao gatilho**
  ao fechar.
- **Scroll do body travado com a largura da scrollbar compensada**
  (`paddingRight = innerWidth - clientWidth`).
- **A animação de saída de fato roda**, porque o `<AnimatePresence>` mora **dentro** do componente.

```ts
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),' +
  'select:not([disabled]),[tabindex]:not([tabindex="-1"])';
```

**Modal:**

```tsx
<motion.div className="scrim fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-[6vh] sm:p-6 sm:py-[8vh]"
  variants={scrimVariants} initial="initial" animate="animate" exit="exit"
  onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
  <motion.div role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
    variants={modalVariants} initial="initial" animate="animate" exit="exit"
    className="relative flex w-full flex-col overflow-hidden outline-none rounded-2xl bg-surface shadow-overlay max-h-[86vh] {MODAL_WIDTH[size]}">
    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">…</header>
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>
    <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3.5">{footer}</footer>
  </motion.div>
</motion.div>
```

```
MODAL_WIDTH = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }
```

Ícone do header: `mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2`.
Fechar: `-mt-0.5 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-2 hover:text-ink` + `aria-label="Fechar"`.

**Drawer** — entra pela direita:

```tsx
<motion.aside role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} variants={drawerVariants} …
  className="relative flex h-full w-full flex-col overflow-hidden outline-none border-l border-hairline bg-surface shadow-overlay {DRAWER_WIDTH[width]}">
```

```
DRAWER_WIDTH = { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' }
```

A `border-l` do drawer é a **única borda-que-não-é-divisor** do sistema: a folha encosta na margem
da janela, e ali a linha separa dois planos, não fecha uma forma.

### 10.14 Tabela operacional (padrão "Base de Alunos")

Uma lista que se comporta como tabela de trabalho: colunas ordenáveis, filtros que se compõem,
paginação e export do que está na tela. **Não é um `<table>` com bordas** — é um card com linhas.

```tsx
<Card padded={false} className="overflow-hidden">
  {/* Barra de topo: contagem à esquerda, cabeçalhos ordenáveis à direita */}
  <div className="flex items-center justify-between border-b border-hairline bg-surface-2 px-4 py-2.5">
    <span className="text-[11px] font-medium text-ink-3">{n} alunos</span>
    <div className="flex items-center gap-4">{/* SortHeader… */}</div>
  </div>

  <div className="divide-y divide-hairline">
    <Row tone={critico ? 'crit' : 'plain'} className="group">
      <div className="flex flex-col gap-2.5 px-5 py-3 xl:flex-row xl:items-center xl:gap-5">
        {/* identidade em DUAS linhas: nome + status na 1ª; código/RA e fatos na 2ª */}
        {/* métricas: só valores, mono, alinhados à direita com largura fixa (w-10, w-12…) */}
        {/* ações: ghost quadrados + um secondary com ChevronRight */}
      </div>
    </Row>
  </div>

  {/* Paginação */}
  <div className="flex items-center justify-between border-t border-hairline bg-surface-2 px-4 py-2.5">
    <span className="font-mono text-[10.5px] text-ink-4">1–12 de 54</span>
    {/* ‹  1 … 4 5 6 … 9  › — página: h-7 min-w-7 rounded-md px-2 font-mono text-[11px] font-semibold;
        ativa bg-brand text-on-brand; demais bg-surface text-ink-3 hover:text-ink.
        Mostra primeira, última e vizinhas da atual; reticências nos saltos. */}
  </div>
</Card>
```

```tsx
/* SortHeader */
<button className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors
                   {ativo ? 'text-ink' : 'text-ink-4 hover:text-ink-2'}">
  {label}{ativo && (asc ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />)}
</button>
```

Regras: a coluna diz o nome, a linha diz só o valor · valor abaixo do mínimo ganha
`font-semibold text-crit-ink`, o resto fica `text-ink-2` · o botão de export diz **quantos** vai
exportar (`Exportar 38 alunos`) e exporta **exatamente** o filtro atual · abaixo de `xl` a linha
empilha em duas faixas em vez de espremer colunas · filtros em um `Card` acima (busca `min-w-[240px]
flex-1`, selects de largura fixa, `Limpar filtros` ghost só quando há filtro).

### 10.15 Página de uma pessoa (padrão "Dossiê 360°")

Tudo sobre um indivíduo numa tela, na ordem em que se lê antes de agir.

```tsx
<div className="space-y-5">
  {/* 1. Voltar + ações: ghost à esquerda; secundárias ghost/secondary e UMA primary à direita */}
  <div className="flex flex-wrap items-center justify-between gap-3">…</div>

  {/* 2. Identidade: AZUL PREENCHIDO = "você está olhando uma pessoa" */}
  <Card padded={false} className="overflow-hidden">
    <div className="bg-brand px-5 py-4 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar initials="…" size="lg" tone="onBrand" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[24px] leading-tight font-semibold text-on-brand">{nome}</h1>
          <p className="mt-1 truncate text-[13px] text-on-brand/80">{curso} · {período} · {turno}</p>
        </div>
      </div>
    </div>
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 p-5 sm:p-6">
        {/* status e tags FORA da faixa azul — eles têm semântica de cor própria */}
        {/* mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 — quatro StatTile com os números-chave */}
      </div>
      <aside className="border-t border-hairline bg-surface-2 p-5 lg:border-t-0 lg:border-l">
        {/* o número-síntese (ScoreRing) e a composição dele */}
      </aside>
    </div>
  </Card>

  {/* 3. O que pede atenção agora (alertas / Callout) */}
  {/* 4. Tabs com o resto: linha do tempo, detalhes, histórico */}
</div>
```

A faixa azul aparece nas telas que tratam de **um** indivíduo e em nenhuma que trata de um conjunto.
Sem dado de nome, a identidade é o identificador (RA) — e **sem avatar de iniciais** inventadas.

### 10.16 Hint e Denominator

**Hint** é a válvula do progressive disclosure: nenhuma métrica ambígua fica sem definição, e nenhuma
definição ocupa espaço permanente. O `title` nativo não abre por teclado, não é lido de forma
confiável e demora meio segundo — o controle que explica um número não pode ser o menos acessível da
página.

```tsx
<Hint label="contato dentro do prazo" align="left|right">Texto da definição…</Hint>
```

Gatilho `h-4 w-4` com `Info h-3.5 w-3.5 text-ink-4 hover:text-ink-2`, `aria-label="Como {label} é
calculado"`, `aria-expanded`, `aria-describedby`. Abre no hover **e no foco**, fecha no Escape, ao
sair e em clique fora. Tooltip `absolute top-6 z-40 w-[268px] rounded-xl bg-surface p-3 text-[11.5px]
leading-relaxed text-ink-2 shadow-overlay` com `popoverVariants`.

**Denominator** — uma taxa institucional nunca é publicada sozinha:

```tsx
<Denominator numerator={24} numeratorLabel="no prazo" denominator={34} denominatorLabel="apurados" />
// 24 no prazo ÷ 34 apurados
```

O `÷` fica visível de propósito — foi a ausência de separador entre contagem e percentual que
produziu `2648,1%`.

### 10.17 MetricSheet — o aprofundamento que não sai da aba

Gestão e diretoria **não** são despachadas para a fila operacional para entender um número. Clicar
num indicador abre um `Drawer width="md"` com a mesma estrutura sempre, nesta ordem:

1. **Qual é a medida, e sobre qual denominador?** — `font-mono text-[42px]` + denominador por extenso
   (obrigatório: medida sem denominador não sai).
2. **Do que ela é feita?** — linhas com rótulo, valor, `|`, percentual e `MeterBar height={5}`, entrando
   com `RevealGroup`.
3. **O que ela significa?** — `rounded-xl bg-surface-2 p-4` "Como ler", uma frase sem eufemismo.

Rodapé com um único `Voltar ao painel`. Nenhuma ação de atendimento. O conteúdo é montado **a partir
do modelo que a tela já calculou** — é o que torna impossível o detalhe discordar do cartão que o
abriu.

### 10.18 Reveal — entrada por rolagem

```tsx
<Reveal delay={0.05}>…</Reveal>                 // um bloco
<RevealGroup as="ul"><RevealItem as="li">…</RevealItem></RevealGroup>   // fileira escalonada 60ms
const { ref, entered, reduced } = useEnter();   // para quem anima por conta própria (calibre, count-up)
```

`once: true`, margem `-12% 0px -8% 0px`, `y: 14`, 520ms; cada nó leva `data-reveal` para a impressão.

### 10.19 Toaster

Toasts confirmam que uma mutação aconteceu e, onde útil, oferecem **a** próxima ação provável. Nunca
carregam informação que não exista em outro lugar.

```tsx
<div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(384px,calc(100vw-2rem))] flex-col gap-2 sm:right-6 sm:bottom-6 print:hidden">
  <motion.div layout variants={toastVariants} className="pointer-events-auto relative flex gap-3 overflow-hidden rounded-xl bg-surface p-3.5 pl-4 shadow-overlay">
    <span className="absolute inset-y-0 left-0 w-[3px] {bar}" />   {/* ok · brand-2 · warn · crit */}
    <Icon className="mt-px h-4 w-4 shrink-0 {tone}" />
    <div className="min-w-0 flex-1">
      <p className="text-[12.5px] leading-snug font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{detail}</p>
      <button className="mt-2 text-[11.5px] font-semibold text-brand-text hover:text-brand-2">{action} →</button>
    </div>
  </motion.div>
</div>
```

`AnimatePresence mode="popLayout"`.

### 10.20 Timeline

Um fio cronológico único. O ícone carrega a fonte, o autor diz se foi uma pessoa, um radar ou o
próprio aluno.

```tsx
<ol className="relative">
  <span className="absolute top-4 left-[13px] w-px bg-hairline" style={{ height: 'calc(100% - 2rem)' }} />  {/* o trilho para no último nó */}
  <li className="relative flex gap-3 pb-5 last:pb-0">
    <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full {ring}">
      <Icon className="h-3.5 w-3.5 {tone}" />
    </span>
    <div className="min-w-0 flex-1 pt-0.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[12.5px] leading-snug font-semibold text-ink">{title}</p>
        <span className="shrink-0 font-mono text-[10.5px] text-ink-4">{stamp(at)}</span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{detail}</p>
    </div>
  </li>
</ol>
```

`ring`: `bg-surface-2` para o comum, `bg-crit-soft` para alerta, `bg-brand-soft` para intervenção.

### 10.21 Tema — troca com revelação circular

O tema novo é pintado por cima do antigo e revelado por um círculo que cresce **a partir do botão**
(View Transitions API). Sem a API, ou com `prefers-reduced-motion`, a troca é seca.

```ts
const transition = document.startViewTransition(() => flushSync(apply));
transition.ready.then(() => {
  document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
  );
});
// radius = Math.hypot(max(x, innerWidth - x), max(y, innerHeight - y)) — cobre a tela inteira
```

O botão passa o próprio centro (`getBoundingClientRect`). O CSS de `::view-transition-*` está na §7.

### 10.22 CrystalGlassCard — perfil completo

O objeto protagonista das telas de gestão: **o gráfico é o cartão, e o vidro é uma placa apoiada
sobre ele** (a referência da Apple: um bloco de vidro sobre uma fotografia).

```tsx
<CrystalGlassCard columns={[{ label: '12/09', value: 71 }, …, { label: 'hoje', value: 88, current: true }]}
  meterLabel="Contato dentro do prazo" meterText="88 por cento" seriesLabel="Taxa diária, 12 dias"
  footer={<GlassPill onClick={…}>Ver composição</GlassPill>}>
  <GlassLabel>Contato dentro do prazo</GlassLabel>
  <GlassValue>88%</GlassValue>
</CrystalGlassCard>
```

As quatro regras que ele impõe: **as colunas são dado** (a mesma conta do número grande — nunca
alturas escolhidas por gosto) · **a escala vai de 0 a 100** (com marcas 0/50/100) · **texto só dentro
da placa** · **a série é publicada em texto** (`role="meter"` + lista `sr-only`).

O que a história do material ensinou (ver `index.css`): blur **pequeno** (5px — as doze colunas
continuam contáveis), saturação moderada (118%), **nenhuma refração** (colunas que entortam mentem
sobre a medida, e a franja cromática pinta cor onde só o verde significa algo), só a coluna de hoje
tem halo, fio escuro no contorno no tema claro. **Armadilha:** nenhum ancestral entre a placa e
`.cg-shell` pode ter `isolation: isolate`, `opacity < 1`, `filter`, `mask` ou `contain: paint` — cada
um cria um *backdrop root* e a placa passa a desfocar o próprio interior vazio, virando um retângulo
chapado sem erro nenhum. O hover da pastilha é **mais vidro**, não menos opacidade, pelo mesmo motivo.

### 10.23 Slab editorial — perfil completo

A abertura de um painel de gestão: **uma cor e uma frase**. `rounded-[var(--radius-glass)]
bg-[var(--slab)]`, texto branco grande. Sem halo, sem degradê, sem trama — já teve os três, e eles
existiam para "dar volume" a uma peça que não precisa competir por atenção. **Uma por tela.**

---

## 11. Visualização de dados e honestidade de dado

### As três regras dos gráficos

1. **Um gráfico tem de responder a uma pergunta que o número sozinho não responde.** Caso contrário
   é um número, e a gente renderiza um número.
2. **Cor codifica a escala de status e nada mais.** Sem arco-íris categórico — toda série aqui é
   ordinal.
3. **Eixos, rótulos e valores vivem na face mono com figuras tabulares.**

### A rampa ordinal — a única exceção da regra 4

Verde → amarelo → laranja → vermelho. Vale para o donut de distribuição **e** para a linha de
evolução **e** para o mini-gráfico da linha da tabela, porque codificam a **mesma variável ordinal** —
se "Crítico" fosse vermelho no donut e cinza no gráfico ao lado, seriam dois alfabetos para uma
palavra.

```ts
export const SCORE_BANDS = [
  { status: 'Estável', label: 'Estável',    range: [81, 100], token: 'ok',   hex: (d) => (d ? '#3fb96b' : '#15803d') },
  { status: 'Atenção', label: 'Atenção',    range: [61, 80],  token: 'warn', hex: (d) => (d ? '#e0b341' : '#ca8a04') },
  { status: 'Risco',   label: 'Alto risco', range: [41, 60],  token: 'risk', hex: (d) => (d ? '#f0844a' : '#ea580c') },
  { status: 'Crítico', label: 'Crítico',    range: [0, 40],   token: 'crit', hex: (d) => (d ? '#e0554b' : '#b42318') },
];
```

Cada faixa carrega `hex(dark)` porque `<svg>` animado não resolve `var()` em todo contexto — a rampa é
a **única** lista de hex do app, e ela é derivada, não avulsa. **Passe sempre o tema corrente**
(`hex(dark)`): `hex(false)` fixo deixava o tema escuro com os acentos claros, e só o vermelho
sobrevivia ao contraste.

> Os **pigmentos** são uma coisa e o **contrato** é outro. Um sistema derivado com outra escala
> ordinal (ex.: faixas de risco de um modelo) **reusa os mesmos hex** para os mesmos degraus
> (âmbar `#ca8a04`/`#e0b341`, laranja `#ea580c`/`#f0844a`, vermelho `#b42318`/`#e0554b`) — mas os
> **nomes, limites e regras** da escala vêm do domínio dele, nunca de `SCORE_BANDS`.

### Paletas semânticas de gráfico

```ts
/** Barras de intervenção: normal → atenção → falha. */
export const SLA_COLOR = { inSla: 'var(--ink-3)', outSla: 'var(--crit)', pending: 'var(--warn)' };
/** Barra de sinal. Neutra por padrão; azul só quando é o recorte ativo. */
export const SIGNAL_COLOR = { idle: 'var(--ink-3)', active: 'var(--brand)' };
/** Desfecho, ordenado como escala: verde (deu certo) · ink-3 (aberto) · ink-4 (repassado) · warn (sem resposta) · crit (não resolveu). */
```

> **Por que a fatia "humano" é vermelha e não azul:** era azul institucional, e isso gastava o azul
> num sliver de 6% enquanto a tela já tinha o seu único azul em outro lugar. Não é juízo moral: é a
> fatia que a operação quer menor.

### Os quatro invariantes técnicos (`Plot.tsx`)

1. **Medir o contêiner antes de desenhar** (`ResizeObserver`). Um SVG com `viewBox` esticado deforma
   o traço e desalinha o eixo. **Descarte o zero transitório** — uma medição de 0 no meio de um reflow
   desmontava o `<svg>` e a linha redesenhava do zero:
   ```ts
   setWidth((prev) => (next > 0 ? next : prev));
   ```
2. **Um único índice de hover** controla guia, marcadores e tooltip. A faixa vertical mais próxima
   ganha o foco — o ponteiro nunca precisa acertar um alvo de 3px.
3. **Teclado funciona.** O SVG é `tabIndex={0}` `role="img"` com `aria-label` descritivo; ←/→
   caminham, Home/End vão às pontas, Escape limpa.
4. **A escala vem só das séries visíveis.** Esconder "Estável" (13.006) é o que permite ver "Crítico"
   (467) se mover. A legenda é o próprio controle (`aria-pressed`), e mostra o último valor de cada série.

Mais:

- **Ticks redondos** — `niceScale()` normaliza para 1 / 2 / 2,5 / 5 / 10 × 10ⁿ. Um eixo terminando em
  3.678 obriga a ler cada rótulo; em 4.000, a posição já diz o valor.
- **Rótulos ralos ancorados no último ponto** — `thin()` anda **de trás para frente** a partir de
  "hoje", que é o rótulo que não pode faltar, e troca o índice mais baixo pelo primeiro. Andar para a
  frente deixava "19/08" colado em "20/08".
- **Grade só horizontal**, tracejada (`3 4`), base cheia. Linha vertical de grade é ruído — a guia do
  hover já diz onde o ponteiro está.
- **Tooltip preso ao contêiner** (`196px`, `left = clamp(4, x − 98, width − 200)`): cortado na borda é
  pior que deslocado.
- Traço `1.9`, `strokeLinecap/linejoin="round"`, marcador `r=3.4` com `fill: var(--surface)`.

### Honestidade de dado — as regras que decidem o que entra num painel

Estas vêm das decisões de arquitetura do Sucesso ao Aluno e valem para qualquer painel do Grupo:

1. **Um indicador só entra se o sistema produz os dois lados da conta** (numerador e denominador) e
   não atribui mérito por correlação. Indicador sem essa garantia sai da tela da diretoria — e volta
   quando a fonte existir, como decisão de produto.
2. **Toda taxa aparece com o seu denominador** (`Denominator`, §10.16).
3. **O último ponto de uma curva é o número do KPI ao lado.** Um gráfico que discorda do indicador
   vizinho destrói a confiança na tela inteira.
4. **Todo agregado fecha.** Filtrar é somar um subconjunto de células inteiras; nada é arredondado
   duas vezes.
5. **Nada usa `Math.random`.** Dado de demonstração é determinístico (PRNG com semente): a mesma
   entidade mostra o mesmo valor em todo render e toda sessão.
6. **Índice não conta, preenche** (§8, regra 4).
7. **Dado de demonstração se declara** — uma tag `Dados fictícios` visível impede que um print do
   esboço vire "resultado".

### AnimatedNumber

Conta do zero na montagem, faz tween entre valores nas atualizações. `duration = 620ms`, easing
`1 - (1-p)³` via `requestAnimationFrame`. `resetOnChange` reconta do zero a cada mudança (o donut
re-escopando a um filtro). `countUp={false}` para índices. `decimals` escreve com vírgula.

### Inventário de formas

| Primitivo | Arquivo | Para quê |
|---|---|---|
| `AnimatedNumber` | Charts | qualquer KPI que muda |
| `ScoreRing` | Charts | um índice 0–100 com veredito |
| `Donut` | Charts | distribuição por faixa ordinal (`centerScale="sm"` nos pequenos) |
| `MeterBar` | Charts | uma proporção contra um alvo |
| `StackedBar` | Charts | composição de uma linha |
| `Sparkline` | Charts | tendência dentro de um tile ou de uma linha |
| `ColumnChart` | Charts | série curta e discreta |
| `heatColor(ratio)` | Charts | célula de heatmap na rampa |
| `LineChart` | Plot | série temporal multissérie |
| `StackedColumns` | Plot | composição ao longo do tempo |
| `BarList` | Plot | ranking horizontal (clicável = filtro) |
| `CrystalGlassCard` | CrystalGlass | o indicador protagonista de uma dobra de gestão |

---

## 12. Vocabulário de status

Há **dois tipos de rótulo pequeno** no app e eles **não podem parecer iguais**:

| | STATUS | TAG |
|---|---|---|
| O que é | um **veredito** sobre o qual você talvez tenha de agir | um **fato** sobre o registro (modalidade, campus, código, radar) |
| Forma | ponto colorido + palavra. **Sem preenchimento, sem contorno.** | chip preenchido quieto em `ink-3` |
| Por quê | dez linhas de balãozinho tingido com borda é um saco de balas; dez linhas de palavra pontuada varrem numa passada **e ainda deixam a linha crítica pular** | não carrega urgência, então não ganha cor nem ponto |

```tsx
/* STATUS */
<span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] whitespace-nowrap
                 {solid ? `font-semibold ${EMPHASIS_INK[tone]}` : 'font-medium text-ink-2'}">
  <span className={`h-1.25 w-1.25 shrink-0 rounded-full ${DOT[tone]}`} />
  {children}
</span>

/* TAG */
<span className="inline-flex shrink-0 items-center rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-ink-3">
  {children}
</span>
```

```ts
const DOT = { ok: 'bg-ok', warn: 'bg-warn', risk: 'bg-risk', crit: 'bg-crit', info: 'bg-brand-2', neutral: 'bg-ink-4', muted: 'bg-ink-4' };
/** Tinta para veredito enfatizado. Só `crit` ganha vermelho. */
const EMPHASIS_INK = { ok: 'text-ink-2', warn: 'text-warn-ink', risk: 'text-risk-ink', crit: 'text-crit-ink', info: 'text-brand-text', neutral: 'text-ink-2', muted: 'text-ink-3' };
```

`solid` **não** significa "fundo tingido + borda". Significa **"este veredito é o ponto da linha"**, e
gasta **peso de tinta** em vez de preenchimento. O nível mais urgente de uma escala sai `solid`
sempre. `mono` para status/tag que é um código (`RA 2640797`, `CPF ***.123.***-**`).

Os **badges de domínio** (`HealthBadge`, `PriorityBadge`, `CaseStatusBadge`, `RadarBadge`,
`CohortBadge`, `ModalityBadge`) são todos construídos sobre `Pill` e moram no domínio de cada sistema.

### O estado saudável não tem ponto

O status de melhor faixa renderiza **só a palavra**, em `text-ink-3`, sem ponto. Não há nada a fazer,
então a linha fica em silêncio — **e é exatamente isso que torna o ponto âmbar e o vermelho visíveis
três linhas abaixo.**

### Avatar — iniciais, não banco de imagens

Retrato de estoque de um estranho fazendo as vezes de aluno real lê como mockup e, com dado real, como
vazamento de privacidade.

```
xs h-6 w-6 text-[10px] · sm h-8 w-8 text-[11px] · md h-9 w-9 text-[12px] · lg h-12 w-12 text-[15px]

neutral   bg-surface-2 text-ink-2
crítico   bg-surface-3 text-ink        ← um tom mais escuro, NÃO vermelho
brand     bg-brand text-on-brand
onBrand   bg-white/15 text-on-brand    ← sobre a faixa azul de identidade
```

Classes fixas: `inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none`
+ `aria-hidden="true"`. **Sem nome, sem avatar** — iniciais fabricadas são dado inventado.

### TrendIndicator

```
up    ArrowUpRight    text-ink-2      ← subir não é automaticamente bom; é neutro
down  ArrowDownRight  text-crit-ink
flat  Minus           text-ink-4
```

`inline-flex items-center gap-0.5 font-mono text-[11.5px] font-medium`, ícone `h-3 w-3`, delta com
sinal de menos de verdade (`−`, não hífen) via `signed()`.

### Formatação pt-BR (`lib/format.ts`)

`int` (`18.426`), `decimal` (`8,2`), `percent`, `money` (BRL), `signed` (`+8` / `−12`), `shortDate`
(`27/09`), `fullDate` (`27/09/2026`), `stamp` (`Hoje, 14:32` · `Ontem, 09:10` · `14/08, 16:45`),
`relative` (`há 12 min`), `duration` (`2 h 15 min`), `searchKey` (sem acento, sem caixa), `digits`.
**Data de calendário (`AAAA-MM-DD`) é ancorada ao meio-dia local** — `new Date('2026-01-01')` é
meia-noite UTC, e em Brasília formatava 31/12/2025.

### Exportação CSV

BOM UTF-8 + separador `;` + `\r\n`: abre direto no Excel em português com colunas e acentos certos.
Nome de arquivo com carimbo ordenável (`20260929-1432`).

---

## 13. Acessibilidade

- **Foco visível é global**, via `:focus-visible` na camada base — anel de 2px em `--focus` com
  `outline-offset: 2px`. Controles de formulário adicionam `focus:ring-2 focus:ring-focus` porque o
  preenchimento come o outline.
- **Papéis ARIA:** `role="tablist"` / `role="tab"` + `aria-selected` em Tabs e Segmented;
  `role="switch"` + `aria-checked` + `aria-label` no Switch; `aria-pressed` no Chip e na legenda do
  gráfico; `role="dialog"` + `aria-modal="true"` + `aria-labelledby` / `aria-label` nos overlays;
  `role="tooltip"` + `aria-describedby` no Hint; `role="img"` + `aria-label` nos gráficos;
  `role="meter"` no vidro; `aria-live="polite"` no Toaster.
- **Trap de foco e restauração** em todo overlay (§10.13).
- `aria-hidden="true"` no Avatar e em todo ícone decorativo.
- **`title` como dica**, nunca como única fonte de informação — explicação de métrica vai no `Hint`.
- Botão de ícone sempre com `aria-label` (`"Fechar"`, `"Limpar busca"`).
- `prefers-reduced-motion` neutraliza CSS globalmente e o JS via `useReducedMotion()`.
- **Cor nunca é o único canal:** todo status colorido vem acompanhado da palavra; toda série de
  gráfico é publicada em texto.
- Contraste-alvo: `--ink` e `--ink-2` passam AA sobre `--surface` nos dois temas; `--ink-4` é
  reservado a texto decorativo e placeholder.

---

## 14. Anti-padrões (zero "AI slop")

| ❌ Nunca | ✅ Em vez disso |
|---|---|
| `border border-hairline` em volta de um card | contraste de superfície: `bg-surface` sobre `bg-canvas` |
| `shadow-sm` / `shadow-md` em card, tile, painel | nada. Só overlay tem `shadow-overlay` |
| Gradiente roxo-azul, `bg-gradient-to-r from-*` decorativo | superfície plana |
| Balãozinho tingido com borda em cada linha da tabela | ponto + palavra (§12) |
| Painel azul royal ocupando uma seção inteira | `bg-surface-2`; azul preenchido só na identidade de uma pessoa ou no slab |
| Quatro KPIs com preenchimentos de cores diferentes | cards limpos; azul do sistema como único acento |
| Eyebrow mono em CAIXA ALTA em cada card | `SectionLabel` sentence case `text-[12px] font-semibold text-ink-3` |
| Seis raios diferentes na mesma tela | 12px para superfície, pílula para ação, exceções nomeadas por token |
| `transition-all` | `transition-colors duration-150` |
| `hover:scale-105`, `hover:-translate-y-1` em card | `hover:bg-surface-hover` e `whileTap={press}` |
| Duas ações primárias na mesma tela | uma `primary`, o resto `secondary` / `ghost` |
| Paleta categórica arco-íris num gráfico ordinal | a rampa ordinal (§11) |
| Vidro em todo card | **um** objeto de vidro por dobra |
| Refração / deslocamento de fundo atrás de um gráfico | translucidez + aresta + espessura; a série atravessa reta |
| `isolation: isolate` / `opacity` / `filter` acima de uma peça de vidro | isolar na casca (`.cg-shell`), nunca no caminho |
| Mandar a diretoria para outra aba para entender um número | `MetricSheet` dentro da própria aba |
| Taxa sem denominador | `Denominator` |
| Count-up num índice 0–100 | `countUp={false}`; anima o calibre |
| Curva cujo último ponto discorda do KPI vizinho | a série termina no número exibido |
| `Math.random` em dado de demonstração | PRNG determinístico com semente |
| Nome ou iniciais inventados quando a fonte não traz nome | o identificador real (RA) |
| Emoji na UI | ícone `lucide-react` |
| Foto de estoque no avatar | iniciais |
| Cinco statzinhos em fila para números que só descrevem | `Metric` separada por espaço em branco |
| Hex escrito no componente | token semântico (ou `hex(dark)` da rampa, para SVG) |
| Um segundo conjunto de classes `dark:` por componente | troca de token no `.dark` |
| `font-bold` (700) na UI | `font-semibold` (600) |
| Mono usada como estilo de label | mono só para valor que alinha em coluna |
| Número em toda entrada do menu | um único badge, no que muda o que você faz a seguir |
| Card com hairline **e** sombra **e** fundo tingido | escolha um passo de contraste. Um. |
| Contorno num input | preenchimento `bg-surface-2`; a única linha é o anel de foco |
| `AnimatePresence` em volta de um `return null` | o `AnimatePresence` mora dentro do componente |
| `title` nativo explicando uma métrica | `Hint` |
| Lista vazia sem frase | `EmptyState` com o porquê e a saída |

---

## 15. Boilerplate: começar um sistema novo

### 15.1 Scaffold

```bash
npm create vite@latest meu-sistema -- --template react-ts
cd meu-sistema
npm i lucide-react motion
npm i -D tailwindcss @tailwindcss/vite @types/node
```

Ou — melhor — parta de um **kit** já extraído deste repositório (o do front da ML de evasão é o
exemplo: `index.css` no perfil simples, `lib/` e `components/ui/` copiados com os cabeçalhos, tudo
validado com `tsc` estrito e `vite build`).

### 15.2 `vite.config.ts`

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    target: 'es2022',
    cssTarget: 'chrome111',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
          motion: ['motion', 'motion/react'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
```

### 15.3 `tsconfig.json` — modo estrito

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "types": ["node", "vite/client"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "paths": { "@/*": ["./src/*"] },
    "noEmit": true
  },
  "include": ["src"]
}
```

### 15.4 `src/index.css`

Nesta ordem: `@import 'tailwindcss'` → `@custom-variant dark` → `:root` (§3.1, + §3.2 no perfil
completo) → `.dark` → `@theme inline` (§4) → `@layer base` e `@layer utilities` (§7) → reduced motion
→ `::view-transition-*`.

### 15.5 `index.html`

`lang="pt-BR"`, preconnect + Geist / Geist Mono (§5), as duas `theme-color` e o script de pré-pintura
(§9) com a **mesma chave** que o código de tema usa.

### 15.6 Ordem de construção

1. `src/index.css` — tokens. **Antes de qualquer JSX.**
2. `src/lib/motion.ts` (§8), `lib/format.ts`, `lib/reactive.ts`.
3. `src/components/ui/` — os primitivos da §10, **com os cabeçalhos de comentário**.
4. O shell (§9): `App.tsx` + `Sidebar` + `Header` + roteador por hash.
5. As views. **Nenhuma view escreve cor, raio ou sombra crua** — só compõe primitivos.

### 15.7 O que trocar por projeto

| Item | Onde |
|---|---|
| Nome da unidade sob o wordmark | `BrandLockup unit="…"` |
| Nome da chave de tema | `index.html` + código de tema (`app.vN.theme`) |
| Título, descrição e `robots` | `index.html` |
| A escala ordinal do domínio | um `*_META` do domínio, reusando os pigmentos da rampa (§11) |
| Itens do menu | `lucide-react`, `h-4 w-4` |

**Não troque:** a marca, os cinzas de superfície, a escada de tinta, os raios, o motion spec, as seis
regras. É deles que vem a semelhança entre os sistemas do Grupo.

### 15.8 Prompt de bootstrap (cole numa sessão nova do Claude Code)

```
Leia DESIGN_SYSTEM.md por inteiro antes de escrever qualquer CSS ou JSX.

Construa <NOME DO SISTEMA> seguindo-o exatamente:

- Stack: React 19 + TypeScript + Vite 6 + Tailwind 4 (plugin Vite, SEM tailwind.config.js)
  + motion/react + lucide-react. Nenhuma biblioteca de UI, de gráficos ou de data fetching.
- Perfil: <simples | completo> (§18).
- Copie §3.1 (+ §3.2 se completo), §4 e §7 verbatim para src/index.css.
- Copie §8 verbatim para src/lib/motion.ts.
- Implemente os primitivos da §10 com as classes exatas listadas, mantendo os
  cabeçalhos de comentário que explicam o porquê de cada regra.
- Obedeça as seis regras da §1, as regras de honestidade de dado da §11 e a
  tabela de anti-padrões da §14 em toda tela.
- Nenhuma view escreve cor, raio ou sombra crua — só compõe primitivos.
- `npm run lint` (tsc --noEmit) e `npm run build` têm de compilar com 0 erro.

Domínio: <descreva o domínio, as telas, as entidades e a FONTE das regras de negócio>
```

---

## 16. Checklist de revisão

Antes de dar por pronta qualquer tela:

**Estrutura**
- [ ] Nenhuma `border` fechando uma forma. Hairline só como divisor.
- [ ] Nenhuma sombra fora de overlay.
- [ ] Todo raio de superfície é 12px; toda ação é pílula; exceções só por token nomeado.
- [ ] Nenhum hex escrito num componente (fora da rampa ordinal para SVG).
- [ ] Nenhuma classe `dark:` — o tema resolve por token.

**Cor e material**
- [ ] O azul aparece só nos lugares da regra 4.
- [ ] Vermelho só no nível mais urgente.
- [ ] Uma única ação `primary` na tela; um único `Metric tone="brand"` por fileira.
- [ ] No máximo um objeto de vidro por dobra (e nenhum no perfil simples).
- [ ] A mesma variável ordinal tem a mesma cor em badge, tile, barra e gráfico.

**Tipografia**
- [ ] Só 400 / 500 / 600.
- [ ] Mono só em valor que alinha em coluna.
- [ ] Rótulo de seção em sentence case, não CAIXA ALTA mono.
- [ ] Todo tamanho vem da tabela da §5.

**Motion**
- [ ] Todo clicável tem `whileTap={press}`.
- [ ] Nada de `transition-all`.
- [ ] `layoutId` único por instância.
- [ ] Saída mais rápida que entrada.
- [ ] Índice com `countUp={false}`.

**Acessibilidade**
- [ ] Botão de ícone tem `aria-label`.
- [ ] Overlay tem `role="dialog"`, `aria-modal`, trap de foco, Escape e restauração de foco.
- [ ] Status tem palavra além da cor; gráfico tem texto além da forma.
- [ ] `role` / `aria-selected` / `aria-checked` / `aria-pressed` nos controles compostos.

**Dados**
- [ ] Todo gráfico responde a algo que o número sozinho não responde.
- [ ] Gráfico mede o contêiner e funciona no teclado; ticks redondos.
- [ ] Toda taxa com denominador; o último ponto da curva = o KPI.
- [ ] Nenhum número sem fonte; nenhum `Math.random`; demonstração declarada como fictícia.
- [ ] Vazio, carregando e erro desenhados — nenhum estado em branco.

**Build**
- [ ] `npm run lint` (`tsc --noEmit`) — 0 erro.
- [ ] `npm run build` — 0 erro.

---

## 17. Skills e referências

### 17.1 Skills de design instaladas nesta máquina

| Skill | O que fornece |
|---|---|
| `cravburgers-design` | Design system do cravburgers — tokens, escala tipográfica, espaçamento, componentes, craft. Modo ultra: `references/ANIMATIONS.md`, `LAYOUT.md`, `COMPONENTS.md`, `INTERACTIONS.md` |
| `gustavo-sextaro-design` | Design system do gustavo-sextaro — dark, paleta neutra, densidade compacta, motion expressivo |

### 17.2 Skills do Claude Code relevantes para UI

| Skill | Quando invocar |
|---|---|
| `dataviz` | **antes** de escrever a primeira linha de qualquer gráfico, KPI, meter ou dashboard |
| `artifact-design` | fundamentos de design **antes** de publicar qualquer Artifact |
| `artifact-diagramming` | diagramas SVG legíveis nos dois temas |
| `shadcn` | só se um projeto novo optar por essa base (este sistema não usa) |
| `code-review` / `simplify` | revisão do diff: correção, reuso, simplificação |
| `security-review` | revisão de segurança das mudanças da branch |
| `run` | subir o app e conferir a mudança de verdade |
| `init` | gerar o `CLAUDE.md` de um projeto novo |

### 17.3 Empacotar este design system como skill

```
~/.claude/skills/unianchieta-design/
  SKILL.md                 ← frontmatter + resumo das seis regras
  references/DESIGN.md     ← este arquivo, na íntegra
```

```markdown
---
name: unianchieta-design
description: Design system UniAnchieta · Sucesso ao Aluno. Ative ao construir qualquer
  componente de UI, página ou elemento visual de um sistema do Grupo Anchieta. Fornece tokens
  exatos (light e dark), Geist + Geist Mono, grade de 4px, primitivos, motion spec, regras de
  honestidade de dado e os perfis simples e completo. Leia references/DESIGN.md antes de
  escrever qualquer CSS ou JSX.
---

# UniAnchieta Design System

Ferramenta operacional densa, dois temas resolvidos por token, Geist + Geist Mono, superfícies
sem borda, uma pílula azul por tela, motion com spring curto.

1. Separação é contraste, não linha.
2. Hairline é divisor, nunca moldura.
3. Um raio de superfície (12px) e uma pílula.
4. Cor é conquistada.
5. Sem sombra no que não flutua.
6. Material é conquistado.

**Leia `references/DESIGN.md` por inteiro antes de escrever CSS ou JSX.**
```

### 17.4 Links

- Repositório: https://github.com/victorpansonato-design/sucesso-ao-aluno
- Sistema publicado (base fictícia): https://sucesso-ao-aluno.vercel.app
- Página de referência de pessoa: https://sucesso-ao-aluno.vercel.app/#/alunos/st-b38
- Referências visuais do vidro e das telas de gestão: `src/sucesso-aluno-dashboard-design/`
  (atenção: `README.md` e `AUDIT.md` dessa pasta são imagens, e os nomes dos arquivos não
  correspondem ao conteúdo)
- Calendários institucionais: https://anchieta.br/calendario-academico-segundo-semestre/ ·
  https://anchieta.br/calendario-academico-hibridos-segundo-semestre/
- Filosofia: Apple Human Interface Guidelines · Linear · Vercel Dashboard.

---

## 18. Perfil simples — para sistemas derivados

O Sucesso ao Aluno tem telas de gestão que são quase apresentação (vidro, slab, aparelho 3D). Um
sistema derivado que é **instrumento de consulta** — o front da ML de evasão é o primeiro — usa o
**perfil simples**: o mesmo sistema, sem a camada de material. Ele continua visualmente da família
(mesmos tokens, mesma tipografia, mesmos primitivos) e pode ser absorvido pelo sistema completo sem
redesenho.

| | Perfil simples | Perfil completo |
|---|---|---|
| Tokens | §3.1 | §3.1 + §3.2 |
| Superfícies, tipografia, raios, motion | ✅ tudo | ✅ tudo |
| Button, Surfaces, Fields, Badges, Overlay | ✅ | ✅ |
| Charts, Plot, Hint, MetricSheet, Reveal | ✅ | ✅ |
| Tabela operacional (§10.14), página de pessoa (§10.15) | ✅ | ✅ |
| Segmented físico, tema com revelação circular | ✅ | ✅ |
| CrystalGlassCard, GlassPill | ❌ | ✅ um por dobra |
| Slab editorial | ❌ | ✅ um por tela |
| Aparelho 3D (`.device-*`, `.ios-*`) | ❌ | ✅ |
| `--vital` (verde de progresso) | ❌ | ✅ |
| Command palette, notificações, seletor de função | só se o domínio pedir | ✅ |
| Entrada por rolagem | só nas dobras de um painel | ✅ |

Regras extras do perfil simples:

- **A regra de negócio vem da fonte do domínio**, nunca do Sucesso ao Aluno. O design system
  empresta forma, não conteúdo: nada de Health Score, radares, SLA ou faixas de lá.
- **Menos telas, mais fundas.** Três itens no menu é um bom número.
- **Estados sempre desenhados**: carregando (skeleton com a geometria real), vazio (com o porquê e a
  saída), erro (a mensagem da fonte, e "tentar de novo"), dado desatualizado (aviso visível).
- **Demonstração se declara** (`Dados fictícios`).

---

## 19. Changelog

### 3.0 — 29/09/2026

- **Regra 6 — material é conquistado**; regra 4 reescrita com os lugares reais do azul (inclui a
  faixa de identidade de uma pessoa, o slab e a paginação) e a decisão "cards de gestão levam só o
  azul do sistema".
- Tokens de **material** documentados (§3.2): `--vital*`, `--slab`, `--radius-glass/crystal/device`,
  `--cg-*`, `--plot-*`. Tokens `--band*` marcados como legado inerte.
- **Segmented físico** (`.seg-track` / `.seg-thumb`) substitui a pílula chapada da 2.0.
- Utilitários novos na camada base: impressão de `[data-reveal]`, `::view-transition-*`.
- Componentes novos: **Tabela operacional** (§10.14), **Página de uma pessoa** (§10.15), **Hint** e
  **Denominator** (§10.16), **MetricSheet** (§10.17), **Reveal** (§10.18), **Toaster** (§10.19),
  **Timeline** (§10.20), **troca de tema circular** (§10.21), **CrystalGlassCard** (§10.22), **slab**
  (§10.23).
- Shell: detalhes reais de Sidebar (grupo de gestão, badge único, rodapé), Header (faixa de escopo,
  popover de notificações), roteamento por hash, persistência versionada, escala de z-index completa.
- Motion: tabela de durações, regra "volume conta, índice preenche", regras de entrada por rolagem.
- Dataviz: `thin()` ancorado em "hoje", tooltip preso ao contêiner, legenda como controle, e as
  **regras de honestidade de dado** (denominador, curva = KPI, agregado fecha, sem `Math.random`,
  demonstração declarada).
- Tipografia: tamanhos que faltavam (identidade 24px, vidro 44/52px, MetricSheet 42px, drawer 19px,
  linha de tabela 13,5px, carimbo 10,5px).
- Anti-padrões novos (vidro, refração, backdrop root, arco-íris de KPIs, sair da aba, count-up em
  índice, iniciais inventadas).
- **Perfil simples** (§18) para sistemas derivados.

### 2.0 — 29/08/2026

Primeira versão portátil: cinco regras, tokens, ponte Tailwind, tipografia, motion, shell,
primitivos, dataviz, status, acessibilidade, anti-padrões, boilerplate e checklist.

---

### A frase que resume o sistema

> **Um card é uma superfície mais clara sobre um canvas mais escuro. Um botão é uma pílula. Cor é
> conquistada, e material também. Nada flutua, exceto o que está genuinamente por cima. Toda linha
> que você desenha separa duas coisas — ela nunca fecha uma. E todo número na tela tem de onde vir.**
