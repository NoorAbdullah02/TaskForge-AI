import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // or vue(), svelte(), etc.
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-animation': ['framer-motion', 'gsap'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['axios', 'zustand']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})