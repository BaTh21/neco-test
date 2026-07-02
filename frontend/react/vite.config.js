import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: '/',

    server: {
      port: 5173,
      proxy: {
        '/hosting-api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});