import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../../js/demo-members.js',import.meta.url),'utf8');
function fixture({table=null,locks=true}={}){
 let seq=0,tail=Promise.resolve();const map=new Map();
 const tables=[{code:'T1',name:'Window'},{code:'T2',name:'Garden'}];
 const directory={id:'',name:'Restaurant',tables};
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
 const ctx={crypto:{randomUUID:()=> 'request-'+ ++seq},RomanoDemoBranches:{id:'',table,scope:k=>k,context:()=>table?directory:null,read:()=>[directory]},navigator:locks?{locks:{request:(_key,fn)=>{const p=tail.then(fn);tail=p.catch(()=>{});return p;}}}:{},localStorage:storage};
 runInNewContext(source,ctx);
 return {model:ctx.RomanoDemoMembers,storage,tables};
}
test('Service request creation, acceptance and completion preserve identity and timing',()=>{
 const {model:m,storage:s}=fixture();
 m.setRequest(s,'T1','waiter','pending',undefined,null,100);
 const id=m.requestDetails(s,'T1').waiter.id;
 assert.equal(m.requests(s,'T1').waiter,'pending');
 m.setRequest(s,'T1','waiter','accepted','pending',id,600);
 m.setRequest(s,'T1','waiter','completed','accepted',id,1100);
 const r=m.requestDetails(s,'T1').waiter;
 assert.equal(r.id,id);assert.equal(r.createdAt,100);assert.equal(r.acceptedAt,600);assert.equal(r.completedAt,1100);
 assert.equal(m.serviceStats([r]).meanResponseMs,500);
});
test('Duplicate and stale requests cannot modify a replacement request',()=>{
 const {model:m,storage:s}=fixture();
 m.setRequest(s,'T1','bill','pending',undefined,null,100);
 const first=m.requestDetails(s,'T1').bill.id;
 assert.throws(()=>m.setRequest(s,'T1','bill','pending',undefined,null,200),/HP_STALE/);
 m.setRequest(s,'T1','bill',undefined,'pending',first,200);
 m.setRequest(s,'T1','bill','pending',undefined,null,300);
 const second=m.requestDetails(s,'T1').bill.id;
 assert.notEqual(first,second);
 assert.throws(()=>m.setRequest(s,'T1','bill','accepted','pending',first,400),/HP_STALE/);
 assert.equal(m.requestDetails(s,'T1').bill.id,second);
 m.setRequest(s,'T1','bill','accepted','pending',second,400);
 assert.throws(()=>m.setRequest(s,'T1','bill',undefined,'accepted',second,500),/HP_REQUEST/);
});
test('Table QR context rejects writes to other tables and unknown codes',()=>{
 const {model:m,storage:s}=fixture({table:'T1'});
 assert.throws(()=>m.setRequest(s,'T2','water','pending',undefined,null,100),/HP_TABLE/);
 assert.throws(()=>m.setRequest(s,'unknown','water','pending',undefined,null,100),/HP_TABLE/);
 m.setRequest(s,'T1','water','pending',undefined,null,100);
 assert.equal(Object.keys(m.requests(s,'T2')).length,0);
});
test('Queue prioritizes active requests and does not fabricate legacy response timings',()=>{
 const {model:m,storage:s,tables}=fixture();
 s.setItem(m.requestPrefix+'T2',JSON.stringify({napkin:true}));
 m.setRequest(s,'T1','bill','pending',undefined,null,100);
 m.setRequest(s,'T1','water','pending',undefined,null,110);
 const rows=m.serviceQueue(s,tables);
 assert.equal(rows.map(r=>r.kind).join(','),'bill,water,napkin');
 assert.equal(m.serviceStats(rows).meanResponseMs,null);
 m.setRequest(s,'T2','napkin','accepted','pending',null,120);
 assert.equal(m.requestDetails(s,'T2').napkin.acceptedAt,null);
 const id=m.requestDetails(s,'T1').bill.id;
 m.setRequest(s,'T1','bill','completed','pending',id,150);
 assert.equal(m.serviceStats(m.serviceQueue(s,tables)).responseSamples,0);
});
test('Corrupt metadata and clock regressions are handled without inventing samples',()=>{
 const {model:m,storage:s}=fixture();
 m.setRequest(s,'T1','waiter','pending',undefined,null,500);
 const id=m.requestDetails(s,'T1').waiter.id;
 m.setRequest(s,'T1','waiter','accepted','pending',id,400);
 assert.equal(m.requestDetails(s,'T1').waiter.acceptedAt,500);
 s.setItem(m.requestPrefix+'T1',JSON.stringify({waiter:'pending',_meta:{waiter:{id:'x',createdAt:100,acceptedAt:200,completedAt:null}}}));
 assert.throws(()=>m.requestDetails(s,'T1'),/HP_REQUEST/);
});
test('Concurrent mutations reject stale snapshots and fail closed without Web Locks',async()=>{
 const {model:m,storage:s}=fixture();
 const results=await Promise.allSettled([m.mutateRequest('T1',()=>m.setRequest(s,'T1','water','pending',undefined,null,100)),m.mutateRequest('T1',()=>m.setRequest(s,'T1','water','pending',undefined,null,100))]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected').length,1);
 const blocked=fixture({locks:false});
 await assert.rejects(blocked.model.mutateRequest('T1',()=>{}),/HP_STORAGE_BUSY/);
});
