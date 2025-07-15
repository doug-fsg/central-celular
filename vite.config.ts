import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['central.manytalks.com.br', 'localhost', '127.0.0.1'], 
    proxy: {
      '/whatsapp-api': {
        target: 'http://173.249.22.227:31000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/whatsapp-api/, '')
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173
  }
})
