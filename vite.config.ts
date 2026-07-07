import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      manifest: {
        name: 'KOHARD Uren',
        short_name: 'KOHARD',
        description: 'Облік робочих годин KOHARD',
        theme_color: '#161616',
        background_color: '#161616',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Библиотеки экспорта (PDF/XLSX) нужны только админу — не кэшируем их на телефонах работников
        globIgnores: ['**/pdfmake-*.js', '**/vfs_fonts-*.js', '**/xlsx-*.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Firestore/Storage/Auth ходят своими SDK — SW их не трогает
        navigateFallbackDenylist: [/^\/__/],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
