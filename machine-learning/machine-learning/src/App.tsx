import { useEffect, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import type { NavKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { pageVariants } from './lib/motion';
import { useRoute } from './lib/router';
import { MonitoramentoView } from './views/MonitoramentoView';
import { AlunosView } from './views/AlunosView';
import { AlunoView } from './views/AlunoView';
import { MensagensView } from './views/MensagensView';
import { ComoFuncionaView } from './views/ComoFuncionaView';
import { RelatorioView } from './views/RelatorioView';
import './brand.css';

/* ==========================================================================
   Shell — Sidebar + Header + a tela da rota (DESIGN_SYSTEM §9)
   --------------------------------------------------------------------------
   O shell é dono do roteamento. As telas leem a rota (`useRoute`) e escrevem
   os filtros nela; nenhuma guarda estado que um link não reproduza.

   A prévia de relatório (`#/relatorio/...`) é a exceção: é uma FOLHA, não uma
   tela do sistema, então aparece sem sidebar e sem header — o que se vê é o
   que sai no PDF.
   ========================================================================== */

const LG = '(min-width: 1024px)';
const subscribeLg = (fn: () => void) => {
  const mql = window.matchMedia(LG);
  mql.addEventListener('change', fn);
  return () => mql.removeEventListener('change', fn);
};
const readLg = () => window.matchMedia(LG).matches;

export default function App() {
  const { route, navigate } = useRoute();
  // Sem botão de recolher: abaixo de `lg` a sidebar é o trilho de ícones.
  const largo = useSyncExternalStore(subscribeLg, readLg, () => true);

  // Tela nova começa do topo; trocar só a query (filtro, página) não rola.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.name, route.param]);

  if (route.name === 'relatorio') return <RelatorioView />;

  const active: NavKey = route.name === 'aluno' ? 'alunos' : route.name;

  let view;
  switch (route.name) {
    case 'alunos':
      view = <AlunosView />;
      break;
    case 'aluno':
      view = <AlunoView />;
      break;
    case 'mensagens':
      view = <MensagensView />;
      break;
    case 'como-funciona':
      view = <ComoFuncionaView />;
      break;
    default:
      view = <MonitoramentoView />;
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar active={active} collapsed={!largo} onNavigate={(name) => navigate(name)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onConsultar={(ra) => navigate('aluno', ra)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <AnimatePresence mode="wait">
              <motion.div key={route.name} variants={pageVariants} initial="initial" animate="animate" exit="exit">
                {view}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
