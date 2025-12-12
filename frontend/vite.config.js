import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // This section forces Vite to correctly link React with the Analytics package
  optimizeDeps: {
    include: ['react', 'react-dom', '@vercel/analytics/react']
  }
})