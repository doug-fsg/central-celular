import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'favicon.svg', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
      manifest: {
        name: 'Aprisco',
        short_name: 'Aprisco',
        description: 'Sistema de gestão de células',
        theme_color: '#7928fa',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        // Preferência ao abrir pelo ícone; iOS às vezes ignora e usa "/" — o router redireciona em modo instalado.
        start_url: '/login?pwa=1',
        // Use apenas arquivos que existem em /public. Referências quebradas a pwa-*.png fazem
        // Android/iOS mostrarem só o theme_color (ícone roxo sem arte).
        icons: [
          {
            src: 'maskable-icon-512x512.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'favicon.png',
            sizes: '48x48',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'favicon.svg',
            sizes: '64x64',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  root: process.cwd(),
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
