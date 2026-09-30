import { handleEvasao } from '../server/evasao-proxy';

/* ==========================================================================
   Função da Vercel — `/api/evasao/*`
   --------------------------------------------------------------------------
   O `vercel.json` reescreve `/api/evasao/:rota*` para `/api/evasao?__rota=…`,
   preservando a query original. Aqui a rota é tirada de `__rota` e o resto da
   query segue intacto para a API (inclusive `faixa` repetida).

   Variáveis no painel da Vercel (Settings → Environment Variables):
     EVASAO_API_TOKEN   o token Bearer — SÓ se o deploy tiver proteção de acesso
     EVASAO_API_BASE    opcional; padrão = produção do app-web

   ATENÇÃO — LGPD: com o token configurado, qualquer pessoa que abrir a URL do
   deploy lê RA e faixa de risco de alunos reais. Um deploy público (sem
   Vercel Authentication / Password Protection, ou sem estar atrás do login da
   intranet) fica SEM token e roda em modo `mock`.
   ========================================================================== */

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rota = url.searchParams.get('__rota') ?? '';
  url.searchParams.delete('__rota');
  return handleEvasao('GET', rota, url.searchParams, {
    EVASAO_API_TOKEN: process.env.EVASAO_API_TOKEN,
    EVASAO_API_BASE: process.env.EVASAO_API_BASE,
  });
}
