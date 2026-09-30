import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { evasaoProxy } from './server/vite-evasao-proxy';

export default defineConfig(({ mode }) => {
  // Prefixo '' = lê TODAS as variáveis do .env, inclusive as sem `VITE_`.
  // Elas ficam no processo do Node (proxy) e NÃO entram no bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Caminhos relativos: o mesmo `dist/` serve na raiz (Vercel) ou numa
    // subpasta do app-web (ex.: /evasao-ml/). O roteador é por hash, então
    // nenhuma regra de reescrita no servidor é necessária.
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      evasaoProxy({
        EVASAO_API_TOKEN: env.EVASAO_API_TOKEN,
        EVASAO_API_BASE: env.EVASAO_API_BASE,
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      target: 'es2022',
      cssTarget: 'chrome111',
      rollupOptions: {
        output: {
          // As três dependências grandes e estáveis ficam fora do chunk do app,
          // então mudar uma tela invalida só o chunk do app.
          manualChunks: {
            react: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
            motion: ['motion', 'motion/react'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
