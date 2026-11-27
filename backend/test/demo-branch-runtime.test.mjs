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

test('Connected mode does not expose the demo table registry',()=>assert.equal(fixture({mode:'connected'}).model,undefined));
test('Single restaurant preserves primary keys and rejects branch creation, rename and switching',async()=>{
 const {model,db}=fixture();
 const old=randomUUID();db.set(registry,JSON.stringify([{id:'',name:'Main',tables:[]},{id:old,name:'Archived',tables:[{code:'T1',name:'Old table'}]}]));
 assert.equal(model.scope('romano_products'),'romano_products');assert.equal(model.read().length,1);
 await assert.rejects(model.save('create','Other'),/BRANCH_INPUT/);
 await assert.rejects(model.save('rename','Other'),/BRANCH_INPUT/);
 assert.equal(model.setActive,undefined);
 assert.throws(()=>fixture({db,url:'https://demo.example/?demoBranch='+old}).model.context(),/BRANCH_MISSING/);
 assert.throws(()=>model.link('../?qr=demo',old,'T1'),/BRANCH_MISSING/);
 await model.save('table','Window','T1');
 assert.equal(JSON.parse(db.get(registry))[1].tables[0].name,'Old table');
 assert.equal(model.read()[0].tables[0].name,'Window');
});
test('Table codes are unique and produce a table-only QR link',async()=>{
 const {model,db}=fixture();
 await Promise.all([model.save('table','Window','T1'),model.save('table','Garden','T2')]);
 await assert.rejects(model.save('table','Duplicate','T1'),/BRANCH_INPUT/);
 await assert.rejects(model.save('table','Bad','<bad>'),/BRANCH_INPUT/);
 const qr=new URL(model.link('../?qr=demo&demoBranch=old','','T1'));
 assert.equal(qr.searchParams.has('demoBranch'),false);
 assert.equal(qr.searchParams.get('demoTable'),'T1');
 assert.equal(fixture({db,url:qr.href}).model.context().tables[0].name,'Window');
 qr.searchParams.set('demoTable','unknown');
 assert.throws(()=>fixture({db,url:qr.href}).model.context(),/BRANCH_MISSING/);
});
test('Legacy multi-location backup cannot silently restore into one restaurant',()=>{
 const {model}=fixture();
 assert.throws(()=>model.validateDirectory([{id:'',name:'Main',tables:[]},{id:randomUUID(),name:'Old',tables:[]}]),/BRANCH_DATA/);
});
test('Table writes fail closed without serialization',async()=>{
 await assert.rejects(fixture({locks:false}).model.save('table','Window','T1'),/BRANCH_STORAGE/);
});

 test('Table QR generation rejects unknown codes, cross-origin targets and ambiguous query parameters',async()=>{
  const {model,db}=fixture();
  await model.save('table','Window','T1');
  assert.throws(()=>model.link('../?qr=demo','','unknown'),/BRANCH_MISSING/);
  assert.throws(()=>model.link('https://other.example/','','T1'),/BRANCH_MISSING/);
  for(const query of ['demoTable=T1&demoTable=T1','demoTable=T1&demoTable=unknown','demoTable=T1&demoBranch=&demoBranch=old']){
   assert.throws(()=>fixture({db,url:'https://demo.example/?'+query}).model.context(),/BRANCH_MISSING/);
  }
  const url=new URL(model.link('../?demoTable=old&demoTable=other','','T1'));
  assert.deepEqual(url.searchParams.getAll('demoTable'),['T1']);
 });
