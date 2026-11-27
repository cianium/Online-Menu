import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const {createLiveClient,createPoller}=createRequire(import.meta.url)('../../js/connect-live.js');
const id='00000000-0000-4000-8000-000000000001',mid='00000000-0000-4000-8000-000000000002',a='a'.repeat(64),b='b'.repeat(64);
const conversation={id,tableId:'T1',language:'fa',status:'new',version:2,guestMessageCount:1,createdAt:100,updatedAt:110,expiresAt:200,assigneeId:null,orderId:null};
const msg={sequence:1,clientId:mid,senderKind:'guest',language:'fa',text:'سلام',createdAt:110,own:true};
const data={conversation,messages:[msg]};
function fixture(){
 let mode='public',calls=[],reply={ok:true,status:200,json:async()=>({data})};const map=new Map();
 const root={sessionStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},AbortSignal:{timeout:()=>({})},fetch:async(path,options)=>{calls.push({path,options});return typeof reply==='function'?reply():reply;}};
 const client=createLiveClient(root,()=>mode);
 return {client,calls,map,root,mode:v=>mode=v,reply:v=>reply=v};
}
test('Live guest transport never calls the API in demo or with missing binding',async()=>{
 const f=fixture();await assert.rejects(f.client.get(a),/CONNECT_EXPIRED/);assert.equal(f.calls.length,0);
 assert.equal(f.client.setBinding(a),true);f.mode('demo');await assert.rejects(f.client.get(a),/CONNECT_EXPIRED/);assert.equal(f.calls.length,0);
 assert.equal(f.client.setBinding('bad'),false);assert.equal(f.client.binding(),null);
});
test('Live requests use tab binding and same-origin no-store transport',async()=>{
 const f=fixture();f.client.setBinding(a);const s=f.client.sessionForCurrent();
 assert.equal((await f.client.get(s)).messages[0].text,'سلام');
 await f.client.send(s,mid,'سلام','fa');
 assert.equal(f.calls[0].path,'/api/v1/orders/connect');
 assert.equal(f.calls[0].options.credentials,'same-origin');assert.equal(f.calls[0].options.cache,'no-store');
 assert.equal(f.calls[0].options.headers['X-Romano-Connect-Binding'],a);
 assert.equal(f.calls[1].options.method,'POST');
 assert.deepEqual(JSON.parse(f.calls[1].options.body),{clientId:mid,text:'سلام',language:'fa'});
 assert.equal(f.map.size,1);assert.equal([...f.map.values()][0],a);
});
test('An in-flight response from a replaced guest binding is discarded',async()=>{
 const f=fixture();f.client.setBinding(a);
 let resolve;f.reply(()=>new Promise(r=>resolve=r));
 const old=f.client.get(a);f.client.setBinding(b);
 resolve({ok:true,status:200,json:async()=>({data})});
 await assert.rejects(old,/CONNECT_EXPIRED/);
});
test('Live error mapping and invalid response validation fail closed',async()=>{
 const f=fixture();f.client.setBinding(a);
 f.reply({ok:false,status:401,json:async()=>({error:{code:'TABLE_SESSION_REQUIRED'}})});await assert.rejects(f.client.get(a),/CONNECT_EXPIRED/);
 f.reply({ok:false,status:503,json:async()=>({error:{code:'CONNECT_UNAVAILABLE'}})});await assert.rejects(f.client.get(a),/CONNECT_UNAVAILABLE/);
 f.reply({ok:false,status:429,json:async()=>({error:{code:'CONNECT_RATE_LIMIT'}})});await assert.rejects(f.client.get(a),/CONNECT_RATE_LIMIT/);
 f.reply({ok:true,status:200,json:async()=>({data:{conversation,messages:[{...msg,sequence:2}]}})});await assert.rejects(f.client.get(a),/CONNECT_INVALID_RESPONSE/);
});
test('Snapshots and inbox project only expected fields and reject duplicate rows',()=>{
 const f=fixture(),snapshot=f.client.snapshot({conversation:{...conversation,guest_token_id:'private'},messages:[{...msg,sender_user_id:'private'}]});
 assert.equal(snapshot.conversation.guest_token_id,undefined);assert.equal(snapshot.messages[0].sender_user_id,undefined);
 assert.deepEqual(f.client.snapshot({conversation:null,messages:[]}),{conversation:null,messages:[]});
 assert.throws(()=>f.client.snapshot({conversation:null,messages:[msg]}),/CONNECT_INVALID_RESPONSE/);
 assert.throws(()=>f.client.inbox([{...conversation,lastMessage:msg},{...conversation,lastMessage:msg}]),/CONNECT_INVALID_RESPONSE/);
});
test('Storage failures do not retain an active previous binding',()=>{
 const f=fixture();f.client.setBinding(a);f.root.sessionStorage.removeItem=()=>{throw Error('blocked');};f.root.sessionStorage.setItem=()=>{throw Error('blocked');};
 assert.equal(f.client.setBinding(b),false);assert.equal(f.client.binding(),null);
});
test('Polling serializes refresh, backs off, respects visibility and stops',async()=>{
 let n=0,visible=true,calls=0;const tasks=new Map();
 const root={setTimeout:(fn,ms)=>{tasks.set(++n,{fn,ms});return n;},clearTimeout:id=>tasks.delete(id)};
 const run=async()=>{const [id,t]=tasks.entries().next().value;tasks.delete(id);await t.fn();};
 let answer=false;const p=createPoller(root,async()=>{calls++;return answer;},{interval:5,maxDelay:20,visible:()=>visible});
 assert.equal([...tasks.values()][0].ms,0);await run();assert.equal(calls,1);assert.equal([...tasks.values()][0].ms,10);
 await run();assert.equal([...tasks.values()][0].ms,20);answer=true;p.wake();await run();assert.equal([...tasks.values()][0].ms,5);
 visible=false;await run();assert.equal(calls,3);p.stop();assert.equal(tasks.size,0);p.wake();assert.equal(tasks.size,0);
});
test('Live backend remains gated and the SQL review draft denies browser-role access',()=>{
 const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
 for(const p of ['supabase/functions/romano-order/index.ts','supabase/functions/romano-admin/index.ts'])assert.match(read(p),/ROMANO_CONNECT_ENABLED/);
 const order=read('supabase/functions/romano-order/index.ts'),admin=read('supabase/functions/romano-admin/index.ts'),sql=read('docs/sql/R24_CONNECT_REVIEW.sql');
 assert.match(order,/x-romano-connect-binding/);assert.match(order,/sha256Hex\("romano-connect-v1:"\+token\)/);
 assert.match(admin,/resolveMember\(p,undefined,"manager"\)/);
 assert.match(sql,/guest_token_id uuid not null unique references public\.table_session_tokens/);
 assert.match(sql,/alter table public\.romano_connect_messages enable row level security/);
 assert.match(sql,/from public,anon,authenticated/);assert.match(sql,/security invoker/);
});
