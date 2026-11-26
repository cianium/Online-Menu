import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportDemo } from './export-demo.mjs';
const source = fileURLToPath(new URL('../',import.meta.url));
async function temp(t){const p=await mkdtemp(path.join(tmpdir(),'online-menu-export-'));t.after(()=>rm(p,{recursive:true,force:true}));return p;}

test('exports the complete public demo, verifies checksums, excludes repository internals',async t=>{
  const dest=path.join(await temp(t),'bundle');
  const {files}=await exportDemo(source,dest);
  const web=path.join(dest,'public');
  assert.deepEqual((await readdir(web)).sort(),['admin','assets','css','index.html','js','manifest.webmanifest','robots.txt','sw.js']);
  const lines=(await readFile(path.join(dest,'SHA256SUMS'),'utf8')).trim().split('\n');
  assert.equal(lines.length,files);
  assert.equal(new Set(lines.map(line=>line.slice(66))).size,files);
  for (const line of lines) {
    const [hash,name]=[line.slice(0,64),line.slice(66)];
    const bytes=await readFile(path.join(web,name));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name);
    if(name==='index.html'||name==='admin/index.html') {
      const original=await readFile(path.join(source,name),'utf8');
      const marker='    <meta name="online-menu-mode" content="standalone">\n';
      assert.ok(bytes.toString().includes(marker));
      assert.ok(bytes.toString().includes('<meta name="robots" content="noindex, nofollow">'));
      assert.equal(bytes.toString().replace(marker,''),original.replace('content="index, follow"','content="noindex, nofollow"'));
    } else if(name==='sw.js') assert.deepEqual(bytes,await readFile(path.join(source,'qa/private-demo-sw.js')));
    else if(name!=='robots.txt')assert.deepEqual(bytes,await readFile(path.join(source,name)),name);
  }
  assert.equal(await readFile(path.join(web,'robots.txt'),'utf8'),'User-agent: *\nDisallow: /\n');
  await assert.rejects(exportDemo(source,dest),{code:'EEXIST'});
  assert.equal((await readdir(web)).length,8);
});

test('rejects unsafe source paths, symlinks and unexpected files without overwriting',async t=>{
  const root=await temp(t);for(const dir of ['admin','assets','css','js'])await mkdir(path.join(root,dir));
  for(const name of ['index.html','manifest.webmanifest','sw.js'])await writeFile(path.join(root,name),name==='index.html'?'<head><meta name="robots" content="index, follow"></head>':'fixture');
  await assert.rejects(exportDemo(root,path.join(root,'admin','out')),/public source directory/);
  const out=path.join(root,'bundle');
  await symlink(path.join(root,'index.html'),path.join(root,'admin','bad.html'));
  await assert.rejects(exportDemo(root,out),/Symlink refused/);
  assert.ok(!(await readdir(root)).includes('bundle'));
  await rm(path.join(root,'admin','bad.html'));
  await writeFile(path.join(root,'admin','.env'),'fixture only');
  await assert.rejects(exportDemo(root,out),/Unexpected public path/);
  assert.ok(!(await readdir(root)).includes('bundle'));
  await rm(path.join(root,'admin','.env'));
  await writeFile(path.join(root,'admin','bad.mjs'),'fixture only');
  await assert.rejects(exportDemo(root,out),/Unexpected public file/);
  assert.ok(!(await readdir(root)).includes('bundle'));
  await rm(path.join(root,'admin','bad.mjs'));
  await rm(path.join(root,'index.html'));
  await mkdir(path.join(root,'index.html'));
  await assert.rejects(exportDemo(root,out),/Expected regular root file/);
  assert.ok(!(await readdir(root)).includes('bundle'));
});


test('private demo worker purges only its own older caches and never intercepts requests',async t=>{
  const dest=path.join(await temp(t),'bundle');
  await exportDemo(source,dest);
  const listeners={},removed=[];let pending,claimed=false;
  const origin='https://example.test';
  const context=vm.createContext({URL,self:{registration:{scope:origin+'/demo/'},addEventListener:(type,fn)=>listeners[type]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{claimed=true;}}},caches:{
    keys:async()=>['romano-demo-legacy','online-menu-root-legacy','ramen-online-menu-cache:https://example.test/demo/:old','ramen-online-menu-cache:https://example.test/:current','unrelated'],
    open:async name=>({keys:async()=>[{url:origin+(name==='romano-demo-legacy'?'/demo/':'/')+'index.html'}]}),
    delete:async key=>{removed.push(key);return true;}
  }});
  const cacheScript=await readFile(path.join(dest,'public/js/sw-cache.js'),'utf8');
  context.importScripts=()=>vm.runInContext(cacheScript,context);
  vm.runInContext(await readFile(path.join(dest,'public/sw.js'),'utf8'),context);
  assert.equal(listeners.fetch,undefined);
  listeners.install({waitUntil:p=>pending=p});await pending;
  listeners.activate({waitUntil:p=>pending=p});await pending;
  assert.deepEqual(removed,['romano-demo-legacy','ramen-online-menu-cache:https://example.test/demo/:old']);
  assert.equal(claimed,true);
});
