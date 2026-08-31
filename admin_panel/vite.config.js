import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';

const tsconfigPath = './tsconfig.json';

export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: {
        tsconfigPath: tsconfigPath,
      },
    }),
  ],
  build: {
    outDir: 'dist',
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
});
