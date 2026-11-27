/* Branch-local sample hospitality administration. Never executes real campaigns or staff requests. */
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
const local=()=>typeof adminInitialized!=="undefined"&&adminInitialized&&!window.RomanoAPI.enabled&&!document.querySelector(".admin-app").inert;
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
function renderRequests(){
 requests.hidden=!local()||!branch;requests.replaceChildren();if(requests.hidden)return;
 requests.append(node("h2",t(12)),node("p",t(1)));let count=0;
 try{const current=branch.context()||branch.read().find(r=>r.id===branch.id);
 for(const table of current?.tables||[]){const values=model.requests(localStorage,table.code);
 for(const [kind,status] of Object.entries(values)){count++;const row=node("article",undefined,"demo-member-row");row.append(node("strong",table.name+" · "+t(19+model.kinds.indexOf(kind))),node("span",t({pending:13,accepted:14,completed:15}[status])));
 if(status!=="completed"){for(const next of status==="pending"?["accepted","completed"]:["completed"]){const button=node("button",t(next==="accepted"?16:17),"secondary-button");button.type="button";button.addEventListener("click",async()=>{if(!local())return;button.disabled=true;try{await model.mutate(()=>model.setRequest(localStorage,table.code,kind,next,status));renderRequests();}catch{row.append(node("p",t(11)));button.disabled=false;}});row.append(button);}}
 requests.append(row);}}
 if(!count)requests.append(node("p",t(18)));
 }catch{requests.append(node("p",t(11)));}
}
document.addEventListener("romano:admin-page-changed",ev=>{if(ev.detail?.page==="settings")renderSettings();if(ev.detail?.page==="orders")renderRequests();});
document.addEventListener("romano:language-changed",()=>{renderSettings();renderRequests();});
window.addEventListener("storage",ev=>{if(ev.key===null||ev.key?.startsWith(model.requestPrefix))renderRequests();});
document.getElementById("orders-refresh")?.addEventListener("click",renderRequests);
})();
