import type { Faixa } from '../api/types';

/** Conteúdo ilustrativo para o esboço. O texto real DISPARO_MENSAGENS não está nesta API. */
const EXEMPLOS: Record<Faixa, { titulo: string; corpo: string }> = {
  CRITICA: {
    titulo: 'Estamos aqui para ajudar',
    corpo: 'Se algo está dificultando seus estudos, conte com a equipe de apoio. Abra o app e veja como podemos conversar com você.',
  },
  ALTA: {
    titulo: 'Conte com a gente nos estudos',
    corpo: 'Sua trajetória importa para nós. Se precisar de orientação, a equipe de apoio está disponível no app.',
  },
  MEDIA: {
    titulo: 'Como estão seus estudos?',
    corpo: 'Quer conversar sobre sua experiência no curso? A equipe de apoio está disponível para ouvir você pelo app.',
  },
};

export function mensagemPushDemo(faixa: Faixa) {
  return EXEMPLOS[faixa];
}
