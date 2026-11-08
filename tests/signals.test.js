import test from 'node:test';
import assert from 'node:assert/strict';
import { signals, sectionById, signalLinks } from '../shared/signals.js';
import { portfolio } from '../src/data/portfolio.js';
import { validateContent, publicContent } from '../shared/content.js';

test('signal names match approved panel order and detail section names', () => {
  assert.deepEqual(signals.map(s=>s.title),['Origin','Forge','Chronicle','Skills','GitHub','Signal','Vault','Nexus']);
  assert.equal(new Set(signals.map(s=>s.entity)).size,8);
  assert.equal(sectionById.updates.title,'Signal');
  assert.equal(sectionById.projects.subtitle,'Projects');
  assert.equal(sectionById.skills.title,'Skills');
});

test('signal navigation respects hidden sections and validates social destinations', () => {
  const visibility={...portfolio.sections,projects:false,updates:false};
  const choices=signalLinks(visibility,{github:'javascript:alert(1)',linkedin:'https://www.linkedin.com/in/example'});
  assert.equal(choices.find(s=>s.id==='projects').enabled,false);
  assert.equal(choices.find(s=>s.id==='github').enabled,false);
  assert.equal(choices.find(s=>s.id==='linkedin').href,'https://www.linkedin.com/in/example');
  assert.equal(signalLinks({...visibility,updates:true},{})[5].href,'#updates');
  const hidden=publicContent({...portfolio,sections:{...portfolio.sections,contact:false,updates:false}});
  assert.equal(signalLinks(hidden.sections,hidden.profile)[4].enabled,false);
  assert.equal(signalLinks(hidden.sections,hidden.profile)[5].enabled,false);
  const hiddenOrigin=publicContent({...portfolio,profile:{...portfolio.profile,punchline:'Origin-only copy'},sections:{...portfolio.sections,about:false}});
  assert.equal(hiddenOrigin.profile.punchline,'');
});

test('optional punchline preserves older content and rejects invalid values', () => {
  const source=structuredClone(portfolio);delete source.profile.punchline;
  assert.equal(validateContent(source).profile.punchline,'');
  source.profile.punchline='  A user-provided line.  ';
  const result=validateContent(source);
  assert.equal(result.profile.punchline,'A user-provided line.');
  assert.equal(result.profile.about,source.profile.about);
  source.profile.punchline=123;assert.throws(()=>validateContent(source),/text field/);
  source.profile.punchline='a'.repeat(241);assert.throws(()=>validateContent(source),/text field/);
});
