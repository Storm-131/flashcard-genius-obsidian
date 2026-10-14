import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  server: {
    // host: '0.0.0.0',
    host: 'localhost',
    port: parseInt(process.env.PORT || '8443'),
    strictPort: true,
  },
  preview: {
    // host: '0.0.0.0',
    host: 'localhost',
    port: parseInt(process.env.PORT || '8443'),
  },
})
