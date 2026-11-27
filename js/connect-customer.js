/* RAMEN Connect R24.3: local-only customer chat preview. */
(function(root){
const copy={
  "fa": {
    "title": "گفت‌وگو با رستوران",
    "demo": "پیش‌نمایش آزمایشی",
    "offline": "گفت‌وگوی آنلاین فعال نیست",
    "notice": "پیام‌ها فقط در حافظه همین صفحه می‌مانند و برای کارکنان ارسال نمی‌شوند. اطلاعات ساختگی وارد کنید.",
    "fallback": "برای ارتباط واقعی از گزینه‌های تماس رستوران استفاده کنید.",
    "hello": "چطور می‌توانیم کمک کنیم؟",
    "hint": "پیام خود را بنویسید یا یکی از پیام‌های آماده را انتخاب کنید.",
    "quick": "پیام‌های آماده",
    "waiter": "لطفاً گارسون را بفرستید.",
    "bill": "لطفاً صورتحساب را بیاورید.",
    "water": "لطفاً آب بیاورید.",
    "question": "درباره منو سوال دارم.",
    "input": "متن پیام",
    "placeholder": "پیام خود را بنویسید…",
    "send": "ثبت پیام آزمایشی",
    "saved": "محلی؛ ارسال نشده",
    "error": "ثبت پیام ممکن نیست. دوباره تلاش کنید.",
    "ended": "مکالمه پایان یافته است. گفت‌وگوی جدید را شروع کنید.",
    "newChat": "گفت‌وگوی جدید",
    "confirm": "پیام‌های آزمایشی فعلی پاک شوند؟",
    "contact": "تماس و خدمات میز",
    "chat": "گفت‌وگو",
    "language": "زبان",
    "log": "پیام‌های مکالمه",
    "you": "شما",
    "invalid": "پیام باید بین ۱ تا ۲۰۰۰ نویسه باشد."
  },
  "en": {
    "title": "Chat with the restaurant",
    "demo": "Demo preview",
    "offline": "Online chat is not enabled",
    "notice": "Messages stay in this page's memory only and are not sent to staff. Use fictional details.",
    "fallback": "Use the restaurant's contact options to reach staff.",
    "hello": "How can we help?",
    "hint": "Write a message or choose a suggested message.",
    "quick": "Suggested messages",
    "waiter": "Could you send a waiter, please?",
    "bill": "Could we have the bill, please?",
    "water": "Could we have some water, please?",
    "question": "I have a question about the menu.",
    "input": "Message",
    "placeholder": "Write your message…",
    "send": "Save demo message",
    "saved": "Local only · not sent",
    "error": "Could not save the message. Try again.",
    "ended": "This conversation has ended. Start a new one.",
    "newChat": "New conversation",
    "confirm": "Clear current demo messages?",
    "contact": "Contact & table services",
    "chat": "Chat",
    "language": "Language",
    "log": "Conversation messages",
    "you": "You",
    "invalid": "Enter a message of 1 to 2,000 characters."
  },
  "tr": {
    "title": "Restoranla sohbet",
    "demo": "Demo önizlemesi",
    "offline": "Çevrimiçi sohbet etkin değil",
    "notice": "Mesajlar yalnızca bu sayfanın belleğinde kalır ve personele gönderilmez. Kurgusal bilgiler kullanın.",
    "fallback": "Personele ulaşmak için restoranın iletişim seçeneklerini kullanın.",
    "hello": "Nasıl yardımcı olabiliriz?",
    "hint": "Bir mesaj yazın veya hazır mesaj seçin.",
    "quick": "Hazır mesajlar",
    "waiter": "Garson gönderebilir misiniz?",
    "bill": "Hesabı alabilir miyiz?",
    "water": "Su alabilir miyiz?",
    "question": "Menü hakkında bir sorum var.",
    "input": "Mesaj",
    "placeholder": "Mesajınızı yazın…",
    "send": "Demo mesajını kaydet",
    "saved": "Yalnızca yerel · gönderilmedi",
    "error": "Mesaj kaydedilemedi. Tekrar deneyin.",
    "ended": "Sohbet sona erdi. Yeni bir sohbet başlatın.",
    "newChat": "Yeni sohbet",
    "confirm": "Mevcut demo mesajları silinsin mi?",
    "contact": "İletişim ve masa hizmetleri",
    "chat": "Sohbet",
    "language": "Dil",
    "log": "Sohbet mesajları",
    "you": "Siz",
    "invalid": "1 ile 2.000 karakter arasında mesaj yazın."
  },
  "ar": {
    "title": "محادثة المطعم",
    "demo": "معاينة تجريبية",
    "offline": "المحادثة عبر الإنترنت غير مفعلة",
    "notice": "تبقى الرسائل في ذاكرة هذه الصفحة فقط ولا تُرسل للموظفين. استخدم بيانات وهمية.",
    "fallback": "استخدم خيارات الاتصال بالمطعم للتواصل مع الموظفين.",
    "hello": "كيف يمكننا مساعدتك؟",
    "hint": "اكتب رسالة أو اختر رسالة جاهزة.",
    "quick": "رسائل مقترحة",
    "waiter": "يرجى إرسال النادل.",
    "bill": "يرجى إحضار الفاتورة.",
    "water": "يرجى إحضار الماء.",
    "question": "لدي سؤال عن القائمة.",
    "input": "نص الرسالة",
    "placeholder": "اكتب رسالتك…",
    "send": "حفظ رسالة تجريبية",
    "saved": "محلي فقط · لم تُرسل",
    "error": "تعذر حفظ الرسالة. حاول مجددًا.",
    "ended": "انتهت المحادثة. ابدأ محادثة جديدة.",
    "newChat": "محادثة جديدة",
    "confirm": "هل تريد حذف الرسائل التجريبية الحالية؟",
    "contact": "الاتصال وخدمات الطاولة",
    "chat": "محادثة",
    "language": "اللغة",
    "log": "رسائل المحادثة",
    "you": "أنت",
    "invalid": "أدخل رسالة من ١ إلى ٢٠٠٠ حرف."
  }
};
const createPreview=function createPreview(core,uuid,clock){
  let state=null,actor=null,scope=null,draft="";
  function clear(){state=null;actor=null;scope=null;draft="";}
  function select(next,lang){
    if(!next){clear();return;}
    if(scope!==next){clear();scope=next;}
    if(!state){const now=clock();actor={id:uuid(),restaurantId:"romano",branchId:next,role:"guest"};state=core.create({id:uuid(),language:lang,expiresAt:now+14400000},actor,now);}
  }
  function send(text,lang){
    if(!state)throw Error("CONNECT_INACTIVE");
    const result=core.apply(state,actor,{type:"send",clientId:uuid(),text,language:lang,expectedVersion:state.version},Math.max(clock(),state.updatedAt));
    state=result.conversation;draft="";return result.message;
  }
  function read(){
    if(!state)return [];
    const rows=[];let cursor=0;
    while(true){const page=core.read(state,actor,Math.max(clock(),state.updatedAt),cursor,100);rows.push(...page.messages);if(!page.hasMore)return rows;cursor=page.nextCursor;}
  }
  return Object.freeze({select,clear,send,read,get draft(){return draft;},set draft(v){draft=v;}});
};
const customerChat=function customerChat(core,copy,createPreview,root){
  "use strict";
  const doc=root.document,preview=createPreview(core,()=>root.crypto.randomUUID(),()=>Date.now());
  const words=l=>copy[l]||copy.fa;
  const node=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const btn=(text,cls,action)=>{const n=node("button",text,cls);n.type="button";n.addEventListener("click",action);return n;};
  function render(host,options){
    const {language,mode,branchId,context,brand,onContact,onLanguage}=options,w=words(language);
    const eligible=mode==="demo"&&typeof branchId==="string"&&typeof root.crypto?.randomUUID==="function";
    let enabled=eligible,rows=[],initialError="";
    try{preview.select(eligible?branchId:null,language);if(eligible)rows=preview.read();}
    catch(error){enabled=false;initialError=error.message==="CONNECT_EXPIRED"?w.ended:w.error;}
    host.replaceChildren();host.classList.add("connect-content");
    const head=node("div",null,"connect-top"),summary=node("div",null,"connect-summary"),identity=node("div",null,"connect-identity");
    const avatar=node("span","R","connect-avatar");avatar.setAttribute("aria-hidden","true");
    const details=node("div",null,"connect-identity-text"),name=node("strong",brand||"RAMEN");name.dir="auto";
    details.append(name,node("span",context,"connect-context"));identity.append(avatar,details);
    summary.append(identity,node("span",eligible?w.demo:w.offline,"connect-badge"));
    const toolbar=node("div",null,"connect-toolbar"),contact=btn(w.contact,"connect-secondary",onContact);
    contact.dataset.connectContact="";
    const selector=node("select",null,"connect-language");selector.setAttribute("aria-label",w.language);
    for(const [value,label] of [["fa","فارسی"],["ar","العربية"],["en","English"],["tr","Türkçe"]]){const o=node("option",label);o.value=value;selector.append(o);}
    selector.value=language;selector.addEventListener("change",()=>onLanguage(selector.value));toolbar.append(contact,selector);
    head.append(summary,toolbar,node("p",eligible?w.notice:w.fallback,"ramen-contact-note connect-notice"));
    const timeline=node("div",null,"connect-timeline");timeline.setAttribute("role","log");timeline.setAttribute("aria-label",w.log);timeline.setAttribute("aria-live","polite");timeline.tabIndex=0;
    const empty=node("div",null,"connect-empty"),symbol=node("span","···","connect-symbol");symbol.setAttribute("aria-hidden","true");empty.append(symbol,node("h3",w.hello),node("p",eligible?w.hint:w.fallback));
    function bubble(m){
      const row=node("article",null,"connect-message"),body=node("p",m.text,"connect-bubble"),meta=node("div",null,"connect-meta");
      body.dir="auto";body.lang=m.language;
      const time=node("time",new Intl.DateTimeFormat(language,{hour:"2-digit",minute:"2-digit"}).format(m.createdAt));time.dateTime=new Date(m.createdAt).toISOString();
      meta.append(node("span",w.you),time,node("span",w.saved));row.append(body,meta);return row;
    }
    if(rows.length)rows.forEach(m=>timeline.append(bubble(m)));else timeline.append(empty);
    const bottom=node("div",null,"connect-bottom"),quick=node("div",null,"connect-quick"),chips=node("div",null,"connect-chips");
    quick.setAttribute("role","group");quick.setAttribute("aria-label",w.quick);quick.append(node("span",w.quick,"connect-quick-label"),chips);
    const status=node("p",initialError,"connect-status");status.setAttribute("role","status");
    const form=node("form",null,"connect-compose"),input=node("textarea",null,"connect-input");
    input.id="connect-message-input";input.rows=2;input.maxLength=core.maxText*2;input.dir="auto";input.setAttribute("aria-label",w.input);input.placeholder=w.placeholder;input.disabled=!enabled;input.value=enabled?preview.draft:"";
    const foot=node("div",null,"connect-compose-footer"),count=node("span",null,"connect-count"),send=node("button",w.send,"connect-send");send.type="submit";count.dir="ltr";
    const valid=()=>enabled&&Boolean(input.value.trim())&&Array.from(input.value.trim()).length<=core.maxText;
    function update(){count.textContent=Array.from(input.value).length+" / "+core.maxText;send.disabled=!valid();if(enabled)preview.draft=input.value;}
    for(const key of ["waiter","bill","water","question"]){const chip=btn(w[key],"connect-chip",()=>{if(!enabled)return;const next=(input.value.trim()?input.value.trim()+"\n":"")+w[key];if(Array.from(next).length>core.maxText){status.textContent=w.invalid;return;}input.value=next;update();input.focus();});chip.disabled=!enabled;chips.append(chip);}
    input.addEventListener("input",update);
    form.addEventListener("submit",event=>{
      event.preventDefault();if(!valid()){status.textContent=w.invalid;return;}
      try{const m=preview.send(input.value,language);empty.remove();timeline.append(bubble(m));input.value="";update();status.textContent=w.saved;timeline.scrollTop=timeline.scrollHeight;}
      catch(error){const ended=["CONNECT_EXPIRED","CONNECT_MESSAGE_LIMIT"].includes(error.message);status.textContent=ended?w.ended:error.message==="CONNECT_INVALID_MESSAGE"?w.invalid:w.error;if(ended){enabled=false;input.disabled=true;for(const c of chips.children)c.disabled=true;update();}}
    });
    foot.append(count,send);form.append(input,foot);
    const reset=btn(w.newChat,"connect-reset",()=>{if(!eligible)return;if((preview.draft||timeline.querySelector(".connect-message"))&&!root.confirm(w.confirm))return;preview.clear();render(host,options);host.querySelector("#connect-message-input")?.focus();});reset.hidden=!eligible;
    bottom.append(quick,status,form,reset);host.append(head,timeline,bottom);update();timeline.scrollTop=timeline.scrollHeight;
  }
  return Object.freeze({render,words,clear:()=>preview.clear()});
};
if(typeof module==='object'&&module.exports)module.exports={copy,createPreview,customerChat};
else if(root.RomanoConnectCore)root.RomanoCustomerChat=customerChat(root.RomanoConnectCore,copy,createPreview,root);
})(globalThis);
