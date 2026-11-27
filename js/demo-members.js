/* Browser-local sample membership only. Never used as server authentication. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RomanoDemoMembers=api;})(globalThis,()=>{
  "use strict";
  const branch = globalThis.RomanoDemoBranches;
  const scope = key => branch ? branch.scope(key) : key;
  const key=scope('online_menu_demo_members_v1:romano'),activeKey=scope('online_menu_demo_member_active_v1:romano');
  const name=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const phone=value=>String(value??'').trim().replace(/[۰-۹٠-٩]/g,ch=>String(ch.charCodeAt(0)-(ch>='۰'?1776:1632))).replace(/[\s().-]/g,'').replace(/^00(?=[1-9][0-9]{6,14}$)/,'+');
  const validPhone=p=>typeof p==='string'&&/^\+?[0-9]{7,15}$/.test(p);
  const validItem=i=>i&&typeof i.name==='string'&&i.name.length<=150&&Number.isSafeInteger(i.quantity)&&i.quantity>=1&&i.quantity<=99&&Number.isFinite(i.price)&&i.price>0&&(i.productId===undefined||(typeof i.productId==="string"&&i.productId.length>0&&i.productId.length<=150))&&(i.note===undefined||(typeof i.note==="string"&&i.note.length<=200));
  const catalogCurrency=value=>{const code=String(value||'IRT').trim().toUpperCase();return /^[A-Z]{3}$/.test(code)&&code!=='IRR'?code:'IRT';};
  const validDate=d=>typeof d==='string'&&Number.isFinite(Date.parse(d));
  const validOrder=o=>o&&(o.notes===undefined||(typeof o.notes==="string"&&o.notes.length<=1000))&&(o.tableName===undefined||(typeof o.tableName==='string'&&o.tableName.length<=80))&&typeof o.id==='string'&&(o.currency===undefined||(typeof o.currency==='string'&&o.currency===catalogCurrency(o.currency)))&&validDate(o.createdAt)&&Array.isArray(o.items)&&o.items.length>0&&o.items.length<=100&&o.items.every(validItem)&&Number.isFinite(o.total)&&o.total>0&&validAmounts(o)&&(o.points===undefined||(Number.isInteger(o.points)&&o.points>=0&&o.points<=1000));
  const settingsKey=scope("online_menu_hospitality_v1:romano");
  const requestPrefix=scope("online_menu_guest_requests_v1:romano")+":";
  const kinds=Object.freeze(["waiter","bill","water","napkin"]);
  const states=Object.freeze(["pending","accepted","completed"]);
  const langs=["fa","en","tr","ar"];
  const defaults=()=>({suggestions:[],bundle:[],coupon:"",percent:0,points:0,hours:{fa:"",en:"",tr:"",ar:""},map:"",whatsapp:""});
  function validatedLink(value,kind){
    if(value==="")return "";
    if(typeof value!=="string"||value.length>500)throw Error("HP_SETTINGS");
    const url=new URL(value);
    if(url.protocol!=="https:"||url.username||url.password||url.port)throw Error("HP_SETTINGS");
    const ok=kind==="whatsapp"?url.hostname==="wa.me"&&/^\/[1-9][0-9]{6,14}\/?$/.test(url.pathname):
      (url.hostname==="maps.app.goo.gl"&&url.pathname.length>1)||(url.hostname==="www.google.com"&&url.pathname.startsWith("/maps"))||(url.hostname==="www.openstreetmap.org"&&url.pathname.length>1);
    if(!ok)throw Error("HP_SETTINGS");return url.href;
  }
  function validateSettings(value){
    if(!value||typeof value!=="object"||Array.isArray(value))throw Error("HP_SETTINGS");
    const {suggestions,bundle=[],coupon,percent,points,hours,map,whatsapp}=value;
    if(!Array.isArray(suggestions)||suggestions.length>3||new Set(suggestions).size!==suggestions.length||suggestions.some(id=>typeof id!=="string"||!id||id.length>150)||
      !Array.isArray(bundle)||![0,2].includes(bundle.length)||new Set(bundle).size!==bundle.length||bundle.some(id=>typeof id!=="string"||!id||id.length>150)||(bundle.length&&!coupon)||typeof coupon!=="string"||!/^([A-Z0-9_-]{3,24})?$/.test(coupon)||!Number.isInteger(percent)||percent<0||percent>50||Boolean(coupon)!==Boolean(percent)||
      !Number.isInteger(points)||points<0||points>1000||!hours||langs.some(l=>typeof hours[l]!=="string"||hours[l].length>120))throw Error("HP_SETTINGS");
    return {suggestions:[...suggestions],bundle:[...bundle],coupon,percent,points,hours:Object.fromEntries(langs.map(l=>[l,hours[l].trim()])),map:validatedLink(map,"map"),whatsapp:validatedLink(whatsapp,"whatsapp")};
  }
  function settings(storage){const raw=storage.getItem(settingsKey);return raw===null?defaults():validateSettings(JSON.parse(raw));}
  function saveSettings(storage,value){branch?.context();const clean=validateSettings(value);storage.setItem(settingsKey,JSON.stringify(clean));return clean;}
  function discountFor(subtotal,percent,currency){
    if(!Number.isFinite(subtotal)||subtotal<=0||!Number.isInteger(percent)||percent<0||percent>50)return 0;
    const code=catalogCurrency(currency);
    const digits=code==="IRT"?0:new Intl.NumberFormat("en",{style:"currency",currency:code}).resolvedOptions().maximumFractionDigits;
    const scale=10**digits;return Math.floor(subtotal*percent/100*scale+1e-8)/scale;
  }
  function eligibleBundle(bundle,items){return Array.isArray(bundle)&&[0,2].includes(bundle.length)&&new Set(bundle).size===bundle.length&&bundle.every(id=>typeof id==="string"&&id&&items.some(item=>item.productId===id&&item.quantity>0));}
  function validAmounts(order){
    const subtotal=order.items.reduce((sum,i)=>sum+i.price*i.quantity,0);
    if(order.offer===undefined)return Math.abs(subtotal-order.total)<1e-6;
    const offer=order.offer;
    return offer&&typeof offer.code==="string"&&/^[A-Z0-9_-]{3,24}$/.test(offer.code)&&Number.isInteger(offer.percent)&&offer.percent>=1&&offer.percent<=50&&
      (offer.bundle===undefined||eligibleBundle(offer.bundle,order.items))&&Number.isFinite(offer.discount)&&offer.discount>0&&Math.abs(offer.discount-discountFor(subtotal,offer.percent,order.currency))<1e-6&&Math.abs(subtotal-offer.discount-order.total)<1e-6;
  }
  function pointsFor(member){return (member?.orders||[]).reduce((sum,o)=>sum+(o.points||0),0);}
  function requestKey(table){if(typeof table!=="string"||! /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(table))throw Error("HP_TABLE");return requestPrefix+table;}
  function requests(storage,table){
    const value=JSON.parse(storage.getItem(requestKey(table))??"{}");
    if(!value||typeof value!=="object"||Array.isArray(value))throw Error("HP_REQUEST");
    const result={};for(const kind of kinds){const state=value[kind];if(state===true)result[kind]="pending";else if(states.includes(state))result[kind]=state;else if(state!==undefined)throw Error("HP_REQUEST");}
    return result;
  }
  function setRequest(storage,table,kind,next,expected){
    if(!kinds.includes(kind)||!branch)throw Error("HP_REQUEST");
    const directory=branch.context()||branch.read().find(r=>r.id===branch.id);
    if(!directory||directory.active===false||!directory.tables.some(t=>t.code===table))throw Error("HP_TABLE");
    const current=requests(storage,table);
    if(current[kind]!==expected)throw Error("HP_STALE");
    const allowed=next==="pending"?(expected===undefined||expected==="completed"):next===undefined?expected==="pending":next==="accepted"?expected==="pending":next==="completed"?(expected==="pending"||expected==="accepted"):false;
    if(!allowed)throw Error("HP_REQUEST");
    if(next===undefined)delete current[kind];else current[kind]=next;
    storage.setItem(requestKey(table),JSON.stringify(current));return current;
  }
  const uuid=()=>globalThis.crypto.randomUUID();
  const lockKey=key+':mutation-lock';
  const delay=ms=>new Promise(resolve=>globalThis.setTimeout(resolve,ms));
  async function fallbackMutate(write){
    const storage=globalThis.localStorage,token=uuid(),deadline=Date.now()+3000;
    while(Date.now()<deadline){
      let lock=null;
      try{lock=JSON.parse(storage.getItem(lockKey)||'null');}catch{}
      if(!lock||!Number.isFinite(lock.expires)||lock.expires<Date.now()){
        storage.setItem(lockKey,JSON.stringify({token,expires:Date.now()+2000}));
        // localStorage has no atomic compare-and-set. Give simultaneous tabs a
        // short election window, then only the surviving token may write.
        await delay(32);
        let confirmed=null;
        try{confirmed=JSON.parse(storage.getItem(lockKey)||'null');}catch{}
        if(confirmed?.token===token){
          try{return write();}
          finally{
            try{if(JSON.parse(storage.getItem(lockKey)||'null')?.token===token)storage.removeItem(lockKey);}catch{}
          }
        }
      }
      await delay(8+Math.floor(Math.random()*12));
    }
    throw Error('STORAGE_BUSY');
  }
  async function mutate(write){
    const locks=globalThis.navigator?.locks;
    const commit=async()=>{try{return {value:await fallbackMutate(write)};}catch(error){return {error};}};
    // The storage lease remains necessary: some standalone/browser contexts
    // expose Web Locks without reliably coordinating every tab process.
    const result=locks?.request?await locks.request('romano-demo-members-v1',commit):await commit();
    if('error' in result)throw result.error;
    return result.value;
  }
  function read(storage){
    const raw=storage.getItem(key);
    if(raw===null)return [];
    const rows=JSON.parse(raw);
    if(!Array.isArray(rows)||rows.length>100||rows.some(r=>!r||typeof r.id!=='string'||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||!validPhone(r.phone)||!validDate(r.createdAt)||!Array.isArray(r.orders)||r.orders.length>100||!r.orders.every(validOrder))||new Set(rows.map(r=>r.id)).size!==rows.length||new Set(rows.map(r=>phone(r.phone))).size!==rows.length)throw Error('INVALID_STORAGE');
    return rows;
  }
  function active(storage,session){
    const id=session.getItem(activeKey);return id?read(storage).find(r=>r.id===id)||null:null;
  }
  function register(storage,session,nameValue,phoneValue){
    branch?.context();
    const memberName=name(nameValue),p=phone(phoneValue);
    if(!memberName||memberName.length>80||!validPhone(p))throw Error('INVALID_INPUT');
    const rows=read(storage),current=rows.find(r=>r.id===session.getItem(activeKey));
    const existing=rows.find(r=>phone(r.phone)===p);
    if(existing){
      // A matching phone never bypasses the sample name check, even in the active tab.
      if(name(existing.name)!==memberName)throw Error('EXISTING_PROFILE');
      if(current?.id===existing.id)return existing;
      if(current)throw Error('ACTIVE_PROFILE');
      session.setItem(activeKey,existing.id);
      return existing;
    }
    if(current)throw Error('ACTIVE_PROFILE');
    if(rows.length>=100)throw Error('LIMIT');
    const member={id:uuid(),name:memberName,phone:p,createdAt:new Date().toISOString(),orders:[]};
    const old=storage.getItem(key);
    try{storage.setItem(key,JSON.stringify([...rows,member]));session.setItem(activeKey,member.id);}
    catch(e){try{if(old===null)storage.removeItem(key);else storage.setItem(key,old);}catch{}throw e;}
    return member;
  }
  function addOrder(storage,session,items,total,currency,notes="",coupon=""){
    branch?.context();
    const rows=read(storage),current=rows.find(r=>r.id===session.getItem(activeKey));
    if(!current)throw Error('NO_PROFILE');
    if(!Array.isArray(items)||!items.length||items.length>100||!Number.isFinite(total)||total<=0||items.some(i=>!i||typeof i.name!=='string'||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>99||!Number.isFinite(i.price)||i.price<=0||(i.note!==undefined&&(typeof i.note!=="string"||i.note.length>200))))throw Error('INVALID_ORDER');
    if(current.orders.length>=100)throw Error('LIMIT');
    const order={id:uuid(),createdAt:new Date().toISOString(),currency:catalogCurrency(currency),items:items.map(i=>({name:i.name.slice(0,150),quantity:i.quantity,price:i.price,...(i.productId?{productId:i.productId}:{}),...(i.note?{note:i.note}:{})})),total};
    const config=settings(storage);
    if(coupon){
      if(coupon!==config.coupon||!eligibleBundle(config.bundle,items))throw Error("HP_COUPON");
      const subtotal=items.reduce((sum,i)=>sum+i.price*i.quantity,0),discount=discountFor(subtotal,config.percent,order.currency);
      if(!discount)throw Error("HP_COUPON");
      order.offer={code:coupon,percent:config.percent,discount,...(config.bundle.length?{bundle:config.bundle}: {})};
    }
    if(config.points)order.points=config.points;
    if (branch?.table) {
      const table = branch.context().tables.find(t => t.code === branch.table);
      order.tableName = table.name;
    }
    if(typeof notes!=="string"||notes.length>1000)throw Error("INVALID_ORDER");
    if(notes.trim())order.notes=notes.trim();
    if(!validOrder(order))throw Error('INVALID_ORDER');
    storage.setItem(key,JSON.stringify(rows.map(r=>r.id===current.id?{...r,orders:[order,...r.orders]}:r)));
    return order;
  }
  function signOut(session){
    session.removeItem(activeKey);
  }
  return Object.freeze({key,activeKey,read,active,mutate,register,addOrder,signOut,phone,settingsKey,requestPrefix,settings,saveSettings,validateSettings,discountFor,eligibleBundle,pointsFor,kinds,requests,setRequest});
});
