import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { repositoryApiPlugin } from './server/repositoryApiPlugin.js'

const repositoryPath =
  process.env.IRONFORGE_REPOSITORY_PATH ??
  'E:\\BaiduSyncdisk\\Gitlab\\Dragon\\lens-mechanics'

// https://vite.dev/config/
export default defineConfig({
  plugins: [repositoryApiPlugin(repositoryPath), react()],
  test: {
    environment: 'jsdom',
    include: [
      'src/**/*.test.{ts,tsx}',
      'server/**/*.test.ts',
      'electron/**/*.test.ts',
    ],
    setupFiles: './src/test/setup.ts',
  },
})
