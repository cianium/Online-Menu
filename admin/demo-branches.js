/* Single-restaurant demo table management. */
(()=>{
 'use strict';
 const model=window.RomanoDemoBranches,panel=document.getElementById('demo-tables');
 if(!model||!panel)return;
 const form=panel.querySelector('#sample-table-form'),select=panel.querySelector('#sample-table-select'),qr=panel.querySelector('#sample-table-qr'),output=panel.querySelector('[role="status"]');
 const t=label=>window.ROMANO_ADMIN_I18N.get(label);
 const ready=()=>typeof adminInitialized!=='undefined'&&adminInitialized&&adminDemoMode&&demoAdminSignedIn()&&!window.RomanoAPI.enabled&&!document.querySelector('.admin-app').inert;
 function updateQr(){
  const link=qr.querySelector('a'),image=qr.querySelector('.ops-qr-image');
  qr.hidden=!select.value;image.replaceChildren();
  if(qr.hidden)return;
  link.href=model.link('../?qr=demo','',select.value);
  try{new window.QRCode(image,{text:link.href,width:192,height:192,correctLevel:window.QRCode.CorrectLevel.M});}catch{qr.hidden=true;output.textContent=t('ساخت QR انجام نشد.');}
 }
 function render(){
  panel.hidden=!ready();if(panel.hidden)return;
  document.getElementById('branch-management').classList.add('has-sample-tables');
  try{const tables=model.read()[0].tables,previous=select.value;
   select.replaceChildren(...tables.map(row=>new Option(row.name+' · '+row.code,row.code)));
   if(tables.some(row=>row.code===previous))select.value=previous;
   select.closest('label').hidden=!tables.length;updateQr();
  }catch{output.textContent=t('خواندن داده محلی ممکن نیست.');}
 }
 select.addEventListener('change',updateQr);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!ready()||!form.reportValidity())return;
  const button=form.querySelector('button[type=submit]');if(button.disabled)return;
  button.disabled=true;output.textContent='';
  const code=form.elements.sampleTableCode.value.trim();
  try{await model.save('table',form.elements.sampleTableName.value,code);form.reset();render();select.value=code;updateQr();output.textContent=t('تغییرات ذخیره شد');}
  catch(error){output.textContent=t(error.message==='BRANCH_INPUT'?'نام یا کد معتبر و غیرتکراری وارد کنید.':'ذخیره انجام نشد. اطلاعات فرم حفظ شده است؛ دوباره تلاش کنید.');}
  finally{button.disabled=false;}
 });
 document.addEventListener('romano:demo-membership-changed',render);
 document.addEventListener('romano:language-changed',render);
 document.addEventListener('romano:admin-page-changed',e=>{if(e.detail?.page==='settings')render();});
 window.addEventListener('storage',e=>{if(e.key===model.registry||e.key===null)render();});
})();
