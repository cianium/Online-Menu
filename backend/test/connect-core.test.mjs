import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const core=createRequire(import.meta.url)('../../js/connect-core.js');
(function cases(core, test, assert){
  const guest={id:"guest-a",role:"guest",restaurantId:"r1",branchId:"b1"};
  const other={...guest,id:"guest-b"};
  const agent={...guest,id:"staff-a",role:"agent"};
  const manager={...guest,id:"staff-m",role:"manager"};
  const fresh=()=>core.create({id:"conv1",tableId:"t1",tableSessionId:"s1",language:"fa",expiresAt:10000},guest,100);
  const send=(c,a=guest,extra={})=>core.apply(c,a,{type:"send",clientId:"msg1",text:"سلام",language:"fa",expectedVersion:c.version,...extra},200);
  const cmd=(c,a,type,extra={})=>core.apply(c,a,{type,expectedVersion:c.version,...extra},300).conversation;
  test("guest identity is scoped to restaurant, branch and guest, not QR table",()=>{
    const c=fresh();assert.equal(c.guestId,guest.id);
    for(const actor of [other,{...guest,branchId:"b2"},{...guest,restaurantId:"r2"}]){
      assert.throws(()=>core.read(c,actor,200),/CONNECT_NOT_FOUND/);
      assert.throws(()=>send(c,actor),/CONNECT_NOT_FOUND/);
    }
    assert.throws(()=>core.create({id:"c",language:"fa",expiresAt:500},agent,100),/CONNECT_FORBIDDEN/);
  });
  test("invalid context and expiry fail closed",()=>{
    const base={id:"c",language:"fa",expiresAt:500};
    for(const extra of [{tableId:"t"},{tableSessionId:"s"},{orderId:"o"}])assert.throws(()=>core.create({...base,...extra},guest,100),/CONNECT_INVALID_CONTEXT/);
    assert.throws(()=>core.create({...base,expiresAt:100},guest,100),/CONNECT_INVALID_EXPIRY/);
    assert.throws(()=>core.create({...base,language:"xx"},guest,100),/CONNECT_INVALID_LANGUAGE/);
    assert.equal(core.create(base,guest,100).tableId,null);
  });
  test("text validation supports all four languages and preserves literal markup",()=>{
    const samples=["سلام","مرحبا","Hello","Merhaba"];
    for(let i=0;i<4;i++){
      const r=send(fresh(),guest,{language:core.languages[i],text:samples[i]});
      assert.equal(r.message.text,samples[i]);
    }
    assert.equal(send(fresh(),guest,{text:" <b>literal</b> "}).message.text,"<b>literal</b>");
    for(const text of [" ","x".repeat(2001),"\u0000",{}])assert.throws(()=>send(fresh(),guest,{text}),/CONNECT_INVALID_MESSAGE/);
    assert.throws(()=>send(fresh(),guest,{language:"xx"}),/CONNECT_INVALID_LANGUAGE/);
  });
  test("send is immutable and increments aggregate version and sequence",()=>{
    const c=fresh(),r=send(c);
    assert.equal(c.messages.length,0);assert.equal(c.version,1);
    assert.equal(r.conversation.version,2);assert.equal(r.message.sequence,1);
    const next=send(r.conversation,guest,{clientId:"msg2"});
    assert.equal(next.message.sequence,2);
  });
  test("idempotent retries do not append; changed payload is rejected",()=>{
    const r=send(fresh());
    const replay=send(r.conversation,guest,{expectedVersion:1});
    assert.equal(replay.replayed,true);assert.equal(replay.conversation.messages.length,1);assert.equal(replay.conversation.version,2);
    assert.throws(()=>send(r.conversation,guest,{text:"changed"}),/CONNECT_IDEMPOTENCY_CONFLICT/);
    assert.throws(()=>send(r.conversation,guest,{clientId:"msg2",expectedVersion:1}),/CONNECT_STALE/);
  });
  test("only assigned staff or manager can reply, resolve or reassign",()=>{
    const c=fresh();assert.throws(()=>send(c,agent),/CONNECT_FORBIDDEN/);
    assert.throws(()=>cmd(c,guest,"assign",{assigneeId:agent.id}),/CONNECT_FORBIDDEN/);
    assert.throws(()=>cmd(c,agent,"assign",{assigneeId:"staff-b"}),/CONNECT_FORBIDDEN/);
    const assigned=cmd(c,agent,"assign",{assigneeId:agent.id});
    assert.equal(assigned.status,"in_progress");
    assert.throws(()=>cmd(assigned,{...agent,id:"staff-b"},"assign",{assigneeId:"staff-b"}),/CONNECT_FORBIDDEN/);
    const replied=core.apply(assigned,agent,{type:"send",clientId:"staff-msg",text:"Hello",language:"en",expectedVersion:assigned.version},400);
    assert.equal(replied.message.senderKind,"staff");
    assert.equal(core.apply(replied.conversation,manager,{type:"assign",assigneeId:"staff-b",expectedVersion:replied.conversation.version},500).conversation.assigneeId,"staff-b");
  });
  test("resolution, reopen and irreversible close enforce state transitions",()=>{
    const c=cmd(fresh(),manager,"resolve");
    assert.equal(c.status,"resolved");
    assert.throws(()=>core.apply(c,guest,{type:"send",clientId:"m",text:"hi",language:"en",expectedVersion:c.version},400),/CONNECT_INACTIVE/);
    const open=core.apply(c,guest,{type:"reopen",expectedVersion:c.version},400).conversation;
    assert.equal(open.status,"new");assert.equal(open.assigneeId,null);
    const closed=core.apply(open,guest,{type:"close",expectedVersion:open.version},500).conversation;
    assert.throws(()=>core.apply(closed,manager,{type:"reopen",expectedVersion:closed.version},600),/CONNECT_INACTIVE/);
  });
  test("expiry denies guest reads and writes; staff can inspect history",()=>{
    const c=fresh();
    assert.throws(()=>core.read(c,guest,10000),/CONNECT_EXPIRED/);
    assert.throws(()=>core.apply(c,guest,{type:"close",expectedVersion:1},10000),/CONNECT_EXPIRED/);
    assert.equal(core.read(c,agent,10000).conversation.id,c.id);
  });
  test("cursor pagination and guest projections hide internal identity fields",()=>{
    const c=send(send(fresh()).conversation,guest,{clientId:"msg2"}).conversation;
    const page=core.read(c,guest,200,0,1);
    assert.equal(page.hasMore,true);assert.equal(page.nextCursor,1);
    assert.equal(page.messages[0].own,true);assert.equal("senderId" in page.messages[0],false);
    assert.equal("guestId" in page.conversation,false);assert.equal("assigneeId" in page.conversation,false);
    assert.equal(core.read(c,guest,200,1,1).hasMore,false);
    assert.throws(()=>core.read(c,guest,200,0,101),/CONNECT_INVALID_CURSOR/);
  });
  test("invalid command, stale version and backwards clock do not change state",()=>{
    const c=fresh();
    assert.throws(()=>cmd(c,manager,"unknown"),/CONNECT_INVALID_COMMAND/);
    assert.throws(()=>cmd(c,manager,"resolve",{expectedVersion:0}),/CONNECT_STALE/);
    assert.throws(()=>core.apply(c,guest,{type:"close",expectedVersion:1},99),/CONNECT_INVALID_TIME/);
    assert.equal(c.status,"new");
  });
})(core,test,assert);
