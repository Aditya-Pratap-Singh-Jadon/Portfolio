import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compressDist } from './scripts/compress-dist.js'

let outputDir

export default defineConfig({
  plugins: [react(), {
    name: 'compress-production-assets',
    apply: 'build',
    configResolved(config) { outputDir = config.build.outDir },
    async closeBundle() { await compressDist(outputDir) },
  }],
  server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:5174' } },
})
