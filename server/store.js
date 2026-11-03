import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { portfolio } from '../src/data/portfolio.js'
import { validateContent } from '../shared/content.js'

export async function createStore(directory) {
  await mkdir(directory, { recursive: true })
  const file = join(directory, 'content.json')
  let state
  try {
    state = JSON.parse(await readFile(file, 'utf8'))
    state.draft = validateContent(state.draft); state.published = validateContent(state.published)
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Cannot read content store. Restore a valid backup; existing data was not overwritten.', { cause: error })
    state = { revision: 0, draft: validateContent(portfolio), published: validateContent(portfolio), history: [], pins: [], sync: { lastSuccess: null, lastAttempt: null, error: null }, updatedAt: null }
  }
  let queue = Promise.resolve()
  const transaction = change => {
    const operation = queue.then(async () => {
      const next = structuredClone(state)
      change(next)
      await writeFile(`${file}.tmp`, JSON.stringify(next), { mode: 0o600, flush: true })
      // Windows scanners can briefly hold a file open; keep the previous version intact while retrying.
      for (let attempt = 0; ; attempt++) {
        try { await rename(`${file}.tmp`, file); break }
        catch (error) { if (attempt >= 4 || !['EPERM','EACCES','EBUSY'].includes(error.code)) throw error; await delay(25 * (attempt + 1)) }
      }
      state = next
      return structuredClone(state)
    })
    queue = operation.catch(() => {})
    return operation
  }
  const check = (s, revision) => { if (s.revision !== revision) { const e = new Error('Content changed in another session. Reload before saving.'); e.status = 409; throw e } }
  return {
    read: () => structuredClone(state),
    readPublished: () => structuredClone({ published: state.published, pins: state.pins, sync: state.sync, updatedAt: state.updatedAt }),
    save: (content, revision) => transaction(s => { check(s, revision); s.draft = validateContent(content); s.revision++ }),
    publish: revision => transaction(s => {
      check(s, revision)
      s.history.unshift({ id: s.revision - 1, date: s.updatedAt || new Date().toISOString(), content: s.published })
      s.history = s.history.slice(0, 20)
      s.published = validateContent(s.draft); s.updatedAt = new Date().toISOString(); s.revision++
    }),
    restore: (id, revision) => transaction(s => {
      check(s, revision)
      const entry = s.history.find(h => h.id === id)
      if (!entry) throw new Error('Revision not found')
      s.draft = validateContent(entry.content); s.revision++
    }),
    sync: (pins, error = null) => transaction(s => {
      s.sync.lastAttempt = new Date().toISOString(); s.sync.error = error
      if (pins) { s.pins = pins; s.sync.lastSuccess = s.sync.lastAttempt }
    }),
  }
}
