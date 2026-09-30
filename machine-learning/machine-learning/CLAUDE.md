# CLAUDE.md — Risco de Evasão · UniAnchieta (front-end da ML)

Front-end da machine learning de risco de evasão da **Graduação Presencial**, construída pelo TI
da UniAnchieta. Primeira etapa do Centro de Sucesso ao Aluno. Contexto completo em
`docs/CONTEXTO.md`.

## Regras que não se negociam

1. **A fonte da verdade é a documentação do TI**: `docs/api/COMO_USAR.md`,
   `docs/api/README_API.md` e `docs/api/openapi.json`. Não invente régua, faixa, limiar, peso,
   meta ou campo. Se algo não está lá, a tela não mostra — ou pergunta.
2. **Nada do Sucesso ao Aluno além do design system.** Health Score, radares, SLA, casos,
   copiloto, onboarding de 90 dias, híbrido/EaD, trilha, PUSH: fora (lista em
   `docs/CONTEXTO.md` §6).
3. **O token da API nunca vai para o navegador.** Ele vive em `EVASAO_API_TOKEN` (sem prefixo
   `VITE_`), lido só por `server/evasao-proxy.ts`. Nunca escreva o token em arquivo versionado.
4. **Só leitura.** O proxy libera apenas `fila/saude`, `fila/datas`, `fila/resumo`,
   `alunos/listar` e `alunos/consultar`, só GET. Nunca chame `disparos/enviar` — ela envia
   push + e-mail de verdade para alunos.
5. **Toda resposta com fila traz `fila_atualizada`.** Se vier `false`, a tela mostra a data da
   fila e avisa que ela não é a mais recente esperada. Sempre.
6. **A faixa é estimativa, não sentença.** Nunca "vai evadir"; nunca um "% de chance" por aluno
   (o modelo não é calibrado). "Fora das faixas" não é "sem risco". Uso interno — não comunicar
   ao aluno (LGPD).
7. **`posicao` é da fila geral da escola**, não do curso filtrado. Diga isso onde ela aparecer.
8. **`sit_aluno` diferente de `Ativo` = o aluno já saiu.** Mostre isso antes da faixa.
9. **A API não devolve nome de aluno.** A identidade na tela é o RA. Não gere nome nem iniciais.
10. **Deploy público = `VITE_DATA_SOURCE=mock` e sem token.** Dado real só atrás de login.

## Design

Leia `DESIGN_SYSTEM.md` antes de escrever CSS ou JSX. Este projeto usa o **perfil simples**
(§18): tokens e primitivos do sistema, sem vidro, sem aparelho 3D, sem slab. Nenhuma view escreve
hex, raio ou sombra crua — só compõe `src/components/ui/`. Não edite os primitivos para "caber"
uma tela; se faltar algo, crie um componente novo que os componha.

## Comandos

```bash
npm run dev       # http://localhost:3000 — proxy /api/evasao ativo
npm run lint      # tsc --noEmit, strict
npm run build     # typecheck + bundle
```

`npm run lint` e `npm run build` têm de passar com 0 erro antes de qualquer entrega.
