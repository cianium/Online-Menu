/* Single-restaurant sample hospitality administration. Never executes real campaigns or staff requests. */
(()=>{
"use strict";
const model=window.RomanoDemoMembers, branch=window.RomanoDemoBranches;
const settings=document.getElementById("hp-admin-settings"), requests=document.getElementById("hp-admin-requests");
const copy={
fa:["تنظیمات خدمات مهمان (آزمایشی)","تنظیمات فقط برای همین رستوران و مرورگر است.","محصولات مکمل (حداکثر ۳)","کد تخفیف نمونه","درصد تخفیف (۰ تا ۵۰)","امتیاز هر سفارش نمونه (۰ تا ۱۰۰۰)","ساعات کاری","لینک نقشه HTTPS","لینک واتس‌اپ wa.me","ذخیره","ذخیره شد","داده نامعتبر یا ذخیره ناموفق","درخواست‌های خدمات میز (آزمایشی)","در انتظار","پذیرفته شد","انجام شد","پذیرش","تکمیل","درخواستی نیست","فراخوان گارسون","صورتحساب","آب","دستمال"],
en:["Guest services settings (demo)","Settings apply to this restaurant and browser only.","Complementary products (up to 3)","Sample promo code","Discount percent (0–50)","Points per sample order (0–1000)","Opening hours","HTTPS map link","WhatsApp wa.me link","Save","Saved","Invalid data or save failed","Table service requests (demo)","Pending","Accepted","Completed","Accept","Complete","No requests","Call waiter","Bill","Water","Napkins"],
tr:["Misafir hizmetleri ayarları (demo)","Ayarlar yalnızca bu restoran ve tarayıcı için geçerlidir.","Tamamlayıcı ürünler (en fazla 3)","Örnek indirim kodu","İndirim yüzdesi (0–50)","Örnek sipariş başına puan (0–1000)","Çalışma saatleri","HTTPS harita bağlantısı","WhatsApp wa.me bağlantısı","Kaydet","Kaydedildi","Geçersiz veri veya kayıt başarısız","Masa hizmeti istekleri (demo)","Bekliyor","Kabul edildi","Tamamlandı","Kabul et","Tamamla","İstek yok","Garson çağır","Hesap","Su","Peçete"],
ar:["إعدادات خدمات الضيوف (تجريبي)","الإعدادات لهذا المطعم والمتصفح فقط.","منتجات مكملة (حتى ٣)","رمز خصم تجريبي","نسبة الخصم (٠–٥٠)","نقاط لكل طلب تجريبي (٠–١٠٠٠)","ساعات العمل","رابط خريطة HTTPS","رابط واتساب wa.me","حفظ","تم الحفظ","بيانات غير صالحة أو فشل الحفظ","طلبات خدمة الطاولات (تجريبي)","قيد الانتظار","مقبول","مكتمل","قبول","إكمال","لا توجد طلبات","استدعاء النادل","الفاتورة","ماء","مناديل"]};
const languages=["fa","en","tr","ar"];
const t=i=>(copy[window.ROMANO_ADMIN_I18N?.language]||copy.fa)[i];
const node=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;n.dataset.adminUserText="true";return n;};
const local=()=>typeof adminInitialized!=="undefined"&&adminInitialized&&adminDemoMode&&demoAdminSignedIn()&&!window.RomanoAPI.enabled&&!document.querySelector(".admin-app").inert;
function renderSettings(){
 settings.hidden=!local();settings.replaceChildren();if(settings.hidden)return;
 settings.append(node("h2",t(0)),node("p",t(1)));
 const status=node("p","");status.setAttribute("role","status");
 let cfg,baseline;try{baseline=localStorage.getItem(model.settingsKey);cfg=model.settings(localStorage);}catch{settings.append(node("p",t(11)));return;}
 const form=node("form",undefined,"settings-form");const fields=node("div",undefined,"form-grid");
 const add=(label,input)=>{const wrap=node("label",undefined,"form-field");wrap.append(node("span",label),input);fields.append(wrap);};
 const suggestions=node("select");suggestions.name="suggestions";suggestions.multiple=true;suggestions.size=4;
 for(const item of state.products.filter(p=>p.active!==false)){const option=node("option",typeof item.name==="string"?item.name:item.id);option.value=item.id;option.selected=cfg.suggestions.includes(item.id);suggestions.append(option);}
 add(t(2),suggestions);
 const bundle=node("select");bundle.name="bundle";bundle.multiple=true;bundle.size=4;
 for(const item of state.products.filter(p=>p.active!==false)){const option=node("option",typeof item.name==="string"?item.name:item.id);option.value=item.id;option.selected=cfg.bundle.includes(item.id);bundle.append(option);}
 add(({fa:"محصولات لازم برای تخفیف ترکیبی (صفر یا دقیقاً ۲)",en:"Required bundle products (none or exactly two)",tr:"Kampanya için gerekli ürünler (yok veya tam iki)",ar:"المنتجات المطلوبة للعرض (لا شيء أو منتجان)"}[window.ROMANO_ADMIN_I18N?.language]||"Bundle products"),bundle);
 function input(name,label,value,type="text",limit=120){const field=node("input");field.name=name;field.type=type;field.value=value;if(type==="number"){field.min="0";field.max=String(limit);field.step="1";field.required=true;}else field.maxLength=limit;add(label,field);}
 input("coupon",t(3),cfg.coupon,"text",24);input("percent",t(4),cfg.percent,"number",50);input("points",t(5),cfg.points,"number",1000);
 for(const l of languages)input("hours_"+l,t(6)+" · "+l.toUpperCase(),cfg.hours[l]);
 input("map",t(7),cfg.map,"url",500);input("whatsapp",t(8),cfg.whatsapp,"url",500);
 const save=node("button",t(9),"primary-button");save.type="submit";form.append(fields,save,status);settings.append(form);
 form.addEventListener("submit",async ev=>{ev.preventDefault();if(!local())return;save.disabled=true;
 try{const data=form.elements;const next={suggestions:[...suggestions.selectedOptions].map(o=>o.value),bundle:[...bundle.selectedOptions].map(o=>o.value),coupon:data.coupon.value.trim().toUpperCase(),percent:Number(data.percent.value),points:Number(data.points.value),hours:Object.fromEntries(languages.map(l=>[l,data["hours_"+l].value])),map:data.map.value.trim(),whatsapp:data.whatsapp.value.trim()};
 await model.mutate(()=>{if(!local()||localStorage.getItem(model.settingsKey)!==baseline)throw Error("STALE");model.saveSettings(localStorage,next);baseline=localStorage.getItem(model.settingsKey);});status.textContent=t(10);
 }catch{status.textContent=t(11);}finally{save.disabled=false;}});
}
const serviceCopy={
 fa:{high:"بالا",normal:"عادی",low:"کم",priority:"اولویت",average:"میانگین زمان پذیرش",samples:"نمونه‌های زمان‌دار",seconds:"ثانیه",unknown:"نامشخص",filter:"فیلتر وضعیت",all:"همه",created:"زمان ثبت",response:"زمان پذیرش",stale:"درخواست تغییر کرده است. فهرست به‌روز شد.",blocked:"ذخیره‌سازی هم‌زمان در این مرورگر پشتیبانی نمی‌شود."},
 en:{high:"High",normal:"Normal",low:"Low",priority:"Priority",average:"Mean time to acceptance",samples:"Timed samples",seconds:"s",unknown:"Unknown",filter:"Filter status",all:"All",created:"Created",response:"Time to acceptance",stale:"Request changed. Queue refreshed.",blocked:"Serialized storage is not supported in this browser."},
 tr:{high:"Yüksek",normal:"Normal",low:"Düşük",priority:"Öncelik",average:"Ortalama kabul süresi",samples:"Süreli örnekler",seconds:"sn",unknown:"Bilinmiyor",filter:"Durum filtresi",all:"Tümü",created:"Oluşturuldu",response:"Kabul süresi",stale:"İstek değişti. Liste yenilendi.",blocked:"Bu tarayıcı sıralı depolamayı desteklemiyor."},
 ar:{high:"مرتفعة",normal:"عادية",low:"منخفضة",priority:"الأولوية",average:"متوسط وقت القبول",samples:"عينات موقّتة",seconds:"ث",unknown:"غير معروف",filter:"تصفية الحالة",all:"الكل",created:"وقت التسجيل",response:"وقت القبول",stale:"تغير الطلب. تم تحديث القائمة.",blocked:"لا يدعم هذا المتصفح التخزين المتسلسل."}
};
let requestFilter="all",requestBusy=false;
function renderRequests(message=""){
 const visible=local()&&Boolean(branch);
 requests.hidden=!visible;requests.replaceChildren();if(!visible)return;
 const lang=window.ROMANO_ADMIN_I18N?.language||"fa",w=serviceCopy[lang]||serviceCopy.fa;
 const number=n=>new Intl.NumberFormat(lang,{maximumFractionDigits:1}).format(n);
 const statusLabel=s=>t({pending:13,accepted:14,completed:15}[s]);
 const duration=ms=>ms===null?w.unknown:number(ms/1000)+" "+w.seconds;
 const notice=node("p",message,"hp-queue-notice");notice.setAttribute("role","status");
 requests.append(node("h2",t(12)),node("p",t(1)),notice);
 try{
  const current=branch.read()[0],rows=model.serviceQueue(localStorage,current?.tables||[]),stats=model.serviceStats(rows);
  const metrics=node("div",undefined,"hp-queue-metrics");
  for(const [label,value] of [[t(13),number(stats.pending)],[t(14),number(stats.accepted)],[t(15),number(stats.completed)],[w.average,duration(stats.meanResponseMs)]]){
   const card=node("div",undefined,"hp-queue-metric");card.append(node("span",label),node("strong",value));metrics.append(card);
  }
  requests.append(metrics,node("p",w.samples+": "+number(stats.responseSamples),"hp-queue-note"));
  const label=node("label",undefined,"hp-queue-filter");label.append(node("span",w.filter));
  const filter=node("select");for(const value of ["all","pending","accepted","completed"]){const option=node("option",value==="all"?w.all:statusLabel(value));option.value=value;filter.append(option);}
  filter.value=requestFilter;filter.addEventListener("change",()=>{requestFilter=filter.value;renderRequests();requests.querySelector("select")?.focus();});label.append(filter);requests.append(label);
  const supported=Boolean(navigator.locks?.request);if(!supported)notice.textContent=w.blocked;
  const filtered=rows.filter(r=>requestFilter==="all"||r.state===requestFilter);
  for(const r of filtered){
   const row=node("article",undefined,"demo-member-row hp-queue-row");row.dataset.serviceKind=r.kind;row.dataset.tableCode=r.tableCode;
   const title=node("strong",r.tableName+" · "+t(19+model.kinds.indexOf(r.kind)));title.dir="auto";
   row.append(title,node("span",statusLabel(r.state)),node("span",w.priority+": "+w[({3:"high",2:"normal",1:"low"})[r.priority]],"hp-queue-priority"));
   const created=r.createdAt===null?w.unknown:new Intl.DateTimeFormat(lang,{dateStyle:"short",timeStyle:"short"}).format(r.createdAt);
   row.append(node("small",w.created+": "+created));
   if(r.acceptedAt!==null&&r.createdAt!==null)row.append(node("small",w.response+": "+duration(r.acceptedAt-r.createdAt)));
   if(r.state!=="completed"){
    const actions=node("div",undefined,"hp-queue-actions");
    for(const next of r.state==="pending"?["accepted","completed"]:["completed"]){
     const button=node("button",t(next==="accepted"?16:17),"secondary-button");button.type="button";button.dataset.serviceAction=next;button.disabled=requestBusy||!supported;
     button.addEventListener("click",async()=>{
      if(!local()||requestBusy||!button.isConnected)return;requestBusy=true;requests.querySelectorAll("button").forEach(b=>b.disabled=true);
      let errorMessage="";
      try{await model.mutateRequest(r.tableCode,()=>{if(!local())throw Error("HP_AUTH");return model.setRequest(localStorage,r.tableCode,r.kind,next,r.state,r.id);});}
      catch(e){errorMessage=e.message==="HP_STALE"?w.stale:t(11);}
      finally{requestBusy=false;renderRequests(errorMessage);document.dispatchEvent(new CustomEvent("romano:table-services-changed"));}
     });actions.append(button);
    }
    row.append(actions);
   }
   requests.append(row);
  }
  if(!filtered.length)requests.append(node("p",t(18)));
 }catch{notice.textContent=t(11);}
}
document.addEventListener("romano:admin-page-changed",ev=>{if(ev.detail?.page==="settings")renderSettings();if(ev.detail?.page==="orders")renderRequests();});
document.addEventListener("romano:language-changed",()=>{renderSettings();renderRequests();});
window.addEventListener("storage",ev=>{if(ev.key===null||ev.key?.startsWith(model.requestPrefix))renderRequests();});
document.getElementById("orders-refresh")?.addEventListener("click",()=>renderRequests());
window.addEventListener("storage",ev=>{if(ev.key===null||ev.key===branch?.registry)renderRequests();});
const app=document.querySelector(".admin-app");if(app)new MutationObserver(()=>{if(!local())renderRequests();}).observe(app,{attributes:true,attributeFilter:["inert"]});
})();
