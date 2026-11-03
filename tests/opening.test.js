import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sampleOpening, ProgressSpring } from '../src/playcanvas/openingTimeline.js'

// Independently follow scene references and transitive asset dependencies.
function referencedAssets(scene, assets) {
  const found = new Set(), queue = [scene]
  while (queue.length) {
    const value = queue.pop()
    if (value && typeof value === 'object') queue.push(...Object.values(value))
    else if (Object.hasOwn(assets, String(value)) && !found.has(String(value))) {
      found.add(String(value))
      queue.push(assets[String(value)].data)
    }
  }
  return found
}

test('asset reference check follows transitive references and terminates on cycles', () => {
  const assets = { 10: { data: { material: 20 } }, 20: { data: { texture: 30 } }, 30: { data: { back: 10 } }, 40: { data: {} } }
  assert.deepEqual([...referencedAssets({ render: [10] }, assets)].sort(), ['10', '20', '30'])
})

test('opening phases reverse deterministically and camera waits for separated stone', () => {
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000, s = sampleOpening(p)
    assert.deepEqual(s, sampleOpening(p))
    assert(s.environmentTime >= 0 && s.environmentTime <= 10.8)
    assert(s.awakeningTime >= 0 && s.awakeningTime <= 10.8)
    if (s.awakeningTime > 6.4) assert(p > .72)
    if (i) assert(s.awakeningTime >= sampleOpening((i - 1) / 1000).awakeningTime)
  }
  assert.equal(sampleOpening(0).awakeningTime, 0)
  assert.equal(sampleOpening(1).awakeningTime, 10.8)
  assert.equal(sampleOpening(1).handoff, true)
  assert.equal(sampleOpening(.8, true).awakeningTime, 0)
  assert.equal(sampleOpening(1, true).handoff, true)
})
test('scroll spring retains velocity on reversal, is time safe and settles exactly', () => {
  const a = new ProgressSpring(), b = new ProgressSpring()
  a.target = b.target = 1
  for (let i = 0; i < 30; i++) a.update(1 / 60)
  for (let i = 0; i < 120; i++) b.update(1 / 240)
  assert(Math.abs(a.value - b.value) < 1e-12)
  const before = a.value, velocity = a.velocity
  a.target = 0
  assert.equal(a.value, before); assert.equal(a.velocity, velocity)
  for (let i = 0; i < 200; i++) { a.target = i % 2; a.update(.013); assert(a.value >= 0 && a.value <= 1) }
  a.target = 0; a.update(10); assert.equal(a.value, 0); assert.equal(a.velocity, 0)
  assert.throws(() => a.update(NaN), RangeError)
})
test('MI01 asset package preserves all113 entities and excludes later-scene assets', () => {
  const root = new URL('../public/playcanvas/mi01/', import.meta.url)
  const config = JSON.parse(readFileSync(new URL('config.json', root)))
  const scene = JSON.parse(readFileSync(new URL('scene.json', root)))
  assert.equal(Object.keys(scene.entities).length, 113)
  assert.equal(config.scenes.length, 1)
  assert(Object.values(scene.entities).some(e => e.name === 'AWAKENING_CRUCIBLE'))
  assert(Object.values(scene.entities).some(e => e.name === 'ASHEN_VOID'))
  assert.equal(Object.values(scene.entities).filter(e => /^STONE_MAJOR_0[1-6]$/.test(e.name)).length, 6)
  for (const asset of Object.values(config.assets)) assert(!/NEURAL|FORGE|HUB|ACCENT|SYNAPSE/i.test(asset.name))
  const closure = referencedAssets(scene, config.assets)
  assert.deepEqual([...closure].sort(), Object.keys(config.assets).sort())
})

test('runtime load failure preserves the original error and disposes a created device', async () => {
  const source = readFileSync(new URL('../src/playcanvas/openingRuntime.js', import.meta.url), 'utf8')
  const body = source.slice(source.indexOf('export async function')).replace('export ', '')
  const make = new Function('fetch', 'createGraphicsDevice', 'ProgressSpring', 'abortError', 'fetchJson', body + ';return createOpeningRuntime')
  const controller = new AbortController(), expected = new Error('device unavailable')
  const fetchJson = async () => ({entities:{}})
  const failed = make(null, async () => { throw expected }, ProgressSpring, () => new DOMException('cancelled','AbortError'), fetchJson)
  await assert.rejects(failed({}, {signal:controller.signal}), error => error === expected)
  let destroyed = 0
  const cancelled = make(null, async () => { controller.abort(); return {destroy(){destroyed++}} }, ProgressSpring, () => new DOMException('cancelled','AbortError'), fetchJson)
  await assert.rejects(cancelled({}, {signal:controller.signal}), {name:'AbortError'})
  assert.equal(destroyed, 1)
})

test('engine callback waits cancel even when the loader never responds', async () => {
  const source = readFileSync(new URL('../src/playcanvas/openingRuntime.js', import.meta.url), 'utf8')
  const helper = source.slice(source.indexOf('const callbackPromise'), source.indexOf('export async function'))
  const wait = new Function('abortError', helper + ';return callbackPromise')(() => new DOMException('cancelled','AbortError'))
  const controller = new AbortController(); let complete
  const pending = wait(done => {complete=done}, controller.signal)
  controller.abort()
  await assert.rejects(pending, {name:'AbortError'})
  complete(null)
  await assert.rejects(wait(() => assert.fail('must not start cancelled work'), controller.signal), {name:'AbortError'})
})

test('website package retains the approved scene, mesh, texture and controller bytes', async () => {
  const { createHash } = await import('node:crypto')
  const { prepareOpeningScene } = await import('../src/playcanvas/openingControllers.js')
  const root = new URL('../public/playcanvas/mi01/', import.meta.url)
  const bytes = readFileSync(new URL('scene.json', root)), original = JSON.parse(bytes)
  const provenance = JSON.parse(readFileSync(new URL('./fixtures/opening-integrity.json', import.meta.url)))
  const config = JSON.parse(readFileSync(new URL('config.json',root)))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), provenance.sceneSha256)
  for (const file of provenance.files) {
    const asset = config.assets[file.id]
    const actual = readFileSync(new URL('../public' + asset.file.url, import.meta.url))
    assert.equal(createHash('md5').update(actual).digest('hex'),file.md5, file.name)
  }
  for (const script of provenance.scripts) assert.equal(createHash('md5').update(readFileSync(new URL('../src/playcanvas/approved/' + script.name, import.meta.url))).digest('hex'),script.md5)
  const prepared = prepareOpeningScene(original)
  assert.deepEqual(original,JSON.parse(bytes))
  assert.deepEqual(Object.keys(prepared.entities),Object.keys(original.entities))
  for (const [id,e] of Object.entries(original.entities)) {
    const modified=prepared.entities[id]
    for (const key of ['position','rotation','scale','parent','children','name','resource_id']) assert.deepEqual(modified[key],e[key])
    for (const key of ['render','light']) assert.deepEqual(modified.components[key],e.components[key])
  }
})

