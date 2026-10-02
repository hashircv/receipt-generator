import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
    manifest: {
      name: 'Receipt Studio', short_name: 'Receipts', description: 'Offline receipt and invoice generator',
      theme_color: '#4f46e5', background_color: '#f8fafc', display: 'standalone', start_url: '/',
      icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
    },
    workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], cleanupOutdatedCaches: true }
  })],
  build: { chunkSizeWarningLimit: 900 }
})
