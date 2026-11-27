/* Shared connected phone sign-in. Never simulates SMS or runs on standalone demo. */
(()=>{
 "use strict";
 const words={
  fa:{title:"ورود به رامن",phone:"شماره تلفن",name:"نام و نام خانوادگی",admin:"کلید دسترسی مدیریت دارم",key:"کلید دسترسی",code:"کد تأیید",next:"ادامه",send:"ارسال کد تأیید",verify:"ورود",edit:"تغییر شماره",resend:"ارسال مجدد کد",guest:"فعلاً فقط منو را ببینید",intro:"با شماره تلفن وارد شوید.",new:"برای ثبت‌نام نام خود را وارد کنید.",sent:"کد شش رقمی ارسال‌شده به شماره‌تان را وارد کنید.",error:"درخواست انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید.",invalid:"کد نادرست یا منقضی است.",limit:"تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید.",language:"زبان",logout:"خروج",login:"ورود / ثبت‌نام",busy:"در حال بررسی…"},
  en:{title:"Welcome to RAMEN",phone:"Phone number",name:"Full name",admin:"I have an admin access key",key:"Access key",code:"Verification code",next:"Continue",send:"Send verification code",verify:"Sign in",edit:"Change number",resend:"Resend code",guest:"Browse the menu for now",intro:"Sign in with your phone number.",new:"Enter your name to create an account.",sent:"Enter the six-digit code sent to your number.",error:"Unable to complete the request. Check your details and try again.",invalid:"The code is incorrect or expired.",limit:"Too many attempts. Try again later.",language:"Language",logout:"Sign out",login:"Sign in / Register",busy:"Please wait…"},
  tr:{title:"RAMEN’ya hoş geldiniz",phone:"Telefon numarası",name:"Ad soyad",admin:"Yönetici erişim anahtarım var",key:"Erişim anahtarı",code:"Doğrulama kodu",next:"Devam et",send:"Doğrulama kodu gönder",verify:"Giriş yap",edit:"Numarayı değiştir",resend:"Kodu yeniden gönder",guest:"Şimdilik menüye göz at",intro:"Telefon numaranızla giriş yapın.",new:"Hesap oluşturmak için adınızı girin.",sent:"Numaranıza gönderilen altı haneli kodu girin.",error:"İşlem tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.",invalid:"Kod yanlış veya süresi dolmuş.",limit:"Çok fazla deneme. Daha sonra tekrar deneyin.",language:"Dil",logout:"Çıkış yap",login:"Giriş / Kayıt",busy:"Kontrol ediliyor…"},
  ar:{title:"مرحبًا بك في رامن",phone:"رقم الهاتف",name:"الاسم الكامل",admin:"لدي مفتاح وصول إداري",key:"مفتاح الوصول",code:"رمز التحقق",next:"متابعة",send:"إرسال رمز التحقق",verify:"تسجيل الدخول",edit:"تغيير الرقم",resend:"إعادة إرسال الرمز",guest:"تصفح القائمة الآن",intro:"سجّل الدخول برقم هاتفك.",new:"أدخل اسمك لإنشاء حساب.",sent:"أدخل الرمز المكوّن من ستة أرقام المرسل إلى هاتفك.",error:"تعذر إتمام الطلب. تحقق من البيانات وحاول مرة أخرى.",invalid:"الرمز غير صحيح أو منتهي الصلاحية.",limit:"محاولات كثيرة. حاول لاحقًا.",language:"اللغة",logout:"تسجيل الخروج",login:"الدخول / التسجيل",busy:"جارٍ التحقق…"}
 };
 const t=k=>(words[window.ROMANO_I18N?.language]||words.fa)[k];
 const initial=new URL(location.href).searchParams;
 const launch=initial.get('login')==='1'||(initial.has('qr')&&initial.get('qr')!=='demo');
 const digits=value=>value.replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
 const el=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n;};
 const label=(tag,key,cls)=>{const n=el(tag,cls);n.dataset.phoneAuthText=key;n.textContent=t(key);return n;};
 const button=(key,cls,action)=>{const n=label('button',key,cls);n.type='button';n.addEventListener('click',action);return n;};
 let available=false,booted=false,session=null,dialog=null,csrf=null,generation=0,timer,opener=null;
 function adminDestination(){return new URL('admin/',location.href.split('#')[0].split('?')[0]);}
 function removeLogin(){const url=new URL(location.href);if(url.searchParams.has('login')){url.searchParams.delete('login');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}}
 async function request(path,body){
  const post=body!==undefined;
  if(post&&!csrf){const data=await request('/auth/csrf');csrf=data?.csrfToken;if(!csrf)throw Error('CSRF');}
  const response=await fetch('/api/v1'+path,{method:post?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:post?{'Accept':'application/json','Content-Type':'application/json','X-CSRF-Token':csrf}:{Accept:'application/json'},...(post?{body:JSON.stringify(body)}:{})});
  const payload=await response.json();
  if(!response.ok||!payload||!Object.hasOwn(payload,'data')){
   const err=Error('PHONE_AUTH');err.code=payload?.error?.code;err.status=response.status;
   if(err.code==='CSRF_INVALID')csrf=null;
   throw err;
  }
  return payload.data;
 }
 function errorKey(error){return error?.status===429?'limit':error?.code==='PHONE_AUTH_CODE_INVALID'?'invalid':'error';}
 function labels(){if(!dialog?.open)return;dialog.querySelectorAll('[data-phone-auth-text]').forEach(n=>n.textContent=t(n.dataset.phoneAuthText));const select=dialog.querySelector('select');if(select){select.setAttribute('aria-label',t('language'));select.value=window.ROMANO_I18N.language;}}
 function open(){
  if(!available||dialog?.open)return false;
  opener=document.activeElement;
  dialog=el('dialog','customer-entry');dialog.id='phone-auth-entry';dialog.setAttribute('aria-labelledby','phone-auth-title');document.body.append(dialog);
  const panel=el('section','customer-entry-panel'),top=el('div','customer-entry-top'),brand=el('div','customer-entry-brand'),logo=el('img');logo.src='assets/images/logo/brand-mark-144.webp';logo.alt='';logo.width=48;logo.height=48;
  const brandName=el('strong');brandName.textContent='RAMEN';brand.append(logo,brandName);top.append(brand);
  const select=el('select');select.setAttribute('aria-label',t('language'));
  for(const [value,text] of Object.entries({fa:'فارسی',en:'English',tr:'Türkçe',ar:'العربية'})){const option=el('option');option.value=value;option.textContent=text;select.append(option);}
  select.value=window.ROMANO_I18N.language;select.addEventListener('change',()=>window.ROMANO_I18N.setLanguage(select.value,false));top.append(select);
  const title=label('h1','title');title.id='phone-auth-title';
  const intro=label('p','intro'),form=el('form'),error=el('p','customer-entry-error');error.setAttribute('role','alert');
  const guest=button('guest','customer-entry-guest',()=>dialog?.close());
  panel.append(top,title,intro,form,guest);dialog.append(panel);
  let stage='phone',phone='',registration=null,challenge=null,canResendAt=0,pending=false;
  const showError=key=>{if(key){error.dataset.phoneAuthText=key;error.textContent=t(key);}else{delete error.dataset.phoneAuthText;error.textContent='';}};
  const field=(key,options)=>{const wrapper=el('label'),input=el('input');Object.assign(input,options);wrapper.append(label('span',key),input);form.append(wrapper);return input;};
  function render(){
   clearTimeout(timer);form.replaceChildren();showError(null);
   intro.dataset.phoneAuthText=stage==='phone'?'intro':stage==='name'?'new':'sent';intro.textContent=t(intro.dataset.phoneAuthText);
   let primary,name,key,adminToggle,resend;
   if(stage==='phone')primary=field('phone',{type:'tel',name:'phone',inputMode:'tel',autocomplete:'tel',dir:'ltr',required:true,maxLength:40,value:phone});
   if(stage==='name'){
    primary=field('name',{name:'name',autocomplete:'name',dir:'auto',required:true,maxLength:80,value:registration?.name||''});
    const toggle=el('label','phone-auth-invite-toggle');adminToggle=el('input');adminToggle.type='checkbox';toggle.append(adminToggle,label('span','admin'));form.append(toggle);
    key=field('key',{type:'password',name:'accessKey',autocomplete:'off',dir:'ltr',maxLength:43});key.parentElement.hidden=true;
    adminToggle.addEventListener('change',()=>{key.parentElement.hidden=!adminToggle.checked;key.required=adminToggle.checked;if(!adminToggle.checked)key.value='';});
   }
   if(stage==='code')primary=field('code',{name:'code',type:'text',inputMode:'numeric',autocomplete:'one-time-code',dir:'ltr',required:true,maxLength:6});
   const submit=label('button',stage==='phone'?'next':stage==='name'?'send':'verify','customer-entry-submit');submit.type='submit';form.append(submit);
   if(stage!=='phone')form.append(button('edit','customer-entry-guest',()=>{if(!pending){stage='phone';challenge=null;registration=null;render();}}));
   if(stage==='code'){
    resend=button('resend','customer-entry-guest',()=>{if(!pending&&Date.now()>=canResendAt)run(async()=>{await start();render();});});form.append(resend);
    const tick=()=>{if(!dialog?.open||stage!=='code')return;resend.disabled=pending||Date.now()<canResendAt;if(Date.now()<canResendAt)timer=setTimeout(tick,1000);};tick();
   }
   form.append(error);primary.focus({preventScroll:true});
   async function start(){const data=await request('/auth/phone/start',{phone,...(registration||{})});if(!data?.challenge)throw Error('INVALID_RESPONSE');challenge=data.challenge;canResendAt=Date.now()+Math.max(60,Number(data.resendAfter)||60)*1000;stage='code';}
   async function run(action){
    if(pending)return;const turn=++generation;pending=true;showError(null);const controls=[...form.querySelectorAll('input,button')];controls.forEach(n=>n.disabled=true);guest.disabled=true;
    try{await action();}catch(e){if(dialog?.open&&turn===generation)showError(errorKey(e));}
    finally{if(turn===generation){pending=false;controls.forEach(n=>n.disabled=false);guest.disabled=false;if(resend)resend.disabled=Date.now()<canResendAt;}}
   }
   form.onsubmit=event=>{event.preventDefault();run(async()=>{
    if(stage==='phone'){phone=digits(primary.value.trim());const result=await request('/auth/phone/lookup',{phone});registration=null;if(result?.needsName===true)stage='name';else if(result?.needsName===false)await start();else throw Error('INVALID_RESPONSE');render();return;}
    if(stage==='name'){registration={name:primary.value.trim(),...(adminToggle.checked?{accessKey:key.value.trim()}:{})};await start();render();return;}
    const result=await request('/auth/phone/verify',{challenge,code:digits(primary.value)});
    if(!result?.user||!['admin','customer'].includes(result.role))throw Error('INVALID_RESPONSE');
    csrf=result.csrfToken||null;session={user:result.user,role:result.role};challenge=null;registration=null;removeLogin();dialog.close();
    if(result.role==='admin')location.assign(adminDestination().href);
   });};
  }
  dialog.addEventListener('cancel',event=>{if(pending)event.preventDefault();});
  dialog.addEventListener('close',()=>{generation++;clearTimeout(timer);registration=null;challenge=null;removeLogin();window.RamenOverlayHistory.leave('phone-entry');dialog.remove();dialog=null;if(opener?.isConnected&&!opener.closest('[inert]'))opener.focus({preventScroll:true});});
  dialog.showModal();window.RamenOverlayHistory.enter('phone-entry',()=>{if(!pending)dialog?.close();},{onBack:()=>pending});render();return true;
 }
 async function boot(){
  if(booted||window.RomanoPublicAPI?.standalone||typeof menuDataMode==='undefined'||menuDataMode!=='public')return;
  booted=true;
  try{available=(await request('/auth/phone/status'))?.enabled===true;if(!available)return;session=await request('/auth/me');if(launch){if(session?.user){removeLogin();if(session.membership)location.assign(adminDestination().href);}else open();}}
  catch{available=false;}
 }
 function renderProfile(host,closePanel){
  if(!available)return false;
  if(!session?.user){host.append(button('login','feedback-save',()=>{closePanel();open();}));return true;}
  const name=el('strong');name.dir='auto';name.textContent=session.user.displayName||'';host.append(name);
  const logout=button('logout','feedback-save',async()=>{logout.disabled=true;try{await request('/auth/logout',{});csrf=null;session=null;closePanel();}catch{logout.disabled=false;const error=label('p','error');error.setAttribute('role','alert');host.append(error);}});host.append(logout);return true;
 }
 window.addEventListener('romano:data-updated',boot);
 document.addEventListener('romano:language-changed',labels);
 window.RomanoPhoneAuth=Object.freeze({open,renderProfile});
})();
