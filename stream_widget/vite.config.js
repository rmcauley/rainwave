import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cwd } from 'process';

import { checker } from 'vite-plugin-checker';

const tsconfigPath = './tsconfig.json';

export default defineConfig({
  plugins: [
    checker({
      typescript: {
        tsconfigPath: tsconfigPath,
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(cwd(), 'src/index.ts'),
    },
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(cwd(), 'src/index.ts'),
        styles: resolve(cwd(), 'src/index.scss'),
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
});
