/* R24.4: demo-only transactional messaging. Browser storage is not an authentication boundary. */
(function(root){
const createDemoEngine=function createDemoEngine(core,platform){
  "use strict";
  const TTL=14400000,RETENTION=86400000,MAX=100;
  const id=v=>typeof v==="string"&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
  const time=v=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000;
  const fail=code=>{throw Error(code);};
  const key="romano_connect_guest_v1";
  const actorFor=(s)=>({id:s.guestId,role:"guest",restaurantId:"romano",branchId:s.branchId});
  function validSession(s){return s&&id(s.guestId)&&id(s.conversationId)&&id(s.branchId)&&typeof s.scope==="string"&&s.scope.length<=200;}
  function session(branchId,scope){
    if(!id(branchId)||typeof scope!=="string"||scope.length>200)fail("CONNECT_INVALID_CONTEXT");
    let s;try{s=JSON.parse(platform.sessionStorage.getItem(key)||"null");}catch{fail("CONNECT_STORAGE");}
    if(s!==null&&!validSession(s))fail("CONNECT_STORAGE");
    if(s?.branchId===branchId&&s.scope===scope)return s;
    s={guestId:platform.uuid(),conversationId:platform.uuid(),branchId,scope};
    platform.sessionStorage.setItem(key,JSON.stringify(s));return s;
  }
  function forget(){platform.sessionStorage.removeItem(key);}
  function validate(c){
    const ok=c&&c.schemaVersion===1&&id(c.id)&&c.restaurantId==="romano"&&id(c.branchId)&&id(c.guestId)&&
      c.tableId===null&&c.tableSessionId===null&&c.orderId===null&&core.languages.includes(c.language)&&core.statuses.includes(c.status)&&
      (c.assigneeId===null||id(c.assigneeId))&&Number.isSafeInteger(c.version)&&c.version>=1&&time(c.createdAt)&&time(c.updatedAt)&&time(c.expiresAt)&&
      c.createdAt<=c.updatedAt&&c.updatedAt<c.expiresAt&&c.expiresAt-c.createdAt===TTL&&Array.isArray(c.messages)&&c.messages.length<=core.maxMessages&&c.version>=c.messages.length+1;
    if(!ok)fail("CONNECT_INVALID_STORAGE");
    const seen=new Set();let last=c.createdAt;
    for(const [i,m] of c.messages.entries()){
      if(!m||m.sequence!==i+1||!id(m.clientId)||!id(m.senderId)||!["guest","staff"].includes(m.senderKind)||
        (m.senderKind==="guest"&&m.senderId!==c.guestId)||!core.languages.includes(m.language)||!time(m.createdAt)||m.createdAt<last||m.createdAt>c.updatedAt||
        typeof m.text!=="string"||m.text!==m.text.trim()||!m.text||m.text.length>core.maxText*2||Array.from(m.text).length>core.maxText||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(m.text))fail("CONNECT_INVALID_STORAGE");
      const k=JSON.stringify([m.senderKind,m.senderId,m.clientId]);if(seen.has(k))fail("CONNECT_INVALID_STORAGE");seen.add(k);last=m.createdAt;
    }
    return c;
  }
  function guest(s){if(!validSession(s))fail("CONNECT_INVALID_CONTEXT");return actorFor(s);}
  function staff(a){if(!a||a.restaurantId!=="romano"||!id(a.branchId)||!id(a.id)||!["agent","manager"].includes(a.role))fail("CONNECT_FORBIDDEN");return a;}
  function project(c,a,now){
    let cursor=0,rows=[],page;
    do{page=core.read(c,a,Math.max(now,c.updatedAt),cursor,100);rows.push(...page.messages);cursor=page.nextCursor;}while(page.hasMore);
    return {conversation:page.conversation,messages:rows};
  }
  async function get(s){
    const a=guest(s),c=await platform.db.get(s.conversationId);
    if(!c)return {conversation:null,messages:[]};
    validate(c);return project(c,a,platform.now());
  }
  async function send(s,clientId,text,language){
    const a=guest(s),result=await platform.db.change(s.conversationId,(current,all)=>{
      const now=platform.now();let c=current,remove=[];
      if(!c){
        const rows=all.map(validate);
        remove=rows.filter(x=>x.expiresAt+RETENTION<=now).map(x=>x.id);
        if(rows.length-remove.length>=MAX)fail("CONNECT_STORAGE_LIMIT");
        c=core.create({id:s.conversationId,language,expiresAt:now+TTL},a,now);
      }else validate(c);
      const r=core.apply(c,a,{type:"send",clientId,text,language,expectedVersion:c.version},Math.max(now,c.updatedAt));
      return {record:r.replayed?null:r.conversation,remove,value:project(r.conversation,a,now)};
    });
    platform.notify();return result;
  }
  async function list(a){
    staff(a);const now=platform.now();
    const rows=(await platform.db.all()).map(validate).filter(c=>c.branchId===a.branchId&&c.expiresAt+RETENTION>now);
    return rows.sort((x,y)=>y.updatedAt-x.updatedAt).map(c=>{const {conversation,messages}=project(c,a,now);return {...conversation,lastMessage:messages.at(-1)||null};});
  }
  async function readStaff(a,conversationId){
    staff(a);if(!id(conversationId))fail("CONNECT_INVALID_ID");const c=await platform.db.get(conversationId);if(!c)fail("CONNECT_NOT_FOUND");validate(c);
    if(c.expiresAt+RETENTION<=platform.now())fail("CONNECT_NOT_FOUND");return project(c,a,platform.now());
  }
  async function command(a,conversationId,cmd){
    staff(a);if(!id(conversationId))fail("CONNECT_INVALID_ID");
    const result=await platform.db.change(conversationId,current=>{
      if(!current)fail("CONNECT_NOT_FOUND");validate(current);
      const now=Math.max(platform.now(),current.updatedAt),r=core.apply(current,a,cmd,now);
      return {record:r.replayed?null:r.conversation,remove:[],value:project(r.conversation,a,now)};
    });
    platform.notify();return result;
  }
  return Object.freeze({session,forget,get,send,list,readStaff,command,validate,subscribe:platform.subscribe});
};
const browserPlatform=function browserPlatform(root){
  "use strict";
  let pending=null;
  const DB="romano_connect_demo_v1",STORE="conversations";
  function open(){
    if(pending)return pending;
    pending=new Promise((resolve,reject)=>{
      let req;try{req=root.indexedDB.open(DB,1);}catch(e){reject(e);return;}
      let settled=false;
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});};
      req.onerror=()=>{settled=true;reject(req.error||Error("CONNECT_STORAGE"));};
      req.onblocked=()=>{settled=true;reject(Error("CONNECT_STORAGE_BLOCKED"));};
      req.onsuccess=()=>{const db=req.result;if(settled){db.close();return;}db.onversionchange=()=>{db.close();pending=null;};resolve(db);};
    }).catch(e=>{pending=null;throw e;});
    return pending;
  }
  async function transaction(mode,work){
    const db=await open();
    return new Promise((resolve,reject)=>{
      let tx,answer,reason;
      try{tx=db.transaction(STORE,mode);}catch(e){reject(e);return;}
      tx.oncomplete=()=>resolve(answer);tx.onabort=()=>reject(reason||tx.error||Error("CONNECT_STORAGE"));tx.onerror=()=>{};
      const abort=e=>{reason=e;try{tx.abort();}catch{reject(e);}};
      try{work(tx.objectStore(STORE),v=>{answer=v;},abort);}catch(e){abort(e);}
    });
  }
  const get=id=>transaction("readonly",(s,done)=>{const q=s.get(id);q.onsuccess=()=>done(q.result||null);});
  const all=()=>transaction("readonly",(s,done)=>{const q=s.getAll();q.onsuccess=()=>done(q.result);});
  const change=(id,mutate)=>transaction("readwrite",(s,done,abort)=>{
    const q=s.get(id);q.onsuccess=()=>{
      const current=q.result||null;
      const commit=rows=>{try{const r=mutate(current,rows);for(const k of r.remove)s.delete(k);if(r.record)s.put(r.record);done(r.value);}catch(e){abort(e);}};
      if(current)commit([]);else{const a=s.getAll();a.onsuccess=()=>commit(a.result);}
    };
  });
  const listeners=new Set();let channel=null;
  try{if(typeof root.BroadcastChannel==="function"){channel=new root.BroadcastChannel("romano-connect-demo-v1");channel.onmessage=()=>emit();}}catch{}
  function emit(){for(const fn of listeners){try{fn();}catch{/* observer cannot affect commit */}}}
  function notify(){emit();try{channel?.postMessage("changed");}catch{}}
  function subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
  return {db:{get,all,change},get sessionStorage(){return root.sessionStorage;},uuid:()=>root.crypto.randomUUID(),now:()=>Date.now(),notify,subscribe};
};
if(typeof module==='object'&&module.exports)module.exports={createDemoEngine,browserPlatform};
else if(root.RomanoConnectCore)root.RomanoConnectDemo=createDemoEngine(root.RomanoConnectCore,browserPlatform(root));
})(globalThis);
