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
