import { defineConfig } from '@tanstack/start/config'

export default defineConfig({
  tsr: {
    appDirectory: './app',
  },
  routers: {
    client: {
      entry: './app/client.tsx',
    },
    ssr: {
      entry: './app/ssr.tsx',
    },
    api: {
      entry: './app/api.ts',
    },
  },
})
