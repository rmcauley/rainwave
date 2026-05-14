import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';

const tsconfigPath = './tsconfig.json';

export default defineConfig({
  plugins: [
    checker({
      typescript: {
        tsconfigPath,
      },
    }),
  ],
  build: {
    outDir: 'dist',
  },
});
