/* One review per demo browser/restaurant. Never a server review or verified identity. */
(function(root){
  'use strict';
  const statuses=new Set(['pending','approved','rejected']);
  const validRating=n=>Number.isInteger(n)&&n>=1&&n<=5;
  const key=tenant=>`online_menu_demo_review_v2:${tenant}`;
  function parse(raw){
    if(raw===null)return null;
    const r=JSON.parse(raw);
    if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(r.id)||!validRating(r.rating)||typeof r.comment!=='string'||r.comment.length>500||!statuses.has(r.status))throw Error('Invalid local review');
    return {id:r.id,rating:r.rating,comment:r.comment,status:r.status};
  }
  function read(storage,tenant){
    const raw=storage.getItem(key(tenant));
    if(raw!==null)return parse(raw);
    // Legacy numeric scores are unverified: never inherit old moderation based on the number alone.
    const rating=JSON.parse(storage.getItem(`online_menu_demo_rating:${tenant}`)??'null');
    return validRating(rating)?{id:`legacy-${rating}`,rating,comment:'',status:'pending'}:null;
  }
  function submit(storage,tenant,rating,comment,id){
    const next=parse(JSON.stringify({id,rating,comment:typeof comment==='string'?comment.trim():comment,status:'pending'}));
    storage.setItem(key(tenant),JSON.stringify(next));return next;
  }
  function moderate(storage,tenant,expected,status){
    if(!['approved','rejected'].includes(status)||!expected)return false;
    const current=read(storage,tenant);
    if(!current||JSON.stringify(current)!==JSON.stringify(expected))return false;
    storage.setItem(key(tenant),JSON.stringify({...current,status}));return true;
  }
  const api=Object.freeze({key,parse,read,submit,moderate});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RomanoDemoReview=api;
})(typeof globalThis!=='undefined'?globalThis:this);
