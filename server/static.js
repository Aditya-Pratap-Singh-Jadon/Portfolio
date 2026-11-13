import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function readStatic(file,headers,method='GET'){
 const encodings=(headers['accept-encoding']||'').split(',').map(value=>{
  const [name,...params]=value.trim().split(';');
  const q=params.find(p=>p.trim().startsWith('q='));return {name,q:q?Number(q.trim().slice(2)):1};
 });
 const gzip=(encodings.find(e=>e.name==='gzip')||encodings.find(e=>e.name==='*'))?.q>0;
 let data=await readFile(file),encoded=false;
 if(gzip)try{data=await readFile(file+'.gz');encoded=true;}catch(error){if(error.code!=='ENOENT')throw error;}
 const etag='"'+createHash('sha256').update(data).digest('hex')+'"';
 const responseHeaders={Vary:'Accept-Encoding',ETag:etag,...(encoded?{'Content-Encoding':'gzip'}:{})};
 const unchanged=(headers['if-none-match']||'').split(',').some(value=>value.trim()==='*'||value.trim().replace(/^W\//,'')===etag);
 return {status:unchanged?304:200,headers:responseHeaders,data:unchanged||method==='HEAD'?undefined:data};
}
