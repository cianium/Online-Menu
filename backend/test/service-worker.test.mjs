import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('offline uncached image returns a Response; admin and API bypass cache', async () => {
  const listeners = {};
  const context = vm.createContext({
    self: { location: {origin:'https://example.test'}, addEventListener:(type,fn)=>listeners[type]=fn },
    URL, Response, fetch:async()=>{throw Error('offline');},
    caches: {match:async()=>undefined}
  });
  vm.runInContext(fs.readFileSync(new URL('../../sw.js',import.meta.url),'utf8'), context);
  let response;
  listeners.fetch({request:{method:'GET',url:'https://example.test/assets/missing.png',destination:'image'},respondWith:value=>response=value});
  assert.equal((await response).status,503);
  for(const path of ['/admin','/admin/','/api/v1/auth/me']) {
    listeners.fetch({request:{method:'GET',url:'https://example.test'+path,destination:'document'},respondWith:()=>assert.fail('Private route intercepted')});
  }
});

test('activation removes obsolete application caches, preserves current and unrelated caches', async () => {
  const listeners = {}, deleted = [];
  const oldKeys = ['romano-v4.9.1-1', 'online-menu-vq2', 'ramen-online-menu-vq3-1', 'ramen-online-menu-vq3-2'];
  let current;
  let claimed = false, pending;
  const context = vm.createContext({
    self: { addEventListener: (type, fn) => listeners[type] = fn, clients: { claim: async () => { claimed = true; } } },
    caches: { keys: async () => [...new Set([...oldKeys, current, 'other-app-cache'])], delete: async key => { deleted.push(key); return true; } }
  });
  vm.runInContext(fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8'), context);
  current = vm.runInContext('CACHE_NAME', context);
  listeners.activate({ waitUntil: value => pending = value });
  await pending;
  assert.deepEqual(deleted.sort(), oldKeys.filter(key => key !== current).sort());
  assert.equal(claimed, true);
});

test('offline navigation returns a real 503 Response if both document and shell are uncached', async () => {
  const listeners = {};
  const context = vm.createContext({
    self: { location: {origin:'https://example.test'}, addEventListener:(type,fn)=>listeners[type]=fn },
    URL, Response, fetch:async()=>{throw Error('offline');},
    caches: {match:async()=>undefined}
  });
  vm.runInContext(fs.readFileSync(new URL('../../sw.js',import.meta.url),'utf8'), context);
  let response;
  listeners.fetch({request:{method:'GET',url:'https://example.test/',mode:'navigate',destination:'document'},respondWith:value=>response=value});
  assert.equal((await response)?.status,503);
});
