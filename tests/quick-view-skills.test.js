import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolio} from '../src/data/portfolio.js';
import {sceneBindings} from '../shared/sceneContent.js';
const presentation=await import('../src/components/quickViewSkills.js').catch(()=>({}));

test('Quick View groups the approved stack once without changing Neural records or bindings',()=>{
  assert.equal(typeof presentation.groupQuickViewSkills,'function');
  const before=JSON.stringify(portfolio.skills),bindings=JSON.stringify(sceneBindings.skills);
  const groups=presentation.groupQuickViewSkills(portfolio.skills);
  assert.deepEqual(groups.map(g=>g.name),['Frontend','Backend & Databases','Integrations & APIs','CS Foundations','DSA','Tools & Teamwork']);
  assert.deepEqual(groups.map(g=>g.status),['Used, still learning','Used, still learning','Used, still learning','Studied, comfortable explaining','Still learning','Comfortable using']);
  assert.deepEqual(groups.map(g=>g.technologies),[
    ['JavaScript','React','Next.js','TypeScript','HTML','CSS','Material UI','Vite'],
    ['Node.js','Express','MongoDB','REST APIs'],
    ['Google OAuth','Nodemailer','Google Drive API'],
    ['Operating Systems','DBMS','Computer Networks','Software Engineering','OOP','C++'],
    ['Data Structures & Algorithms'],
    ['Git','GitHub','VS Code','Chrome DevTools','Render','AWS (with assistance)'],
  ]);
  const technologies=groups.flatMap(g=>g.technologies);
  assert.equal(new Set(technologies).size,technologies.length);
  assert.equal(JSON.stringify(portfolio.skills),before);assert.equal(JSON.stringify(sceneBindings.skills),bindings);
  assert.deepEqual(presentation.groupQuickViewSkills([]),[]);
  assert.deepEqual(presentation.groupQuickViewSkills(portfolio.skills.filter(s=>s.id==='react')).map(g=>g.technologies),[['React']]);
});
