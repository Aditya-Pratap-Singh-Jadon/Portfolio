import test from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { portfolio } from '../src/data/portfolio.js'

test('production HTTP serves root, routes and assets while keeping private files outside dist', async () => {
  const tempRoot = resolve('tmp')
  await mkdir(tempRoot, { recursive: true })
  const fixture = await mkdtemp(join(tempRoot, 'http-test-'))
  assert(fixture.startsWith(tempRoot + sep))
  let child
  try {
    for (const path of ['server', 'shared', 'src/data']) {
      await mkdir(resolve(fixture, path, '..'), { recursive: true })
      await cp(resolve(path), join(fixture, path), { recursive: true })
    }
    await mkdir(join(fixture, 'dist/assets'), { recursive: true })
    await writeFile(join(fixture, 'package.json'), '{"type":"module"}')
    await writeFile(join(fixture, 'dist/index.html'), '<h1>Fixture portfolio</h1>')
    await writeFile(join(fixture, 'dist/assets/app.js'), 'console.log("fixture")')
    await mkdir(join(fixture,'dist/playcanvas/mi05/assets'),{recursive:true})
    await writeFile(join(fixture,'dist/playcanvas/mi05/assets/shared.glb'),'fixture runtime')
    await writeFile(join(fixture, 'secret.txt'), 'Must stay private')
    const reservation = createServer()
    reservation.listen(0, '127.0.0.1')
    await once(reservation, 'listening')
    const port = reservation.address().port
    await new Promise((done, reject) => reservation.close(error => error ? reject(error) : done()))
    child = spawn(process.execPath, [join(fixture, 'server/index.js')], {
      cwd: fixture, windowsHide: true,
      env: { ...process.env, PORT: String(port), APP_ORIGIN: `http://127.0.0.1:${port}`, DATA_DIR: '.data', GITHUB_TOKEN: '', GITHUB_CLIENT_SECRET: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', data => { output += data })
    child.stderr.on('data', data => { output += data })
    await new Promise((done, reject) => {
      const timeout = setTimeout(() => reject(new Error('HTTP server did not start: ' + output)), 10000)
      child.once('error', error => { clearTimeout(timeout); reject(error) })
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`HTTP server exited ${code}: ${output}`)) })
      child.stdout.once('data', () => { clearTimeout(timeout); done() })
    })
    const request = (path, options) => fetch(`http://127.0.0.1:${port}${path}`, options)
    for (const path of ['/', '/quick', '/admin']) {
      const response = await request(path)
      assert.equal(response.status, 200, path)
      assert.equal(await response.text(), '<h1>Fixture portfolio</h1>')
    }
    const head = await request('/', { method: 'HEAD' })
    assert.equal(head.status, 200)
    assert.equal(await head.text(), '')
    const asset = await request('/assets/app.js')
    assert.equal(asset.status, 200)
    assert.equal(asset.headers.get('content-type'), 'text/javascript')
    const shared=await request('/playcanvas/mi05/assets/shared.glb?t=0123456789abcdef0123456789abcdef')
    assert.equal(shared.headers.get('cache-control'),'public, max-age=31536000, immutable')
    assert.equal((await request('/playcanvas/mi05/assets/shared.glb')).headers.get('cache-control'),'no-cache')
    assert.equal((await request('/%2e%2e%2fsecret.txt')).status, 404)
    assert.equal((await request('/', { method: 'POST' })).status, 405)
    assert.equal((await request('/api/content')).status, 200)
    const resume = await request('/api/resume', { redirect: 'manual' })
    assert.equal(resume.status, 302)
    assert.equal(resume.headers.get('location'), portfolio.resume.url)
  } finally {
    if (child && child.exitCode === null) {
      const exited = once(child, 'exit')
      child.kill()
      await exited
    }
    await rm(fixture, { recursive: true, force: true })
  }
})
