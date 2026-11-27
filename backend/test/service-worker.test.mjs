import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
const cacheScript = fs.readFileSync(new URL('../../js/sw-cache.js', import.meta.url), 'utf8');
const origin = 'https://example.test';
function runWorker({self, caches, fetch}) {
  const context = vm.createContext({self:{registration:{scope:origin+'/'}, ...self}, URL, Response, caches, fetch});
  context.importScripts = () => vm.runInContext(cacheScript, context);
  vm.runInContext(worker, context);
  return context;
}

test('uncached images and documents return a real 503; admin and API bypass the worker', async () => {
  const listeners = {};
  runWorker({
    self: {location:{origin}, addEventListener:(type,fn)=>listeners[type]=fn},
    fetch:async()=>{throw Error('offline');},
    caches:{open:async()=>({match:async()=>undefined})}
  });
  for (const [path,mode,destination] of [['/', 'navigate', 'document'], ['/assets/missing.png', 'same-origin', 'image']]) {
    let response;
    listeners.fetch({request:{method:'GET',url:origin+path,mode,destination},respondWith:value=>response=value});
    assert.equal((await response)?.status,503);
  }
  for(const path of ['/admin','/admin/','/api/v1/auth/me','/?qr=sample','/?payment=sample']) {
    listeners.fetch({request:{method:'GET',url:origin+path,destination:'document'},respondWith:()=>assert.fail('Request should bypass cache')});
  }
});

test('activation only removes obsolete caches owned by this worker scope', async () => {
  const listeners = {}, deleted = [];
  const old = ['romano-v4.9.1-1', 'ramen-online-menu-cache:https://example.test/:old'];
  const otherScope = 'ramen-online-menu-cache:https://example.test/demo/:old';
  let claimed = false, pending, current;
  const context = runWorker({
    self:{addEventListener:(type,fn)=>listeners[type]=fn, clients:{claim:async()=>{claimed=true;}}},
    caches:{
      keys:async()=>[...old,current,otherScope,'online-menu-mixed','other-app-cache'],
      open:async key=>({keys:async()=>['/index.html',key==='online-menu-mixed'?'/demo/js/app.js':'/js/app.js'].map(path=>({url:origin+path}))}),
      delete:async key=>{deleted.push(key);return true;}
    }
  });
  current = vm.runInContext('CACHE_NAME', context);
  listeners.activate({waitUntil:value=>pending=value});
  await pending;
  assert.deepEqual(deleted,old);
  assert.equal(claimed,true);
});


test('worker excludes unknown paths, queries, authenticated requests and sibling deployments', () => {
  const listeners={};
  runWorker({self:{registration:{scope:origin+'/menu/'},location:{origin},addEventListener:(type,fn)=>listeners[type]=fn}});
  for(const [path,destination,extra] of [
    ['/other/assets/logo.png','image',{}],
    ['/menu/private','document',{}],
    ['/menu/admin','document',{}],
    ['/menu/api/v1/orders','document',{}],
    ['/menu/?session=secret','document',{}],
    ['/menu/assets/logo.png?token=secret','image',{}],
    ['/menu/js/app.js','script',{cache:'no-store'}],
    ['/menu/js/app.js','script',{headers:new Headers({Authorization:'Bearer sample'})}],
    ['/menu/assets/logo.png','image',{headers:new Headers({Range:'bytes=0-9'})}],
    ['/menu/js/unknown.js','script',{}]
  ]) listeners.fetch({request:{method:'GET',url:origin+path,destination,...extra},respondWith:()=>assert.fail(path+' must bypass cache')});
});
test('worker caches only public complete responses; bundled media cache hits avoid network', async()=>{
  const listeners={},puts=[],tasks=[];
  let cached,networkCalls=0,policy='',redirected=false,status=200;
  const networkResponse=()=>({status,type:'basic',redirected,headers:new Headers({'Cache-Control':policy}),clone(){return this;}});
  runWorker({self:{location:{origin},addEventListener:(type,fn)=>listeners[type]=fn},
    caches:{open:async()=>({match:async()=>cached,put:async(request)=>puts.push(request.url)})},
    fetch:async()=>{networkCalls++;return networkResponse();}
  });
  async function request(path,destination){
    let reply;listeners.fetch({request:{method:'GET',url:origin+path,destination},respondWith:p=>reply=p,waitUntil:p=>tasks.push(p)});
    const result=await reply;await Promise.all(tasks.splice(0));return result;
  }
  for(const value of ['private','public, no-store','no-cache="Set-Cookie"']){
    policy=value;await request('/js/app.js','script');
  }
  policy='public, max-age=60';redirected=true;await request('/js/app.js','script');
  redirected=false;status=206;await request('/assets/logo.png','image');
  assert.deepEqual(puts,[]);
  status=200;await request('/js/app.js','script');assert.deepEqual(puts,[origin+'/js/app.js']);
  cached={marker:'bundled-image'};const before=networkCalls;
  assert.equal(await request('/assets/logo.png','image'),cached);assert.equal(networkCalls,before);
});


test('Precache requests omit credentials, reject redirects and honor response cache policy',async()=>{
  const listeners={},puts=[],calls=[];let skipped=false,pending;
  runWorker({self:{location:{origin},addEventListener:(type,fn)=>listeners[type]=fn,skipWaiting:async()=>{skipped=true;}},
    caches:{open:async()=>({put:async url=>puts.push(url)})},
    fetch:async(url,options)=>{calls.push({url,options});return {ok:true,status:200,type:'basic',redirected:false,headers:new Headers({'Cache-Control':url.endsWith('/index.html')?'private':'public'})};}
  });
  listeners.install({waitUntil:p=>pending=p});await pending;
  assert.ok(skipped);assert.ok(calls.length>20);assert.ok(puts.includes(origin+'/js/app.js'));assert.ok(!puts.includes(origin+'/index.html'));
  for(const {url,options} of calls){assert.ok(url.startsWith(origin+'/'));assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');}
});
