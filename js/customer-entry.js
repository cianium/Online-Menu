/* Sample-only customer entry and history. A QR marker is not an authorization token. */
(()=>{
 "use strict";
 const model=window.RomanoDemoMembers;
 const entryUrl=new URL(document.currentScript.src),initialQuery=new URLSearchParams(location.search);
 const phoneLaunch=initialQuery.get('login')==='1'||(initialQuery.has('qr')&&initialQuery.get('qr')!=='demo');
 let phoneLoading=false;
 function loadPhoneEntry(){
  if(phoneLoading||menuDataMode!=='public'||window.RomanoPublicAPI.standalone)return;
  phoneLoading=true;
  const script=document.createElement('script'),url=new URL('phone-auth.js',entryUrl);
  if(entryUrl.searchParams.has('v'))url.searchParams.set('v',entryUrl.searchParams.get('v'));
  script.src=url.href;
  script.onload=()=>window.RomanoPhoneAuth?.boot(phoneLaunch);
  script.onerror=()=>{phoneLoading=false;script.remove();};
  document.head.append(script);
 }
 window.addEventListener('romano:data-updated',loadPhoneEntry);
 const words={
 fa:{eyebrow:'باشگاه مشتریان',title:'ورود به رامن',intro:'شماره تلفن نمونه را وارد کنید.',nameIntro:'نام نمونه را وارد کنید.',codeIntro:'کد نمایشی: ۱۲۳۴۵۶ (پیامکی ارسال نمی‌شود).',code:'کد آزمایشی',edit:'تغییر شماره',badCode:'کد آزمایشی نادرست است.',name:'نام',phone:'شماره تلفن',continue:'ادامه',notice:'نسخه نمایشی؛ فقط اطلاعات ساختگی وارد کنید. داده‌ها در همین مرورگر ذخیره می‌شوند.',error:'نام و شماره نمونه معتبر وارد کنید یا ذخیره مرورگر را بررسی کنید.',active:'برای تغییر پروفایل، ابتدا از پروفایل فعلی خارج شوید.',existing:'این شماره با نام دیگری ثبت شده است. نام قبلی را دقیق وارد کنید.',history:'تاریخچه سفارش‌های نمونه',empty:'هنوز سفارش نمونه‌ای ندارید.',logout:'خروج از پروفایل نمونه',join:'عضویت آزمایشی',order:'ثبت سفارش نمونه',saved:'سفارش نمونه ذخیره شد؛ برای رستوران ارسال نشد.',orderError:'ذخیره سفارش نمونه ممکن نشد.',language:'زبان',guest:'فعلاً فقط منو را ببینید'},
 en:{eyebrow:'Customer club',title:'Enter RAMEN',intro:'Enter a fictional phone number.',nameIntro:'Enter a fictional name.',codeIntro:'Demo code: 123456 (no SMS is sent).',code:'Demo code',edit:'Change number',badCode:'Incorrect demo code.',name:'Name',phone:'Phone number',continue:'Continue',notice:'Demo only. Use fictional details; data stays in this browser.',error:'Enter a valid sample name and phone or check browser storage.',active:'Sign out of the current sample profile before switching.',existing:'This number is registered under a different name. Enter the previous name exactly.',history:'Sample order history',empty:'No sample orders yet.',logout:'Sign out of sample profile',join:'Join the demo club',order:'Save sample order',saved:'Sample order saved; nothing was sent to the restaurant.',orderError:'Could not save the sample order.',language:'Language',guest:'Browse the menu for now'},
 tr:{eyebrow:'Müşteri kulübü',title:'RAMEN’ya giriş',intro:'Kurgusal bir telefon numarası girin.',nameIntro:'Kurgusal bir ad girin.',codeIntro:'Demo kodu: 123456 (SMS gönderilmez).',code:'Demo kodu',edit:'Numarayı değiştir',badCode:'Demo kodu yanlış.',name:'Ad',phone:'Telefon numarası',continue:'Devam et',notice:'Yalnızca demo. Kurgusal bilgi kullanın; veriler bu tarayıcıda kalır.',error:'Geçerli örnek ad ve telefon girin veya tarayıcı depolamasını kontrol edin.',active:'Profil değiştirmek için önce mevcut örnek profilden çıkın.',existing:'Bu numara farklı bir adla kayıtlı. Önceki adı tam olarak girin.',history:'Örnek sipariş geçmişi',empty:'Henüz örnek sipariş yok.',logout:'Örnek profilden çık',join:'Demo kulübüne katıl',order:'Örnek siparişi kaydet',saved:'Örnek sipariş kaydedildi; restorana gönderilmedi.',orderError:'Örnek sipariş kaydedilemedi.',language:'Dil',guest:'Şimdilik menüye göz at'},
 ar:{eyebrow:'نادي العملاء',title:'الدخول إلى رامن',intro:'أدخل رقم هاتف وهميًا.',nameIntro:'أدخل اسمًا وهميًا.',codeIntro:'رمز تجريبي: ١٢٣٤٥٦ (لا ترسل رسالة نصية).',code:'رمز تجريبي',edit:'تغيير الرقم',badCode:'الرمز التجريبي غير صحيح.',name:'الاسم',phone:'رقم الهاتف',continue:'متابعة',notice:'نسخة تجريبية فقط. استخدم بيانات وهمية؛ تبقى البيانات في هذا المتصفح.',error:'أدخل اسمًا ورقمًا تجريبيين صالحين أو تحقق من تخزين المتصفح.',active:'سجّل الخروج من الملف التجريبي الحالي قبل التبديل.',existing:'هذا الرقم مسجل باسم مختلف. أدخل الاسم السابق كما هو.',history:'سجل الطلبات التجريبية',empty:'لا توجد طلبات تجريبية بعد.',logout:'الخروج من الملف التجريبي',join:'الانضمام للنادي التجريبي',order:'حفظ طلب تجريبي',saved:'حُفظ الطلب التجريبي ولم يُرسل للمطعم.',orderError:'تعذر حفظ الطلب التجريبي.',language:'اللغة',guest:'تصفح القائمة الآن'}
 };
 const lang=()=>window.ROMANO_I18N?.language||'fa';
 const t=k=>words[lang()]?.[k]||words.fa[k];
 const demo=()=>typeof menuDataMode!=='undefined'&&menuDataMode==='demo';
 const current=()=>{try{return demo()?model.active(localStorage,sessionStorage):null;}catch{return null;}};
 const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
 let dialog,opener,returnToCart=null,required=false,entered=false,pending=false;
 const qr=()=>new URLSearchParams(location.search).get('qr')==='demo';
 function announce(){document.dispatchEvent(new CustomEvent('romano:demo-membership-changed'));}
 function removeMarker(){const url=new URL(location.href);if(qr()){url.searchParams.delete('qr');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}}
 function close(){if(dialog?.open)dialog.close();}
 function labels(){if(!dialog?.open)return;dialog.querySelectorAll('[data-member-text]').forEach(n=>n.textContent=t(n.dataset.memberText));dialog.querySelector('select').value=lang();dialog.querySelector('select').setAttribute('aria-label',t('language'));}
 function text(tag,key,cls){const n=el(tag,t(key),cls);n.dataset.memberText=key;return n;}
 function open(must=false,onReturn=null){
  if(!demo()||typeof HTMLDialogElement==='undefined'||!HTMLDialogElement.prototype.showModal)return false;
  required=must;
  if(dialog?.open)return true;
  returnToCart=typeof onReturn==="function"?onReturn:null;
  opener=document.activeElement;
  dialog=document.querySelector('#customer-entry');
  if(!dialog){dialog=el('dialog',undefined,'customer-entry');dialog.id='customer-entry';dialog.setAttribute('aria-labelledby','customer-entry-title');document.body.append(dialog);
   dialog.addEventListener('cancel',e=>{if(required||pending)e.preventDefault();});
   dialog.addEventListener('close',()=>{window.RamenOverlayHistory.leave("entry");const resume=returnToCart;returnToCart=null;if(resume)resume();else if(opener?.isConnected&&!opener.closest('[inert]'))opener.focus({preventScroll:true});});
  }
  const panel=el('section',undefined,'customer-entry-panel'),top=el('div',undefined,'customer-entry-top');
  const brand=el('div',undefined,'customer-entry-brand'),logo=el('img');
  logo.src='assets/images/logo/brand-mark-144.webp';logo.alt='';logo.width=48;logo.height=48;
  const brandCopy=el('div');brandCopy.append(el('strong','RAMEN'),text('span','eyebrow','customer-entry-eyebrow'));brand.append(logo,brandCopy);top.append(brand);
  const select=el('select');select.setAttribute('aria-label',t('language'));
  for(const [code,label] of Object.entries({fa:'فارسی',en:'English',tr:'Türkçe',ar:'العربية'})){const o=el('option',label);o.value=code;select.append(o);}
  select.value=lang();select.addEventListener('change',()=>window.ROMANO_I18N.setLanguage(select.value,false));top.append(select);
  const title=text('h1','title');title.id='customer-entry-title';
  const form=el('form'),intro=text('p','intro'),error=el('p','','customer-entry-error');
  error.setAttribute('role','alert');
  let stage='phone',phoneValue='',nameValue='',knownId=null,input;
  const submit=text('button','continue','customer-entry-submit');submit.type='submit';
  const guest=text('button','guest','customer-entry-guest');guest.type='button';guest.onclick=()=>{entered=true;removeMarker();close();};
  const edit=text('button','edit','customer-entry-guest');edit.type='button';edit.onclick=()=>{if(!pending){stage='phone';knownId=null;nameValue='';render();}};
  function fail(key){error.dataset.memberText=key;error.textContent=t(key);}
  function render(){
   const label=el('label');input=el('input');input.name=stage;input.required=true;input.autocomplete='off';input.maxLength=stage==='phone'?32:stage==='name'?80:6;input.dir=stage==='name'?'auto':'ltr';input.type=stage==='phone'?'tel':'text';input.inputMode=stage==='phone'?'tel':stage==='code'?'numeric':'text';
   if(stage==='phone')input.value=phoneValue;
   input.setAttribute('aria-describedby','customer-entry-notice');label.append(text('span',stage),input);
   intro.dataset.memberText=stage==='phone'?'intro':stage==='name'?'nameIntro':'codeIntro';intro.textContent=t(intro.dataset.memberText);
   delete error.dataset.memberText;error.textContent='';edit.hidden=stage==='phone';form.replaceChildren(label,submit,edit,error);if(dialog.open)input.focus();
  }
  form.onsubmit=async event=>{
   event.preventDefault();if(!demo()||pending)return;delete error.dataset.memberText;error.textContent='';
   try{
    if(stage==='phone'){
     phoneValue=model.phone(input.value);if(!/^\+?[0-9]{7,15}$/.test(phoneValue))throw Error('INVALID_INPUT');
     const member=model.read(localStorage).find(row=>model.phone(row.phone)===phoneValue);knownId=member?.id||null;nameValue=member?.name||'';stage=member?'code':'name';render();return;
    }
    if(stage==='name'){nameValue=input.value.trim();if(!nameValue||nameValue.length>80)throw Error('INVALID_INPUT');stage='code';render();return;}
    if(model.phone(input.value)!=='123456'){fail('badCode');return;}
    pending=submit.disabled=guest.disabled=edit.disabled=true;
    await model.mutate(()=>{
     const member=model.read(localStorage).find(row=>model.phone(row.phone)===phoneValue);
     if(knownId&&member?.id!==knownId)throw Error('INVALID_INPUT');
     return model.register(localStorage,sessionStorage,knownId?member.name:nameValue,phoneValue);
    });
    entered=true;removeMarker();close();announce();
   }catch(err){fail(err.message==='EXISTING_PROFILE'?'existing':err.message==='ACTIVE_PROFILE'?'active':'error');}
   finally{pending=submit.disabled=guest.disabled=edit.disabled=false;}
  };
  render();
  const notice=text('p','notice','customer-entry-notice');notice.id='customer-entry-notice';
  panel.append(top,title);
  const branch=window.RomanoDemoBranches?.context();
  if(branch){
    const table=branch.tables.find(row=>row.code===window.RomanoDemoBranches.table);
    if(table)panel.append(el('p',window.ROMANO_I18N.displayBrand(table.name)));
  }
  panel.append(intro,form,notice,guest);
  dialog.replaceChildren(panel);dialog.showModal();
  window.RamenOverlayHistory.enter("entry",()=>{if(required)entered=true;close();});
  input.focus();return true;
 }
 function renderProfile(host,closePanel){
  if(!demo())return window.RomanoPhoneAuth?.renderProfile(host,closePanel)??false;
  const member=current();
  if(!member){const button=text('button','join','feedback-save');button.type='button';button.addEventListener('click',()=>{closePanel();open();});host.append(text('p','notice','ramen-contact-note'),button);return true;}
  window.RomanoCustomerPanels.renderDemoProfile(host,member,{model,lang,el,text});
  const logout=text('button','logout','feedback-save');logout.type='button';logout.addEventListener('click',()=>{try{model.signOut(sessionStorage);}catch{}closePanel();announce();});host.append(logout);return true;
 }
 function scan(){if(demo()&&qr()&&!entered){if(current()){removeMarker();entered=true;}else open(true);}}
 window.addEventListener("popstate",()=>{if(entered&&qr())removeMarker();});
 window.addEventListener('romano:data-updated',scan);
 document.addEventListener('romano:language-changed',labels);
 window.RomanoCustomerEntry=Object.freeze({t,current,open,renderProfile,scan,isDemoQr:qr});
})();
