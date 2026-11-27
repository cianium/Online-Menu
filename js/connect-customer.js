/* R24.4: customer demo messaging backed by local IndexedDB. */
(function(root){
const copy={
  "fa": {
    "title": "گفت‌وگو با رستوران",
    "demo": "گفت‌وگوی آزمایشی محلی",
    "offline": "گفت‌وگوی آنلاین فعال نیست",
    "notice": "پیام‌ها در همین مرورگر ذخیره می‌شوند؛ ارتباط با کارکنان واقعی برقرار نیست. فقط اطلاعات ساختگی وارد کنید.",
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
    "saved": "ذخیره محلی؛ ارسال آنلاین نشده",
    "error": "دسترسی به پیام‌ها ممکن نیست. دوباره تلاش کنید.",
    "ended": "مکالمه پایان یافته است. گفت‌وگوی جدید را شروع کنید.",
    "newChat": "گفت‌وگوی جدید",
    "confirm": "گفت‌وگوی جدید شروع شود؟ مکالمه قبلی موقتاً در مرورگر باقی می‌ماند.",
    "contact": "تماس و خدمات میز",
    "chat": "گفت‌وگو",
    "language": "زبان",
    "log": "پیام‌های مکالمه",
    "you": "شما",
    "invalid": "پیام باید بین ۱ تا ۲۰۰۰ نویسه باشد.",
    "staff": "کارکنان آزمایشی",
    "loading": "در حال بارگذاری…",
    "retry": "تلاش مجدد"
  },
  "en": {
    "title": "Chat with the restaurant",
    "demo": "Local demo chat",
    "offline": "Online chat is not enabled",
    "notice": "Messages are stored in this browser; no real staff connection. Use fictional details only.",
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
    "saved": "Saved locally · not sent online",
    "error": "Could not access messages. Try again.",
    "ended": "This conversation has ended. Start a new one.",
    "newChat": "New conversation",
    "confirm": "Start a new conversation? Previous messages remain temporarily in this browser.",
    "contact": "Contact & table services",
    "chat": "Chat",
    "language": "Language",
    "log": "Conversation messages",
    "you": "You",
    "invalid": "Enter a message of 1 to 2,000 characters.",
    "staff": "Demo staff",
    "loading": "Loading…",
    "retry": "Retry"
  },
  "tr": {
    "title": "Restoranla sohbet",
    "demo": "Yerel demo sohbeti",
    "offline": "Çevrimiçi sohbet etkin değil",
    "notice": "Mesajlar bu tarayıcıda saklanır; gerçek personele bağlantı yoktur. Yalnızca kurgusal bilgiler kullanın.",
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
    "saved": "Yerel kayıt · çevrimiçi gönderilmedi",
    "error": "Mesajlara erişilemedi. Tekrar deneyin.",
    "ended": "Sohbet sona erdi. Yeni bir sohbet başlatın.",
    "newChat": "Yeni sohbet",
    "confirm": "Yeni sohbet başlatılsın mı? Önceki mesajlar geçici olarak bu tarayıcıda kalır.",
    "contact": "İletişim ve masa hizmetleri",
    "chat": "Sohbet",
    "language": "Dil",
    "log": "Sohbet mesajları",
    "you": "Siz",
    "invalid": "1 ile 2.000 karakter arasında mesaj yazın.",
    "staff": "Demo personeli",
    "loading": "Yükleniyor…",
    "retry": "Tekrar dene"
  },
  "ar": {
    "title": "محادثة المطعم",
    "demo": "محادثة تجريبية محلية",
    "offline": "المحادثة عبر الإنترنت غير مفعلة",
    "notice": "تُحفظ الرسائل في هذا المتصفح ولا يوجد اتصال بموظفين حقيقيين. استخدم بيانات وهمية فقط.",
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
    "saved": "محفوظ محليًا · لم يُرسل عبر الإنترنت",
    "error": "تعذر الوصول إلى الرسائل. حاول مجددًا.",
    "ended": "انتهت المحادثة. ابدأ محادثة جديدة.",
    "newChat": "محادثة جديدة",
    "confirm": "بدء محادثة جديدة؟ تبقى الرسائل السابقة مؤقتًا في هذا المتصفح.",
    "contact": "الاتصال وخدمات الطاولة",
    "chat": "محادثة",
    "language": "اللغة",
    "log": "رسائل المحادثة",
    "you": "أنت",
    "invalid": "أدخل رسالة من ١ إلى ٢٠٠٠ حرف.",
    "staff": "موظف تجريبي",
    "loading": "جارٍ التحميل…",
    "retry": "إعادة المحاولة"
  }
};
const customerChat=function customerChat(core,copy,engine,root){
  "use strict";
  const doc=root.document;
  let generation=0,dispose=()=>{},draft="",draftScope=null,pending=null,busy=false;
  const words=l=>copy[l]||copy.fa;
  const node=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const btn=(text,cls,action)=>{const n=node("button",text,cls);n.type="button";n.addEventListener("click",action);return n;};
  function suspend(){generation++;dispose();dispose=()=>{};}
  function clear(){suspend();draft="";draftScope=null;pending=null;try{engine.forget();}catch{/* never fall back to memory */}}
  function render(host,options){
    suspend();const run=generation;
    const {language,mode,branchId,context,brand,onContact,onLanguage}=options,w=words(language);
    const eligible=mode==="demo"&&typeof branchId==="string"&&typeof root.crypto?.randomUUID==="function";
    const scope=branchId+":"+String(options.tableCode||"")+":"+String(options.profileId||"guest");
    if(!eligible){if(draftScope!==null)clear();}
    if(draftScope!==scope){draft="";pending=null;draftScope=scope;}
    const current=()=>run===generation&&host.isConnected&&host.closest("dialog")?.open;
    let session=null,enabled=false,loaded=false,refreshing=false,lastVersion=-1,ended=false;
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
    const empty=node("div",null,"connect-empty"),symbol=node("span","···","connect-symbol");symbol.setAttribute("aria-hidden","true");empty.append(symbol,node("h3",w.hello),node("p",eligible?w.hint:w.fallback));timeline.append(empty);
    function bubble(m){
      const row=node("article",null,"connect-message"),body=node("p",m.text,"connect-bubble"),meta=node("div",null,"connect-meta");
      row.classList.toggle("is-staff",!m.own);body.dir="auto";body.lang=m.language;
      const time=node("time",new Intl.DateTimeFormat(language,{hour:"2-digit",minute:"2-digit"}).format(m.createdAt));time.dateTime=new Date(m.createdAt).toISOString();
      meta.append(node("span",m.own?w.you:w.staff),time,node("span",w.saved));row.append(body,meta);return row;
    }
    const bottom=node("div",null,"connect-bottom"),quick=node("div",null,"connect-quick"),chips=node("div",null,"connect-chips");
    quick.setAttribute("role","group");quick.setAttribute("aria-label",w.quick);quick.append(node("span",w.quick,"connect-quick-label"),chips);
    const status=node("p",eligible?w.loading:"","connect-status");status.setAttribute("role","status");
    const form=node("form",null,"connect-compose"),input=node("textarea",null,"connect-input");
    input.id="connect-message-input";input.rows=2;input.maxLength=core.maxText*2;input.dir="auto";input.setAttribute("aria-label",w.input);input.placeholder=w.placeholder;input.value=eligible?draft:"";
    const foot=node("div",null,"connect-compose-footer"),count=node("span",null,"connect-count"),send=node("button",w.send,"connect-send");send.type="submit";count.dir="ltr";
    const valid=()=>enabled&&!busy&&Boolean(input.value.trim())&&Array.from(input.value.trim()).length<=core.maxText;
    function update(){count.textContent=Array.from(input.value).length+" / "+core.maxText;input.disabled=!enabled||busy;send.disabled=!valid();for(const c of chips.children)c.disabled=!enabled||busy;reset.disabled=busy;retry.disabled=busy;selector.disabled=busy;contact.disabled=busy;}
    function display(data){
      const v=data.conversation?.version??0;
      if(v<lastVersion)return;
      if(v!==lastVersion){
        const atBottom=lastVersion<0||timeline.scrollHeight-timeline.scrollTop-timeline.clientHeight<80;
        timeline.replaceChildren(...(data.messages.length?data.messages.map(bubble):[empty]));lastVersion=v;
        if(atBottom)timeline.scrollTop=timeline.scrollHeight;
      }
      ended=Boolean(data.conversation&&["closed","resolved"].includes(data.conversation.status));
      enabled=!ended;loaded=true;retry.hidden=true;if(ended)status.textContent=w.ended;update();
    }
    function showError(error){
      enabled=false;loaded=false;ended=["CONNECT_EXPIRED","CONNECT_MESSAGE_LIMIT","CONNECT_INACTIVE"].includes(error.message);
      status.textContent=ended?w.ended:w.error;retry.hidden=ended;update();
    }
    async function refresh(){
      if(!eligible||!current()||refreshing||busy)return;
      refreshing=true;
      try{if(!session)session=engine.session(branchId,scope);const data=await engine.get(session);if(!current()||busy)return;display(data);if(!ended&&status.textContent!==w.saved)status.textContent="";}
      catch(error){if(current()&&!busy)showError(error);}
      finally{refreshing=false;}
    }
    for(const key of ["waiter","bill","water","question"]){const chip=btn(w[key],"connect-chip",()=>{if(!enabled||busy)return;const next=(input.value.trim()?input.value.trim()+"\n":"")+w[key];if(Array.from(next).length>core.maxText){status.textContent=w.invalid;return;}input.value=next;draft=next;pending=null;update();input.focus();});chips.append(chip);}
    input.addEventListener("input",()=>{draft=input.value;pending=null;update();});
    form.addEventListener("submit",async event=>{
      event.preventDefault();if(!valid()||!session)return;
      const attempt=pending&&pending.text===input.value?pending:{id:root.crypto.randomUUID(),text:input.value,language};
      pending=attempt;busy=true;update();
      try{
        const data=await engine.send(session,attempt.id,attempt.text,attempt.language);
        if(pending===attempt){pending=null;draft="";}
        if(current()){input.value=draft;display(data);status.textContent=w.saved;timeline.scrollTop=timeline.scrollHeight;}
      }catch(error){if(current()){if(error.message==="CONNECT_INVALID_MESSAGE"){status.textContent=w.invalid;pending=null;}else showError(error);}}
      finally{busy=false;if(current())update();else root.setTimeout(()=>{if(activeRefresh)activeRefresh();},0);}
    });
    foot.append(count,send);form.append(input,foot);
    const retry=btn(w.retry,"connect-secondary",()=>refresh());retry.hidden=true;
    const reset=btn(w.newChat,"connect-reset",()=>{if(!eligible||busy)return;if((draft||timeline.querySelector(".connect-message"))&&!root.confirm(w.confirm))return;try{engine.forget();}catch(error){showError(error);return;}draft="";pending=null;render(host,options);});
    reset.hidden=!eligible;bottom.append(quick,status,form,retry,reset);host.append(head,timeline,bottom);update();
    if(eligible){
      const off=engine.subscribe(()=>refresh()),timer=root.setInterval(()=>{if(current()&&doc.visibilityState!=="hidden")refresh();},2000);
      activeRefresh=refresh;dispose=()=>{off();root.clearInterval(timer);if(activeRefresh===refresh)activeRefresh=null;};
      root.setTimeout(refresh,0);
    }
  }
  let activeRefresh=null;
  return Object.freeze({render,words,clear,suspend});
};
if(typeof module==='object'&&module.exports)module.exports={copy,customerChat};
else if(root.RomanoConnectCore&&root.RomanoConnectDemo)root.RomanoCustomerChat=customerChat(root.RomanoConnectCore,copy,root.RomanoConnectDemo,root);
})(globalThis);
