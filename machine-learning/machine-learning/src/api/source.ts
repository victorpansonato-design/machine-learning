import type {
  ConsultarParams,
  DataCorte,
  DatasParams,
  HistoricoAluno,
  ListarParams,
  PaginaAlunos,
  ResumoCurso,
  ResumoParams,
  Saude,
} from './types';
import { apiGet } from './client';
import { mockSource } from './mock';

/* ==========================================================================
   A camada de dados — o ponto em que o TI "conecta com o backend"
   --------------------------------------------------------------------------
   Duas fontes, um contrato. As telas só conhecem `source`; trocar de fonte é
   trocar `VITE_DATA_SOURCE` (`api` ou `mock`, padrão `mock`). Nenhuma tela
   sabe de qual das duas o dado veio — só a tag "Dados fictícios" no header.
   ========================================================================== */

export interface DataSource {
  kind: 'api' | 'mock';
  saude(signal?: AbortSignal): Promise<Saude>;
  datas(p: DatasParams, signal?: AbortSignal): Promise<DataCorte[]>;
  resumo(p: ResumoParams, signal?: AbortSignal): Promise<ResumoCurso[]>;
  listar(p: ListarParams, signal?: AbortSignal): Promise<PaginaAlunos>;
  consultar(p: ConsultarParams, signal?: AbortSignal): Promise<HistoricoAluno>;
}

export const apiSource: DataSource = {
  kind: 'api',
  saude: (signal) => apiGet<Saude>('fila/saude', {}, signal),
  datas: (p, signal) => apiGet<DataCorte[]>('fila/datas', { limite: p.limite }, signal),
  resumo: (p, signal) => apiGet<ResumoCurso[]>('fila/resumo', { curso: p.curso, data: p.data }, signal),
  listar: (p, signal) =>
    apiGet<PaginaAlunos>(
      'alunos/listar',
      { curso: p.curso, faixa: p.faixa, data: p.data, pagina: p.pagina, limite: p.limite },
      signal,
    ),
  consultar: (p, signal) =>
    apiGet<HistoricoAluno>('alunos/consultar', { ra: p.ra, dias: p.dias }, signal),
};

export const source: DataSource = import.meta.env.VITE_DATA_SOURCE === 'api' ? apiSource : mockSource;
