import type { Plugin } from 'vite';
import { handleEvasao } from './evasao-proxy';
import type { ProxyEnv } from './evasao-proxy';

/* ==========================================================================
   Plugin do Vite: `/api/evasao/*` no `npm run dev` e no `npm run preview`
   --------------------------------------------------------------------------
   Monta a mesma `handleEvasao` da função da Vercel como middleware do servidor
   de desenvolvimento. O token vem de `.env.local` SEM prefixo `VITE_` (o
   `vite.config.ts` lê com `loadEnv(mode, cwd, '')`), então ele existe no
   processo do Node e nunca chega ao bundle do navegador.
   ========================================================================== */

const PREFIX = '/api/evasao/';

export function evasaoProxy(env: ProxyEnv): Plugin {
  const middleware = async (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    next: () => void,
  ) => {
    if (!req.url?.startsWith(PREFIX)) return next();

    const url = new URL(req.url, 'http://localhost');
    const rota = url.pathname.slice(PREFIX.length);
    const response = await handleEvasao(req.method ?? 'GET', rota, url.searchParams, env);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  };

  return {
    name: 'evasao-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => void middleware(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void middleware(req, res, next));
    },
  };
}
