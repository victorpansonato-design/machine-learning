import type { MouseEvent } from 'react';
import { motion } from 'motion/react';
import { BookOpen, GraduationCap, LayoutDashboard, Moon, Send, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BrandLockup } from '../brand/AnchietaLogo';
import { Avatar } from '../ui/Badges';
import { press, spring } from '../../lib/motion';
import { initialsOf } from '../../lib/format';
import { useTheme } from '../../lib/theme';
import type { RouteName } from '../../lib/router';
import { USUARIO } from '../../config';

/* ==========================================================================
   Sidebar — a do Sucesso ao Aluno (DESIGN_SYSTEM §9), com quatro itens e nada
   mais. Sem seletor de função, sem badge de contagem: o único número que muda
   o que se faz a seguir (a saúde da fila) mora no header.

   Sem botão de recolher: em tela larga ela fica sempre aberta; abaixo de `lg`
   vira o trilho de ícones (68px) sozinha, porque é a largura que cabe.

   A zona da marca tem a mesma altura do header (74px), para a linha do topo
   fechar.
   ========================================================================== */

export type NavKey = 'monitoramento' | 'alunos' | 'mensagens' | 'como-funciona';

const ITEMS: { key: NavKey; label: string; icon: LucideIcon }[] = [
  { key: 'monitoramento', label: 'Monitoramento', icon: LayoutDashboard },
  { key: 'alunos', label: 'Alunos', icon: GraduationCap },
  { key: 'mensagens', label: 'Mensagens enviadas', icon: Send },
  { key: 'como-funciona', label: 'Como funciona', icon: BookOpen },
];

export function Sidebar({
  active,
  collapsed,
  onNavigate,
}: {
  active: NavKey;
  collapsed: boolean;
  onNavigate: (route: RouteName) => void;
}) {
  const { dark, toggleTheme } = useTheme();

  const onTheme = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 244 }}
      transition={spring}
      className="sticky top-0 z-30 flex h-screen shrink-0 flex-col bg-surface select-none print:hidden"
    >
      <div className="flex h-[74px] shrink-0 items-center px-4">
        {collapsed ? <BrandLockup compact unit="Risco de Evasão" /> : <BrandLockup unit="Risco de Evasão" />}
      </div>

      <nav className="scroll-slim min-h-0 flex-1 overflow-y-auto px-2.5 py-2" aria-label="Navegação principal">
        <ul className="space-y-0.5">
          {ITEMS.map(({ key, label, icon: Icon }) => {
            const on = key === active;
            return (
              <li key={key}>
                <motion.button
                  whileTap={press}
                  onClick={() => onNavigate(key)}
                  aria-current={on ? 'page' : undefined}
                  title={collapsed ? label : undefined}
                  className={[
                    'relative flex w-full items-center gap-2.5 rounded-md py-2 text-left transition-colors',
                    collapsed ? 'justify-center' : 'px-2.5',
                    on ? 'text-on-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                  ].join(' ')}
                >
                  {on && (
                    <motion.span
                      layoutId="sidebar-active"
                      transition={spring}
                      className="absolute inset-0 rounded-md bg-brand"
                    />
                  )}
                  <Icon className={`relative z-10 h-4 w-4 shrink-0 ${on ? 'text-on-brand' : 'text-ink-4'}`} />
                  {!collapsed && (
                    <span
                      className={`relative z-10 min-w-0 flex-1 truncate text-[13px] ${on ? 'font-semibold' : ''}`}
                    >
                      {label}
                    </span>
                  )}
                </motion.button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-2 p-2.5">
        {/* Quem está usando */}
        <div
          className={['flex items-center gap-2.5 rounded-md py-2', collapsed ? 'justify-center' : 'px-2'].join(' ')}
          title={collapsed ? `${USUARIO.nome} · ${USUARIO.equipe}` : undefined}
        >
          <Avatar initials={initialsOf(USUARIO.nome)} size="md" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{USUARIO.nome}</p>
              <p className="truncate text-[11px] font-medium text-ink-3">{USUARIO.equipe}</p>
            </div>
          )}
        </div>

        <motion.button
          whileTap={press}
          onClick={onTheme}
          aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
          title={collapsed ? (dark ? 'Claro' : 'Escuro') : undefined}
          className={[
            'flex h-8 items-center justify-center gap-1.5 rounded-full bg-surface-2 text-[12px] font-medium text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink',
            collapsed ? 'mx-auto w-8' : 'w-full',
          ].join(' ')}
        >
          {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {!collapsed && (dark ? 'Claro' : 'Escuro')}
        </motion.button>
      </div>
    </motion.aside>
  );
}
