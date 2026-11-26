import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const model=require('../../js/demo-members.js');
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
test('Demo registration normalizes RTL digits and preserves opaque browser session, not phone authentication',()=>{
 const db=storage(),a=storage(),b=storage();
 assert.throws(()=>model.register(db,a,'','123'));
 const p=model.register(db,a,'Sample','+۱۲۰۲۵۵۵۰۱۰۱');
 assert.equal(p.phone,'+12025550101');assert.equal(model.active(db,a).id,p.id);
 assert.equal(model.active(db,b),null);
 assert.throws(()=>model.register(db,b,'Other',p.phone),/EXISTING_PROFILE/);
 assert.equal(model.read(db).length,1);
 const order=model.addOrder(db,a,[{name:'Demo dish',quantity:2,price:5}],10);
 assert.equal(model.active(db,a).orders[0].id,order.id);
 assert.throws(()=>model.addOrder(db,b,[{name:'Demo dish',quantity:1,price:5}],5),/NO_PROFILE/);
 model.signOut(a);assert.equal(model.active(db,a),null);
 assert.equal(model.read(db)[0].orders.length,1);
});
test('An active profile still checks the name and requires sign-out before a profile change',()=>{
 const db=storage(),session=storage(),secondTab=storage();
 const first=model.register(db,session,'Sample A','+12025550112');
 const second=model.register(db,secondTab,'Sample B','+12025550113');
 model.addOrder(db,session,[{name:'Sample dish',quantity:1,price:5}],5);
 assert.throws(()=>model.register(db,session,'Different name',first.phone),/EXISTING_PROFILE/);
 assert.throws(()=>model.register(db,session,second.name,second.phone),/ACTIVE_PROFILE/);
 assert.throws(()=>model.register(db,session,'New sample','+12025550114'),/ACTIVE_PROFILE/);
 assert.equal(model.register(db,session,' Sample  A ','+١٢٠٢٥٥٥٠١١٢').orders.length,1);
 assert.equal(model.active(db,session).id,first.id);
 assert.equal(model.read(db).length,2);
 model.signOut(session);
 assert.equal(model.register(db,session,second.name,second.phone).id,second.id);
 assert.equal(model.active(db,session).orders.length,0);
});

test('Demo membership storage failure is not reported as success',()=>{
 const db=storage(),session=storage();session.setItem=()=>{throw Error('BLOCKED')};
 assert.throws(()=>model.register(db,session,'Sample','+12025550102'));
 assert.deepEqual(model.read(db),[]);
});

test('Corrupted member/order data and inconsistent totals fail closed',()=>{
 const db=storage(),session=storage();model.register(db,session,'Sample','+12025550103');
 assert.throws(()=>model.addOrder(db,session,[{name:'Demo dish',quantity:2,price:5}],1),/INVALID_ORDER/);
 const rows=model.read(db);rows[0].orders=[{id:'bad',total:10}];db.setItem(model.key,JSON.stringify(rows));
 assert.throws(()=>model.active(db,session),/INVALID_STORAGE/);
});

test('Matching sample name and phone resume history in another browser tab',()=>{
 const db=storage(),a=storage(),b=storage();
 const member=model.register(db,a,'Sample Customer','+12025550104');
 const order=model.addOrder(db,a,[{name:'Demo dish',quantity:1,price:5}],5);
 model.signOut(a);
 assert.equal(model.active(db,a),null);
 assert.throws(()=>model.register(db,a,'Wrong name',member.phone),/EXISTING_PROFILE/);
 const crossTab=model.register(db,b,' Sample   Customer ',member.phone);
 assert.equal(crossTab.id,member.id);
 assert.equal(crossTab.orders[0].id,order.id);
 model.signOut(b);
 const resumed=model.register(db,a,' Sample Customer ','+۱۲۰۲۵۵۵۰۱۰۴');
 assert.equal(resumed.id,member.id);
 assert.equal(resumed.orders[0].id,order.id);
 assert.equal(model.read(db).length,1);
 model.signOut(a);
 assert.equal(model.active(db,a),null);
 a.setItem=()=>{throw Error('BLOCKED')};
 assert.throws(()=>model.register(db,a,member.name,member.phone),/BLOCKED/);
 assert.equal(model.active(db,a),null);
});

test('Storage lease serializes concurrent demo registration even with ineffective Web Locks',async()=>{
 const db=storage(),a=storage(),b=storage();
 const localDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:db});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,commit)=>commit()}}});
  await Promise.all([
   model.mutate(()=>model.register(db,a,'Synthetic A','+12025550110')),
   model.mutate(()=>model.register(db,b,'Synthetic B','+12025550111'))
  ]);
  assert.equal(model.read(db).length,2);
 }finally{
  if(localDescriptor)Object.defineProperty(globalThis,'localStorage',localDescriptor);else delete globalThis.localStorage;
  if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;
 }
});

test('Both international prefixes recover the same legacy membership and preserve its history',()=>{
 const db=storage(),session=storage();
 const original=model.register(db,session,'Sample','+12025550101');
 const order=model.addOrder(db,session,[{name:'Sample',price:5,quantity:1}],5);
 model.signOut(session);
 const [legacy]=model.read(db);
 db.setItem(model.key,JSON.stringify([{...legacy,phone:'0012025550101'}]));
 const returned=model.register(db,session,'Sample','+۱۲۰۲۵۵۵۰۱۰۱');
 assert.equal(returned.id,original.id);
 assert.equal(returned.orders[0].id,order.id);
 assert.equal(model.phone('٠٠١ ٢٠٢ ٥٥٥ ٠١٠١'),original.phone);
 assert.throws(()=>model.register(db,session,'Other','0012025550101'),/EXISTING_PROFILE/);
 assert.equal(model.read(db).length,1);
});
