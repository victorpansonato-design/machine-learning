# Risco de Evasão · UniAnchieta — front-end da ML

Front-end da machine learning de risco de evasão da **Graduação Presencial**, construída pelo TI
da UniAnchieta. Primeira etapa do Centro de Sucesso ao Aluno. **Só leitura**: consulta a fila que
o job grava (segunda e quinta, ~06:30) e não envia nada a ninguém.

Telas:

| Rota | Tela | Pergunta que responde |
|---|---|---|
| `#/monitoramento` | Monitoramento | Como está a fila no período (hoje, semana, mês, 3/6/12 meses ou datas escolhidas), por faixa e por curso? Quem entrou e saiu de cada faixa? A fila está em dia? |
| `#/alunos` · `#/alunos/<RA>` | Alunos · Dossiê do aluno | Quem está em cada faixa? Qual a situação deste RA e qual foi o caminho dele nas filas? |
| `#/mensagens` | Mensagens enviadas | Quais disparos de triagem foram registrados nesta fila? |
| `#/como-funciona` | Como funciona | O sistema explicado para qualquer pessoa: como a fila é montada e como ler as faixas. |

Toda tela é um link: os filtros vivem na URL (`#/alunos?faixa=CRITICA,ALTA&curso=258&data=2026-09-27`,
`#/monitoramento?periodo=6m&mov=ALTA`).

### Esboço do histórico de mensagens

Na demonstração, a lista de mensagens abre a aba **Mensagens** do dossiê do RA. A aba mostra a
linha do tempo dos disparos de triagem por fila, com status e um exemplo do título e corpo do push.
O conteúdo e os registros são **fictícios**. `ENVIADO` significa apenas envio registrado no mock;
não há confirmação de entrega no aparelho. O relatório exportado também identifica esse conteúdo
como demonstrativo. Em modo `api`, a aba avisa que falta uma consulta de mensagens por RA.

### Exportar

Todo botão **Exportar** oferece duas saídas do mesmo relatório (`src/export/`):

- **Planilha Excel (.xlsx)** — com logo, uma aba de resumo e uma aba por tabela, todas as linhas
  do filtro atual, número como número, data como data, RA como texto (preserva o zero à
  esquerda), larguras calculadas pelo conteúdo, cabeçalho congelado, filtro e pronta para
  imprimir. O gerador (`exceljs`) só é baixado no primeiro clique.
- **PDF** — abre a prévia da folha (`#/relatorio/<tipo>?…`); o botão "Imprimir ou salvar em PDF"
  usa a impressão do navegador, com o texto selecionável.

## Rodar

```bash
npm install
npm run dev       # http://localhost:3000 — proxy /api/evasao ativo
npm run lint      # tsc --noEmit, estrito
npm run build     # typecheck + bundle em dist/
```

Sem configuração nenhuma, o app roda com **dados fictícios** (`mock`), com a tag
"Dados fictícios" no header.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` (o git ignora) e preencha.

| Variável | Onde vive | Para quê |
|---|---|---|
| `VITE_DATA_SOURCE` | bundle (público) | `api` = API real via proxy; qualquer outro valor = `mock` (padrão) |
| `VITE_API_BASE` | bundle (público) | URL que o front chama. Padrão `/api/evasao` (o proxy deste repositório) |
| `VITE_MOCK_FILA_ATRASADA` | bundle (público) | `true` simula o job atrasado no mock — é como se testa o aviso de fila desatualizada |
| `EVASAO_API_TOKEN` | **só servidor** | token Bearer da API. **Nunca** com prefixo `VITE_` |
| `EVASAO_API_BASE` | só servidor | base da API do TI. Padrão: produção do app-web |

Tudo que começa com `VITE_` entra no bundle e é público. O token não tem esse prefixo de
propósito: só o proxy (`server/evasao-proxy.ts`) o lê, no servidor.

## Os três modos

### 1. Demo pública (Vercel)

`VITE_DATA_SOURCE=mock` e **sem** `EVASAO_API_TOKEN`. O front mostra dados fictícios e o proxy
responde `503` a qualquer chamada: nenhum dado real sai.

> A regra de reescrita do `vercel.json` (`/api/evasao/:rota*` → `/api/evasao?__rota=…`) ainda não
> foi testada num deploy real. No primeiro deploy, abra `/api/evasao/fila/saude` e confirme que a
> resposta é **JSON** (`503` sem token é o esperado neste modo).

### 2. Local com dado real

```bash
# .env.local
VITE_DATA_SOURCE=api
EVASAO_API_TOKEN=<peça ao TI>
```

`npm run dev` sobe o proxy junto (plugin do Vite). O CORS da API libera `localhost`, e o token
fica no processo do Node.

### 3. Produção com dado real — decisão do TI

Duas saídas, as duas **atrás de login**:

- **Vercel com proteção de acesso** (Vercel Authentication / Password Protection) e o token no
  painel (Settings → Environment Variables). Sem a proteção, qualquer pessoa com a URL lê RA e
  faixa de alunos reais.
- **`dist/` servido dentro do app-web**, atrás do login da intranet, com `VITE_API_BASE`
  apontando para a rota que o TI expuser. O `dist/` usa caminhos relativos e roteador por hash,
  então funciona numa subpasta sem regra de reescrita.

Depois de todo build com dado real, confira que o token não foi parar no bundle:

```bash
grep -r "evasao-presencial-" dist && echo VAZOU || echo ok
```

## Ligar ao backend (para o TI)

A camada de dados é um contrato explícito:

- `src/api/types.ts` — os schemas da OpenAPI, 1:1.
- `src/api/source.ts` — a interface `DataSource` e a escolha `api` | `mock`.
- `src/api/client.ts` — o `fetch` para `VITE_API_BASE`, erros tipados (`401`, `404`, `422`,
  `503`, `502/504`) com o texto que a tela mostra.
- `src/api/mock.ts` — a fonte fictícia: mesmo formato, mesmos filtros, mesmos erros.

**Mensagens enviadas** depende de uma rota que ainda não existe: a tabela
`ANC_ML_RISCO_DISPARO` não tem leitura publicada. A tela roda sobre o contrato proposto em
[`docs/CONTRATO_DISPAROS_PROPOSTA.md`](docs/CONTRATO_DISPAROS_PROPOSTA.md); em modo `api` ela
avisa que aguarda a rota. Quando `GET disparos/listar` existir, a troca é em
`src/api/disparos.ts` e na lista `ROTAS_PERMITIDAS` do proxy. `POST disparos/enviar` **nunca**
passa pelo proxy: ela envia push + e-mail de verdade.

## LGPD

A fila é dado pessoal de aluno. Por isso:

- **O token nunca vai para o navegador** nem para arquivo versionado.
- **Deploy público = `mock` e sem token.** Dado real só atrás de login.
- A tela não mostra nome, telefone, e-mail nem CPF (a API não devolve). A identidade é o RA.
- A faixa é **estimativa de risco**, não sentença: nunca "vai evadir", nunca "% de chance" por
  aluno, e "fora das faixas" não é "sem risco". Uso interno da equipe; **nunca comunicar ao
  aluno**.

## Documentação

- [`CLAUDE.md`](CLAUDE.md) — as regras que não se negociam.
- [`docs/CONTEXTO.md`](docs/CONTEXTO.md) — de onde vem o projeto e o que foi combinado com o TI.
- [`docs/api/`](docs/api/) — a documentação do TI (a única fonte de regra de negócio):
  `COMO_USAR.md`, `README_API.md`, `openapi.json`.
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — o design system (perfil simples, §18).
