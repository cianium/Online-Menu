import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const core=require('../../js/connect-core.js');
const {copy}=require('../../js/connect-customer.js');
const {createDemoEngine}=require('../../js/connect-demo.js');
function fixture(){
 let now=100,n=0,tail=Promise.resolve(),events=0;const map=new Map(),kv=new Map(),listeners=new Set();
 const db={get:async id=>map.get(id)||null,all:async()=>[...map.values()],change(id,fn){
  const result=tail.then(()=>{const r=fn(map.get(id)||null,[...map.values()]);for(const k of r.remove)map.delete(k);if(r.record)map.set(id,r.record);return r.value;});
  tail=result.catch(()=>{});return result;
 }};
 const platform={db,sessionStorage:{getItem:k=>kv.get(k)||null,setItem:(k,v)=>kv.set(k,v),removeItem:k=>kv.delete(k)},uuid:()=>String(++n),now:()=>now,notify:()=>{events++;for(const l of listeners)l();},subscribe:l=>{listeners.add(l);return ()=>listeners.delete(l);}};
 return {platform,map,engine:createDemoEngine(core,platform),advance:ms=>now+=ms,events:()=>events};
}
const manager=branchId=>({id:'staff1',role:'manager',restaurantId:'romano',branchId});
test('Demo sessions persist by tab and rotate when branch or table changes',async()=>{
 const f=fixture(),a=f.engine.session('primary','primary:T1');await f.engine.send(a,'m1','سلام','fa');
 const next=createDemoEngine(core,f.platform),b=next.session('primary','primary:T1');assert.deepEqual(a,b);assert.equal((await next.get(b)).messages[0].text,'سلام');
 const c=next.session('primary','primary:T2');assert.notEqual(c.guestId,a.guestId);assert.deepEqual((await next.get(c)).messages,[]);
 next.forget();assert.notEqual(next.session('primary','primary:T2').guestId,c.guestId);
});
test('Concurrent messages and duplicate retries use one transaction per mutation',async()=>{
 const f=fixture(),s=f.engine.session('primary','primary');
 await Promise.all([f.engine.send(s,'m1','one','en'),f.engine.send(s,'m2','two','en'),f.engine.send(s,'m1','one','en')]);
 const data=await f.engine.get(s);assert.deepEqual(data.messages.map(m=>m.sequence),[1,2]);assert.equal(data.conversation.version,3);
 await assert.rejects(f.engine.send(s,'m1','changed','en'),/CONNECT_IDEMPOTENCY_CONFLICT/);
 assert.equal((await f.engine.get(s)).messages.length,2);
});
test('Staff inbox and replies remain branch-scoped; guest projection identifies replies',async()=>{
 const f=fixture(),s=f.engine.session('b1','b1:T1');await f.engine.send(s,'m1','hello','en');
 assert.equal((await f.engine.list(manager('b2'))).length,0);
 await assert.rejects(f.engine.readStaff(manager('b2'),s.conversationId),/CONNECT_NOT_FOUND/);
 await f.engine.command(manager('b1'),s.conversationId,{type:'send',clientId:'r1',text:'reply',language:'en',expectedVersion:2});
 const rows=(await f.engine.get(s)).messages;assert.equal(rows.length,2);assert.equal(rows[1].own,false);assert.equal(rows[1].text,'reply');
 await assert.rejects(f.engine.get({...s,guestId:'other'}),/CONNECT_NOT_FOUND/);
});
test('Expiry, malformed storage and storage failures do not report success',async()=>{
 const f=fixture(),s=f.engine.session('primary','primary');await f.engine.send(s,'m1','hello','en');
 f.advance(14400000);await assert.rejects(f.engine.get(s),/CONNECT_EXPIRED/);await assert.rejects(f.engine.send(s,'m2','late','en'),/CONNECT_EXPIRED/);
 f.map.get(s.conversationId).messages[0].sequence=9;await assert.rejects(f.engine.list(manager('primary')),/CONNECT_INVALID_STORAGE/);
 const g=fixture(),a=g.engine.session('primary','primary');g.platform.db.change=async()=>{throw Error('QUOTA');};
 await assert.rejects(g.engine.send(a,'m1','hello','en'),/QUOTA/);assert.equal(g.events(),0);
});
test('Notifications occur only after a committed mutation and can unsubscribe',async()=>{
 const f=fixture(),s=f.engine.session('primary','primary');let count=0;const off=f.engine.subscribe(()=>count++);
 await f.engine.send(s,'m1','hello','en');assert.equal(count,1);off();await f.engine.send(s,'m2','hello','en');assert.equal(count,1);
});
test('Customer chat localizes all labels and precaches local-only scripts',()=>{
 const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'),html=read('index.html'),sw=read('sw.js');
 for(const lang of core.languages){assert.deepEqual(Object.keys(copy[lang]).sort(),Object.keys(copy.fa).sort());assert.ok(Object.values(copy[lang]).every(Boolean));}
 const assets=['js/connect-core.js','js/connect-demo.js','js/connect-customer.js','js/commerce.js'];
 assert.ok(assets.every((p,i)=>html.includes(p)&&(!i||html.indexOf(assets[i-1])<html.indexOf(p))));
 for(const p of assets)assert.ok(sw.includes(p));
 for(const p of ['js/connect-demo.js','js/connect-customer.js'])assert.doesNotMatch(read(p),/\b(?:fetch|WebSocket|XMLHttpRequest)\b/);
});
