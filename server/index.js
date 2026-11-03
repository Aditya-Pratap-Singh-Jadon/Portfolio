import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore } from './store.js'
import { createApp } from './app.js'
const root = fileURLToPath(new URL('..', import.meta.url))
const store = await createStore(resolve(root, process.env.DATA_DIR || '.data'))
const app = createApp({ store, env: process.env })
const dist = resolve(root, 'dist')
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' }
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname
    if (path.startsWith('/api/')) {
      const chunks = []; let size = 0
      for await (const chunk of req) {
        size += chunk.length
        if (size > 8 * 1024 * 1024) { res.writeHead(413); res.end('Request too large'); return }
        chunks.push(chunk)
      }
      const response = await app(new Request(`${process.env.APP_ORIGIN || 'http://127.0.0.1:5173'}${req.url}`, { method: req.method, headers: req.headers, ...(!['GET','HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}) }))
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
    let file = resolve(dist, `.${decodeURIComponent(path)}`)
    if (file !== dist && !file.startsWith(dist + sep)) { res.writeHead(404); res.end(); return }
    if (!extname(file)) file = resolve(dist, 'index.html')
    const data = await readFile(file)
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    }); res.end(req.method === 'HEAD' ? undefined : data)
  } catch { res.writeHead(404); res.end('Not found. Run npm run build before serving the production site.') }
})
server.listen(Number(process.env.PORT || 5174), '127.0.0.1', () => console.log(`Portfolio API: http://localhost:${process.env.PORT || 5174}`))
const timer = setInterval(() => {
  const s = store.readPublished()
  if (process.env.GITHUB_TOKEN && s.published.sync.enabled && Date.now() - Date.parse(s.sync.lastAttempt || '1970-01-01') >= s.published.sync.intervalHours * 3600000) app.syncPins()
}, 60000)
timer.unref()
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => { clearInterval(timer); server.close(() => process.exit()) })
