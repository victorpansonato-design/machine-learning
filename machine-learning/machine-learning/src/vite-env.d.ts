/// <reference types="vite/client" />

/* Variáveis que o bundle do navegador pode ler. Tudo que começa com `VITE_` é
   PÚBLICO — o token da API (`EVASAO_API_TOKEN`) não tem o prefixo de propósito
   e nunca aparece aqui. */
interface ImportMetaEnv {
  /** `api` = API real via proxy; qualquer outro valor (ou ausente) = `mock`. */
  readonly VITE_DATA_SOURCE?: string;
  /** Base que o front chama. Padrão: `/api/evasao` (o proxy deste repositório). */
  readonly VITE_API_BASE?: string;
  /** `true` = o mock simula o job atrasado (última fila com dias de atraso). */
  readonly VITE_MOCK_FILA_ATRASADA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
