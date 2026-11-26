import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../../js/demo-branches.js',import.meta.url),'utf8');
const registry='online_menu_demo_branches_v1';
function fixture({url='https://demo.example/menu/',mode='standalone',locks=true,db=new Map()}={}){
  const window={};
  let pending=Promise.resolve();
  const storage={
    getItem:key=>db.get(key)??null,
    setItem:(key,value)=>db.set(key,value)
  };
  const navigator=locks?{locks:{request:(_key,callback)=>{
    const next=pending.then(callback);
    pending=next.catch(()=>{});
    return next;
  }}}:{};
  runInNewContext(source,{
    window,document:{querySelector:()=>({content:mode})},
    location:new URL(url),URL,URLSearchParams,localStorage:storage,
    navigator,crypto:{randomUUID}
  });
  return {model:window.RomanoDemoBranches,db};
}

test('Connected mode does not expose the standalone branch registry',()=>{
  assert.equal(fixture({mode:'connected'}).model,undefined);
});

test('Primary data retains original unscoped keys and legacy labels',()=>{
  const {model,db}=fixture();
  assert.equal(model.scope('romano_products'),'romano_products');
  assert.equal(model.read()[0].id,'');
  db.set(registry,JSON.stringify([{id:'',name:'Main  branch',tables:[]}]));
  assert.equal(model.read()[0].name,'Main  branch');
  assert.throws(()=>fixture({db:new Map([[registry,'{']])}).model.read());
});

test('Branch creation normalizes names and rejects duplicate legacy variants',async()=>{
  const {model,db}=fixture();
  db.set(registry,JSON.stringify([{id:'',name:'Main  branch',tables:[]}]));
  await assert.rejects(model.save('create','ＭＡＩＮ branch'),/BRANCH_INPUT/);
  const id=await model.save('create','  شعبه   دوم  ');
  assert.equal(model.read().find(row=>row.id===id).name,'شعبه دوم');
  await assert.rejects(model.save('create','شعبه دوم'),/BRANCH_INPUT/);
  await assert.rejects(model.save('create','bad\u202ename'),/BRANCH_INPUT/);
  await assert.rejects(model.save('create',123),/BRANCH_INPUT/);
  await model.save('create','شعبه\u200cها');
});

test('Serialized writes retain branch IDs and existing tables',async()=>{
  const {model,db}=fixture();
  const ids=await Promise.all([model.save('create','North'),model.save('create','South')]);
  assert.equal(new Set(ids).size,2);
  assert.equal(model.read().length,3);
  const branch=fixture({db,url:'https://demo.example/admin/?demoBranch='+ids[0]}).model;
  await branch.save('table','Window','T1');
  await branch.save('rename','North harbour');
  assert.equal(branch.context().name,'North harbour');
  assert.equal(branch.context().tables[0].code,'T1');
  assert.equal(branch.scope('romano_products'),'romano_products:branch:'+ids[0]);
  await assert.rejects(branch.save('table','Duplicate','T1'),/BRANCH_INPUT/);
});

test('Routing rejects unknown branch or table and clears obsolete link parameters',async()=>{
  const {model,db}=fixture();
  const id=await model.save('create','North');
  const branch=fixture({db,url:'https://demo.example/admin/?demoBranch='+id}).model;
  await branch.save('table','Window','T1');
  const qr=new URL(branch.link('../?qr=demo',id,'T1'));
  assert.equal(fixture({db,url:qr.href}).model.context().id,id);
  qr.searchParams.set('demoTable','unknown');
  assert.throws(()=>fixture({db,url:qr.href}).model.context(),/BRANCH_MISSING/);
  qr.searchParams.set('demoBranch',randomUUID());
  assert.throws(()=>fixture({db,url:qr.href}).model.context(),/BRANCH_MISSING/);
  const primary=new URL(branch.link('../?qr=demo&demoBranch=old&demoTable=old','',''));
  assert.equal(primary.searchParams.has('demoBranch'),false);
  assert.equal(primary.searchParams.has('demoTable'),false);
  assert.equal(primary.searchParams.get('qr'),'demo');
});

test('Unavailable Web Locks or corrupt storage never silently resets registry',async()=>{
  const {model,db}=fixture({locks:false});
  await assert.rejects(model.save('create','North'),/BRANCH_STORAGE/);
  assert.equal(db.has(registry),false);
  db.set(registry,'invalid');
  const next=fixture({db}).model;
  await assert.rejects(next.save('create','North'));
  assert.equal(db.get(registry),'invalid');
});
