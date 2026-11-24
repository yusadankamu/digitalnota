import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Jangan inline aset sebagai data: URI, supaya CSP font-src 'self' tetap ketat.
  build: { assetsInlineLimit: 0 },
})
