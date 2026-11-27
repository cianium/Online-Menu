import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const model=require('../../admin/demo-backup-model.js');
const id='12345678-1234-1234-1234-123456789abc';
const directory=[{id:'',name:'Main',tables:[]},{id,name:'Archive',active:false,tables:[{code:'T1',name:'Window'}]}];
function storage(initial=[],failAt=Infinity){
  const data=new Map(initial);
  let writes=0;
  return {data,get length(){return data.size;},key:i=>[...data.keys()][i]??null,
    getItem:key=>data.get(key)??null,setItem(key,value){if(++writes===failAt)throw Error('QUOTA');data.set(key,value);},
    removeItem:key=>data.delete(key)};
}
const validateDirectory=rows=>{assert.deepEqual(rows,directory);return rows;};
const validateRecords=(data)=>{if(data.members!==null&&!Array.isArray(data.members))throw Error('INVALID_MEMBERS');};
const source=()=>storage([
  ['romano_restaurant',JSON.stringify({name:'Main menu'})],
  ['romano_products:branch:'+id,JSON.stringify([{id:'x',name:'Tea'}])],
  ['online_menu_demo_members_v1:romano:branch:'+id,JSON.stringify([{id:'member',orders:[{id:'order'}]}])],
  ['online_menu_loyalty_drafts_v1:romano:branch:'+id,'[]'],
  ['online_menu_demo_review_v2:romano:branch:'+id,JSON.stringify({rating:4})],
  ['online_menu_demo_branches_v1',JSON.stringify(directory)],
  ['online_menu_cart_vq3:romano','{}'],
  ['online_menu_demo_admin_session_v1','1'],
  ['unrelated','private']
]);
const capture=()=>model.capture(source(),directory,validateDirectory,validateRecords);

test('All-branch backup round trips archived directory and business records, never sessions or carts',()=>{
  const payload=capture(), dest=storage([['unrelated','keep']]);
  model.restore(dest,JSON.stringify(payload),validateDirectory,validateRecords);
  const expected=source();
  for(const [key,value] of expected.data){
    if(key.startsWith('romano_')||key.startsWith('online_menu_demo_members')||key.startsWith('online_menu_loyalty')||key.startsWith('online_menu_demo_review')||key==='online_menu_demo_branches_v1')assert.equal(dest.getItem(key),value);
  }
  assert.equal(dest.getItem('online_menu_cart_vq3:romano'),null);
  assert.equal(dest.getItem('online_menu_demo_admin_session_v1'),null);
  assert.equal(dest.getItem('unrelated'),'keep');
});

test('Restore refuses any existing managed data, including orphaned branch records',()=>{
  for(const key of ['romano_products','romano_products:branch:orphan','online_menu_demo_branches_v1']){
    const dest=storage([[key,'original']]);
    assert.throws(()=>model.restore(dest,JSON.stringify(capture()),validateDirectory,validateRecords),/BACKUP_NOT_EMPTY/);
    assert.deepEqual([...dest.data],[[key,'original']]);
  }
});

test('Reject malformed records, unknown or duplicate branch IDs and prototype keys before writing',()=>{
  for(const modify of [
    p=>p.records.pop(),
    p=>p.records[1].id='',
    p=>p.records[1].id='other',
    p=>p.records[1].data.members='{}',
    p=>p.records[1].data.restaurant='{"__proto__":{"polluted":true}}',
    p=>p.records[1].data.extra='secret',
    p=>p.schemaVersion=2
  ]){
    const payload=capture(),dest=storage();
    modify(payload);
    assert.throws(()=>model.restore(dest,JSON.stringify(payload),validateDirectory,validateRecords));
    assert.equal(dest.length,0);
  }
});

test('Failed quota write rolls back inserted records without touching unrelated data',()=>{
  const dest=storage([['unrelated','keep']],3);
  assert.throws(()=>model.restore(dest,JSON.stringify(capture()),validateDirectory,validateRecords),/QUOTA/);
  assert.deepEqual([...dest.data],[['unrelated','keep']]);
});

test('Hospitality settings round trip and legacy v1 backups without them still restore',()=>{
 const db=source();db.setItem('online_menu_hospitality_v1:romano:branch:'+id,JSON.stringify({suggestions:[],coupon:'DEMO10',percent:10}));
 const payload=model.capture(db,directory,validateDirectory,validateRecords),dest=storage();
 model.restore(dest,JSON.stringify(payload),validateDirectory,validateRecords);
 assert.equal(dest.getItem('online_menu_hospitality_v1:romano:branch:'+id),db.getItem('online_menu_hospitality_v1:romano:branch:'+id));
 for(const record of payload.records)delete record.data.hospitality;
 const legacy=storage();model.restore(legacy,JSON.stringify(payload),validateDirectory,validateRecords);
 assert.equal(legacy.getItem('online_menu_hospitality_v1:romano:branch:'+id),null);
});
