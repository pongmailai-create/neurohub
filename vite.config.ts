import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // In the packaged app the renderer is loaded via file:// — assets must use
  // relative paths ('./'). The dev server still uses '/'.
  base: command === 'build' ? './' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared'),
    },
  },
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron-store'],
            },
          },
        },
      },
      {
        // Preload script
        entry: 'electron/preload.ts',
        onstart(args) {
          // Reload the renderer when the preload rebuilds
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              // ESM preloads must use the .mjs extension to be loaded by Electron.
              output: { entryFileNames: '[name].mjs' },
            },
          },
        },
      },
      {
        // Preload, внедряемый в КАЖДЫЙ встроенный сайт (анти-детект).
        // Собираем как CommonJS .cjs — самый надёжный формат для session preload.
        entry: 'electron/webview-preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: { format: 'cjs', entryFileNames: '[name].cjs' },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
}));
