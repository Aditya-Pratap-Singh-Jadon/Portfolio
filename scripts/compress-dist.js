import {readdir,readFile,writeFile,rm} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';

const compress=promisify(gzip);
// Sidecars cost build time, never a visitor's render or request thread.
export async function compressDist(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())await compressDist(path);
  else if(['.js','.css','.html','.json','.svg','.glb'].includes(extname(path))){
   const data=await readFile(path);
   if(data.length<1024){await rm(path+'.gz',{force:true});continue;}
   const compressed=await compress(data,{level:9});
   if(compressed.length<data.length)await writeFile(path+'.gz',compressed);
   else await rm(path+'.gz',{force:true});
  }
 }
}
