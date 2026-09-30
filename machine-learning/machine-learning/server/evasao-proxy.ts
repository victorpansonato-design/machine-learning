/* ==========================================================================
   Proxy da API de evasão — o único lugar que conhece o token
   --------------------------------------------------------------------------
   Por que existe, em três fatos verificados em 29/09/2026:

     1. O TOKEN NÃO PODE IR PARA O NAVEGADOR. O COMO_USAR do TI é explícito:
        "não o coloque em página web, em código que roda no navegador". Tudo o
        que o Vite embute no bundle (variáveis `VITE_*`) é público.
     2. O CORS DA API SÓ LIBERA A INTRANET E O LOCALHOST. Um preflight vindo de
        uma origem externa (ex.: *.vercel.app) volta sem
        `Access-Control-Allow-Origin` — o navegador bloqueia.
     3. A API TEM UMA ROTA QUE ENVIA MENSAGEM DE VERDADE (`POST
        disparos/enviar`). Esta etapa do front é só leitura, então o proxy não
        deixa essa rota passar em hipótese nenhuma.

   Uma função, dois lugares: o plugin do Vite (`npm run dev`) e a função da
   Vercel (`api/evasao.ts`) chamam a MESMA `handleEvasao`. A regra de segurança
   vive uma vez só.

   Sem token configurado o proxy recusa tudo (503) — o mesmo comportamento da
   própria API do TI.
   ========================================================================== */

/** As cinco rotas de leitura documentadas pelo TI. Nada fora desta lista passa. */
export const ROTAS_PERMITIDAS = [
  'fila/saude',
  'fila/datas',
  'fila/resumo',
  'alunos/listar',
  'alunos/consultar',
] as const;

export const BASE_PADRAO = 'https://app.anchieta.br/api_evasao_grad_presencial/api';

export interface ProxyEnv {
  /** Token Bearer da API. Só no servidor — NUNCA com prefixo `VITE_`. */
  EVASAO_API_TOKEN?: string;
  /** Base da API. Padrão: produção do app-web. */
  EVASAO_API_BASE?: string;
}

const TIMEOUT_MS = 15_000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Dado pessoal de aluno: nenhum cache intermediário guarda a resposta.
      'cache-control': 'no-store',
    },
  });
}

/**
 * Recebe `rota` (ex.: `alunos/listar`) e a query string original, e devolve a
 * resposta da API com o mesmo status e o mesmo corpo — inclusive os erros no
 * formato `{"error": "..."}`, que a interface mostra como vieram.
 */
export async function handleEvasao(
  method: string,
  rota: string,
  search: URLSearchParams,
  env: ProxyEnv,
): Promise<Response> {
  if (method !== 'GET') {
    return json(405, { error: 'Este front é só leitura: o proxy aceita apenas GET.' });
  }

  const limpa = rota.replace(/^\/+|\/+$/g, '');
  if (!(ROTAS_PERMITIDAS as readonly string[]).includes(limpa)) {
    return json(404, {
      error: `Rota não permitida pelo proxy: ${limpa || '(vazia)'}. Válidas: ${ROTAS_PERMITIDAS.join(', ')}.`,
    });
  }

  const token = env.EVASAO_API_TOKEN?.trim();
  if (!token) {
    return json(503, {
      error: 'Proxy sem EVASAO_API_TOKEN. Configure a variável no servidor (nunca com prefixo VITE_).',
    });
  }

  const base = (env.EVASAO_API_BASE?.trim() || BASE_PADRAO).replace(/\/+$/, '');
  const query = search.toString();
  const url = `${base}/${limpa}${query ? `?${query}` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return json(aborted ? 504 : 502, {
      error: aborted
        ? `A API não respondeu em ${TIMEOUT_MS / 1000} s.`
        : 'Não foi possível falar com a API de evasão.',
    });
  } finally {
    clearTimeout(timer);
  }
}
