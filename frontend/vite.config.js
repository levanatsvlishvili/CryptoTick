import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      './runtimeConfig': './runtimeConfig.browser',
    },
  },
  optimizeDeps: {
    include: ['tslib', 'aws-amplify', '@aws-amplify/ui-react'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})