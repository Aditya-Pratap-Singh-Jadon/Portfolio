import test from 'node:test';
import assert from 'node:assert/strict';
import { paintHubLabels } from '../src/playcanvas/hubLabels.js';
import { signals } from '../shared/signals.js';

test('runtime label atlas uses the shared eight names and honest structural copy', () => {
  const text=[];
  const context={clearRect(){},fillText(value,x,y){text.push({value,x,y});}};
  paintHubLabels(context);
  for(const signal of signals){assert(text.some(t=>t.value===signal.title));assert(text.some(t=>t.value===signal.summary));}
  assert(!text.some(t=>/placeholder|content to be provided|Neural Core/i.test(t.value)));
  assert(text.every(t=>t.x>=0&&t.x<1024&&t.y>=0&&t.y<1024));
});
