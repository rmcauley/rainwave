import { resolve } from 'path';
import { cwd } from 'process';

import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';

const entryPath = resolve(cwd(), 'src/index.js');
const scssLoadPaths = [
  resolve(cwd(), 'src'),
  resolve(cwd(), 'src/components'),
  resolve(cwd(), 'src/components/albumArt'),
  resolve(cwd(), 'src/components/detailPane'),
  resolve(cwd(), 'src/components/detailPane/listenerDetail'),
  resolve(cwd(), 'src/components/errorModal'),
  resolve(cwd(), 'src/components/errors'),
  resolve(cwd(), 'src/components/hotkey'),
  resolve(cwd(), 'src/components/menu'),
  resolve(cwd(), 'src/components/player'),
  resolve(cwd(), 'src/components/playlist'),
  resolve(cwd(), 'src/components/ratingSpreadChart'),
  resolve(cwd(), 'src/components/ratings'),
  resolve(cwd(), 'src/components/requestsPanel'),
  resolve(cwd(), 'src/components/search'),
  resolve(cwd(), 'src/components/settings'),
  resolve(cwd(), 'src/components/timeline'),
  resolve(cwd(), 'src/components/timeline/timelineSong'),
];

export default defineConfig({
  plugins: [
    checker({
      stylelint: {
        lintCommand: 'stylelint "./src/**/*.scss"',
      },
    }),
  ],
  build: {
    lib: {
      entry: entryPath,
      name: 'Rainwave',
    },
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: entryPath,
        styles: resolve(cwd(), 'src/index.scss'),
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: scssLoadPaths,
      },
    },
  },
});
