import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {randomBytes} from 'node:crypto';
import {compressDist} from '../scripts/compress-dist.js';
import {readStatic} from '../server/static.js';

test('static compression preserves bytes, negotiates gzip and validates each deployed representation',async()=>{
 const dir=await mkdtemp(resolve('tmp/static-performance-'));
 try{
  const file=join(dir,'scene.json'),body=JSON.stringify({entities:Array(200).fill('approved runtime data')});
  await writeFile(file,body);await writeFile(join(dir,'image.png'),'image bytes');await compressDist(dir);
  assert.equal(gunzipSync(await readFile(file+'.gz')).toString(),body);
  await assert.rejects(readFile(join(dir,'image.png.gz')),{code:'ENOENT'});
  const plain=await readStatic(file,{}),compressed=await readStatic(file,{'accept-encoding':'br, gzip'});
  assert.equal(plain.data.toString(),body);assert.equal(plain.headers.Vary,'Accept-Encoding');
  assert.equal(compressed.headers['Content-Encoding'],'gzip');assert.equal(gunzipSync(compressed.data).toString(),body);
  assert.notEqual(plain.headers.ETag,compressed.headers.ETag);
  assert.equal((await readStatic(file,{'accept-encoding':'gzip;q=0, *;q=1'})).headers['Content-Encoding'],undefined);
  assert.equal((await readStatic(file,{'accept-encoding':'gzip;q=0.5'})).headers['Content-Encoding'],'gzip');
  const cached=await readStatic(file,{'if-none-match':`"other", W/${plain.headers.ETag}`});
  assert.equal(cached.status,304);assert.equal(cached.data,undefined);
  assert.equal((await readStatic(file,{},'HEAD')).data,undefined);
  await writeFile(file,body+' ');await compressDist(dir);
  const changed=await readStatic(file,{'if-none-match':plain.headers.ETag});assert.equal(changed.status,200);assert.notEqual(changed.headers.ETag,plain.headers.ETag);
  await writeFile(file,'{}');await compressDist(dir);
  const shrunk=await readStatic(file,{'accept-encoding':'gzip'});assert.equal(shrunk.data.toString(),'{}');assert.equal(shrunk.headers['Content-Encoding'],undefined);
  await writeFile(file,body);await compressDist(dir);
  const noise=randomBytes(4096);await writeFile(file,noise);await compressDist(dir);
  const uncompressed=await readStatic(file,{'accept-encoding':'gzip'});assert.deepEqual(uncompressed.data,noise);assert.equal(uncompressed.headers['Content-Encoding'],undefined);
  const missingSidecar=await readStatic(join(dir,'image.png'),{'accept-encoding':'gzip'});assert.equal(missingSidecar.data.toString(),'image bytes');
 }finally{await rm(dir,{recursive:true,force:true});}
});
