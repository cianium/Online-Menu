import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const storage = () => { const map=new Map(); return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}; };
function adminContext(localStorage,navigator={}) {
  const s=read('admin/admin.js');
  const ctx=vm.createContext({localStorage,navigator,console});
  vm.runInContext(s.slice(s.indexOf('const STORAGE_KEYS ='),s.indexOf('const ROMANO_NATIVE_ALERT'))+s.slice(s.indexOf('const RomanoStorage ='),s.indexOf('/* =========================================================\n   APPLICATION STATE'))+s.slice(s.indexOf('let localCatalogRevision = null;'),s.indexOf('async function loadState()')),ctx);
  vm.runInContext('localCatalogRevision=readCatalogRevision()',ctx);
  return ctx;
}
test('Local catalog rejects stale admin writes and preserves latest values',async()=>{
  const localStorage=storage(),a=adminContext(localStorage),b=adminContext(localStorage);
  await vm.runInContext('commitLocalCatalog([[STORAGE_KEYS.products,[{id:"new"}]]])',a);
  await assert.rejects(vm.runInContext('commitLocalCatalog([[STORAGE_KEYS.products,[]]])',b),{code:'LOCAL_CATALOG_CONFLICT'});
  assert.equal(localStorage.getItem('romano_products'),'[{"id":"new"}]');
  await vm.runInContext('commitLocalCatalog([[STORAGE_KEYS.products,[]]])',a);
  assert.equal(localStorage.getItem('romano_products'),'[]');
});
test('Local catalog uses Web Locks when available and keeps storage failure visible',async()=>{
  const localStorage=storage();let locked=false;
  const ctx=adminContext(localStorage,{locks:{request:async(name,fn)=>{assert.equal(name,'romano-demo-catalog');locked=true;return fn();}}});
  await vm.runInContext('commitLocalCatalog([[STORAGE_KEYS.restaurant,{name:"QA"}]])',ctx);
  assert.ok(locked);localStorage.setItem=()=>{throw Error('quota');};
  await assert.rejects(vm.runInContext('commitLocalCatalog([[STORAGE_KEYS.products,[]]])',ctx),/Local storage write failed/);
});
test('Web Locks callback stays fulfilled on stale writes and quota failures; caller still rejects',async()=>{
  const localStorage=storage();const outcomes=[];
  const navigator={locks:{request:async(name,fn)=>{
    assert.equal(name,'romano-demo-catalog');
    let result;
    assert.doesNotThrow(()=>{result=fn();},'Expected failure must not escape the Web Locks callback');
    outcomes.push(result.ok);
    return result;
  }}};
  const a=adminContext(localStorage,navigator),b=adminContext(localStorage,navigator);
  await vm.runInContext('commitLocalCatalog([[STORAGE_KEYS.products,[{id:"new"}]]])',a);
  await assert.rejects(vm.runInContext('commitLocalCatalog([[STORAGE_KEYS.products,[]]])',b),{code:'LOCAL_CATALOG_CONFLICT'});
  assert.equal(localStorage.getItem('romano_products'),'[{"id":"new"}]');
  localStorage.setItem=()=>{throw Error('quota');};
  await assert.rejects(vm.runInContext('commitLocalCatalog([[STORAGE_KEYS.products,[]]])',a),/Local storage write failed/);
  assert.equal(localStorage.getItem('romano_products'),'[{"id":"new"}]');
  assert.deepEqual(outcomes,[true,false,false]);
});
test('Inactive branch guard rejects catalog writes without swallowing the error',async()=>{
  const localStorage=storage(),ctx=adminContext(localStorage);
  localStorage.setItem('romano_products','[]');
  vm.runInContext('localCatalogRevision=readCatalogRevision()',ctx);
  ctx.RomanoDemoBranches={context(){throw Error('BRANCH_MISSING');}};
  await assert.rejects(vm.runInContext('commitLocalCatalog([[STORAGE_KEYS.products,[{id:"new"}]]])',ctx),/BRANCH_MISSING/);
  assert.equal(localStorage.getItem('romano_products'),'[]');
});
function cartContext(mode='demo') {
  const source=read('js/commerce.js'),localStorage=storage();
  const ctx=vm.createContext({localStorage,menuDataMode:mode,menu:[{id:'a',price:10},{id:'b',price:20},{id:'zero',price:0}],saved:[],getProductById:id=>ctx.menu.find(p=>p.id===id&&p.active!==false)});
  vm.runInContext('let cart;const itemNotes=new Map();function cartKey(){return "cart"}function save(k,v){saved.push(JSON.stringify(v));}'+source.slice(source.indexOf('  function normalizeCart('),source.indexOf('  function localized('))+source.slice(source.indexOf('  function count()'),source.indexOf('  function announce(')),ctx);
  return ctx;
}
test('Cart validates saved quantities, removes unavailable products and updates totals',()=>{
  const ctx=cartContext();
  vm.runInContext('cart=normalizeCart(JSON.parse(\'{"a":2,"b":200,"missing":1,"zero":1,"bad":-1,"str":"2","__proto__":1}\'));reconcileCart()',ctx);
  assert.equal(vm.runInContext('JSON.stringify(cart)',ctx),'{"a":2,"b":99}');
  vm.runInContext('itemNotes.set("a","No onions");itemNotes.set("b","Extra sauce")',ctx);
  ctx.menu[0].active=false;ctx.menu[1].price=30;
  vm.runInContext('reconcileCart()',ctx);
  assert.equal(vm.runInContext('itemNotes.has("a")',ctx),false);assert.equal(vm.runInContext('itemNotes.get("b")',ctx),'Extra sauce');
  assert.equal(vm.runInContext('count()',ctx),99);assert.equal(vm.runInContext('total()',ctx),2970);
});
test('Unavailable and offline catalog do not erase saved cart',()=>{
  for(const mode of ['loading','offline','unavailable']) {
    const ctx=cartContext(mode);
    vm.runInContext('cart=normalizeCart({a:2});menu=[];reconcileCart()',ctx);
    assert.equal(vm.runInContext('JSON.stringify(cart)',ctx),'{"a":2}');assert.equal(vm.runInContext('count()',ctx),0);assert.deepEqual(ctx.saved,[]);
  }
});
test('Integration hooks retain all four conflict translations and local-only submission boundary',()=>{
  const s=read('admin/admin-i18n.js');assert.match(s,/Data changed in another tab/);assert.match(s,/Veriler başka bir sekmede değişti/);assert.match(s,/تغيرت البيانات في تبويب آخر/);
  assert.match(read('js/commerce.js'),/menuDataMode !== "public"/);
  assert.match(read('js/commerce.js'),/window.addEventListener\("storage"/);
});
