import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '',
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'client/src') },
      { find: '@shared', replacement: path.resolve(__dirname, 'shared') },
      { find: '@assets', replacement: path.resolve(__dirname, 'client/src/assets') }
    ]
  },
  optimizeDeps: {
    exclude: ['@radix-ui/react-tooltip']
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: path.resolve(__dirname, 'client/index.html')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  }
});