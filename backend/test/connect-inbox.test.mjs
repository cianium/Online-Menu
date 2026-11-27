import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const {copy,model}=createRequire(import.meta.url)('../../admin/connect-inbox.js');
const row={id:'conversation-1',status:'new',expiresAt:1000,guestMessageCount:4,lastMessage:{text:'Water please'},assigneeId:null};
test('Inbox unread counts are based on guest messages, not staff replies',()=>{
 assert.equal(model.unread(row,2),2);assert.equal(model.unread(row,8),0);assert.equal(model.unread(row,-1),4);
});
test('Inbox filters by text, lifecycle, unread and expired status',()=>{
 assert.equal(model.select([row],'WATER','new',{},100).length,1);
 assert.equal(model.select([row],'water','unread',{[row.id]:4},100).length,0);
 assert.equal(model.select([row],'missing','all',{},100).length,0);
 assert.equal(model.select([row],'','new',{},1000).length,0);
 assert.equal(model.select([row],'','expired',{},1000).length,1);
});
test('Inbox controls match lifecycle and expiry rules',()=>{
 assert.deepEqual(model.permissions(row,100),{reply:true,assign:true,resolve:true,reopen:false,close:true});
 assert.deepEqual(model.permissions({...row,status:'resolved'},100),{reply:false,assign:false,resolve:false,reopen:true,close:true});
 for(const c of [{...row,status:'closed'},row])assert.ok(Object.values(model.permissions(c,1000)).every(x=>!x));
 assert.equal(model.roster.length,3);
});
test('Inbox four-language dictionaries and integration hooks are complete',()=>{
 const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
 for(const l of ['fa','en','ar','tr']){assert.deepEqual(Object.keys(copy[l]).sort(),Object.keys(copy.fa).sort());assert.ok(Object.values(copy[l]).every(Boolean));}
 const html=read('admin/index.html'),js=read('admin/admin.js'),inbox=read('admin/connect-inbox.js');
 assert.match(html,/data-page="connect"/);assert.match(html,/id="page-connect"/);
 assert.ok(html.indexOf('../js/connect-core.js')<html.indexOf('../js/connect-demo.js')&&html.indexOf('../js/connect-demo.js')<html.indexOf('connect-inbox.js'));
 assert.match(js,/connect:\s*"صندوق مکالمات"/);assert.match(inbox,/demoAdminSignedIn\(\)/);assert.match(inbox,/RomanoAPI.enabled/);
 assert.doesNotMatch(inbox,/\.innerHTML\s*=|\bfetch\(|\bWebSocket\b/);
});
