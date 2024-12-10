import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: "https://safetalk-backend.onrender.com",
        secure: false,
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
});