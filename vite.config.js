import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Capacitor serves from the local filesystem, not a web server.
  // Relative paths ensure assets resolve correctly on Android.
  base: './',
})
