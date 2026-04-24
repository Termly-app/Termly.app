import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ShuleSoft',
        short_name: 'ShuleSoft',
        description: 'The School Management System for modern Kenya.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0C0E0D',
        theme_color: '#4f46e5',
        orientation: 'portrait',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/assets/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Precache all built assets
        globPatterns: ['**/*.{js,css,html,ico,woff2}'],
        // Runtime caching for Supabase API calls
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async', 'papaparse'],
          supabase: ['@supabase/supabase-js', 'dexie'],
        }
      }
    },
    chunkSizeWarningLimit: 800
  }
})
