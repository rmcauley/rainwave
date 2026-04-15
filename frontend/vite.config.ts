import { resolve } from 'path';
import { cwd } from 'process';

import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';
import sassDts from 'vite-plugin-sass-dts';

const backendOrigin = process.env.VITE_BACKEND_ORIGIN ?? 'http://localhost';

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
    sassDts(),
  ],
  server: {
    proxy: {
      '/api4': {
        target: backendOrigin,
        changeOrigin: true,
        ws: true,
      },
      '/oauth': {
        target: backendOrigin,
        changeOrigin: true,
      },
      '/pages': {
        target: backendOrigin,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        codeSplitting: false,
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
