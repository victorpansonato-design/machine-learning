# Contexto — front-end da machine learning de evasão

> Por que este repositório existe, o que foi combinado com o TI e o que fica de fora.
> Escrito em 29/09/2026 a partir do repositório `sucesso-ao-aluno` e da conversa com o TI.

---

## 1. De onde vem

O **Centro de Sucesso ao Aluno** (repositório `sucesso-ao-aluno`, publicado em
https://sucesso-ao-aluno.vercel.app) é o sistema completo pensado para a retenção na
UniAnchieta: cockpit do atendente, fila com SLA, Health Score explicável, radares, trilha do
aluno, gestão de PUSH, indicadores. **Toda a base de lá é fictícia.**

O projeto está sendo construído junto com o TI da UniAnchieta **por etapas**. A primeira
etapa é só a **machine learning de risco de evasão** que o TI já construiu — este
repositório (`machine-learning`) é o **front-end dessa etapa**, e só dela.

Quando as etapas avançarem, este front pode ser ligado ao Sucesso ao Aluno. Por isso ele usa
**o mesmo design system** (mesmos tokens, mesmos primitivos) — a junção futura é trocar de
casa, não redesenhar.

## 2. O que foi combinado com o TI

Conversa com o Davi Ferreira Freitas (TI). Resumo fiel:

- Fazer em partes, começando pela ML. "Futuramente, se for suave ligar ao Sucesso, tranquilo."
- **Rápido**: o Cristian quer isso logo. O pedido é um **esboço até o fim da semana**
  (sexta, 02/10/2026) "para mandar o mais rápido possível, a gente vai atualizando depois".
- **Não precisa ser complexo.** "Algo mais simples."
- O sistema teria **três coisas**:
  1. **Dashboard de monitoramento geral**
  2. **Alunos que foram enviadas as mensagens**
  3. **Ver a chance de evasão de todos os alunos**
- Referência visual aceita: a página do aluno do Sucesso ao Aluno
  (https://sucesso-ao-aluno.vercel.app/#/alunos/st-b38 — o Dossiê 360°: faixa azul com a
  identidade, números-chave em tiles, abas).
- Design system: **usar o nosso** ("faz o seu, melhor"), não o padrão do TI.
- **"Daí eu já conecto com o backend"** — o TI liga o front aos dados reais. O front precisa
  deixar essa ligação fácil: uma camada de dados com contrato explícito.

## 3. A fonte da verdade

**Só a documentação do TI.** Nada de régua do Sucesso ao Aluno.

| Arquivo | O que é |
|---|---|
| `docs/api/COMO_USAR.md` | guia de consumo da API (rotas, exemplos, regras para o assistente) |
| `docs/api/README_API.md` | instalação e manutenção da API, **inclui a rota de disparos** e a regra das faixas |
| `docs/api/openapi.json` | especificação OpenAPI 3.1 baixada de `…/api/openapi` em 29/09/2026 |

### O que a API responde (resumo)

- Um job roda **segunda e quinta ~06:30**, pontua ~9.429 alunos da graduação presencial e grava
  numa fila os de maior risco, em três faixas. A API **só lê** essa fila.
- `dt_corte` é a data de corte dos dados. Nos dados de 29/09/2026 as filas gravadas eram
  **23/09 (quarta)** e **27/09 (domingo)** — ou seja, a véspera da execução de quinta e de
  segunda. Mostre a data como a API devolve; não "corrija" para o dia da execução.
- Faixas pela **posição** na fila, não por probabilidade (o modelo não é calibrado):

  | Faixa | Regra (TI) | Tamanho típico | Evadem de fato* |
  |---|---|---|---|
  | `CRITICA` | 20% do topo da ALTA (≈ 2% da base) | 189 | ~41% (~4 em 10) |
  | `ALTA` | resto dos 10% do topo | 754 | ~25% (~1 em 4) |
  | `MEDIA` | de 10% a 20% da base | 943 | ~16% (~1 em 6) |

  \* CV out-of-fold na coorte 2025/2; a média de evasão da base é 8,2%.

- **A API não devolve nome de aluno.** Só RA, código e nome do curso, faixa, posição e data.
  `alunos/consultar` acrescenta `sit_aluno` (situação atual no Lyceum) e `leitura` (uma frase
  pronta).
- Aluno fora da fila = não está entre os ~20% de maior risco (ou não é da graduação
  presencial). **Não é "sem risco nenhum".**

  > **Divergência entre os dois documentos do TI.** O `README_API.md` escreve "Aluno fora da
  > tabela = **sem risco** naquele dia"; o `COMO_USAR.md` — o guia de quem **consome** a API,
  > regra 3 para o assistente — diz que "não está na fila" **não** é "sem risco nenhum". O front
  > segue o COMO_USAR: é o texto escrito para quem mostra o dado a uma pessoa, e é o mais
  > prudente. Na tela: "Fora das faixas", nunca "Sem risco".

### Verificado ao vivo em 29/09/2026 (só rotas agregadas, sem baixar dado de aluno)

- `fila/saude` sem token → `401`. Com token → `200`, fila de 27/09 em dia, 2 filas gravadas.
- `fila/datas` → 27/09: 189 / 755 / 944 = 1.888 · 23/09: 189 / 754 / 943 = 1.886.
- **CORS**: libera `http://localhost:*` e a intranet; uma origem externa (`*.vercel.app`) **não**
  recebe `Access-Control-Allow-Origin`. O navegador bloquearia uma chamada direta.

## 4. Decisões de arquitetura (e por quê)

1. **Proxy no servidor, token fora do navegador.** O COMO_USAR proíbe o token em código que
   roda no navegador, e o CORS bloqueia origens externas. O kit traz `server/evasao-proxy.ts`,
   usado pelo `npm run dev` (plugin do Vite) e pela função da Vercel (`api/evasao.ts`). Testado.
2. **Só leitura.** A API tem `POST disparos/enviar`, que **manda push + e-mail de verdade** para
   alunos. Esta etapa não envia nada: o proxy só deixa passar as 5 rotas GET e recusa qualquer
   outra coisa (inclusive `disparos`). Testado.
3. **Camada de dados com duas fontes** — `mock` (padrão; dados fictícios no formato exato da
   API) e `api` (real, via proxy). O esboço roda e pode ser mostrado sem tocar em dado real, e o
   TI troca uma variável para ligar.
4. **LGPD no deploy.** Com o token configurado, qualquer pessoa que abrir a URL lê RA e faixa de
   alunos reais. Deploy público = `mock` e sem token. Dado real só com proteção de acesso
   (Vercel Authentication/Password Protection) ou hospedado atrás do login da intranet.
5. **Simples de propósito.** Mesmo design system, **perfil simples**: sem vidro, sem aparelho 3D,
   sem slab editorial. Ver DESIGN_SYSTEM.md §18.

## 5. A tela "Mensagens enviadas" depende do TI

O README do TI documenta a tabela **`ANC_ML_RISCO_DISPARO`** — quem recebeu a mensagem de
triagem, com `DT_CORTE`, `MODALIDADE = 'PRESENCIAL'` e `STATUS` (`ENVIANDO`, `FALHA`, …).
**Mas não existe rota GET para ler essa tabela.** A única rota é o `POST disparos/enviar`, cuja
resposta não tem schema publicado (`type: object`).

Por isso a tela é construída sobre um contrato **proposto** (`docs/CONTRATO_DISPAROS_PROPOSTA.md`),
roda em `mock` e, em modo `api`, mostra com clareza que aguarda a rota de leitura. **Não usar o
POST de simulação para ler a tabela** — é uma rota de envio; um `confirmar: true` por engano
dispara mensagem para alunos reais.

## 6. O que NÃO vem do Sucesso ao Aluno

Tudo o que é régua, número ou conceito daquele sistema fica fora — o TI definiu a ML com as
regras dele:

- Health Score, pesos por modalidade, faixas Estável/Atenção/Risco/Crítico
- Os 5 radares, SLA em horas úteis, fila de atendimento, casos e a máquina de estados
- Copiloto de abordagem, playbook, Freio Concorrente
- Regra dos 90 dias / onboarding, coorte calouro × veterano
- Híbrido e EaD (a API é **só graduação presencial**)
- Trilha do aluno, calendários acadêmicos, Gestão de PUSH e o catálogo de mensagens
- Nome, telefone, e-mail, CPF do aluno (a API não devolve) e qualquer "% de chance" por aluno

## 7. Pessoas

- **Davi Ferreira Freitas** (TI) — dono da API e de ligar o front ao backend.
- **Cristian** — quer a entrega rápida.
- **Victor Capitani Pansonato** — autor do Sucesso ao Aluno e deste front.
