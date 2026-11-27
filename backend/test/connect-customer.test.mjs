import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const core=require('../../js/connect-core.js');
const {copy,createPreview}=require('../../js/connect-customer.js');
test('Customer chat has every UI label in all four languages',()=>{
 for(const lang of core.languages){assert.deepEqual(Object.keys(copy[lang]).sort(),Object.keys(copy.fa).sort());assert.ok(Object.values(copy[lang]).every(Boolean));}
});
test('Preview preserves draft and messages on language change and isolates branch and mode',()=>{
 let n=0,now=100;const p=createPreview(core,()=>String(++n),()=>now);
 p.select('primary','fa');p.send('<b>سلام</b>','fa');p.draft='draft';
 p.select('primary','en');assert.equal(p.read()[0].text,'<b>سلام</b>');assert.equal(p.draft,'draft');
 p.select('other','ar');assert.deepEqual(p.read(),[]);assert.equal(p.draft,'');
 p.send('Hello','en');p.select(null,'en');assert.deepEqual(p.read(),[]);
});
test('Invalid and expired messages fail; resetting starts a new preview',()=>{
 let n=0,now=100;const p=createPreview(core,()=>String(++n),()=>now);
 p.select('primary','en');assert.throws(()=>p.send('  ','en'),/CONNECT_INVALID_MESSAGE/);assert.equal(p.read().length,0);
 now+=14400000;assert.throws(()=>p.send('late','en'),/CONNECT_EXPIRED/);
 p.clear();p.select('primary','en');assert.deepEqual(p.read(),[]);
});
test('Connect assets load in dependency order and are precached; preview has no external transport',()=>{
 const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
 const html=read('index.html'),sw=read('sw.js'),ui=read('js/connect-customer.js'),commerce=read('js/commerce.js');
 assert.ok(html.indexOf('js/connect-core.js')<html.indexOf('js/connect-customer.js')&&html.indexOf('js/connect-customer.js')<html.indexOf('js/commerce.js'));
 for(const p of ['css/connect.css','js/connect-core.js','js/connect-customer.js']){assert.ok(html.includes(p));assert.ok(sw.includes(p));}
 assert.doesNotMatch(ui,/\b(?:fetch|localStorage|sessionStorage|indexedDB|WebSocket)\b/);
 assert.match(commerce,/openPanel = \(panel='chat'/);
 assert.match(commerce,/activePanel==='chat'/);
});
