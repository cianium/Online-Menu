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
test('Demo membership storage failure is not reported as success',()=>{
 const db=storage(),session=storage();session.setItem=()=>{throw Error('BLOCKED')};
 assert.throws(()=>model.register(db,session,'Sample','+12025550102'));
 assert.deepEqual(model.read(db),[]);
});
