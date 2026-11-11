import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolio} from '../src/data/portfolio.js';
import {publicContent,validateContent} from '../shared/content.js';
const bindings=await import('../shared/sceneContent.js').catch(()=>({}));
import {MiNeuralNavigation} from '../src/playcanvas/neuralController.js';
import {MiForgeNavigation} from '../src/playcanvas/forgeController.js';
import {AccentsController} from '../src/playcanvas/accentsController.js';

test('approved publication removes excluded projects, restricted details and automatic pin publication',()=>{
  const content=publicContent(validateContent(portfolio),[{id:'unapproved',title:'Unreviewed',repo:'https://github.com/example/unreviewed',featured:true}]);
  assert.deepEqual(content.projects.map(p=>p.id),['ssxi','stackvision','cubex']);
  assert.equal(content.projects[2].description,'An experimental carbon-capture software prototype under ongoing development.');
  assert(content.skills.every(skill=>skill.projects.every(id=>['ssxi','stackvision','cubex'].includes(id))));
  assert.equal(content.projects[2].repo,'');assert.deepEqual(content.projects[2].tags,[]);
  assert.equal(portfolio.sync.enabled,false);
  assert.equal(content.education.semester,'Semester 5');
  assert.equal(content.education.grade,'8.96 / 10 · through Semester 4');
  assert.equal(content.skills.length,15);
  assert(content.skills.slice(0,12).every(s=>s.status==='Used, still learning'));
});

test('approved manual LinkedIn short link supports an absent date without weakening date or host validation',()=>{
  const copy=structuredClone(portfolio);
  copy.posts=[{id:'win',title:'Team win',summary:'Approved summary',text:'',date:'',url:'https://lnkd.in/p/example',published:true}];
  const post=publicContent(validateContent(copy)).posts[0];
  assert.equal(post.date,'');assert.equal(post.url,'https://lnkd.in/p/example');assert.equal(post.text,undefined);
  for(const bad of ['https://lnkd.in.evil.example/p/example','https://evil.example/post']){copy.posts[0].url=bad;assert.throws(()=>validateContent(copy),/LinkedIn/);}
  copy.posts[0].url='https://lnkd.in/p/example';copy.posts[0].date='2026-02-31';assert.throws(()=>validateContent(copy),/date/);
});

test('scene bindings resolve only approved visible records and leave unused objects unassigned',()=>{
  assert.equal(typeof bindings.sceneEntry,'function');
  const content=publicContent(validateContent(portfolio));
  assert.deepEqual(Array.from({length:6},(_,i)=>bindings.sceneEntry(content,'projects',i)?.record?.id??null),['ssxi','stackvision','cubex',null,null,null]);
  for(let i=0;i<15;i++)assert.equal(bindings.sceneEntry(content,'skills',i).record.id,content.skills[i].id);
  assert.equal(bindings.sceneEntry(content,'experience',0).record.id,'csed');
  for(let i=1;i<5;i++)assert.equal(bindings.sceneEntry(content,'experience',i).type,'empty');
  assert.equal(bindings.sceneEntry(content,'achievements',0).record.id,'hackathon');
  assert.equal(bindings.sceneEntry(content,'achievements',1).record.id,'forage');
  for(let i=2;i<4;i++)assert.equal(bindings.sceneEntry(content,'achievements',i).type,'empty');
  assert.equal(bindings.sceneEntry(content,'projects',null),null);
  const hidden=structuredClone(portfolio);hidden.sections.projects=false;
  assert.equal(bindings.sceneEntry(publicContent(validateContent(hidden)),'projects',0).type,'empty');
});

test('scene shortcuts leave selected-content keyboard scrolling and Escape to its accessible interface',()=>{
  for(const Controller of [MiNeuralNavigation,MiForgeNavigation,AccentsController]){
    let intercepted=false;
    const controller={keyboardFocus:null,kind:'nexus',buttons:Array.from({length:15},()=>({focus(){intercepted=true;}})),reset(){intercepted=true;},select(){intercepted=true;},separate(){intercepted=true;},resetButton:{focus(){intercepted=true;}},overviewButton:{focus(){intercepted=true;}}};
    for(const key of ['ArrowDown','Home','Escape']){
      Controller.prototype.key.call(controller,{key,target:{closest:selector=>selector==='.space-detail'?{}:null},preventDefault(){intercepted=true;}});
      assert.equal(intercepted,false,Controller.name+' '+key);
    }
  }
});
