import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// vite.config.ts — AI Studio / local dev configuration.
// The app is a pure client-side SPA: no proxy, no server, demo mode by default.
export default defineConfig({
  plugins: [react()],
  // styles.css is plain, fully self-contained CSS — pin an empty PostCSS
  // pipeline so Vite never picks up an unrelated parent-directory config.
  css: { postcss: {} },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});
