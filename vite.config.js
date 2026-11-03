import { defineConfig } from 'vite';

// GitHub Pages serves the site from /the-quiet-path/.
export default defineConfig({
  base: '/the-quiet-path/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
