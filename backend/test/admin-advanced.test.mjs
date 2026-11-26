import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import review from '../../js/demo-review.js';
import model from '../../admin/admin-stage12-model.js';
const read = file => fs.readFileSync(new URL(`../../${file}`,import.meta.url),'utf8');
function store(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}

test('Review identity prevents a stale moderation decision on a new submission of the same score',()=>{
 const storage=store();const first=review.submit(storage,'romano',4,'Old','id-1');
 assert.equal(review.moderate(storage,'romano',first,'approved'),true);
 assert.equal(review.read(storage,'romano').status,'approved');
 const next=review.submit(storage,'romano',4,'<b>New</b>','id-2');
 assert.equal(next.status,'pending');assert.equal(review.moderate(storage,'romano',first,'approved'),false);
 assert.deepEqual(review.read(storage,'romano'),next);
 assert.equal(review.moderate(storage,'romano',next,'rejected'),true);
 assert.equal(review.read(storage,'romano').status,'rejected');assert.equal(review.read(storage,'other'),null);
});
test('Review legacy approval cannot be inherited and corrupted records cannot be moderated',()=>{
 const storage=store();storage.setItem('online_menu_demo_rating:romano','5');storage.setItem('online_menu_demo_rating_moderation:romano','{"rating":5,"status":"approved"}');
 const legacy=review.read(storage,'romano');assert.deepEqual(legacy,{id:'legacy-5',rating:5,comment:'',status:'pending'});
 assert.equal(review.moderate(storage,'romano',legacy,'approved'),true);
 assert.equal(review.read(storage,'romano').status,'approved');
 for(const bad of ['{}','bad','null','[]','{"id":"x","rating":5,"comment":"","status":"paid"}']){storage.setItem(review.key('romano'),bad);assert.throws(()=>review.read(storage,'romano'));}
 assert.throws(()=>review.submit(storage,'romano',6,'','x'));assert.throws(()=>review.submit(storage,'romano',4,'a'.repeat(501),'x'));assert.throws(()=>review.submit(storage,'romano',4,'','<script>'));
});
test('Failed review write leaves previous approved review intact; no fake success',()=>{
 const storage=store();const first=review.submit(storage,'romano',3,'OK','one');assert.equal(review.moderate(storage,'romano',first,'approved'),true);
 const before=review.read(storage,'romano');storage.setItem=()=>{throw Error('Quota');};
 assert.throws(()=>review.submit(storage,'romano',3,'Changed','two'),/Quota/);assert.deepEqual(review.read(storage,'romano'),before);
 assert.throws(()=>review.moderate(storage,'romano',before,'rejected'),/Quota/);assert.deepEqual(review.read(storage,'romano'),before);
});
test('Order summaries distinguish zero from malformed and capped data and never compute revenue from order values',()=>{
 const status=['submitted','accepted','preparing','ready','served','delivered','completed','rejected','cancelled'];
 const rows=status.map((status,i)=>({id:String(i),status,totalMinor:99999,paymentStatus:'paid'}));
 assert.deepEqual(model.summarizeOrders(rows),{count:6,counts:{submitted:1,preparing:2,ready:1,other:2},sampleSize:9,limited:false});
 assert.equal(model.summarizeOrders([]).count,0);assert.equal(model.summarizeOrders(Array.from({length:100},(_,i)=>({id:String(i),status:'ready'}))).limited,true);
 for(const bad of [undefined,{},null,[null],[{id:'a',status:'unknown'}],[rows[0],rows[0]],Array(101).fill(rows[0])])assert.equal(model.summarizeOrders(bad),null);
});
test('Settings reset and draft preview are local, all new labels translate and user text is never HTML',()=>{
 const html=read('admin/index.html'),script=read('admin/admin-stage12.js');
 assert.equal((html.match(/fieldset class="settings-group"/g)||[]).length,2);
 assert.match(html,/id="settings-validation" role="status"/);assert.match(html,/id="settings-reset"/);
 assert.match(script,/comment\.textContent=review\.comment/);assert.match(script,/loyalty-message-preview'\)\.textContent=message/);
 assert.match(script,/baseline!==expectedBaseline/);assert.match(script,/localStorage\.getItem\(ruleKey\)!==baseline/);assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|\.innerHTML\s*=/);
 for(const key of ['هویت رستوران','راه‌های ارتباطی','پیش‌نمایش متن پیامک','تنظیمات پیامکی','نظر تغییر کرده است؛ دوباره بررسی کنید.','بر اساس حداکثر ۱۰۰ سفارش اخیر']){
  const translations=['fa','en','tr','ar'].map(lang=>{const window={};vm.runInNewContext(read('admin/admin-i18n.js'),{window,localStorage:{getItem:()=>lang},document:{addEventListener(){}}});return window.ROMANO_ADMIN_I18N.get(key);});assert.equal(new Set(translations).size,4,key);
 }
});
const uuid='12345678-1234-1234-1234-123456789abc';
async function callback({search,active=null,response=null,fail=false}){
 const source=read('js/commerce.js');const snippet=source.slice(source.indexOf('  async function paymentReturn()'),source.indexOf('  function init()',source.indexOf('  async function paymentReturn()')));
 const toast={hidden:true,textContent:''},calls=[],removed=[],history=[];const ctx={URLSearchParams,AbortSignal,location:{search,pathname:'/index.html',hash:'#menu'},history:{replaceState:(_a,_b,url)=>history.push(url)},document:{querySelector:()=>toast},window:{setTimeout(){}},activeOrder:active,t:k=>k,fetch:async(url,opts)=>{calls.push({url,opts});if(fail)throw Error('offline');return response;},orderKey:()=> 'order',paymentRequestKey:id=>`payment:${id}`,save(){},remove:k=>removed.push(k),render(){}};
 vm.createContext(ctx);await vm.runInContext(`${snippet}\npaymentReturn()`,ctx);return {toast,calls,removed,history};
}
const ok=data=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({data})});
test('Forged payment query cannot show success, display reference or erase idempotency state',async()=>{
 const out=await callback({search:`?payment=success&order=${uuid}&ref=FORGED&lang=fa`});
 assert.equal(out.toast.textContent,'paymentUnverified');assert.equal(out.calls.length,0);assert.equal(out.removed.length,0);assert.equal(out.history[0],'/index.html?lang=fa#menu');
});
test('Payment callback only trusts the exact server-authenticated order, fails closed offline and ignores unverified URL values',async()=>{
 for(const options of [{response:ok({id:'other',paymentStatus:'paid'})},{response:ok({id:uuid,paymentStatus:'pending'})},{fail:true},{response:{ok:false}}]){
  const out=await callback({search:`?payment=success&order=${uuid}`,active:{id:uuid},...options});assert.equal(out.toast.textContent,'paymentUnverified');assert.deepEqual(out.removed,[]);assert.equal(out.calls.length,1);
 }
 const paid=await callback({search:`?payment=failed&order=${uuid}&ref=fake`,active:{id:uuid},response:ok({id:uuid,paymentStatus:'paid'})});assert.equal(paid.toast.textContent,'paid');assert.deepEqual(paid.removed,[`payment:${uuid}`]);assert.equal(paid.calls[0].opts.credentials,'include');
 const failed=await callback({search:`?payment=success&order=${uuid}`,active:{id:uuid},response:ok({id:uuid,paymentStatus:'failed'})});assert.equal(failed.toast.textContent,'failed');
});
