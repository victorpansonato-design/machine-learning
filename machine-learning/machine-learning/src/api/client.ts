/* ==========================================================================
   Cliente HTTP da API de evasão
   --------------------------------------------------------------------------
   O front conhece UMA url: `VITE_API_BASE` (padrão `/api/evasao`, o proxy
   deste repositório). O TI pode apontá-la para outro backend sem tocar em
   tela.

   Nunca há header `Authorization` aqui. O token é problema do proxy, que roda
   no servidor — tudo o que está neste arquivo vai para o navegador.

   Todo erro vira `ApiError { status, message }`, com `message` já no texto que
   a tela mostra (tabela de erros do COMO_USAR). O mock lança o mesmo erro, então
   a tela não sabe — nem precisa saber — de qual fonte ele veio.
   ========================================================================== */

export class ApiError extends Error {
  readonly status: number;
  /** A mensagem crua da API (ou do proxy), quando veio uma. */
  readonly apiMessage?: string;

  constructor(status: number, message: string, apiMessage?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.apiMessage = apiMessage;
  }
}

const BASE = (import.meta.env.VITE_API_BASE || '/api/evasao').replace(/\/+$/, '');

export type QueryValue = string | number | boolean | undefined | null | readonly (string | number)[];

/** Arrays viram parâmetro repetido (`faixa=CRITICA&faixa=ALTA`); vazio é omitido. */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== '' && item !== undefined && item !== null) search.append(key, String(item));
      }
    } else {
      search.append(key, String(value));
    }
  }
  return search.toString();
}

/** O texto que a tela mostra para cada status (COMO_USAR, "Erros"). */
export function mensagemDeErro(status: number, apiMessage?: string): string {
  const msg = apiMessage?.trim();
  const doProxy = Boolean(msg && /proxy/i.test(msg));

  switch (status) {
    case 401:
      return 'Acesso recusado pela API (token do servidor ausente ou inválido).';
    case 404:
    case 422:
      return msg || (status === 404 ? 'Não encontrado.' : 'Parâmetro inválido.');
    case 503:
      return doProxy && msg ? msg : 'Banco indisponível. Tente de novo em alguns minutos.';
    case 502:
    case 504:
      return msg || 'Não foi possível falar com a API de evasão.';
    case 0:
      return 'Não foi possível falar com o servidor. Confira a conexão e tente de novo.';
    default:
      return msg || `A API respondeu com erro ${status}.`;
  }
}

export async function apiGet<T>(
  rota: string,
  params: Record<string, QueryValue> = {},
  signal?: AbortSignal,
): Promise<T> {
  const query = buildQuery(params);
  const url = `${BASE}/${rota}${query ? `?${query}` : ''}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, mensagemDeErro(0));
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const apiMessage =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : undefined;
    throw new ApiError(response.status, mensagemDeErro(response.status, apiMessage), apiMessage);
  }

  if (body === null) {
    throw new ApiError(
      response.status,
      `Resposta inesperada do servidor (HTTP ${response.status}, sem JSON).`,
    );
  }

  return body as T;
}

/** Normaliza qualquer coisa lançada para `ApiError`. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new ApiError(-1, message || 'Erro inesperado.');
}

export function isAbort(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}
