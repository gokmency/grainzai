import path from 'path';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BASE = '/grainz3d';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    {
      name: 'serve-public-under-base',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith(`${BASE}/`) && req.method === 'GET') {
            const filePath = path.join(
              __dirname,
              'public',
              req.url.slice(BASE.length).replace(/^\//, ''),
            );
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.setHeader('Content-Type', getMime(filePath));
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,

    outDir: 'dist/grainz3d',
    emptyOutDir: true,

    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
        },
      },
    },

    sourcemap: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  server: {
    port: 3000,
    open: BASE,
  },
  optimizeDeps: {
    exclude: ['@zip.js/zip.js', 'three', 'three-stdlib'],
  },
});

function getMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mime: Record<string, string> = {
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  return mime[ext] ?? 'application/octet-stream';
}
