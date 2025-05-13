import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/whatsapp-api': {
        target: 'http://173.249.22.227:31000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/whatsapp-api/, '')
      }
    }
  }
})
