/* Standalone business-data backup. No credentials, session state, cart or payment cache. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.RomanoDemoBackup=api;
})(globalThis,()=>{
  'use strict';
  const schema='romano.standalone-branches';
  const registry='online_menu_demo_branches_v1';
  const maxBytes=10*1024*1024;
  const fields=Object.freeze({
    restaurant:'romano_restaurant',
    categories:'romano_categories',
    products:'romano_products',
    members:'online_menu_demo_members_v1:romano',
    rules:'online_menu_loyalty_drafts_v1:romano',
    review:'online_menu_demo_review_v2:romano',
    rating:'online_menu_demo_rating:romano',
    hospitality:'online_menu_hospitality_v1:romano'
  });
  const key=(field,id)=>fields[field]+(id?':branch:'+id:'');
  const own=(obj,k)=>Object.prototype.hasOwnProperty.call(obj,k);
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  function parse(raw){
    return JSON.parse(raw,(name,value)=>{
      if(['__proto__','constructor','prototype'].includes(name))throw Error('BACKUP_INVALID');
      return value;
    });
  }
  function validate(payload,validateDirectory,validateRecords){
    if(!object(payload)||payload.schema!==schema||payload.schemaVersion!==1||
      typeof payload.exportedAt!=='string'||!Number.isFinite(Date.parse(payload.exportedAt))||
      !Array.isArray(payload.records)||!Array.isArray(payload.directory))throw Error('BACKUP_INVALID');
    const directory=validateDirectory(payload.directory);
    if(payload.records.length!==directory.length)throw Error('BACKUP_INVALID');
    const ids=new Set(directory.map(row=>row.id));
    const entries=[];
    for(const record of payload.records){
      if(!object(record)||typeof record.id!=='string'||!ids.delete(record.id)||!object(record.data)||
        Object.keys(record.data).some(field=>!own(fields,field)))throw Error('BACKUP_INVALID');
      const decoded=Object.create(null);
      for(const field of Object.keys(fields)){
        // Original v1 backups did not contain hospitality settings.
        if(!own(record.data,field)&&field!=='hospitality')throw Error('BACKUP_INVALID');
        const raw=own(record.data,field)?record.data[field]:null;
        if(raw!==null&&typeof raw!=='string')throw Error('BACKUP_INVALID');
        decoded[field]=raw===null?null:parse(raw);
        if(raw!==null&&decoded[field]===null)throw Error('BACKUP_INVALID');
        if(raw!==null)entries.push([key(field,record.id),raw]);
      }
      validateRecords(decoded,record.data);
    }
    entries.push([registry,JSON.stringify(directory)]);
    return entries;
  }
  function capture(storage,directory,validateDirectory,validateRecords){
    const payload={schema,schemaVersion:1,exportedAt:new Date().toISOString(),directory,records:directory.map(row=>({
      id:row.id,data:Object.fromEntries(Object.keys(fields).map(field=>[field,storage.getItem(key(field,row.id))]))
    }))};
    const text=JSON.stringify(payload);
    if(new TextEncoder().encode(text).length>maxBytes)throw Error('BACKUP_LIMIT');
    // Apply the same validation used by import, including nested JSON.
    validate(parse(text),validateDirectory,validateRecords);
    return payload;
  }
  function occupied(storage){
    for(let i=0;i<storage.length;i++){
      const name=storage.key(i);
      if(name===registry||Object.values(fields).some(base=>name===base||name?.startsWith(base+':')))return true;
    }
    return false;
  }
  function restore(storage,text,validateDirectory,validateRecords){
    if(typeof text!=='string'||new TextEncoder().encode(text).length>maxBytes)throw Error('BACKUP_LIMIT');
    const entries=validate(parse(text),validateDirectory,validateRecords);
    if(occupied(storage))throw Error('BACKUP_NOT_EMPTY');
    const written=[];
    try{
      for(const [name,raw] of entries){
        if(storage.getItem(name)!==null)throw Error('BACKUP_NOT_EMPTY');
        storage.setItem(name,raw);
        written.push([name,raw]);
      }
    }catch(error){
      let rollbackFailed=false;
      for(const [name,raw] of written.reverse()){
        try{
          if(storage.getItem(name)!==raw){rollbackFailed=true;continue;}
          storage.removeItem(name);
        }catch{rollbackFailed=true;}
      }
      if(rollbackFailed)throw Error('BACKUP_ROLLBACK');
      throw error;
    }
  }
  return Object.freeze({maxBytes,capture,restore,occupied});
});
