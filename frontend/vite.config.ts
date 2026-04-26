import { defineConfig } from 'vite';

const backendOrigin = process.env.VITE_BACKEND_ORIGIN ?? 'http://localhost:24000';

export default defineConfig({
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
