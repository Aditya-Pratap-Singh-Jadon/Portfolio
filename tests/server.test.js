import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { portfolio } from '../src/data/portfolio.js'
import { publicContent, validateContent } from '../shared/content.js'
await mkdir('tmp', { recursive: true })
const storeModule = await import('../server/store.js').catch(() => ({}))
const serverModule = await import('../server/app.js').catch(() => ({}))

test('drafts are private, stale writes fail, and revisions restore only to draft', async () => {
  assert.equal(typeof storeModule.createStore, 'function')
  const dir = await mkdtemp(join(process.cwd(), 'tmp', 'portfolio-test-'))
  try {
    const store = await storeModule.createStore(dir)
    const initial = store.read()
    const draft = structuredClone(initial.draft)
    draft.profile.name = 'Unpublished name'
    await store.save(draft, 0)
    assert.equal(store.read().published.profile.name, 'Aditya Pratap Singh Jadon')
    await assert.rejects(store.save(draft, 0), /changed/)
    await store.publish(1)
    assert.equal(store.read().published.profile.name, 'Unpublished name')
    await store.restore(0, 2)
    assert.equal(store.read().draft.profile.name, 'Aditya Pratap Singh Jadon')
    assert.equal(store.read().published.profile.name, 'Unpublished name')
    const reopened = await storeModule.createStore(dir)
    assert.equal(reopened.read().revision, 3)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
test('anonymous users cannot read or mutate admin state; missing credentials fail closed', async () => {
  assert.equal(typeof serverModule.createApp, 'function')
  const dir = await mkdtemp(join(process.cwd(), 'tmp', 'portfolio-api-'))
  try {
    const store = await storeModule.createStore(dir)
    const app = serverModule.createApp({ store, env: { APP_ORIGIN: 'http://localhost:5173' } })
    const request = (path, method = 'GET') => app(new Request(`http://localhost:5173${path}`, { method }))
    assert.equal((await request('/api/admin/content')).status, 401)
    assert.equal((await request('/api/admin/publish', 'POST')).status, 401)
    assert.equal((await request('/api/auth/login')).status, 503)
    const published = await (await request('/api/content')).json()
    assert.equal(published.content.profile.name, 'Aditya Pratap Singh Jadon')
    assert.equal(published.draft, undefined)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
test('private post text is excluded and invalid content imports fail', () => {
  const p = structuredClone(portfolio)
  p.posts = [{ id: 'private', title: 'Private', text: 'Sensitive source', summary: 'Summary', date: '2026-10-26', url: 'https://www.linkedin.com/posts/example', published: false }]
  assert.equal(publicContent(p).posts.length, 0)
  p.posts[0].published = true
  assert.equal(publicContent(p).posts[0].text, undefined)
  p.profile.linkedin = 'javascript:alert(1)'
  assert.throws(() => validateContent(p), /HTTPS/)
  p.profile.linkedin = portfolio.profile.linkedin
  p.posts.push({ ...p.posts[0], id: 'duplicate' })
  assert.throws(() => validateContent(p), /already/)
})

async function fixture(run, { owner = 42, upstream } = {}) {
  const dir = await mkdtemp(join(process.cwd(), 'tmp', 'portfolio-auth-'))
  try {
    const store = await storeModule.createStore(dir)
    const env = { APP_ORIGIN: 'http://localhost:5173', GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-secret', GITHUB_OWNER_ID: '42', GITHUB_TOKEN: 'test-only' }
    const fetcher = async (url, options) => {
      if (url.endsWith('/login/oauth/access_token')) return Response.json({ access_token: 'fake-github-access-token' })
      if (url.endsWith('/user')) return Response.json({ id: owner })
      return upstream ? upstream(url, options) : Response.json({ errors: [{ message: 'Rate limited' }] })
    }
    const app = serverModule.createApp({ store, env, fetcher })
    const request = (path, options = {}) => app(new Request(env.APP_ORIGIN + path, options))
    const login = await request('/api/auth/login')
    const state = new URL(login.headers.get('location')).searchParams.get('state')
    const callback = await request('/api/auth/callback?code=example&state=' + state, { headers: { cookie: login.headers.get('set-cookie').split(';')[0] } })
    const cookie = callback.headers.get('set-cookie')?.split(';')[0]
    const session = cookie ? await (await request('/api/session', { headers: { cookie } })).json() : {}
    const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { cookie, origin: env.APP_ORIGIN, 'x-csrf-token': session.csrf, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
    await run({ app, store, request, post, callback, cookie, state })
  } finally { await rm(dir, { recursive: true, force: true }) }
}

test('owner OAuth session enforces CSRF, stale write prevention, publication and logout', async () => {
  await fixture(async ({ store, post, request, cookie }) => {
    assert.equal((await post('/api/admin/save', {}, { origin: 'https://attacker.example' })).status, 403)
    assert.equal((await post('/api/admin/save', {}, { 'x-csrf-token': 'wrong' })).status, 403)
    const content = store.read().draft; content.profile.title = 'Updated role'
    assert.equal((await post('/api/admin/save', { content, revision: 0 })).status, 200)
    assert.equal((await post('/api/admin/save', { content, revision: 0 })).status, 409)
    assert.equal((await (await request('/api/content')).json()).content.profile.title, 'Aspiring Software Engineer')
    const publishedResponse = await post('/api/admin/publish', { revision: 1 })
    assert.equal(publishedResponse.status, 200, await publishedResponse.text())
    assert.equal((await (await request('/api/content')).json()).content.profile.title, 'Updated role')
    assert.equal((await post('/api/logout', {})).status, 200)
    assert.equal((await request('/api/admin/content', { headers: { cookie } })).status, 401)
  })
})
test('non-owner login is refused and callback state cannot be replayed', async () => {
  await fixture(async ({ callback, request, state }) => {
    assert.equal(callback.status, 403)
    assert.equal(callback.headers.get('set-cookie'), null)
    assert.equal((await request('/api/auth/callback?code=x&state=' + state, { headers: { cookie: 'portfolio_oauth=' + state } })).status, 403)
  }, { owner: 43 })
})
test('replacement resume remains private until publication', async () => {
  await fixture(async ({ store, post, request }) => {
    const content = store.read().draft
    content.resume = { name: 'new.pdf', data: 'data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK' }
    assert.equal((await post('/api/admin/save', { content, revision: 0 })).status, 200)
    const before = await request('/api/resume')
    assert.equal(before.status, 302)
    assert.equal(before.headers.get('location'), portfolio.resume.url)
    assert.equal((await (await request('/api/content')).json()).content.resumeUrl, portfolio.resume.url)
    assert.equal((await post('/api/admin/publish', { revision: 1 })).status, 200)
    const after = await request('/api/resume')
    assert.equal(after.status, 200)
    assert.equal(after.headers.get('content-type'), 'application/pdf')
    assert.match(await after.text(), /^%PDF-1.4/)
    assert.equal((await (await request('/api/content')).json()).content.resumeAvailable, true)
  })
})

test('an unpublished resume is unavailable even when a local original exists', async () => {
  const app = serverModule.createApp({
    store: { readPublished: () => ({ published: { resume: { data: '' } } }) },
    env: { APP_ORIGIN: 'http://localhost:5173' },
  })
  const response = await app(new Request('http://localhost:5173/api/resume'))
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: 'Resume is not available.' })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('external resume changes remain private until publication and PDF uploads take precedence', async () => {
  await fixture(async ({ store, post, request }) => {
    const content = store.read().draft
    content.resume = { name: 'Resume.pdf', data: '', url: 'https://drive.google.com/file/d/example/view' }
    const before = (await request('/api/resume')).headers.get('location')
    assert.equal((await post('/api/admin/save', { content, revision: 0 })).status, 200)
    assert.equal((await request('/api/resume')).headers.get('location'), before)
    assert.equal((await post('/api/admin/publish', { revision: 1 })).status, 200)
    const response = await request('/api/resume')
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('location'), 'https://drive.google.com/file/d/example/view')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    content.resume.data = 'data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK'
    await post('/api/admin/save', { content, revision: 2 })
    await post('/api/admin/publish', { revision: 3 })
    const uploaded = await request('/api/resume')
    assert.equal(uploaded.headers.get('content-type'), 'application/pdf')
    assert.equal((await (await request('/api/content')).json()).content.resumeUrl, '')
  })
})
test('pin refresh preserves last good data on failure and never imports private repositories', async () => {
  let fail = false
  const upstream = () => fail ? Response.json({ errors: [{ message: 'Limit reached' }] }) : Response.json({ data: { user: { pinnedItems: { nodes: [
    { id:'public', name:'Public project', description:'Public', url:'https://github.com/u/public', homepageUrl:'javascript:alert(1)', isPrivate:false, updatedAt:'2026-10-26T00:00:00Z', stargazerCount:1, primaryLanguage:{name:'JavaScript'}, repositoryTopics:{nodes:[]} },
    { id:'private', name:'Private project', description:'Secret', url:'https://github.com/u/private', homepageUrl:'', isPrivate:true, updatedAt:'2026-10-26T00:00:00Z', repositoryTopics:{nodes:[]} },
  ] } } } })
  await fixture(async ({ app, store }) => {
    await app.syncPins(); assert.equal(store.read().pins.length, 1); assert.equal(store.read().pins[0].live, '')
    fail = true; await app.syncPins(); assert.equal(store.read().pins.length, 1); assert.ok(store.read().sync.error)
  }, { upstream })
})
