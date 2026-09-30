import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isAbort, toApiError } from './client';

/* ==========================================================================
   useApi — carregamento com cache, abort e reload
   --------------------------------------------------------------------------
   Sem biblioteca de data fetching. Três regras:

     · CACHE POR CHAVE, 5 MIN. A fila muda duas vezes por semana; voltar a uma
       tela não precisa de skeleton de novo.
     · ABORT ao trocar de chave ou desmontar — a resposta velha nunca pisa na
       nova (trocar de página rápido não mostra a página anterior por último).
     · `reload()` IGNORA O CACHE. É o "tentar de novo" dos estados de erro.

   `key === null` não carrega (a tela ainda não sabe o que pedir).
   ========================================================================== */

const TTL = 5 * 60_000;
const cache = new Map<string, { data: unknown; at: number }>();

function fresh<T>(key: string | null): T | undefined {
  if (key === null) return undefined;
  const hit = cache.get(key);
  return hit && Date.now() - hit.at < TTL ? (hit.data as T) : undefined;
}

/** Semeia o cache — para quem já tem a resposta de outra chave (RA canônico). */
export function primeCache(key: string, data: unknown): void {
  cache.set(key, { data, at: Date.now() });
}

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

interface Internal<T> {
  key: string | null;
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

export function useApi<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): ApiState<T> {
  const loadRef = useRef(load);
  loadRef.current = load;
  const force = useRef(false);
  const [nonce, setNonce] = useState(0);

  const [state, setState] = useState<Internal<T>>(() => {
    const hit = fresh<T>(key);
    return { key, data: hit ?? null, error: null, loading: key !== null && hit === undefined };
  });

  useEffect(() => {
    if (key === null) {
      setState({ key, data: null, error: null, loading: false });
      return;
    }

    const hit = force.current ? undefined : fresh<T>(key);
    force.current = false;
    if (hit !== undefined) {
      setState({ key, data: hit, error: null, loading: false });
      return;
    }

    const controller = new AbortController();
    setState((s) => ({ key, data: s.key === key ? s.data : null, error: null, loading: true }));

    loadRef.current(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        cache.set(key, { data, at: Date.now() });
        setState({ key, data, error: null, loading: false });
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbort(err)) return;
        setState({ key, data: null, error: toApiError(err), loading: false });
      },
    );

    return () => controller.abort();
  }, [key, nonce]);

  const reload = useCallback(() => {
    force.current = true;
    setNonce((n) => n + 1);
  }, []);

  // No render em que a chave acabou de mudar, o estado ainda é da chave
  // anterior: nunca mostrar esse dado velho como se fosse o novo.
  if (state.key !== key) {
    const hit = fresh<T>(key);
    return { data: hit ?? null, error: null, loading: key !== null && hit === undefined, reload };
  }

  return { data: state.data, error: state.error, loading: state.loading, reload };
}
