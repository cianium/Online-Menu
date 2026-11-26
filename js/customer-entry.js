/* Sample-only customer entry and history. A QR marker is not an authorization token. */
(()=>{
 "use strict";
 const model=window.RomanoDemoMembers;
 const words={
 fa:{title:'به رومانو خوش آمدید',intro:'با نام و شماره تلفن، پروفایل آزمایشی بسازید یا در همین تب دوباره وارد شوید.',name:'نام',phone:'شماره تلفن',continue:'ورود / ثبت‌نام',notice:'فقط اطلاعات ساختگی وارد کنید. عضویت و سفارش نمونه در همین مرورگر است؛ احراز هویت واقعی نیست.',error:'نام و شماره نمونه معتبر وارد کنید یا ذخیره مرورگر را بررسی کنید.',existing:'این شماره نمونه قبلاً ثبت شده است. برای ورود مجدد، همان نام و شماره را در تب اولیه وارد کنید.',history:'تاریخچه سفارش‌های نمونه',empty:'هنوز سفارش نمونه‌ای ندارید.',logout:'خروج از پروفایل نمونه',join:'عضویت آزمایشی',order:'ثبت سفارش نمونه',saved:'سفارش نمونه ذخیره شد؛ برای رستوران ارسال نشد.',orderError:'ذخیره سفارش نمونه ممکن نشد.',language:'زبان',guest:'مشاهده منو بدون عضویت'},
 en:{title:'Welcome to ROMANO',intro:'Create a sample profile or sign in again in this tab using your name and phone number.',name:'Name',phone:'Phone number',continue:'Sign in / Register',notice:'Use fictional details only. Membership and sample orders stay in this browser; this is not real authentication.',error:'Enter a valid sample name and phone or check browser storage.',existing:'This sample number is already registered. To sign in again, use the same name and phone in the original tab.',history:'Sample order history',empty:'No sample orders yet.',logout:'Sign out of sample profile',join:'Join the demo club',order:'Save sample order',saved:'Sample order saved; nothing was sent to the restaurant.',orderError:'Could not save the sample order.',language:'Language',guest:'Browse without joining'},
 tr:{title:'ROMANO’ya hoş geldiniz',intro:'Adınız ve telefon numaranızla örnek profil oluşturun veya bu sekmede tekrar giriş yapın.',name:'Ad',phone:'Telefon numarası',continue:'Giriş / Kayıt',notice:'Yalnızca kurgusal bilgi kullanın. Üyelik ve örnek siparişler bu tarayıcıda kalır; gerçek kimlik doğrulaması değildir.',error:'Geçerli örnek ad ve telefon girin veya tarayıcı depolamasını kontrol edin.',existing:'Bu örnek numara kayıtlı. Tekrar giriş için ilk sekmede aynı adı ve telefon numarasını kullanın.',history:'Örnek sipariş geçmişi',empty:'Henüz örnek sipariş yok.',logout:'Örnek profilden çık',join:'Demo kulübüne katıl',order:'Örnek siparişi kaydet',saved:'Örnek sipariş kaydedildi; restorana gönderilmedi.',orderError:'Örnek sipariş kaydedilemedi.',language:'Dil',guest:'Üye olmadan menüye bak'},
 ar:{title:'مرحبًا بك في رومانو',intro:'أنشئ ملفًا تجريبيًا أو سجّل الدخول مجددًا في علامة التبويب هذه باستخدام اسمك ورقم هاتفك.',name:'الاسم',phone:'رقم الهاتف',continue:'دخول / تسجيل',notice:'استخدم بيانات وهمية فقط. العضوية والطلبات التجريبية تبقى في هذا المتصفح؛ ليست مصادقة حقيقية.',error:'أدخل اسمًا ورقمًا تجريبيين صالحين أو تحقق من تخزين المتصفح.',existing:'هذا الرقم التجريبي مسجل. لتسجيل الدخول مجددًا، استخدم الاسم والرقم نفسيهما في علامة التبويب الأصلية.',history:'سجل الطلبات التجريبية',empty:'لا توجد طلبات تجريبية بعد.',logout:'الخروج من الملف التجريبي',join:'الانضمام للنادي التجريبي',order:'حفظ طلب تجريبي',saved:'حُفظ الطلب التجريبي ولم يُرسل للمطعم.',orderError:'تعذر حفظ الطلب التجريبي.',language:'اللغة',guest:'تصفح القائمة دون عضوية'}
 };
 const lang=()=>window.ROMANO_I18N?.language||'fa';
 const t=k=>words[lang()]?.[k]||words.fa[k];
 const demo=()=>typeof menuDataMode!=='undefined'&&menuDataMode==='demo';
 const current=()=>{try{return demo()?model.active(localStorage,sessionStorage):null;}catch{return null;}};
 const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
 let dialog,opener,required=false,entered=false;
 const qr=()=>new URLSearchParams(location.search).get('qr')==='demo';
 function announce(){document.dispatchEvent(new CustomEvent('romano:demo-membership-changed'));}
 function removeMarker(){const url=new URL(location.href);if(qr()){url.searchParams.delete('qr');history.replaceState(null,'',url.pathname+url.search+url.hash);}}
 function close(){if(dialog?.open)dialog.close();}
 function labels(){if(!dialog?.open)return;dialog.querySelectorAll('[data-member-text]').forEach(n=>n.textContent=t(n.dataset.memberText));dialog.querySelector('select').value=lang();dialog.querySelector('select').setAttribute('aria-label',t('language'));}
 function text(tag,key,cls){const n=el(tag,t(key),cls);n.dataset.memberText=key;return n;}
 function open(must=false){
  if(!demo()||typeof HTMLDialogElement==='undefined'||!HTMLDialogElement.prototype.showModal)return false;
  required=must;
  if(dialog?.open)return true;
  opener=document.activeElement;
  dialog=document.querySelector('#customer-entry');
  if(!dialog){dialog=el('dialog',undefined,'customer-entry');dialog.id='customer-entry';dialog.setAttribute('aria-labelledby','customer-entry-title');document.body.append(dialog);
   dialog.addEventListener('cancel',e=>{if(required)e.preventDefault();});
   dialog.addEventListener('close',()=>{if(opener?.isConnected&&!opener.closest('[inert]'))opener.focus({preventScroll:true});});
  }
  const panel=el('section',undefined,'customer-entry-panel'),top=el('div',undefined,'customer-entry-top');
  top.append(el('strong','ROMANO'));
  const select=el('select');select.setAttribute('aria-label',t('language'));
  for(const [code,label] of Object.entries({fa:'فارسی',en:'English',tr:'Türkçe',ar:'العربية'})){const o=el('option',label);o.value=code;select.append(o);}
  select.value=lang();select.addEventListener('change',()=>window.ROMANO_I18N.setLanguage(select.value,false));top.append(select);
  const title=text('h1','title');title.id='customer-entry-title';
  const form=el('form'),nameLabel=el('label'),phoneLabel=el('label');
  const name=el('input');name.name='name';name.autocomplete='off';name.required=true;name.maxLength=80;
  const phone=el('input');phone.name='phone';phone.type='tel';phone.inputMode='tel';phone.autocomplete='off';phone.dir='ltr';phone.required=true;phone.maxLength=32;
  nameLabel.append(text('span','name'),name);phoneLabel.append(text('span','phone'),phone);
  const submit=text('button','continue','customer-entry-submit');submit.type='submit';
  const error=el('p','', 'customer-entry-error');error.setAttribute('role','alert');
  const guest=text('button','guest','customer-entry-guest');guest.type='button';guest.addEventListener('click',()=>{entered=true;removeMarker();close();});
  form.append(nameLabel,phoneLabel,submit,error);
  form.addEventListener('submit',e=>{e.preventDefault();if(!demo())return;try{model.register(localStorage,sessionStorage,name.value,phone.value);entered=true;removeMarker();close();announce();}catch(err){error.textContent=t(err.message==='EXISTING_PROFILE'?'existing':'error');}});
  panel.append(top,title,text('p','intro'),form,text('p','notice','customer-entry-notice'),guest);
  dialog.replaceChildren(panel);dialog.showModal();name.focus();return true;
 }
 function renderProfile(host,closePanel){
  if(!demo())return false;
  const member=current();
  if(!member){const button=text('button','join','feedback-save');button.type='button';button.addEventListener('click',()=>{closePanel();open();});host.append(text('p','notice','ramen-contact-note'),button);return true;}
  host.append(el('strong',member.name),text('h3','history'));
  if(!member.orders.length)host.append(text('p','empty','ramen-contact-note'));
  for(const order of member.orders){
   const card=el('article',undefined,'ramen-contact-item');
   card.append(el('small',new Date(order.createdAt).toLocaleDateString(lang())));
   for(const item of order.items)card.append(el('span',item.name+' × '+item.quantity));
   card.append(el('strong',order.currency&&window.OnlineMenuMoney?window.OnlineMenuMoney.formatCatalog(order.total,{currency:order.currency,language:lang()}):typeof formatPrice==='function'?formatPrice(order.total):String(order.total)));host.append(card);
  }
  const logout=text('button','logout','feedback-save');logout.type='button';logout.addEventListener('click',()=>{try{model.signOut(sessionStorage);}catch{}closePanel();announce();});host.append(logout);return true;
 }
 function scan(){if(demo()&&qr()&&!entered){if(current()){removeMarker();entered=true;}else open(true);}}
 window.addEventListener('romano:data-updated',scan);
 document.addEventListener('romano:language-changed',labels);
 window.RomanoCustomerEntry=Object.freeze({t,current,open,renderProfile,scan,isDemoQr:qr});
})();
