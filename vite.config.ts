import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'fs';

// Plugin para copiar arquivos estáticos necessários para a extensão
const copyStaticFiles = () => {
  return {
    name: 'copy-static-files',
    closeBundle() {
      const filesToCopy = ['manifest.json', 'content.js', 'styles.css'];
      const outDir = path.resolve(__dirname, 'dist');

      filesToCopy.forEach(file => {
        const src = path.resolve(__dirname, file);
        const dest = path.resolve(outDir, file);

        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log(`✓ Copied ${file} to dist/`);
        }
      });
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), copyStaticFiles()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
      // Garante que os assets sejam copiados corretamente
      assetsDir: 'assets',
      // Não minificar demais para facilitar debug se necessário
      minify: 'terser',
    },
  };
});
