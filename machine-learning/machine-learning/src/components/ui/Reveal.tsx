import { useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useInView } from 'motion/react';
import type { Variants } from 'motion/react';
import { emphasis } from '../../lib/motion';
import { useReducedMotion } from '../../lib/reactive';

/* ==========================================================================
   Reveal — a entrada por rolagem
   --------------------------------------------------------------------------
   Um painel de gestão é lido de cima para baixo uma vez por dia, e a rolagem é
   o único momento em que a página tem a atenção inteira de quem lê. Animar a
   chegada de cada dobra usa esse momento para dizer onde termina um assunto e
   começa o próximo — o movimento aqui é PONTUAÇÃO, não enfeite.

   Cinco regras que este arquivo impõe:

     1. UMA VEZ SÓ. `once: true`. Um bloco que re-anima toda vez que volta ao
        viewport transforma rolar para conferir um número em um piscar de
        conteúdo, e é o motivo de metade dos sites com scroll-animation serem
        cansativos depois do primeiro minuto.
     2. DISPARA ANTES DE APARECER. A margem negativa de −12% faz o bloco chegar
        já em movimento em vez de começar a se mover depois de estar visível.
        Animação que começa quando o elemento já está parado na tela lê como
        atraso de carregamento.
     3. DESLOCAMENTO CURTO. 14px. Acima de ~24px o texto "voa", e um relatório
        que voa não é um relatório sério.
     4. REDUCED MOTION DESLIGA DE VERDADE. Não é uma duração menor: o conteúdo
        nasce na posição final, com opacidade 1. Quem pediu menos movimento não
        precisa de movimento rápido, precisa de nenhum.
     5. A IMPRESSÃO NÃO TEM VIEWPORT. Cada nó leva `data-reveal`, e `@media
        print` força opacidade 1 e transform nenhuma. Sem isso, o relatório
        executivo sai com as dobras em branco — porque numa impressão nada
        entra em viewport nenhum, e a animação que nunca dispara deixa o
        conteúdo invisível para sempre. É o tipo de defeito que ninguém
        descobre antes da reunião.
   ========================================================================== */

const VIEWPORT = { once: true, margin: '-12% 0px -8% 0px' } as const;

export function Reveal({
  children,
  delay = 0,
  y = 14,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.52, ease: emphasis, delay }}
    >
      {children}
    </motion.div>
  );
}

/* -- Lista escalonada ------------------------------------------------------
   O escalonamento é o que faz uma fileira de quatro indicadores ser lida como
   UMA fileira em vez de quatro cartões que apareceram juntos por acaso. 60ms
   entre irmãos: o suficiente para o olho perceber a ordem, curto o bastante
   para a fileira inteira estar pronta em menos de um terço de segundo. */

const groupVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: emphasis } },
};

export function RevealGroup({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'section';
}) {
  const reduced = useReducedMotion();
  const Motion = motion[Tag];

  if (reduced) return <Tag className={className}>{children}</Tag>;

  return (
    <Motion
      data-reveal=""
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
    >
      {children}
    </Motion>
  );
}

export function RevealItem({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li';
}) {
  const reduced = useReducedMotion();
  const Motion = motion[Tag];

  if (reduced) return <Tag className={className}>{children}</Tag>;

  return (
    <Motion data-reveal="" className={className} variants={itemVariants}>
      {children}
    </Motion>
  );
}

/* -- O gatilho, para quem anima por conta própria --------------------------
   O calibre de vidro não anima opacidade: ele enche. O count-up não anima
   posição: ele conta. Nenhum dos dois cabe num wrapper que faz fade — os dois
   precisam apenas saber QUANDO começar, e é isto que este hook entrega.

   Com `prefers-reduced-motion`, devolve `true` de imediato: o valor final já
   está lá desde o primeiro quadro. */

export function useEnter<T extends Element = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, VIEWPORT);
  return { ref, entered: reduced || inView, reduced };
}
