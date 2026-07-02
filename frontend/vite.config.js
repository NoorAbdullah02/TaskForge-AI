import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
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
          if (id.includes('three') || id.includes('@react-three')) {
            return 'chunk-three';
          }
          // Framer Motion — lazy loaded
          if (id.includes('framer-motion')) {
            return 'chunk-framer';
          }
          // GSAP — lazy loaded
          if (id.includes('gsap')) {
            return 'chunk-gsap';
          }
          // Recharts
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'chunk-charts';
          }
          // Core React runtime
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'chunk-react';
          }
          // Router
          if (id.includes('react-router-dom') || id.includes('react-router/')) {
            return 'chunk-router';
          }
          // Everything else in node_modules
          if (id.includes('node_modules')) {
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