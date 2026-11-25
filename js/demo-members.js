/* Browser-local sample membership only. Never used as server authentication. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RomanoDemoMembers=api;})(globalThis,()=>{
  "use strict";
  const key='online_menu_demo_members_v1:romano',activeKey='online_menu_demo_member_active_v1:romano';
  const previousKey='online_menu_demo_member_previous_v1:romano';
  const phone=value=>String(value??'').trim().replace(/[۰-۹٠-٩]/g,ch=>String(ch.charCodeAt(0)-(ch>='۰'?1776:1632))).replace(/[\s().-]/g,'');
  const validPhone=p=>typeof p==='string'&&/^\+?[0-9]{7,15}$/.test(p);
  const validItem=i=>i&&typeof i.name==='string'&&i.name.length<=150&&Number.isSafeInteger(i.quantity)&&i.quantity>=1&&i.quantity<=99&&Number.isFinite(i.price)&&i.price>0;
  const validDate=d=>typeof d==='string'&&Number.isFinite(Date.parse(d));
  const validOrder=o=>o&&typeof o.id==='string'&&validDate(o.createdAt)&&Array.isArray(o.items)&&o.items.length>0&&o.items.length<=100&&o.items.every(validItem)&&Number.isFinite(o.total)&&o.total>0&&Math.abs(o.items.reduce((sum,i)=>sum+i.price*i.quantity,0)-o.total)<0.000001;
  const uuid=()=>globalThis.crypto.randomUUID();
  function read(storage){
    const raw=storage.getItem(key);
    if(raw===null)return [];
    const rows=JSON.parse(raw);
    if(!Array.isArray(rows)||rows.length>100||rows.some(r=>!r||typeof r.id!=='string'||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||!validPhone(r.phone)||!validDate(r.createdAt)||!Array.isArray(r.orders)||r.orders.length>100||!r.orders.every(validOrder))||new Set(rows.map(r=>r.id)).size!==rows.length||new Set(rows.map(r=>r.phone)).size!==rows.length)throw Error('INVALID_STORAGE');
    return rows;
  }
  function active(storage,session){
    const id=session.getItem(activeKey);return id?read(storage).find(r=>r.id===id)||null:null;
  }
  function register(storage,session,nameValue,phoneValue){
    const name=String(nameValue??'').trim(),p=phone(phoneValue);
    if(!name||name.length>80||!validPhone(p))throw Error('INVALID_INPUT');
    const rows=read(storage),current=active(storage,session);
    if(current&&current.phone===p)return current;
    const existing=rows.find(r=>r.phone===p);
    if(existing){
      // Resume only the last signed-out sample profile bound to this tab.
      if(current||session.getItem(previousKey)!==existing.id||existing.name!==name)throw Error('EXISTING_PROFILE');
      session.setItem(activeKey,existing.id);
      return existing;
    }
    if(rows.length>=100)throw Error('LIMIT');
    const member={id:uuid(),name,phone:p,createdAt:new Date().toISOString(),orders:[]};
    const old=storage.getItem(key);
    try{storage.setItem(key,JSON.stringify([...rows,member]));session.setItem(activeKey,member.id);}
    catch(e){try{if(old===null)storage.removeItem(key);else storage.setItem(key,old);}catch{}throw e;}
    return member;
  }
  function addOrder(storage,session,items,total){
    const rows=read(storage),current=active(storage,session);
    if(!current)throw Error('NO_PROFILE');
    if(!Array.isArray(items)||!items.length||items.length>100||!Number.isFinite(total)||total<=0||items.some(i=>!i||typeof i.name!=='string'||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>99||!Number.isFinite(i.price)||i.price<=0))throw Error('INVALID_ORDER');
    if(current.orders.length>=100)throw Error('LIMIT');
    const order={id:uuid(),createdAt:new Date().toISOString(),items:items.map(i=>({name:i.name.slice(0,150),quantity:i.quantity,price:i.price})),total};
    if(!validOrder(order))throw Error('INVALID_ORDER');
    storage.setItem(key,JSON.stringify(rows.map(r=>r.id===current.id?{...r,orders:[order,...r.orders]}:r)));
    return order;
  }
  function signOut(session){
    const id=session.getItem(activeKey);
    session.removeItem(activeKey);
    if(id)session.setItem(previousKey,id);
  }
  return Object.freeze({key,activeKey,read,active,register,addOrder,signOut,phone});
});
