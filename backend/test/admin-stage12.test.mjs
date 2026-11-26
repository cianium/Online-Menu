import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import model from '../../admin/admin-stage12-model.js';
const root = new URL('../../',import.meta.url);
const read = file => fs.readFileSync(new URL(file,root),'utf8');
const example = {name:'Birthday',trigger:'birthday',reward:'percent',value:'15',message:'Happy birthday!',expires:'2028-02-29'};
test('local rule drafts validate percentages, integer amounts, conditions and dates',()=>{
 assert.deepEqual(model.validateRule(example),{name:'Birthday',trigger:'birthday',threshold:null,condition:'',reward:'percent',value:15,gift:'',message:'Happy birthday!',expires:'2028-02-29'});
 for(const value of ['101','0','-1','10.5','1e2',true,[],Infinity])assert.equal(model.validateRule({...example,value}),null);
 assert.equal(model.validateRule({...example,trigger:'threshold'}),null);
 assert.equal(model.validateRule({...example,trigger:'threshold',threshold:'1000'}).threshold,1000);
 assert.equal(model.validateRule({...example,trigger:'custom',condition:'  '}),null);
 assert.equal(model.validateRule({...example,trigger:'custom',condition:'Anniversary'}).condition,'Anniversary');
 assert.equal(model.validateRule({...example,reward:'gift',gift:''}),null);
 assert.equal(model.validateRule({...example,reward:'gift',gift:'Coffee'}).gift,'Coffee');
 assert.equal(model.validateRule({...example,expires:'2026-02-29'}),null);
 assert.equal(model.validateRule({...example,message:' '}),null);
});
test('draft storage rejects corruption, duplicate IDs and invalid shapes without running rules',()=>{
 const rule={...example,id:'test-1',enabled:true,apiKey:'not retained'};
 const parsed=model.readRules(JSON.stringify([rule]));assert.equal(parsed[0].enabled,true);assert.equal(parsed[0].apiKey,undefined);
 for(const raw of ['bad','{}','[null]',JSON.stringify([rule,rule]),JSON.stringify([{...rule,id:'<script>'}]),JSON.stringify(Array.from({length:101},(_,i)=>({...rule,id:String(i)})))])assert.throws(()=>model.readRules(raw));
 assert.deepEqual(model.readRules(null),[]);
 const script=read('admin/admin-stage12.js');assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|\.innerHTML\s*=/);assert.match(script,/!window\.RomanoAPI\?\.enabled/);
});
test('contact settings reject malformed phone and credential-bearing URLs',()=>{
 for(const number of ['','+98 31 0000 0000','۰۹۱۲۳۴۵۶۷۸۹','٠١٢٣٤٥٦٧٨٩'])assert.ok(model.validPhone(number));
 for(const number of ['call me','12','+12+3456','<script>',null])assert.equal(model.validPhone(number),false);
 for(const link of ['','https://instagram.com/romano','http://example.test/',' #'.trim()])assert.ok(model.validSocialUrl(link));
 for(const link of ['javascript:alert(1)','https://trusted.test@evil.test','https://user:secret@example.test','//example.test','relative','data:text/html,hi'])assert.equal(model.validSocialUrl(link),false);
 assert.match(read('admin/admin.js'),/AdminStage12Model\.validSocialUrl\(instagram\)/);
 assert.match(read('admin/rv4-admin-plus.js'),/const urlField = window\.AdminStage12Model\.validSocialUrl/);
});
test('category move preserves IDs, contents and original array; bounds enforced',()=>{
 const original=[{id:'a',name:'A',image:'a.jpg'},{id:'b',name:'B'},{id:'c',name:'C'}];
 assert.deepEqual(model.moveCategory(original,'b',-1).map(x=>[x.id,x.sortOrder]),[['b',0],['a',1],['c',2]]);
 assert.equal(original[0].sortOrder,undefined);assert.equal(original[0].id,'a');
 for(const [id,delta] of [['a',-1],['c',1],['x',1],['b',2]])assert.equal(model.moveCategory(original,id,delta),null);
 assert.match(read('admin/admin.js'),/if \(!\(await saveCategories\(\)\)\) \{ state\.categories = previous; return; \}/);
});
test('five admin bottom destinations match the requested physical order and have real pages',()=>{
 const html=read('admin/index.html');const nav=html.match(/<nav class="admin-bottom-nav"[\s\S]*?<\/nav>/)[0];
 assert.deepEqual([...nav.matchAll(/data-page="([^"]+)"/g)].map(x=>x[1]),['loyalty','products','dashboard','categories','settings']);
 for(const page of ['loyalty','products','dashboard','categories','settings'])assert.match(html,new RegExp(`id="page-${page}"`));
 assert.match(read('admin/admin-stage12.css'),/direction:ltr/);assert.match(read('admin/admin.js'),/\.admin-bottom-nav \[data-page\]/);
 assert.match(read('admin/rv4-admin-plus.js'),/const headerActions = document.querySelector\("\.sidebar-navigation"\)/);
 assert.match(read('admin/admin.js'),/document.querySelector\("\.admin-main"\)\.inert = true/);
});
test('new admin labels are available across four locales and a rating is not fake revenue',()=>{
 const labels=['باشگاه مشتریان','خانه','ناوبری سریع مدیریت','قوانین و کمپین‌ها','تأیید امتیاز آزمایشی','داده کافی برای نمودار وجود ندارد.','انتقال به بالا','شماره تلفن معتبر نیست.'];
 for(const key of labels){const values=[];for(const lang of ['fa','en','tr','ar']){const window={};vm.runInNewContext(read('admin/admin-i18n.js'),{window,localStorage:{getItem:()=>lang},document:{addEventListener(){}}});values.push(window.ROMANO_ADMIN_I18N.get(key));}assert.equal(new Set(values).size,4,key);}
 for(const invalid of [0,6,2.5,'5',null])assert.equal(model.localRating(invalid),null);assert.equal(model.localRating(4),4);
 assert.match(read('js/commerce.js'),/review\.submit\(localStorage,tenant\(\),selected,comment\.value,id\)/);
 assert.match(read('admin/index.html'),/گزارش درآمد نیازمند تاریخچه پرداخت معتبر است/);
});
