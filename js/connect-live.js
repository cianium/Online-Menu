/* Live chat client: server-authorized, no demo fallback, no stored transcript. */
(function(root){
const createLiveClient=function liveFactory(root,mode){
  "use strict";
  const KEY="romano_connect_binding_v1",hex=/^[a-f0-9]{64}$/,uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const languages=["fa","en","tr","ar"],statuses=["new","in_progress","resolved","closed"];
  let disabled=false;
  const fail=code=>{throw Error(code);};
  const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const time=v=>integer(v,0,8640000000000000);
  const object=v=>Boolean(v&&typeof v==="object"&&!Array.isArray(v));
  function binding(){
    if(disabled)return null;
    try{const v=root.sessionStorage.getItem(KEY);return typeof v==="string"&&hex.test(v)?v:null;}catch{return null;}
  }
  function clearBinding(){
    disabled=true;try{root.sessionStorage.removeItem(KEY);}catch{}
  }
  function setBinding(value){
    clearBinding();
    if(typeof value!=="string"||!hex.test(value))return false;
    try{root.sessionStorage.setItem(KEY,value);disabled=false;return true;}catch{return false;}
  }
  function metadata(c){
    if(!object(c)||typeof c.id!=="string"||!uuid.test(c.id)||typeof c.tableId!=="string"||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(c.tableId)||
      !languages.includes(c.language)||!statuses.includes(c.status)||!integer(c.version,1,2147483647)||!integer(c.guestMessageCount,0,200)||
      !time(c.createdAt)||!time(c.updatedAt)||!time(c.expiresAt)||c.updatedAt<c.createdAt||
      ![null,"assigned"].includes(c.assigneeId)||c.orderId!==null)fail("CONNECT_INVALID_RESPONSE");
    return {id:c.id,tableId:c.tableId,language:c.language,status:c.status,version:c.version,guestMessageCount:c.guestMessageCount,createdAt:c.createdAt,updatedAt:c.updatedAt,expiresAt:c.expiresAt,assigneeId:c.assigneeId,orderId:null,firstResponseMs:integer(c.firstResponseMs,0,Number.MAX_SAFE_INTEGER)?c.firstResponseMs:null};
  }
  function message(m){
    if(!object(m)||!integer(m.sequence,1,200)||typeof m.clientId!=="string"||!uuid.test(m.clientId)||!["staff","guest"].includes(m.senderKind)||!languages.includes(m.language)||
       typeof m.text!=="string"||!m.text.trim()||Array.from(m.text).length>2000||!time(m.createdAt)||typeof m.own!=="boolean")fail("CONNECT_INVALID_RESPONSE");
    return {sequence:m.sequence,clientId:m.clientId,senderKind:m.senderKind,language:m.language,text:m.text,createdAt:m.createdAt,own:m.own};
  }
  function snapshot(data){
    if(!object(data)||!Array.isArray(data.messages)||data.messages.length>200)fail("CONNECT_INVALID_RESPONSE");
    if(data.conversation===null){if(data.messages.length)fail("CONNECT_INVALID_RESPONSE");return {conversation:null,messages:[]};}
    const c=metadata(data.conversation),messages=data.messages.map(message);
    if(messages.some((m,i)=>m.sequence!==i+1)||messages.filter(m=>m.senderKind==="guest").length!==c.guestMessageCount||c.version<messages.length+1)fail("CONNECT_INVALID_RESPONSE");
    return {conversation:c,messages};
  }
  function inbox(data){
    if(!Array.isArray(data)||data.length>50)fail("CONNECT_INVALID_RESPONSE");
    const rows=data.map(r=>({...metadata(r),lastMessage:r.lastMessage===null?null:message(r.lastMessage)}));
    if(new Set(rows.map(r=>r.id)).size!==rows.length)fail("CONNECT_INVALID_RESPONSE");
    return rows;
  }
  function sessionForCurrent(){
    const v=binding();if(mode()!=="public"||!v)fail("CONNECT_EXPIRED");return v;
  }
  function check(s){if(mode()!=="public"||!s||binding()!==s)fail("CONNECT_EXPIRED");}
  const errors=new Set(["CONNECT_EXPIRED","CONNECT_NOT_FOUND","CONNECT_FORBIDDEN","CONNECT_UNAVAILABLE","CONNECT_INVALID_MESSAGE","CONNECT_INVALID_REQUEST","CONNECT_RATE_LIMIT","CONNECT_IDEMPOTENCY_CONFLICT","CONNECT_MESSAGE_LIMIT","CONNECT_INACTIVE"]);
  async function request(s,payload){
    check(s);let response,body;
    const headers={Accept:"application/json","X-Romano-Connect-Binding":s};
    if(payload!==undefined)headers["Content-Type"]="application/json";
    try{
      response=await root.fetch("/api/v1/orders/connect",{method:payload===undefined?"GET":"POST",headers,credentials:"same-origin",cache:"no-store",redirect:"error",signal:root.AbortSignal.timeout(10000),...(payload===undefined?{}:{body:JSON.stringify(payload)})});
      body=await response.json().catch(()=>null);
    }catch{check(s);fail("CONNECT_NETWORK");}
    check(s);
    if(!response.ok){
      const code=body?.error?.code;
      if(response.status===401||response.status===403)fail("CONNECT_EXPIRED");
      if(errors.has(code))fail(code);
      fail(response.status===404||response.status===503?"CONNECT_UNAVAILABLE":"CONNECT_NETWORK");
    }
    return snapshot(body?.data);
  }
  return Object.freeze({binding,clearBinding,setBinding,sessionForCurrent,snapshot,inbox,get:s=>request(s),send:(s,clientId,text,language)=>request(s,{clientId,text,language})});
};
const createPoller=function createPoller(root,refresh,{interval=5000,maxDelay=30000,visible=()=>true}={}){
  let stopped=false,running=false,timer=null,delay=interval,queued=false;
  const schedule=ms=>{if(stopped)return;if(timer!==null)root.clearTimeout(timer);timer=root.setTimeout(tick,ms);};
  async function tick(){
    timer=null;if(stopped)return;
    if(running){queued=true;return;}
    if(!visible()){schedule(interval);return;}
    running=true;
    try{const success=await refresh();if(success===true)delay=interval;else if(success===false)delay=Math.min(maxDelay,delay*2);}
    catch{delay=Math.min(maxDelay,delay*2);}
    finally{running=false;if(!stopped){const next=queued?0:delay;queued=false;schedule(next);}}
  }
  function wake(){if(stopped)return;delay=interval;if(running){queued=true;return;}schedule(0);}
  function stop(){stopped=true;queued=false;if(timer!==null)root.clearTimeout(timer);timer=null;}
  wake();return Object.freeze({wake,stop});
};
if(typeof module==='object'&&module.exports)module.exports={createLiveClient,createPoller};
else {const client=createLiveClient(root,()=>typeof menuDataMode!=='undefined'?menuDataMode:'unavailable');root.RomanoConnectLive=Object.freeze({...client,createPoller:(refresh,options)=>createPoller(root,refresh,options)});}
})(globalThis);
