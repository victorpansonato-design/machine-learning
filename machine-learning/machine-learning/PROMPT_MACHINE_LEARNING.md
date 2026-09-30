# PROMPT — Front-end da ML de risco de evasão · UniAnchieta

> **Para:** Claude Code, no repositório `machine-learning`.
> **Como usar:** com o pacote já extraído na raiz do repositório, abra o Claude Code e diga:
> *"Leia o PROMPT_MACHINE_LEARNING.md inteiro e execute."*

---

## 0. Antes de escrever qualquer linha

Leia, nesta ordem e por inteiro:

1. `CLAUDE.md` — as 10 regras que não se negociam.
2. `docs/CONTEXTO.md` — de onde vem o projeto, o que foi combinado com o TI, o que fica de fora.
3. `docs/api/COMO_USAR.md`, `docs/api/README_API.md` e `docs/api/openapi.json` — **a única
   fonte de regra de negócio deste sistema**.
4. `DESIGN_SYSTEM.md` — com atenção à §18 (perfil simples), que é o deste projeto.
5. O código que **já está pronto** na raiz (o "kit", validado com `tsc` estrito e `vite build`):

   ```
   index.html  package.json  tsconfig.json  vite.config.ts  vercel.json  .gitignore  .env.example
   api/evasao.ts                   função da Vercel (proxy)
   server/evasao-proxy.ts          a regra de segurança do proxy — uma vez só
   server/vite-evasao-proxy.ts     o mesmo proxy no `npm run dev`
   src/index.css                   tokens do design system (perfil simples)
   src/api/types.ts                o contrato da API, 1:1 com a OpenAPI
   src/domain/faixas.ts            faixas: rótulo, tom, cor + números publicados pelo TI
   src/domain/FaixaBadge.tsx       o status de faixa
   src/lib/{motion,format,reactive,csv,theme}.ts
   src/components/ui/*             primitivos do design system
   src/components/brand/AnchietaLogo.tsx
   src/main.tsx  src/App.tsx       App.tsx é placeholder — você o substitui
   ```

**Não reescreva o kit.** Os primitivos em `src/components/ui/` e os tokens em `src/index.css`
são o design system; `src/api/types.ts` é o contrato. Se uma tela precisar de algo que eles não
fazem, crie um componente novo que os componha — não altere o primitivo.

Rode `npm install` e `npm run build` antes de começar, para confirmar que o kit está íntegro.

## 1. O que construir

Um front **simples** com três telas, pedidas pelo TI (Davi) nesta ordem:

| # | Rota | Tela | Pergunta que responde |
|---|---|---|---|
| 1 | `#/monitoramento` (padrão) | **Monitoramento** | Como está a fila hoje, por faixa e por curso? A fila está em dia? |
| 2 | `#/alunos` · `#/alunos/:ra` | **Alunos** · **Aluno** | Quem está em cada faixa? Qual a situação deste RA? |
| 3 | `#/mensagens` | **Mensagens enviadas** | Quais alunos receberam a mensagem de triagem desta fila? |

Prazo: **esboço funcional até sexta, 02/10/2026**. Priorize nesta ordem: shell + camada de dados
+ mock → Monitoramento → Alunos + Aluno → Mensagens → acabamento. Cada etapa tem de ficar de pé
sozinha (build passando) antes da próxima.

Referência visual aprovada pelo TI: a página do aluno do Sucesso ao Aluno,
https://sucesso-ao-aluno.vercel.app/#/alunos/st-b38 — faixa azul com a identidade, tiles com os
números-chave, conteúdo em cards limpos. Leve **a estrutura**, não o conteúdo: lá há Health Score,
radares e casos, que aqui não existem.

## 2. Arquitetura

```
src/
  main.tsx  App.tsx  index.css
  api/
    types.ts        (kit) contrato
    client.ts       fetch para /api/evasao/<rota>, erros tipados
    source.ts       interface DataSource + escolha api|mock por VITE_DATA_SOURCE
    mock.ts         fonte fictícia, mesmo contrato, mesmos erros
    disparos.ts     fonte da tela Mensagens (só mock até o TI publicar a rota)
    useApi.ts       hook de carregamento com cache, abort e reload
  domain/
    faixas.ts  FaixaBadge.tsx          (kit)
    FilaStatus.tsx                     pílula do estado da fila (header)
    FilaDesatualizada.tsx              aviso de fila_atualizada = false
  lib/
    motion.ts format.ts reactive.ts csv.ts theme.ts   (kit)
    router.ts                          hash router com query string
  components/
    ui/*  brand/*                      (kit)
    layout/Sidebar.tsx  layout/Header.tsx
  views/
    MonitoramentoView.tsx  AlunosView.tsx  AlunoView.tsx  MensagensView.tsx
```

### 2.1 `lib/router.ts`

Hash router sem dependência, no molde do Sucesso ao Aluno (o botão voltar funciona, toda tela é
compartilhável por link), **com query string** — os filtros da lista vivem na URL:

```
#/monitoramento
#/alunos?faixa=CRITICA,ALTA&curso=258&data=2026-09-27&pagina=2
#/alunos/2640797
#/mensagens?data=2026-09-27&faixa=CRITICA&status=FALHA
```

`useRoute()` → `{ route: { name, param, query }, navigate(name, param?, query?), replace(...) }`.
Rota desconhecida cai em `#/monitoramento`. Uma URL sem hash é normalizada com `replace`.

### 2.2 `api/client.ts`

- Base: `import.meta.env.VITE_API_BASE ?? '/api/evasao'`. É a única URL que o front conhece; o TI
  pode apontá-la para outro backend sem tocar em tela.
- `apiGet<T>(rota, params, signal)`: monta a query; **arrays viram parâmetro repetido**
  (`faixa=CRITICA&faixa=ALTA`), `undefined` e `''` são omitidos. `credentials: 'same-origin'`.
- Resposta não-2xx: lê `{"error": "..."}` e lança `ApiError { status, message }`. Mensagens para o
  usuário por status, a partir da tabela de erros do COMO_USAR:

  | Status | Texto na tela |
  |---|---|
  | 401 | "Acesso recusado pela API (token do servidor ausente ou inválido)." |
  | 404 | a mensagem da API, como veio (ela diz qual: rota, data ou RA) |
  | 422 | a mensagem da API, como veio (ela diz o parâmetro e o formato) |
  | 503 | "Banco indisponível. Tente de novo em alguns minutos." — ou a mensagem do proxy, se for dele |
  | 502/504 | a mensagem do proxy |

- **Nunca** um header `Authorization` no front. O token é problema do proxy.

### 2.3 `api/source.ts`

```ts
export interface DataSource {
  kind: 'api' | 'mock';
  saude(signal?: AbortSignal): Promise<Saude>;
  datas(p: DatasParams, signal?: AbortSignal): Promise<DataCorte[]>;
  resumo(p: ResumoParams, signal?: AbortSignal): Promise<ResumoCurso[]>;
  listar(p: ListarParams, signal?: AbortSignal): Promise<PaginaAlunos>;
  consultar(p: ConsultarParams, signal?: AbortSignal): Promise<HistoricoAluno>;
}
export const source: DataSource = import.meta.env.VITE_DATA_SOURCE === 'api' ? apiSource : mockSource;
```

Padrão = `mock`. Declare as variáveis `VITE_DATA_SOURCE`, `VITE_API_BASE` e
`VITE_MOCK_FILA_ATRASADA` em `src/vite-env.d.ts`.

### 2.4 `api/mock.ts` — dados fictícios, contrato real

O mock existe para o esboço ser mostrado sem dado real. Ele tem de ser **indistinguível da API
no formato** e **obviamente fictício no conteúdo**:

- **Determinístico.** PRNG com semente fixa (mulberry32 ou similar). **Nunca `Math.random`**: o
  mesmo RA tem de mostrar a mesma faixa em todo render e toda sessão.
- **12 filas** retroativas no ritmo do job: `dt_corte` em quartas e domingos (a véspera das
  execuções de quinta e segunda — é o que a API real mostra), terminando no domingo ou quarta
  mais recente ≤ hoje.
- **Por fila, ~1.886 linhas** com os tamanhos do TI: posições 1–189 `CRITICA`, 190–943 `ALTA`,
  944–1886 `MEDIA` (variação de poucas unidades entre filas é bem-vinda). Totais de `fila/datas`
  e `fila/resumo` são **a soma das linhas** — nenhum número escrito à mão que possa discordar.
- **Continuidade entre filas**: um grupo de ~2.600 RAs com um risco latente + ruído por fila,
  ordenado para formar a fila. Assim `historico` tem sentido (o aluno sobe, desce, entra e sai).
- **RAs fictícios** de 7 dígitos; **~14 cursos** com código de 3 dígitos e nome em caixa alta como
  o Lyceum grava (ex.: `258 · BACHARELADO EM ENGENHARIA MECÂNICA`, `215 · BACHARELADO EM
  ENGENHARIA QUÍMICA`, `146 · SUPERIOR DE TECNOLOGIA EM LOGÍSTICA`, `BACHARELADO EM DIREITO`…).
- `sit_aluno`: ~95% `Ativo`, o resto `Cancelado` (os dois valores que a documentação cita).
- `leitura`: imita o exemplo do COMO_USAR (`"CRITICA na fila de 2026-09-27, posicao 11."`); para
  fora das faixas e para `sit_aluno ≠ Ativo`, uma frase curta equivalente. Em modo `api` a tela
  mostra **a `leitura` da API, verbatim** — o front nunca gera a sua.
- **Mesmas regras de filtro da API**: `curso` = código exato ou trecho do nome sem acento e sem
  caixa; `faixa` múltipla; `data` inexistente → 404; faixa inválida, data malformada ou `limite`
  fora de 1–1000 → 422; `consultar` sem `ra` → 422; RA aceito sem zero à esquerda e com ponto e
  traço (normaliza para 7 dígitos); RA fora do grupo → 404; RA do grupo fora da última fila →
  `faixa_ultima_fila: null`.
- `fila_atualizada: true`, a não ser com `VITE_MOCK_FILA_ATRASADA=true` — aí a última fila fica
  com 4 dias de atraso e todas as respostas vêm com `false`. É como se testa o aviso.
- Latência simulada de 250–450 ms (determinística por chamada), para os skeletons aparecerem.

### 2.5 `api/useApi.ts`

`useApi<T>(key: string | null, load: (signal) => Promise<T>)` → `{ data, error, loading, reload }`.
Cache em memória por `key` (5 min — a fila muda duas vezes por semana), `AbortController` ao
trocar de `key` ou desmontar, `reload()` ignora o cache. `key === null` não carrega. Sem
biblioteca de data fetching.

### 2.6 Shell

- **Sidebar** (`layout/Sidebar.tsx`) — a do Sucesso ao Aluno (DESIGN_SYSTEM §9), com três itens
  e nada mais: `Monitoramento` (`LayoutDashboard`), `Alunos` (`GraduationCap`), `Mensagens
  enviadas` (`Send`). `BrandLockup unit="Risco de Evasão"`. Rodapé: tema (com a revelação
  circular de `lib/theme.ts`) e recolher. Sem seletor de função, sem badge de contagem.
  Abaixo de `lg`, começa recolhida (68 px).
- **Header** (`layout/Header.tsx`), 74 px, sticky, `bg-surface/85 backdrop-blur-xl`:
  - à esquerda, **Consultar RA**: `SearchInput` com placeholder `Consultar RA…`; Enter navega
    para `#/alunos/<ra digitado>`.
  - à direita, `FilaStatus` (de `fila/saude`): `Fila de 27/09 · em dia` como status neutro; com
    `fila_atualizada: false`, `Fila de 23/09 · 4 dias de atraso` em âmbar `solid`. Sem
    `ultima_fila`, `Sem fila gravada` em vermelho. Clique abre um popover com a `DataList` da
    saúde (última fila, fila esperada, dias de atraso, filas gravadas, "o job roda segunda e
    quinta, ~06:30").
  - com `source.kind === 'mock'`, uma tag `Dados fictícios` (`Pill dot={false}`) ao lado — para
    ninguém fotografar o esboço e apresentar como resultado.
- `main`: `px-4 py-6 sm:px-6 lg:px-8`, conteúdo em `max-w-[1440px]`, `AnimatePresence mode="wait"`
  com `pageVariants`.

### 2.7 `domain/FilaDesatualizada.tsx`

`Callout tone="warn"` usado no topo de **toda** tela que recebe uma resposta com
`fila_atualizada: false`: *"Fila de 23/09/2026 — não é a mais recente esperada (esperada:
27/09/2026). Os números abaixo são dessa data."* Quando o usuário escolheu uma data antiga de
propósito, o texto muda para *"Você está vendo a fila de 23/09/2026, não a mais recente."* com um
`LinkButton` "Ver a mais recente". É a regra nº 1 do COMO_USAR para quem consome a API.

## 3. As telas

### 3.1 Monitoramento — `#/monitoramento`

Dados: `fila/saude`, `fila/datas?limite=60`, `fila/resumo?data=<selecionada>`.

1. **PageHeader** — título `Monitoramento`; descrição: *"A fila de risco de evasão da graduação
   presencial, gerada pela machine learning do TI toda segunda e quinta."*; ações: `Select` de
   fila (datas de `fila/datas`, formato `27/09/2026 · domingo`, padrão = a mais recente) e
   `Exportar CSV` (secondary) do resumo por curso.
2. **Quatro `StatTile`** em `grid-cols-2 lg:grid-cols-4`:
   - `Crítica`, `Alta`, `Média` — valor `AnimatedNumber`, `accent` = `FAIXA_META[f].hex(dark)`,
     `detail` = % do total nas faixas, rodapé = `evadem ~4 em cada 10` (o `evadem` de
     `FAIXA_META`) e, se houver fila anterior, a variação contra ela com `TrendIndicator`.
   - `Nas faixas` — o total; rodapé `fila de 27/09/2026`.
   - Clique num tile abre o `MetricSheet` da faixa (fica na aba): valor, denominador *"de N alunos
     nas três faixas da fila de DD/MM"*, composição por curso (os 8 maiores + "demais") e a
     leitura com a regra e o `evadem` do TI.
3. **Grade `lg:grid-cols-[minmax(0,1fr)_340px]`**:
   - **Evolução das faixas** — `LineChart` com as três séries de `fila/datas` em ordem
     cronológica (cores de `FAIXA_META`), legenda que liga e desliga. Com menos de 2 filas,
     `EmptyState compact` *"A evolução aparece a partir da segunda fila gravada."*
   - **Saúde da fila** — `DataList` de `fila/saude` + um `Callout` curto *"O job roda segunda e
     quinta por volta das 06:30. Antes das 8h desses dias, a fila anterior ainda conta como em
     dia."* (texto do COMO_USAR).
4. **Cursos** — `Card padded={false}` com a tabela de `fila/resumo`, no padrão da Base de Alunos
   do Sucesso ao Aluno (DESIGN_SYSTEM §10.14):
   - barra de topo `bg-surface-2` com `N cursos`, `SearchInput` por nome (sem acento, sem caixa) e
     cabeçalhos ordenáveis (Crítica, Alta, Média, Total). Ordem inicial = a da API (mais alunos na
     Crítica primeiro).
   - linha: nome do curso (`text-[13px] font-semibold`) + código em `Pill dot={false} mono`;
     números em mono alinhados à direita; um `StackedBar` de 96 px com a composição; ação
     `Ver alunos` (ghost) → `#/alunos?curso=<código>&data=<fila>`.
   - **sem trilho vermelho nesta tabela**: destacar "curso crítico" exigiria um limiar, e
     limiar seria régua inventada. A coluna Crítica fica em `text-crit-ink font-semibold`
     quando > 0, e só.
5. **Como ler as faixas** — card com a tabela das faixas (regra, tamanho típico, evadem) copiada
   de `FAIXA_META`, a linha *"Média de evasão da base: 8,2% (coorte 2025/2, medição do TI)."* e
   o `AVISO_FAIXA`.

### 3.2 Alunos — `#/alunos`

Dados: `alunos/listar` com os filtros da URL; `fila/datas` para o seletor e as contagens.

1. **PageHeader** — título `Alunos em risco`; descrição: *"Os alunos nas três faixas da fila de
   DD/MM/AAAA. Quem não aparece aqui não está entre os ~20% de maior risco — consulte qualquer RA
   pela busca."* Ação: `Exportar N alunos` (secondary) — percorre todas as páginas do filtro
   atual com `limite=1000` e baixa CSV (`dt_corte;posicao;ra;faixa;curso;nome_curso`).
2. **Card de consulta** — `SearchInput` grande `RA do aluno` + botão `Consultar` (primary — a
   única primary da tela) → `#/alunos/<ra>`. É o que atende "ver a chance de evasão de **todos**
   os alunos": a lista mostra ~1.886; a consulta responde por qualquer um dos ~9.400.
3. **Filtros** (`Card`): `Chip` por faixa, multi, com a contagem da fila (`tone="crit"` na
   Crítica); campo `Curso` (código ou trecho do nome, debounce 350 ms, enviado à API como
   `curso`); `Select` de fila; `Limpar filtros` (ghost) quando houver filtro. Todo filtro reinicia
   a página e é escrito na URL com `replace`.
4. **Tabela** (`Card padded={false}`):
   - topo `bg-surface-2`: `N alunos` e a nota `Posição = lugar na fila geral da escola, todos os
     cursos` com um `Hint`.
   - linha: posição (`#11`, mono, `w-14`), RA (mono semibold), nome do curso + código (tag),
     `FaixaBadge`, `ChevronAffordance`. Linha inteira clicável → `#/alunos/<ra>`. `Row
     tone="crit"` nas linhas `CRITICA` (o trilho de 2 px do design system).
   - paginação do servidor, 50 por página, no padrão da Base de Alunos.
   - vazio: `EmptyState` *"Nenhum aluno nas faixas com esses filtros."* + `Limpar filtros`.
   - carregando: 8 linhas de `Skeleton` com a mesma geometria da linha real.

### 3.3 Aluno — `#/alunos/:ra`

Dados: `alunos/consultar?ra=<param>&dias=30`. Quando a resposta vier, `replace` a URL pelo RA
canônico (`aluno`, com zero à esquerda).

1. **Voltar** — `Button ghost` `Alunos` com `ArrowLeft` (volta com os filtros que estavam na URL).
2. **Identidade** — o cartão do Dossiê 360° em versão enxuta: `Card padded={false}` com a faixa
   `bg-brand` em cima (azul preenchido = "você está olhando uma pessoa"):
   - `RA 2640797` em `text-[24px] font-semibold text-on-brand` (mono no número); abaixo,
     `nome_curso · código` em `text-on-brand/80`. **Sem nome de aluno e sem avatar de
     iniciais** — a API não devolve nome, e o front não inventa.
   - abaixo da faixa azul (fora dela, porque badges têm semântica própria de cor): situação atual
     (`Ativo` como status neutro; qualquer outro valor em vermelho `solid`), `FaixaBadge` da última
     fila, e a tag `fila de 27/09/2026`.
3. **Se `sit_aluno ≠ 'Ativo'`** — `Callout tone="crit"` antes de tudo: *"Situação atual no Lyceum:
   Cancelado. O aluno já saiu — não há o que reter."* (regra 5 do COMO_USAR).
4. **Leitura** — `Callout tone="info"` com a `leitura` da API, verbatim.
5. **Três `StatTile`**: `Faixa na última fila` (o `FaixaBadge` como valor, ou `Fora das faixas`),
   `Posição na fila geral` (`#11`, ou `—` fora das faixas; `Hint` explicando que é a escola
   inteira), `Filas em que apareceu` (`historico.length` + `nas últimas N filas consultadas`).
6. **Histórico** — `Card` com uma lista (divisores hairline) das filas em que o aluno apareceu:
   data, `FaixaBadge`, posição e a variação contra a fila anterior da lista (*"subiu 34 posições"*
   quando a posição diminuiu — mais perto do topo = maior risco —, *"desceu 12"* quando
   aumentou). Vazio: *"Não apareceu em nenhuma das últimas N filas."*
7. **Rodapé** — `AVISO_FAIXA` em `text-[11.5px] text-ink-4`.
8. **Erros**: 404 → `EmptyState` *"RA não encontrado no Lyceum."* com a busca de novo; 422 → a
   mensagem da API.

### 3.4 Mensagens enviadas — `#/mensagens`

**Leia `docs/CONTEXTO.md` §5 e `docs/CONTRATO_DISPAROS_PROPOSTA.md` antes.** A tabela
`ANC_ML_RISCO_DISPARO` existe, mas o TI ainda **não** publicou rota de leitura. A tela é
construída sobre o contrato proposto, isolado em `api/disparos.ts`:

```ts
// Proposta — a confirmar com o TI. Só `ENVIANDO` e `FALHA` estão documentados;
// o valor gravado no sucesso é desconhecido (o mock usa 'ENVIADO').
export type StatusDisparo = 'ENVIADO' | 'ENVIANDO' | 'FALHA' | (string & {});
export interface Disparo {
  dt_corte: string; aluno: string; chance_evasao: Faixa; modalidade: string;
  status: StatusDisparo; external_id?: string | null; enviado_em?: string | null;
}
export interface PaginaDisparos {
  dt_corte: string; fila_atualizada: boolean; total: number; pagina: number; limite: number;
  resumo: Record<string, number>; disparos: Disparo[];
}
export interface DisparosSource { disponivel: boolean; listar(p, signal?): Promise<PaginaDisparos>; }
```

- `mock`: `disponivel: true`, dados coerentes com a fila do mock (os alunos `Ativo` de uma faixa
  recebem uma vez por fila; ~3% `FALHA`, alguns `ENVIANDO`).
- `api`: `disponivel: false` enquanto a rota não existir. A tela mostra um `EmptyState`: *"A
  leitura dos envios ainda não está disponível na API. O TI registra quem recebeu a mensagem na
  tabela ANC_ML_RISCO_DISPARO; falta a rota de consulta."* — e mais nada. **Não chame `POST
  disparos/enviar` para ler** (é rota de envio) e **não crie botão de envio**: esta etapa é só
  leitura.

Layout (quando `disponivel`):

1. **PageHeader** — `Mensagens enviadas`; descrição: *"Quem recebeu a mensagem de triagem (push +
   e-mail) em cada fila. Cada aluno recebe no máximo uma vez por fila."* (fatos do README do TI).
   Ações: `Select` de fila, `Exportar CSV`.
2. **Tiles**: `Enviados`, `Falhas`, `Em andamento` (a partir de `resumo`); `Falhas` com
   `accent="var(--crit)"` só quando > 0.
3. **Filtros**: `Chip` por faixa e por status.
4. **Tabela**: RA (mono) → `#/alunos/<ra>`, `FaixaBadge`, status (`Pill`: `FALHA` crit solid,
   `ENVIANDO` warn, sucesso neutro), `enviado_em` com `stamp()` quando existir, `external_id` em
   mono `text-ink-4` quando existir. Paginação como em Alunos.
5. Em modo mock, um `Callout tone="warn"` fixo no topo: *"Formato proposto ao TI — ainda não é a
   API real."*

## 4. Linguagem

- Português do Brasil, sentence case, frases curtas. Datas `27/09/2026` (use `fullDate` /
  `shortDate` de `lib/format.ts` — elas tratam `AAAA-MM-DD` sem cair no dia anterior).
- **Vocabulário da faixa**: "faixa Crítica / Alta / Média", "chance de evasão Crítica",
  "estimativa de risco". **Proibido**: "vai evadir", "evadirá", "% de chance" por aluno,
  "sem risco" para quem está fora das faixas, "aluno crítico" como rótulo de pessoa.
- `posicao` sempre com "na fila geral" por perto na primeira vez que aparece numa tela.
- Nunca mostrar dado que a API não devolve. Nada de nome, telefone, e-mail, CPF, motivo.

## 5. Design (perfil simples)

Siga `DESIGN_SYSTEM.md`. O essencial para este projeto:

- Cinco regras: separação é contraste, não linha · hairline é divisor, nunca moldura · 12 px para
  superfície, pílula para ação · cor é conquistada · sem sombra no que não flutua.
- **Azul** só em: botão primário (um por tela), item ativo da sidebar, faixa de identidade da
  página do aluno, paginação ativa.
- **Cor de faixa** só via `FAIXA_META` — a mesma no badge, no tile, na barra e na linha do gráfico.
  Nenhum outro matiz em gráfico.
- **Sem** vidro (`CrystalGlass`), aparelho 3D, slab editorial, trama de pontos, gradiente
  decorativo. É um instrumento de consulta, não uma apresentação.
- Todo clicável com `whileTap={press}`; `transition-colors`, nunca `transition-all`; entradas por
  rolagem com `Reveal`/`RevealGroup` só nas dobras do Monitoramento.
- Claro e escuro pelos tokens (nenhuma classe `dark:` em view); `prefers-reduced-motion`
  respeitado (já está nos primitivos).
- Responsivo até 360 px: tabelas viram lista de duas linhas abaixo de `lg`, como na Base de
  Alunos do Sucesso ao Aluno.

## 6. Segurança e dados reais

- O token **não** é escrito em nenhum arquivo do repositório. Local: `.env.local` (ignorado pelo
  git) com `EVASAO_API_TOKEN=...` e `VITE_DATA_SOURCE=api`.
- Não altere `ROTAS_PERMITIDAS` em `server/evasao-proxy.ts` para incluir `disparos/enviar`.
- Depois do build, confira que o token não está no bundle:
  `grep -r "evasao-presencial-" dist && echo VAZOU || echo ok`.
- **Deploy**: três modos, documentados no README que você vai escrever:
  1. **Demo pública (Vercel)** — `VITE_DATA_SOURCE=mock`, **sem** `EVASAO_API_TOKEN`. O proxy
     responde 503 e nada real sai.
  2. **Local com dado real** — `npm run dev` com `.env.local`.
  3. **Produção com dado real** — decisão do TI: Vercel **com** proteção de acesso + token no
     painel, ou o `dist/` servido dentro do app-web atrás do login da intranet, com
     `VITE_API_BASE` apontando para a rota que o TI expuser.
- A regra de reescrita do `vercel.json` (`/api/evasao/:rota*` → `/api/evasao?__rota=…`) não foi
  testada num deploy real. No primeiro deploy, abra `/api/evasao/fila/saude` e confirme que
  responde JSON (503 sem token é o esperado no modo demo).

## 7. Entrega

- `README.md` do repositório: o que é, os três modos, como rodar, variáveis de ambiente, a nota de
  LGPD e o link para `docs/`.
- `npm run lint` e `npm run build` com **0 erro**.
- Verifique no navegador (skill `run`, se disponível): as três telas e a página do aluno nos dois
  temas; `VITE_MOCK_FILA_ATRASADA=true` mostra o aviso de fila desatualizada em todas as telas; um
  RA inexistente mostra o 404; o modo `api` com `.env.local` carrega a fila real no localhost.
- Não faça commit nem deploy sem eu pedir.

### Critérios de aceite

- [ ] Três itens no menu, nenhum a mais.
- [ ] Nenhum número na tela que não venha da API (ou do mock no formato dela) ou de `FAIXA_META`.
- [ ] `fila_atualizada: false` gera aviso visível em toda tela afetada.
- [ ] Nenhum "vai evadir", "% de chance", "sem risco"; `posicao` explicada como fila geral.
- [ ] Nenhum nome de aluno, nenhuma inicial; identidade = RA.
- [ ] Página do aluno mostra `sit_aluno ≠ Ativo` antes da faixa.
- [ ] Mensagens: mock no contrato proposto; em modo `api`, aviso de rota indisponível; nenhum
      botão de envio; nenhuma chamada a `disparos/enviar`.
- [ ] Tag `Dados fictícios` visível em modo mock.
- [ ] Token ausente do `dist/`.
- [ ] Nenhum hex, raio ou sombra crua em `views/` e `layout/`.
- [ ] `lint` e `build` com 0 erro.
