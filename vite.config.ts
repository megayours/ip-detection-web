import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['5173-ib8vi6hzjga59ma45jq22.e2b.app'],
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
