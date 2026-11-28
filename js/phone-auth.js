/* Shared phone entry: server-authorized connected transport and explicitly fictional demo transport. */
(()=>{
 "use strict";
 const words={
  fa:{title:"ورود به رامن",phone:"شماره تلفن",name:"نام و نام خانوادگی",admin:"ثبت‌نام ادمین",staffTitle:"ثبت‌نام ادمین",customerTitle:"ثبت‌نام مشتری",staffIntro:"شماره تلفن، نام و کلید دسترسی دریافتی را وارد کنید.",backLogin:"بازگشت به ورود",key:"کلید دسترسی",code:"کد تأیید",next:"ادامه",send:"ارسال کد تأیید",verify:"ورود",edit:"تغییر شماره",resend:"ارسال مجدد کد",guest:"فعلاً فقط منو را ببینید",intro:"با شماره تلفن وارد شوید.",new:"برای ثبت‌نام نام خود را وارد کنید.",sent:"کد شش رقمی ارسال‌شده به شماره‌تان را وارد کنید.",error:"درخواست انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید.",invalid:"کد نادرست یا منقضی است.",limit:"تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید.",language:"زبان",logout:"خروج",login:"ورود / ثبت‌نام",busy:"در حال بررسی…"},
  en:{title:"Welcome to RAMEN",phone:"Phone number",name:"Full name",admin:"Admin registration",staffTitle:"Admin registration",customerTitle:"Customer registration",staffIntro:"Enter your phone number, name and issued access key.",backLogin:"Back to sign in",key:"Access key",code:"Verification code",next:"Continue",send:"Send verification code",verify:"Sign in",edit:"Change number",resend:"Resend code",guest:"Browse the menu for now",intro:"Sign in with your phone number.",new:"Enter your name to create an account.",sent:"Enter the six-digit code sent to your number.",error:"Unable to complete the request. Check your details and try again.",invalid:"The code is incorrect or expired.",limit:"Too many attempts. Try again later.",language:"Language",logout:"Sign out",login:"Sign in / Register",busy:"Please wait…"},
  tr:{title:"RAMEN’ya hoş geldiniz",phone:"Telefon numarası",name:"Ad soyad",admin:"Yönetici kaydı",staffTitle:"Yönetici kaydı",customerTitle:"Müşteri kaydı",staffIntro:"Telefon numaranızı, adınızı ve verilen erişim anahtarını girin.",backLogin:"Girişe dön",key:"Erişim anahtarı",code:"Doğrulama kodu",next:"Devam et",send:"Doğrulama kodu gönder",verify:"Giriş yap",edit:"Numarayı değiştir",resend:"Kodu yeniden gönder",guest:"Şimdilik menüye göz at",intro:"Telefon numaranızla giriş yapın.",new:"Hesap oluşturmak için adınızı girin.",sent:"Numaranıza gönderilen altı haneli kodu girin.",error:"İşlem tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.",invalid:"Kod yanlış veya süresi dolmuş.",limit:"Çok fazla deneme. Daha sonra tekrar deneyin.",language:"Dil",logout:"Çıkış yap",login:"Giriş / Kayıt",busy:"Kontrol ediliyor…"},
  ar:{title:"مرحبًا بك في رامن",phone:"رقم الهاتف",name:"الاسم الكامل",admin:"تسجيل المدير",staffTitle:"تسجيل المدير",customerTitle:"تسجيل العميل",staffIntro:"أدخل رقم هاتفك واسمك ومفتاح الوصول الممنوح لك.",backLogin:"العودة إلى تسجيل الدخول",key:"مفتاح الوصول",code:"رمز التحقق",next:"متابعة",send:"إرسال رمز التحقق",verify:"تسجيل الدخول",edit:"تغيير الرقم",resend:"إعادة إرسال الرمز",guest:"تصفح القائمة الآن",intro:"سجّل الدخول برقم هاتفك.",new:"أدخل اسمك لإنشاء حساب.",sent:"أدخل الرمز المكوّن من ستة أرقام المرسل إلى هاتفك.",error:"تعذر إتمام الطلب. تحقق من البيانات وحاول مرة أخرى.",invalid:"الرمز غير صحيح أو منتهي الصلاحية.",limit:"محاولات كثيرة. حاول لاحقًا.",language:"اللغة",logout:"تسجيل الخروج",login:"الدخول / التسجيل",busy:"جارٍ التحقق…"}
 };
 const sampleWords={
  fa:{demoNotice:'نسخه آزمایشی؛ پیامک واقعی ارسال نمی‌شود. فقط نام ساختگی و شماره نمونه +12025550101 تا +12025550199 وارد کنید.',intro:'با شماره نمونه وارد شوید.',staffIntro:'برای ثبت‌نام مدیر از نام و شماره نمونه و کلید RAMEN-DEMO-ACCESS استفاده کنید.',sent:'کد تأیید آزمایشی: 123456. هیچ پیامکی ارسال نشده است.',send:'دریافت کد نمونه',resend:'دریافت مجدد کد نمونه',demoPhone:'فقط شماره‌های نمونه اعلام‌شده پذیرفته می‌شوند.'},
  en:{demoNotice:'Demo only. No real SMS is sent. Use a fictional name and a sample number from +12025550101 to +12025550199.',intro:'Sign in with a sample phone number.',staffIntro:'Use a fictional name, sample number and the RAMEN-DEMO-ACCESS key.',sent:'Sample verification code: 123456. No SMS was sent.',send:'Get sample code',resend:'Get another sample code',demoPhone:'Use one of the listed sample numbers only.'},
  tr:{demoNotice:'Yalnızca demo. Gerçek SMS gönderilmez. Kurgusal bir ad ve +12025550101 ile +12025550199 arasında örnek numara kullanın.',intro:'Örnek telefon numaranızla giriş yapın.',staffIntro:'Kurgusal ad, örnek numara ve RAMEN-DEMO-ACCESS anahtarını kullanın.',sent:'Örnek doğrulama kodu: 123456. SMS gönderilmedi.',send:'Örnek kod al',resend:'Yeni örnek kod al',demoPhone:'Yalnızca belirtilen örnek numaraları kullanın.'},
  ar:{demoNotice:'عرض تجريبي فقط. لا تُرسل رسالة حقيقية. استخدم اسمًا وهميًا ورقمًا من +12025550101 إلى +12025550199.',intro:'سجّل الدخول برقم تجريبي.',staffIntro:'استخدم اسمًا وهميًا ورقمًا تجريبيًا ومفتاح RAMEN-DEMO-ACCESS.',sent:'رمز التحقق التجريبي: 123456. لم تُرسل رسالة.',send:'احصل على رمز تجريبي',resend:'احصل على رمز آخر',demoPhone:'استخدم أحد الأرقام التجريبية المحددة فقط.'}
 };
 const language=()=>window.ROMANO_I18N?.language||'fa';
 const t=k=>(demoAuth?sampleWords[language()]?.[k]:undefined)??(words[language()]||words.fa)[k];
 const digits=value=>value.replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
 const el=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n;};
 const label=(tag,key,cls)=>{const n=el(tag,cls);n.dataset.phoneAuthText=key;n.textContent=t(key);return n;};
 const button=(key,cls,action)=>{const n=label('button',key,cls);n.type='button';n.addEventListener('click',action);return n;};
 let available=false,booted=false,session=null,dialog=null,csrf=null,generation=0,timer,opener=null;
 let demoAuth=false,demoChallenge=null;
 const sampleStaffKey='ramen_demo_staff_v1',sampleAdminSession='online_menu_demo_admin_session_v1',sampleAccessKey='RAMEN-DEMO-ACCESS';
 function sampleError(code){return Object.assign(Error(code),{code});}
 function samplePhone(raw){
  const p=window.RomanoDemoMembers.phone(raw).replace(/^\+?1(?=20255501\d{2}$)/,'');
  if(!/^20255501(?:0[1-9]|[1-9]\d)$/.test(p))throw sampleError('DEMO_PHONE');
  return '+1'+p;
 }
 function sampleStaff(){
  const raw=localStorage.getItem(sampleStaffKey),rows=raw===null?[]:JSON.parse(raw);
  if(!Array.isArray(rows)||rows.length>99||rows.some(r=>!r||samplePhone(r.phone)!==r.phone||typeof r.name!=='string'||!r.name.trim()||r.name.length>80)||new Set(rows.map(r=>r.phone)).size!==rows.length)throw Error('DEMO_STORAGE');
  return rows;
 }
 function sampleCustomer(phone){
  return window.RomanoDemoMembers.read(localStorage).find(r=>{try{return samplePhone(r.phone)===phone;}catch{return false;}});
 }
 async function sampleRequest(path,body){
  if(typeof menuDataMode==='undefined'||menuDataMode!=='demo')throw Error('DEMO_DISABLED');
  const model=window.RomanoDemoMembers;
  if(path==='/auth/phone/lookup'){
   const p=samplePhone(body.phone);
   return {needsName:!sampleStaff().some(r=>r.phone===p)&&!sampleCustomer(p)};
  }
  if(path==='/auth/phone/start'||path==='/auth/phone/enroll-admin'){
   const p=samplePhone(body.phone),staff=sampleStaff().find(r=>r.phone===p),customer=sampleCustomer(p),enrolling=path.endsWith('/enroll-admin');
   const name=String(body.name||'').normalize('NFKC').trim();
   if(enrolling&&(staff||customer||body.accessKey!==sampleAccessKey||!name||name.length>80))throw Error('DEMO_ENROLL');
   if(!enrolling&&!staff&&!customer&&(!name||name.length>80))throw Error('DEMO_NAME');
   demoChallenge={id:crypto.randomUUID(),phone:p,role:enrolling||staff?'admin':'customer',name:staff?.name||customer?.name||name,enrolling,expires:Date.now()+300000,attempts:0};
   return {challenge:demoChallenge.id,resendAfter:60};
  }
  if(path==='/auth/phone/verify'){
   const c=demoChallenge;
   if(!c||c.id!==body.challenge||Date.now()>=c.expires||c.attempts>=5)throw sampleError('PHONE_AUTH_CODE_INVALID');
   if(body.code!=='123456'){c.attempts++;throw sampleError('PHONE_AUTH_CODE_INVALID');}
   demoChallenge=null;
   await model.mutate(()=>{
    const staff=sampleStaff(),existing=staff.find(r=>r.phone===c.phone),customer=sampleCustomer(c.phone);
    if(c.role==='admin'){
     if(customer||(!c.enrolling&&!existing)||(c.enrolling&&existing))throw Error('DEMO_ROLE_CONFLICT');
     if(c.enrolling)localStorage.setItem(sampleStaffKey,JSON.stringify([...staff,{phone:c.phone,name:c.name}]));
     model.signOut(sessionStorage);sessionStorage.setItem(sampleAdminSession,'1');
    }else{
     if(existing)throw Error('DEMO_ROLE_CONFLICT');
     model.register(localStorage,sessionStorage,customer?.name||c.name,customer?.phone||c.phone);
     sessionStorage.removeItem(sampleAdminSession);
    }
   });
   document.dispatchEvent(new CustomEvent('romano:demo-membership-changed'));
   return {role:c.role,user:{displayName:c.name}};
  }
  throw Error('DEMO_ROUTE');
 }
 function adminDestination(){return new URL('admin/',location.href.split('#')[0].split('?')[0]);}
 function removeLogin(){const url=new URL(location.href);if(url.searchParams.has('login')){url.searchParams.delete('login');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}}
 async function request(path,body){
  if(demoAuth)return sampleRequest(path,body);
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
 function errorKey(error){return error?.code==='DEMO_PHONE'?'demoPhone':error?.status===429?'limit':error?.code==='PHONE_AUTH_CODE_INVALID'?'invalid':'error';}
 function labels(){if(!dialog?.open)return;dialog.querySelectorAll('[data-phone-auth-text]').forEach(n=>n.textContent=t(n.dataset.phoneAuthText));const select=dialog.querySelector('select');if(select){select.setAttribute('aria-label',t('language'));select.value=window.ROMANO_I18N.language;}}
 function open(){
  if(!available||dialog?.open)return false;
  opener=document.activeElement;
  dialog=el('dialog','customer-entry');dialog.id='phone-auth-entry';dialog.setAttribute('aria-labelledby','phone-auth-title');document.body.append(dialog);
  const panel=el('section','customer-entry-panel'),top=el('div','customer-entry-top'),brand=el('div','customer-entry-brand'),logo=el('img');logo.src='assets/images/logo/brand-mark-144.webp';logo.alt='';logo.width=48;logo.height=48;
  const brandName=el('strong');brandName.textContent='RAMEN';brand.append(logo,brandName);top.append(brand);
  const select=el('select');select.setAttribute('aria-label',t('language'));
  for(const [value,text] of Object.entries({fa:'فارسی',en:'English',tr:'Türkçe',ar:'العربية'})){const option=el('option');option.value=value;option.textContent=text;select.append(option);}
  select.value=window.ROMANO_I18N.language;select.addEventListener('change',()=>window.ROMANO_I18N.setLanguage(select.value,false));const languageControl=el('label','ramen-phone-language');const globe=document.createElementNS('http://www.w3.org/2000/svg','svg');globe.setAttribute('viewBox','0 0 24 24');globe.setAttribute('aria-hidden','true');const circle=document.createElementNS(globe.namespaceURI,'circle');circle.setAttribute('cx','12');circle.setAttribute('cy','12');circle.setAttribute('r','9');const path=document.createElementNS(globe.namespaceURI,'path');path.setAttribute('d','M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z');globe.append(circle,path);languageControl.append(globe,select);top.append(languageControl);
  const title=label('h1','title');title.id='phone-auth-title';
  const intro=label('p','intro'),form=el('form'),error=el('p','customer-entry-error');error.setAttribute('role','alert');
  const guest=button('guest','customer-entry-guest',()=>dialog?.close());
  panel.append(top,title,intro);if(demoAuth)panel.append(label('p','demoNotice','customer-entry-notice'));panel.append(form,guest);dialog.append(panel);
  let stage='phone',phone='',registration=null,challenge=null,canResendAt=0,pending=false,staffEnrollment=false;
  const showError=key=>{if(key){error.dataset.phoneAuthText=key;error.textContent=t(key);}else{delete error.dataset.phoneAuthText;error.textContent='';}};
  const field=(key,options)=>{const wrapper=el('label'),input=el('input');Object.assign(input,options);wrapper.append(label('span',key),input);form.append(wrapper);return input;};
  function render(){
   clearTimeout(timer);form.replaceChildren();showError(null);
   dialog.dataset.stage=stage;
   title.dataset.phoneAuthText=staffEnrollment?'staffTitle':stage==='name'||registration?'customerTitle':'title';
   title.textContent=t(title.dataset.phoneAuthText);
   intro.dataset.phoneAuthText=stage==='phone'?'intro':stage==='name'?'new':stage==='staff'?'staffIntro':'sent';intro.textContent=t(intro.dataset.phoneAuthText);
   let primary,name,key,resend;
   if(stage==='phone')primary=field('phone',{type:'tel',name:'phone',inputMode:'tel',autocomplete:demoAuth?'off':'tel',placeholder:demoAuth?'+12025550101':'',dir:'ltr',required:true,maxLength:40,value:phone});
   if(stage==='name')primary=field('name',{name:'name',autocomplete:demoAuth?'off':'name',dir:'auto',required:true,maxLength:80,value:registration?.name||''});
   if(stage==='staff'){
    primary=field('phone',{type:'tel',name:'phone',inputMode:'tel',autocomplete:demoAuth?'off':'tel',placeholder:demoAuth?'+12025550101':'',dir:'ltr',required:true,maxLength:40,value:phone});
    name=field('name',{name:'name',autocomplete:demoAuth?'off':'name',dir:'auto',required:true,maxLength:80,value:registration?.name||''});
    key=field('key',{type:'password',name:'accessKey',autocomplete:'off',dir:'ltr',minLength:demoAuth?sampleAccessKey.length:43,maxLength:demoAuth?sampleAccessKey.length:43,required:true});
   }
   if(stage==='code')primary=field('code',{name:'code',type:'text',inputMode:'numeric',autocomplete:'one-time-code',dir:'ltr',required:true,maxLength:6});
   const submit=label('button',stage==='phone'?'next':stage==='code'?'verify':'send','customer-entry-submit');submit.type='submit';form.append(submit);
   if(stage==='phone'||stage==='name')form.append(button('admin','customer-entry-guest',()=>{if(!pending){if(stage==='phone')phone=digits(primary.value.trim());staffEnrollment=true;stage='staff';registration=null;render();}}));
   if(stage!=='phone')form.append(button(stage==='staff'||stage==='name'?'backLogin':'edit','customer-entry-guest',()=>{if(!pending){stage='phone';staffEnrollment=false;challenge=null;registration=null;render();}}));
   if(stage==='code'){
    resend=button('resend','customer-entry-guest',()=>{if(!pending&&Date.now()>=canResendAt)run(async()=>{await start();render();});});form.append(resend);
    const tick=()=>{if(!dialog?.open||stage!=='code')return;resend.disabled=pending||Date.now()<canResendAt;if(Date.now()<canResendAt)timer=setTimeout(tick,1000);};tick();
   }
   form.append(error);primary.focus({preventScroll:true});
   async function start(){const data=await request(staffEnrollment?'/auth/phone/enroll-admin':'/auth/phone/start',{phone,...(registration||{})});if(!data?.challenge)throw Error('INVALID_RESPONSE');challenge=data.challenge;canResendAt=Date.now()+Math.max(60,Number(data.resendAfter)||60)*1000;stage='code';}
   async function run(action){
    if(pending)return;const turn=++generation;pending=true;showError(null);const controls=[...form.querySelectorAll('input,button')];controls.forEach(n=>n.disabled=true);guest.disabled=true;
    try{await action();}catch(e){if(dialog?.open&&turn===generation)showError(errorKey(e));}
    finally{if(turn===generation){pending=false;controls.forEach(n=>n.disabled=false);guest.disabled=false;if(resend)resend.disabled=Date.now()<canResendAt;}}
   }
   form.onsubmit=event=>{event.preventDefault();run(async()=>{
    if(stage==='phone'){phone=digits(primary.value.trim());const result=await request('/auth/phone/lookup',{phone});registration=null;if(result?.needsName===true)stage='name';else if(result?.needsName===false)await start();else throw Error('INVALID_RESPONSE');render();return;}
    if(stage==='name'){registration={name:primary.value.trim()};await start();render();return;}
    if(stage==='staff'){phone=digits(primary.value.trim());registration={name:name.value.trim(),accessKey:key.value.trim()};await start();render();return;}
    const result=await request('/auth/phone/verify',{challenge,code:digits(primary.value)});
    if(!result?.user||!['admin','customer'].includes(result.role))throw Error('INVALID_RESPONSE');
    csrf=result.csrfToken||null;session={user:result.user,role:result.role};challenge=null;registration=null;removeLogin();dialog.close();
    if(result.role==='admin')location.assign(adminDestination().href);
   });};
  }
  function backStage(){
   if(pending)return true;
   if(stage==='phone')return false;
   if(stage==='code'){
    stage=staffEnrollment?'staff':registration?'name':'phone';challenge=null;demoChallenge=null;
    if(registration?.accessKey)registration={name:registration.name};
   }else{stage='phone';staffEnrollment=false;challenge=null;registration=null;demoChallenge=null;}
   render();return true;
  }
  dialog.addEventListener('cancel',event=>{if(backStage())event.preventDefault();});
  dialog.addEventListener('close',()=>{generation++;clearTimeout(timer);registration=null;challenge=null;demoChallenge=null;removeLogin();window.RamenOverlayHistory.leave('phone-entry');dialog.remove();dialog=null;if(opener?.isConnected&&!opener.closest('[inert]'))opener.focus({preventScroll:true});});
  dialog.showModal();window.RamenOverlayHistory.enter('phone-entry',()=>{if(!pending)dialog?.close();},{onBack:backStage});render();return true;
 }
 async function boot(launch=false){
  if(booted||typeof menuDataMode==='undefined')return;
  if(menuDataMode==='demo'){booted=true;demoAuth=true;available=true;if(launch)open();return;}
  if(window.RomanoPublicAPI?.standalone||menuDataMode!=='public')return;
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
 document.addEventListener('romano:language-changed',labels);
 window.RomanoPhoneAuth=Object.freeze({boot,open,renderProfile});
})();
