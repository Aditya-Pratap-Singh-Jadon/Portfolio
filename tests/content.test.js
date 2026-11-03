import test from 'node:test'
import assert from 'node:assert/strict'
import { portfolio } from '../src/data/portfolio.js'

const content = await import('../shared/content.js').catch(() => ({}))
test('content validation rejects executable and non-HTTPS external links', () => {
  assert.equal(typeof content.safeUrl, 'function')
  assert.equal(content.safeUrl('javascript:alert(1)'), false)
  assert.equal(content.safeUrl('https://github.com/example'), true)
  assert.equal(content.safeUrl('http://example.com'), false)
})
test('hidden sections are removed from the public response, including contact and skill evidence', () => {
  const source = structuredClone(portfolio)
  source.sections = Object.fromEntries(Object.keys(source.sections).map(key => [key, false]))
  const result = content.publicContent(source)
  assert.deepEqual(result.projects, [])
  assert.deepEqual(result.experience, [])
  assert.deepEqual(result.skills, [])
  assert.deepEqual(result.achievements, [])
  assert.equal(result.profile.email, '')
  assert.equal(result.profile.about, '')
})
test('resume imports reject non-PDF data and stay out of public JSON', () => {
  const source = structuredClone(portfolio)
  source.resume = { name: 'resume.pdf', data: 'data:application/pdf;base64,SGVsbG8=' }
  assert.throws(() => content.validateContent(source), /PDF/)
  source.resume.data = 'data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK'
  const result = content.publicContent(content.validateContent(source))
  assert.equal(result.resume, undefined)
  assert.equal(result.resumeAvailable, true)
})
test('imports reject missing IDs and impossible LinkedIn dates', () => {
  const source = structuredClone(portfolio)
  delete source.projects[0].id
  assert.throws(() => content.validateContent(source), /IDs/)
  source.projects[0].id = 'ssxi'
  source.posts = [{ id:'post',title:'A post',text:'Source',summary:'Summary',date:'2026-02-31',url:'https://www.linkedin.com/posts/example',published:true }]
  assert.throws(() => content.validateContent(source), /date/)
})
test('pin refresh retains editorial descriptions and independent featured projects', () => {
  assert.equal(typeof content.mergeProjects, 'function')
  const manual = [{ id: 'a', title: 'My case study', description: 'Approved', repo: 'https://github.com/u/a', featured: false, hidden: false }, { id: 'b', title: 'Independent', featured: true }, { id: 'c', repo: 'https://github.com/u/c', hidden: true }]
  const pins = [{ id: 'a', title: 'Imported', description: 'Remote', repo: 'https://github.com/u/a' }, { id: 'c', repo: 'https://github.com/u/c' }, { id: 'd', title: 'New', repo: 'https://github.com/u/d' }]
  const merged = content.mergeProjects(manual, pins)
  assert.deepEqual(merged.map(p => p.id), ['a', 'd', 'b'])
  assert.equal(merged[0].description, 'Approved')
  assert.deepEqual(content.mergeProjects(manual, []).map(p => p.id), ['b'])
  assert.equal(manual.length, 3)
})
