import { useCallback, useSyncExternalStore } from 'react';

/* ==========================================================================
   Roteador por hash, com query string
   --------------------------------------------------------------------------
   No molde do Sucesso ao Aluno: o botão voltar funciona, toda tela é
   compartilhável por link, e o app é servido como bundle estático (nenhuma
   regra de reescrita no servidor). A diferença é a QUERY: os filtros da lista
   vivem na URL, então um link leva o filtro junto.

     #/monitoramento
     #/alunos?faixa=CRITICA,ALTA&curso=258&data=2026-09-27&pagina=2
     #/alunos/2640797
     #/mensagens?data=2026-09-27&faixa=CRITICA&status=FALHA
     #/como-funciona
     #/relatorio/alunos?faixa=CRITICA     (prévia de PDF, fora do shell)

   Rota desconhecida cai em `#/monitoramento`. Uma URL sem hash é normalizada
   com `replace`, para o primeiro item do histórico ser uma rota real.
   ========================================================================== */

export type RouteName = 'monitoramento' | 'alunos' | 'aluno' | 'mensagens' | 'como-funciona' | 'relatorio';
export type Query = Record<string, string>;
export type QueryInput = Record<string, string | number | readonly string[] | undefined | null>;

export interface Route {
  name: RouteName;
  param?: string;
  query: Query;
}

const PADRAO: RouteName = 'monitoramento';

function parseHash(hash: string): { route: Route; known: boolean } {
  const raw = hash.replace(/^#\/?/, '');
  const cut = raw.indexOf('?');
  const path = cut >= 0 ? raw.slice(0, cut) : raw;
  const qs = cut >= 0 ? raw.slice(cut + 1) : '';

  const query: Query = {};
  new URLSearchParams(qs).forEach((value, key) => {
    if (value !== '') query[key] = value;
  });

  const parts = path
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });

  if (parts[0] === 'alunos' && parts[1]) return { route: { name: 'aluno', param: parts[1], query }, known: true };
  if (parts[0] === 'alunos') return { route: { name: 'alunos', query }, known: true };
  if (parts[0] === 'mensagens') return { route: { name: 'mensagens', query }, known: true };
  if (parts[0] === 'como-funciona') return { route: { name: 'como-funciona', query }, known: true };
  if (parts[0] === 'relatorio' && parts[1]) return { route: { name: 'relatorio', param: parts[1], query }, known: true };
  if (parts[0] === 'monitoramento') return { route: { name: 'monitoramento', query }, known: true };
  return { route: { name: PADRAO, query: {} }, known: false };
}

/** Vírgula fica legível na URL (`faixa=CRITICA,ALTA`); o resto é codificado. */
function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%2C/gi, ',');
}

export function buildHash(name: RouteName, param?: string, query?: QueryInput): string {
  const path =
    name === 'aluno'
      ? `#/alunos/${encodeURIComponent(param ?? '')}`
      : name === 'relatorio'
        ? `#/relatorio/${encodeURIComponent(param ?? '')}`
        : `#/${name}`;

  const pairs: string[] = [];
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    const text = Array.isArray(value) ? value.join(',') : String(value);
    if (text === '') continue;
    pairs.push(`${encodeURIComponent(key)}=${encodeValue(text)}`);
  }
  return pairs.length ? `${path}?${pairs.join('&')}` : path;
}

/* -- Store ---------------------------------------------------------------- */

const listeners = new Set<() => void>();
let snapshotHash: string | null = null;
let snapshot: Route = { name: PADRAO, query: {} };

function read(): Route {
  const hash = window.location.hash;
  if (hash !== snapshotHash) {
    snapshotHash = hash;
    snapshot = parseHash(hash).route;
  }
  return snapshot;
}

function notify() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) window.addEventListener('hashchange', notify);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) window.removeEventListener('hashchange', notify);
  };
}

function replaceHash(hash: string) {
  window.history.replaceState(window.history.state, '', hash);
  notify();
}

// Normaliza na carga: sem hash, ou rota desconhecida → `#/monitoramento`.
if (typeof window !== 'undefined') {
  const { known } = parseHash(window.location.hash);
  if (!window.location.hash || !known) {
    window.history.replaceState(window.history.state, '', buildHash(PADRAO));
  }
}

/* -- Hook ----------------------------------------------------------------- */

export function useRoute() {
  const route = useSyncExternalStore(subscribe, read, read);

  const navigate = useCallback((name: RouteName, param?: string, query?: QueryInput) => {
    const hash = buildHash(name, param, query);
    if (hash !== window.location.hash) window.location.hash = hash;
  }, []);

  const replace = useCallback((name: RouteName, param?: string, query?: QueryInput) => {
    const hash = buildHash(name, param, query);
    if (hash !== window.location.hash) replaceHash(hash);
  }, []);

  return { route, navigate, replace };
}

/* -- Query helpers -------------------------------------------------------- */

/** `CRITICA,ALTA` → `['CRITICA', 'ALTA']`. */
export function listParam(query: Query, key: string): string[] {
  return (query[key] ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Página da query, ≥ 1. */
export function pageParam(query: Query): number {
  const n = Number(query.pagina);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
