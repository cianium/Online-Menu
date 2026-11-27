/* RAMEN Connect R24.2 — transport-independent domain core, no DOM or storage. */
(function(root){
  const factory = function createConnectCore(){
  "use strict";
  // Pure domain model. Actor identities and persisted aggregates must come from a trusted adapter.
  const languages=Object.freeze(["fa","ar","en","tr"]);
  const statuses=Object.freeze(["new","in_progress","resolved","closed"]);
  const maxMessages=1000, maxText=2000;
  const fail=code=>{throw new Error(code);};
  const id=v=>typeof v==="string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
  const time=v=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000;
  const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
  const requireId=v=>{if(!id(v))fail("CONNECT_INVALID_ID");return v;};
  const optionalId=v=>v==null?null:requireId(v);
  const language=v=>{if(!languages.includes(v))fail("CONNECT_INVALID_LANGUAGE");return v;};
  function messageText(v){
    if(typeof v!=="string"||v.length>maxText*2)fail("CONNECT_INVALID_MESSAGE");
    const clean=v.trim();
    if(!clean||Array.from(clean).length>maxText||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(clean))fail("CONNECT_INVALID_MESSAGE");
    return clean;
  }
  function checkActor(actor){
    if(!object(actor)||!id(actor.id)||!id(actor.restaurantId)||!id(actor.branchId)||!["guest","agent","manager"].includes(actor.role))fail("CONNECT_FORBIDDEN");
    return actor;
  }
  function authorize(c,actor){
    checkActor(actor);
    if(!object(c)||c.restaurantId!==actor.restaurantId||c.branchId!==actor.branchId||
      (actor.role==="guest"&&c.guestId!==actor.id))fail("CONNECT_NOT_FOUND");
  }
  function checkTime(now,min=0){
    if(!time(now)||now<min)fail("CONNECT_INVALID_TIME");
    return now;
  }
  function create(input,actor,now){
    checkActor(actor);
    if(actor.role!=="guest"||!object(input))fail("CONNECT_FORBIDDEN");
    checkTime(now);
    const expiresAt=checkTime(input.expiresAt,now);
    if(expiresAt===now)fail("CONNECT_INVALID_EXPIRY");
    const tableId=optionalId(input.tableId), tableSessionId=optionalId(input.tableSessionId);
    if((tableId===null)!==(tableSessionId===null))fail("CONNECT_INVALID_CONTEXT");
    if(input.orderId!=null && tableSessionId===null)fail("CONNECT_INVALID_CONTEXT");
    return {schemaVersion:1,id:requireId(input.id),restaurantId:actor.restaurantId,branchId:actor.branchId,
      guestId:actor.id,tableId,tableSessionId,orderId:optionalId(input.orderId),language:language(input.language),
      status:"new",assigneeId:null,version:1,createdAt:now,updatedAt:now,expiresAt,messages:[]};
  }
  function checkAggregate(c){
    if(!object(c)||c.schemaVersion!==1||!statuses.includes(c.status)||!Number.isSafeInteger(c.version)||c.version<1||
      !Array.isArray(c.messages)||c.messages.length>maxMessages||!time(c.createdAt)||!time(c.updatedAt)||
      c.updatedAt<c.createdAt||!time(c.expiresAt)||c.expiresAt<=c.createdAt)fail("CONNECT_INVALID_STATE");
  }
  function apply(c,actor,command,now){
    checkAggregate(c);
    authorize(c,actor);
    if(!object(command))fail("CONNECT_INVALID_COMMAND");
    checkTime(now,c.updatedAt);
    if(now>=c.expiresAt)fail("CONNECT_EXPIRED");
    const staff=actor.role!=="guest", manager=actor.role==="manager";
    let patch={}, message=null;
    if(command.type==="send"){
      const clientId=requireId(command.clientId), text=messageText(command.text), lang=language(command.language);
      const senderKind=staff?"staff":"guest";
      const prior=c.messages.find(m=>m.senderKind===senderKind&&m.senderId===actor.id&&m.clientId===clientId);
      if(prior){
        if(prior.text!==text||prior.language!==lang)fail("CONNECT_IDEMPOTENCY_CONFLICT");
        return {conversation:c,message:prior,replayed:true};
      }
      if(c.status==="closed"||c.status==="resolved")fail("CONNECT_INACTIVE");
      if(staff&&c.assigneeId!==actor.id&&!manager)fail("CONNECT_FORBIDDEN");
      if(c.messages.length>=maxMessages)fail("CONNECT_MESSAGE_LIMIT");
      message={sequence:c.messages.length+1,clientId,senderKind,senderId:actor.id,text,language:lang,createdAt:now};
      patch.messages=[...c.messages,message];
      if(staff&&c.status==="new")patch.status="in_progress";
    }else{
      if(c.status==="closed")fail("CONNECT_INACTIVE");
      switch(command.type){
        case "link_order":{
          // The adapter must verify order ownership and visit context before invoking this command.
          if(staff||!c.tableId||!c.tableSessionId||c.status==="resolved")fail("CONNECT_FORBIDDEN");
          const orderId=requireId(command.orderId);
          if(c.orderId===orderId)return {conversation:c,message:null,replayed:true};
          patch.orderId=orderId;break;
        }
        case "assign":{
          if(!staff||c.status==="resolved")fail("CONNECT_FORBIDDEN");
          const target=requireId(command.assigneeId);
          if(!manager&&(target!==actor.id||(c.assigneeId!==null&&c.assigneeId!==actor.id)))fail("CONNECT_FORBIDDEN");
          patch={assigneeId:target,status:"in_progress"};break;
        }
        case "resolve":
          if(!staff||(!manager&&c.assigneeId!==actor.id))fail("CONNECT_FORBIDDEN");
          if(c.status!=="in_progress"&&c.status!=="new")fail("CONNECT_INVALID_TRANSITION");
          patch.status="resolved";break;
        case "reopen":
          if(c.status!=="resolved")fail("CONNECT_INVALID_TRANSITION");
          if(staff&&!manager&&c.assigneeId!==actor.id)fail("CONNECT_FORBIDDEN");
          patch={status:"new",assigneeId:null};break;
        case "close":
          if(staff&&!manager&&c.assigneeId!==actor.id)fail("CONNECT_FORBIDDEN");
          patch.status="closed";break;
        default:fail("CONNECT_INVALID_COMMAND");
      }
    }
    if(command.expectedVersion!==c.version)fail("CONNECT_STALE");
    if(c.version===Number.MAX_SAFE_INTEGER)fail("CONNECT_VERSION_LIMIT");
    return {conversation:{...c,...patch,version:c.version+1,updatedAt:now},message,replayed:false};
  }
  function read(c,actor,now,after=0,limit=50){
    checkAggregate(c);authorize(c,actor);checkTime(now,c.updatedAt);
    if(actor.role==="guest"&&now>=c.expiresAt)fail("CONNECT_EXPIRED");
    if(!Number.isSafeInteger(after)||after<0||!Number.isSafeInteger(limit)||limit<1||limit>100)fail("CONNECT_INVALID_CURSOR");
    const {messages,guestId,assigneeId,...metadata}=c;
    const rows=messages.filter(m=>m.sequence>after).slice(0,limit).map(m=>{
      const {senderId,...publicMessage}=m;
      return {...publicMessage,own:m.senderKind===(actor.role==="guest"?"guest":"staff")&&senderId===actor.id};
    });
    return {conversation:actor.role==="guest"?metadata:{...metadata,guestId,assigneeId},messages:rows,
      nextCursor:rows.length?rows[rows.length-1].sequence:after,hasMore:messages.some(m=>m.sequence>(rows.length?rows[rows.length-1].sequence:after))};
  }
  return Object.freeze({languages,statuses,maxMessages,maxText,create,apply,read});
};
  const core=factory();
  if(typeof module==='object'&&module.exports)module.exports=core;
  else root.RomanoConnectCore=core;
})(globalThis);
