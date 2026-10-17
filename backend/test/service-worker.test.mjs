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
