import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      'zustand/traditional': path.resolve(__dirname, 'src/lib/zustand-traditional.js'),
      'use-sync-external-store/shim/with-selector.js': path.resolve(__dirname, 'src/lib/use-sync-external-store-shim.js'),
      'use-sync-external-store/shim/with-selector': path.resolve(__dirname, 'src/lib/use-sync-external-store-shim.js'),
    },
  },

  plugins: [
    react({
      // babel fast-refresh stays on; JSX transform is automatic
      babel: {
        plugins: [
          // tree-shake lodash if ever imported
        ],
      },
    }),
    tailwindcss(),
  ],

  // Speed up cold-start by pre-bundling heavy deps
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'react-hot-toast',
      'lucide-react',
      'zustand',
      'socket.io-client',
      'lenis',
      'gsap',
      'recharts',
      'use-sync-external-store',
      'use-sync-external-store/shim',
      'use-sync-external-store/shim/with-selector',
      'scheduler',
      'stats.js',
    ],
    // Heavy optional deps — only bundle when actually used
    exclude: ['three', '@react-three/fiber', '@react-three/drei'],
  },

  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,   // no sourcemaps in prod = smaller + faster
    minify: 'esbuild', // esbuild is 20x faster than terser
    rollupOptions: {
      output: {
        // Fine-grained manual chunks: each heavy lib loads independently
        manualChunks(id) {
          // Three.js ecosystem — only loaded on pages that need it
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'chunk-three';
          }
          // Framer Motion — standalone, no React circular risk
          if (id.includes('node_modules/framer-motion')) {
            return 'chunk-framer';
          }
          // GSAP — standalone animation library
          if (id.includes('node_modules/gsap')) {
            return 'chunk-gsap';
          }
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'chunk-router';
          }
          // Everything else (react, react-dom, recharts, d3, zustand, etc.)
          // All kept in one chunk to prevent any circular dependency between
          // packages that import each other (e.g. recharts <-> d3 <-> react).
          if (id.includes('node_modules/')) {
            return 'chunk-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },

  server: {
    // Faster HMR — only invalidate changed modules
    hmr: { overlay: true },
    // Pre-transform pages on first request
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/Components/Header.jsx',
        './src/Pages/LoginPage.jsx',
        './src/Pages/Dashboard.jsx',
      ],
    },
  },
})