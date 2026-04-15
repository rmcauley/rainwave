import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';
import sassDts from 'vite-plugin-sass-dts';

const backendOrigin = process.env.VITE_BACKEND_ORIGIN ?? 'http://localhost';

export default defineConfig({
  plugins: [
    checker({
      stylelint: {
        lintCommand: 'stylelint "./src/**/*.scss"',
      },
    }),
    sassDts({
      enabledMode: ['development', 'production'],
    }),
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
});
