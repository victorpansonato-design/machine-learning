import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { popoverVariants, press } from '../../lib/motion';
import { useRoute } from '../../lib/router';
import type { Query } from '../../lib/router';
import { montarRelatorio } from '../../export/relatorios';
import type { TipoRelatorio } from '../../export/relatorios';

/* ==========================================================================
   ExportMenu — "Exportar" abre duas saídas do MESMO relatório
   --------------------------------------------------------------------------
     · Planilha Excel: gerada aqui, com todas as linhas do filtro atual
       (percorre todas as páginas), e baixada direto.
     · PDF: abre a prévia da folha (`#/relatorio/<tipo>`), de onde se imprime
       ou salva em PDF — o que se vê é o que sai.

   O gerador da planilha (exceljs) só é carregado no primeiro clique.
   ========================================================================== */

export function ExportMenu({
  tipo,
  query,
  label = 'Exportar',
  disabled = false,
  onErro,
}: {
  tipo: TipoRelatorio;
  query: Query;
  label?: string;
  disabled?: boolean;
  onErro?: (mensagem: string | null) => void;
}) {
  const { navigate } = useRoute();
  const [open, setOpen] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const planilha = async () => {
    setOpen(false);
    onErro?.(null);
    setProgresso('Preparando planilha…');
    try {
      const [rel, { baixarXlsx }] = await Promise.all([
        montarRelatorio(tipo, undefined, query, undefined, setProgresso),
        import('../../export/xlsx'),
      ]);
      setProgresso('Montando a planilha…');
      await baixarXlsx(rel);
    } catch (err) {
      onErro?.(err instanceof Error ? err.message : 'Não foi possível gerar a planilha.');
    } finally {
      setProgresso(null);
    }
  };

  const pdf = () => {
    setOpen(false);
    navigate('relatorio', tipo, query);
  };

  const ocupado = progresso !== null;

  return (
    <div ref={wrap} className="relative">
      <Button
        variant="secondary"
        size="md"
        icon={<Download className="h-4 w-4" />}
        iconRight={ocupado ? undefined : <ChevronDown className="h-3.5 w-3.5 text-ink-3" />}
        disabled={disabled || ocupado}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {progresso ?? label}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute right-0 z-50 mt-2 w-[268px] origin-top-right overflow-hidden rounded-xl bg-surface p-1.5 shadow-overlay"
          >
            <Opcao
              icon={<FileSpreadsheet className="h-4 w-4" />}
              titulo="Planilha Excel"
              detalhe="Formatada, com todas as linhas do filtro."
              onClick={() => void planilha()}
            />
            <Opcao
              icon={<FileText className="h-4 w-4" />}
              titulo="PDF"
              detalhe="Abre a prévia do documento para salvar."
              onClick={pdf}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Opcao({
  icon,
  titulo,
  detalhe,
  onClick,
}: {
  icon: React.ReactNode;
  titulo: string;
  detalhe: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      role="menuitem"
      whileTap={press}
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
    >
      <span className="mt-0.5 text-ink-3">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{titulo}</span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{detalhe}</span>
      </span>
    </motion.button>
  );
}
