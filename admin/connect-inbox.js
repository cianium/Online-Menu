/* R24.5 — local demo inbox; no real staff authentication or transport. */
(function(root){
const copy={
  "fa": {
    "title": "صندوق مکالمات",
    "mode": "RAMEN Connect · آزمایشی",
    "notice": "فقط مکالمات نمونه همین رستوران و مرورگر. پاسخ‌ها برای مشتری واقعی ارسال نمی‌شوند.",
    "unavailable": "صندوق آنلاین هنوز فعال نشده است.",
    "branch": "شعبه",
    "primary": "شعبه اصلی",
    "all": "همه",
    "new": "جدید",
    "in_progress": "در حال بررسی",
    "resolved": "حل‌شده",
    "closed": "بسته",
    "expired": "منقضی",
    "unread": "خوانده‌نشده",
    "search": "جست‌وجوی مکالمات",
    "filter": "فیلتر وضعیت",
    "refresh": "به‌روزرسانی",
    "loading": "در حال بارگذاری…",
    "empty": "مکالمه‌ای یافت نشد.",
    "select": "یک مکالمه انتخاب کنید.",
    "guest": "مهمان",
    "staff": "کارکنان نمونه",
    "me": "مدیر نمونه",
    "agent1": "اپراتور نمونه ۱",
    "agent2": "اپراتور نمونه ۲",
    "unassigned": "بدون مسئول",
    "assignment": "مسئول مکالمه",
    "assign": "تخصیص",
    "resolve": "حل‌شده",
    "reopen": "بازگشایی",
    "close": "بستن مکالمه",
    "confirm": "این مکالمه برای همیشه بسته شود؟",
    "reply": "پاسخ",
    "send": "ثبت پاسخ محلی",
    "quick": "پاسخ‌های آماده",
    "q1": "درخواست شما را بررسی می‌کنیم.",
    "q2": "ممنون از صبر شما.",
    "q3": "چطور می‌توانیم کمک کنیم؟",
    "saved": "در مرورگر ذخیره شد.",
    "error": "دسترسی یا ذخیره‌سازی ممکن نیست.",
    "stale": "مکالمه تغییر کرده است؛ اطلاعات تازه شد. دوباره بررسی کنید.",
    "back": "بازگشت به فهرست",
    "log": "پیام‌های مکالمه",
    "inactive": "این مکالمه امکان دریافت پاسخ ندارد.",
    "count": "تعداد پیام‌ها",
    "read": "خوانده شد",
    "invalid": "پیام باید بین ۱ تا ۲۰۰۰ نویسه باشد.",
    "table": "میز",
    "noTable": "بدون میز",
    "order": "سفارش مرتبط",
    "noOrder": "سفارش مرتبط ثبت نشده",
    "orderMissing": "جزئیات سفارش در دسترس نیست",
    "quantity": "تعداد",
    "services": "مدیریت خدمات این میز",
    "requests": "درخواست‌های فعال میز"
  },
  "en": {
    "title": "Conversation inbox",
    "mode": "RAMEN Connect · Demo",
    "notice": "Sample conversations in this restaurant and browser only. No replies are sent to real guests.",
    "unavailable": "The online inbox is not enabled yet.",
    "branch": "Branch",
    "primary": "Main branch",
    "all": "All",
    "new": "New",
    "in_progress": "In progress",
    "resolved": "Resolved",
    "closed": "Closed",
    "expired": "Expired",
    "unread": "Unread",
    "search": "Search conversations",
    "filter": "Status filter",
    "refresh": "Refresh",
    "loading": "Loading…",
    "empty": "No conversations found.",
    "select": "Select a conversation.",
    "guest": "Guest",
    "staff": "Demo staff",
    "me": "Demo manager",
    "agent1": "Demo agent 1",
    "agent2": "Demo agent 2",
    "unassigned": "Unassigned",
    "assignment": "Assigned to",
    "assign": "Assign",
    "resolve": "Resolve",
    "reopen": "Reopen",
    "close": "Close conversation",
    "confirm": "Permanently close this conversation?",
    "reply": "Reply",
    "send": "Save local reply",
    "quick": "Quick replies",
    "q1": "We are checking your request.",
    "q2": "Thank you for your patience.",
    "q3": "How can we help?",
    "saved": "Saved in this browser.",
    "error": "Unable to access or save messages.",
    "stale": "The conversation changed. Refreshed; review and try again.",
    "back": "Back to list",
    "log": "Conversation messages",
    "inactive": "This conversation cannot receive replies.",
    "count": "Messages",
    "read": "Read",
    "invalid": "Enter a message of 1 to 2,000 characters.",
    "table": "Table",
    "noTable": "No table",
    "order": "Linked order",
    "noOrder": "No linked order",
    "orderMissing": "Order details unavailable",
    "quantity": "Quantity",
    "services": "Manage table services",
    "requests": "Active table requests"
  },
  "tr": {
    "title": "Sohbet gelen kutusu",
    "mode": "RAMEN Connect · Demo",
    "notice": "Yalnızca bu restoran ve tarayıcıdaki örnek sohbetler. Gerçek misafirlere yanıt gönderilmez.",
    "unavailable": "Çevrimiçi gelen kutusu henüz etkin değil.",
    "branch": "Şube",
    "primary": "Ana şube",
    "all": "Tümü",
    "new": "Yeni",
    "in_progress": "İşlemde",
    "resolved": "Çözüldü",
    "closed": "Kapalı",
    "expired": "Süresi doldu",
    "unread": "Okunmamış",
    "search": "Sohbetleri ara",
    "filter": "Durum filtresi",
    "refresh": "Yenile",
    "loading": "Yükleniyor…",
    "empty": "Sohbet bulunamadı.",
    "select": "Bir sohbet seçin.",
    "guest": "Misafir",
    "staff": "Demo personeli",
    "me": "Demo yönetici",
    "agent1": "Demo temsilci 1",
    "agent2": "Demo temsilci 2",
    "unassigned": "Atanmamış",
    "assignment": "Atanan kişi",
    "assign": "Ata",
    "resolve": "Çöz",
    "reopen": "Yeniden aç",
    "close": "Sohbeti kapat",
    "confirm": "Bu sohbet kalıcı olarak kapatılsın mı?",
    "reply": "Yanıt",
    "send": "Yerel yanıtı kaydet",
    "quick": "Hazır yanıtlar",
    "q1": "Talebinizi inceliyoruz.",
    "q2": "Sabrınız için teşekkür ederiz.",
    "q3": "Nasıl yardımcı olabiliriz?",
    "saved": "Bu tarayıcıya kaydedildi.",
    "error": "Mesajlara erişilemiyor veya kaydedilemiyor.",
    "stale": "Sohbet değişti. Yenilendi; kontrol edip tekrar deneyin.",
    "back": "Listeye dön",
    "log": "Sohbet mesajları",
    "inactive": "Bu sohbet yanıt alamaz.",
    "count": "Mesajlar",
    "read": "Okundu",
    "invalid": "1 ile 2.000 karakter arasında mesaj yazın.",
    "table": "Masa",
    "noTable": "Masa yok",
    "order": "Bağlı sipariş",
    "noOrder": "Bağlı sipariş yok",
    "orderMissing": "Sipariş ayrıntıları kullanılamıyor",
    "quantity": "Adet",
    "services": "Masa hizmetlerini yönet",
    "requests": "Aktif masa istekleri"
  },
  "ar": {
    "title": "صندوق المحادثات",
    "mode": "RAMEN Connect · تجريبي",
    "notice": "محادثات نموذجية في هذا المطعم والمتصفح فقط. لا تُرسل الردود إلى ضيوف حقيقيين.",
    "unavailable": "صندوق المحادثات عبر الإنترنت غير مفعّل بعد.",
    "branch": "الفرع",
    "primary": "الفرع الرئيسي",
    "all": "الكل",
    "new": "جديدة",
    "in_progress": "قيد المعالجة",
    "resolved": "تم الحل",
    "closed": "مغلقة",
    "expired": "منتهية",
    "unread": "غير مقروءة",
    "search": "البحث في المحادثات",
    "filter": "تصفية الحالة",
    "refresh": "تحديث",
    "loading": "جارٍ التحميل…",
    "empty": "لا توجد محادثات.",
    "select": "اختر محادثة.",
    "guest": "ضيف",
    "staff": "موظف تجريبي",
    "me": "مدير تجريبي",
    "agent1": "موظف تجريبي ١",
    "agent2": "موظف تجريبي ٢",
    "unassigned": "غير معيّنة",
    "assignment": "المسؤول",
    "assign": "تعيين",
    "resolve": "حل",
    "reopen": "إعادة فتح",
    "close": "إغلاق المحادثة",
    "confirm": "هل تريد إغلاق هذه المحادثة نهائيًا؟",
    "reply": "رد",
    "send": "حفظ الرد محليًا",
    "quick": "ردود جاهزة",
    "q1": "نراجع طلبك.",
    "q2": "شكرًا لصبرك.",
    "q3": "كيف يمكننا مساعدتك؟",
    "saved": "حُفظ في هذا المتصفح.",
    "error": "تعذر الوصول إلى الرسائل أو حفظها.",
    "stale": "تغيرت المحادثة. تم التحديث؛ راجعها وحاول مجددًا.",
    "back": "العودة إلى القائمة",
    "log": "رسائل المحادثة",
    "inactive": "لا يمكن لهذه المحادثة تلقي الردود.",
    "count": "الرسائل",
    "read": "مقروءة",
    "invalid": "أدخل رسالة من ١ إلى ٢٠٠٠ حرف.",
    "table": "الطاولة",
    "noTable": "بلا طاولة",
    "order": "الطلب المرتبط",
    "noOrder": "لا يوجد طلب مرتبط",
    "orderMissing": "تفاصيل الطلب غير متاحة",
    "quantity": "الكمية",
    "services": "إدارة خدمات الطاولة",
    "requests": "طلبات الطاولة النشطة"
  }
};
const model=(function inboxModel(){
  const roster=Object.freeze(["demo-manager","demo-agent-1","demo-agent-2"]);
  const status=(row,now)=>now>=row.expiresAt?"expired":row.status;
  function unread(row,seen){const total=row.guestMessageCount;return Number.isSafeInteger(total)&&total>=0?Math.max(0,total-Math.max(0,Number.isSafeInteger(seen)?seen:0)):0;}
  function select(rows,query,filter,seen,now){
    const q=String(query||"").trim().toLocaleLowerCase();
    return rows.filter(row=>{
      if(filter==="unread"&&!unread(row,seen[row.id]))return false;
      if(filter!=="all"&&filter!=="unread"&&status(row,now)!==filter)return false;
      return !q||[row.id,row.lastMessage?.text,row.assigneeId,row.tableId,row.orderId].some(v=>typeof v==="string"&&v.toLocaleLowerCase().includes(q));
    });
  }
  function permissions(c,now){const active=Boolean(c&&now<c.expiresAt&&c.status!=="closed");return {reply:active&&c.status!=="resolved",assign:active&&c.status!=="resolved",resolve:active&&["new","in_progress"].includes(c.status),reopen:active&&c.status==="resolved",close:active};}
  function orderSummary(c,members){
    if(!c?.orderId||!c.tableId||!c.tableSessionId||!Array.isArray(members))return null;
    const matches=members.flatMap(m=>Array.isArray(m.orders)?m.orders:[]).filter(o=>o.id===c.orderId&&o.tableCode===c.tableId&&o.connectVisitId===c.tableSessionId);
    if(matches.length!==1)return null;
    const o=matches[0];
    return {id:o.id,items:o.items.map(i=>({name:i.name,quantity:i.quantity}))};
  }
  return Object.freeze({roster,status,unread,select,permissions,orderSummary});
})();
const start=function startInbox(root,copy,model){
  "use strict";
  const doc=root.document,host=doc.getElementById("connect-inbox"),page=doc.getElementById("page-connect"),badge=doc.getElementById("connect-nav-badge"),engine=root.RomanoConnectDemo;
  if(!host||!page||!badge||!engine)return;
  const lang=()=>root.ROMANO_ADMIN_I18N?.language||"fa",w=()=>copy[lang()]||copy.fa;
  function identity(){
    try{
      if(typeof adminInitialized==="undefined"||!adminInitialized||!adminDemoMode||!demoAdminSignedIn()||root.RomanoAPI.enabled||doc.querySelector(".admin-app").inert)return null;
      const branch=root.RomanoDemoBranches;
      if(branch)branch.context();
      return {id:"demo-manager",role:"manager",restaurantId:"romano",branchId:"primary"};
    }catch{return null;}
  }
  const isPage=()=>page.classList.contains("is-active");
  const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,cls,fn)=>{const n=el("button",text,cls);n.type="button";n.addEventListener("click",fn);return n;};
  const format=n=>new Intl.NumberFormat(lang()).format(n);
  const date=n=>new Intl.DateTimeFormat(lang(),{dateStyle:"short",timeStyle:"short"}).format(n);
  const staffName=id=>id===model.roster[0]?w().me:id===model.roster[1]?w().agent1:id===model.roster[2]?w().agent2:w().unassigned;
  let actor=null,rows=[],seen=Object.create(null),selection=null,query="",filter="all",draft="",pending=null,detail=null,ui=null,generation=0,refreshing=false,busy=false;
  function seenKey(a){return "romano_connect_seen_v1:"+a.branchId;}
  function loadSeen(a){
    const out=Object.create(null);
    try{const raw=JSON.parse(root.sessionStorage.getItem(seenKey(a))||"{}");if(raw&&typeof raw==="object"&&!Array.isArray(raw))for(const [k,v] of Object.entries(raw).slice(0,100))if(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(k)&&Number.isSafeInteger(v)&&v>=0&&v<=1000)out[k]=v;}catch{}
    return out;
  }
  function mark(c,messages){
    if(doc.visibilityState==="hidden")return;
    const count=messages.filter(m=>m.senderKind==="guest").length;
    if(count>(seen[c.id]||0)){seen[c.id]=count;try{root.sessionStorage.setItem(seenKey(actor),JSON.stringify(seen));}catch{}}
  }
  function updateBadge(){
    const total=actor?rows.reduce((sum,r)=>sum+model.unread(r,seen[r.id]),0):0;
    badge.textContent=format(total);badge.hidden=!total;
    badge.setAttribute("aria-label",w().unread+": "+format(total));
  }
  function clear(){
    generation++;actor=null;rows=[];seen=Object.create(null);selection=null;detail=null;draft="";pending=null;query="";filter="all";ui=null;
    host.replaceChildren(el("h1",w().title));host.firstChild.id="connect-inbox-title";updateBadge();
  }
  function syncIdentity(){
    const next=identity();
    if(!next){if(actor||ui)clear();return null;}
    if(!actor||actor.branchId!==next.branchId){clear();actor=next;seen=loadSeen(actor);}
    return actor;
  }
  function showNotice(){
    host.replaceChildren();const h=el("h1",w().title);h.id="connect-inbox-title";host.append(h,el("p",w().unavailable,"connect-inbox-notice"));ui=null;
  }
  function build(){
    if(!actor){showNotice();return;}
    const t=w(),heading=el("div",null,"page-heading"),h=el("h1",t.title);h.id="connect-inbox-title";
    heading.append(el("span",t.mode,"page-eyebrow"),h,el("p",t.notice,"connect-inbox-notice"));
    const toolbar=el("div",null,"connect-inbox-toolbar"),search=el("input"),statusFilter=el("select");
    search.type="search";search.placeholder=t.search;search.setAttribute("aria-label",t.search);search.value=query;search.maxLength=200;
    statusFilter.setAttribute("aria-label",t.filter);
    for(const key of ["all","unread","new","in_progress","resolved","closed","expired"]){const o=el("option",t[key]);o.value=key;statusFilter.append(o);}statusFilter.value=filter;
    const refreshButton=button(t.refresh,"secondary-button",()=>refresh());
    toolbar.append(search,statusFilter,refreshButton);
    const metrics=el("div",null,"connect-inbox-metrics"),statusLine=el("p",t.loading,"connect-inbox-status");statusLine.setAttribute("role","status");
    const grid=el("div",null,"connect-inbox-grid"),list=el("div",null,"connect-inbox-list"),detailPane=el("div",null,"connect-inbox-detail");
    list.setAttribute("aria-label",t.title);list.setAttribute("role","region");
    grid.append(list,detailPane);host.replaceChildren(heading,toolbar,metrics,statusLine,grid);
    ui={grid,list,detailPane,metrics,statusLine,search,statusFilter,refreshButton,renderedVersion:null};
    search.addEventListener("input",()=>{query=search.value;renderList();});
    statusFilter.addEventListener("change",()=>{filter=statusFilter.value;renderList();});
    renderList();renderDetail(true);
  }
  function renderList(){
    if(!ui)return;
    const t=w(),now=Date.now(),shown=model.select(rows,query,filter,seen,now);
    const totals=[["all",rows.length],["new",rows.filter(r=>model.status(r,now)==="new").length],["in_progress",rows.filter(r=>model.status(r,now)==="in_progress").length],["unread",rows.reduce((n,r)=>n+model.unread(r,seen[r.id]),0)]];
    ui.metrics.replaceChildren(...totals.map(([k,n])=>{const d=el("div",null,"connect-inbox-metric");d.append(el("span",t[k]),el("strong",format(n)));return d;}));
    const focused=doc.activeElement?.dataset?.conversationId;
    const nodes=shown.map(r=>{
      const n=button(null,"connect-inbox-row",()=>open(r.id));
      n.dataset.conversationId=r.id;n.setAttribute("aria-pressed",String(r.id===selection));
      const top=el("div",null,"connect-inbox-row-top"),label=el("strong",t.guest+" · "+r.id.slice(-8));label.dir="auto";top.append(label,el("span",t[model.status(r,now)],"connect-inbox-pill"));
      const preview=el("p",r.lastMessage?.text||"");preview.dir="auto";
      const meta=el("div",null,"connect-inbox-row-meta");meta.append(el("span",staffName(r.assigneeId)),el("time",date(r.updatedAt)));
      const unread=model.unread(r,seen[r.id]);if(unread){const u=el("b",format(unread),"connect-inbox-unread");u.setAttribute("aria-label",t.unread+": "+format(unread));meta.append(u);}
      const context=el("p",r.tableId?t.table+" · "+r.tableId:t.noTable);context.dir="auto";
      n.append(top,context,preview,meta);return n;
    });
    ui.list.replaceChildren(...(nodes.length?nodes:[el("p",t.empty,"connect-inbox-empty")]));
    if(focused)nodes.find(n=>n.dataset.conversationId===focused)?.focus({preventScroll:true});
    updateBadge();
  }
  function renderDetail(force=false){
    if(!ui)return;const t=w(),pane=ui.detailPane;
    ui.grid.classList.toggle("has-selection",Boolean(selection));
    if(!detail){pane.replaceChildren(el("p",selection?t.loading:t.select,"connect-inbox-empty"));return;}
    const c=detail.conversation,permissions=model.permissions(c,Date.now()),version=c.id+":"+c.version+":"+model.status(c,Date.now());
    if(!force&&ui.renderedVersion===version)return;ui.renderedVersion=version;
    const oldLog=pane.querySelector(".connect-inbox-log"),bottom=!oldLog||oldLog.scrollHeight-oldLog.scrollTop-oldLog.clientHeight<80,oldScroll=oldLog?.scrollTop||0;
    const active=doc.activeElement?.id;
    const header=el("div",null,"connect-inbox-detail-head"),top=el("div",null,"connect-inbox-row-top");
    const back=button(t.back,"secondary-button connect-inbox-back",()=>{selection=null;detail=null;draft="";pending=null;ui.renderedVersion=null;renderList();renderDetail(true);ui.list.querySelector("button")?.focus();});
    const title=el("h2",t.guest+" · "+c.id.slice(-8));title.tabIndex=-1;title.id="connect-inbox-conversation-title";
    top.append(title,el("span",t[model.status(c,Date.now())],"connect-inbox-pill"));header.append(back,top,el("p",t.assignment+": "+staffName(c.assigneeId)));
    const context=el("div",null,"connect-inbox-context");
    const table=el("p",c.tableId?t.table+" · "+c.tableId:t.noTable);table.dir="auto";context.append(table);
    if(c.orderId){
      const label=el("p",t.order+" · "+c.orderId);label.dir="auto";context.append(label);
      let order=null;try{order=model.orderSummary(c,root.RomanoDemoMembers.read(root.localStorage));}catch{}
      if(order){const items=el("ul");for(const item of order.items){const li=el("li",item.name+" × "+format(item.quantity));li.dir="auto";items.append(li);}context.append(items);}
      else context.append(el("p",t.orderMissing));
    }else context.append(el("p",t.noOrder));
    if(c.tableId){
      const link=button(t.services,"secondary-button",()=>{if(identity()&&typeof navigateTo==="function")navigateTo("orders");});
      const serviceCount=el("p",null,"connect-inbox-service-count");
      serviceCount.dataset.tableCode=c.tableId;
      context.append(serviceCount,link);
      try{const values=root.RomanoDemoMembers.requests(root.localStorage,c.tableId);serviceCount.textContent=t.requests+": "+format(Object.values(values).filter(s=>s==="pending"||s==="accepted").length);}catch{serviceCount.textContent=t.error;}
    }
    header.append(context);
    const actions=el("div",null,"connect-inbox-actions"),select=el("select");
    select.id="connect-inbox-assignee";select.setAttribute("aria-label",t.assignment);
    for(const id of model.roster){const o=el("option",staffName(id));o.value=id;select.append(o);}select.value=model.roster.includes(c.assigneeId)?c.assigneeId:model.roster[0];
    const assign=button(t.assign,"secondary-button",()=>mutate({type:"assign",assigneeId:select.value}));assign.dataset.connectAction="assign";select.disabled=assign.disabled=!permissions.assign||busy;
    actions.append(select,assign);
    for(const [type,label] of [["resolve","resolve"],["reopen","reopen"],["close","close"]]){const b=button(t[label],"secondary-button",()=>{if(type==="close"&&!root.confirm(t.confirm))return;mutate({type});});b.dataset.connectAction=type;b.disabled=!permissions[type]||busy;actions.append(b);}
    header.append(actions);
    const log=el("div",null,"connect-inbox-log");log.setAttribute("role","log");log.setAttribute("aria-label",t.log);log.tabIndex=0;
    for(const m of detail.messages){
      const row=el("article",null,"connect-inbox-message");row.classList.toggle("is-staff",m.senderKind==="staff");
      const body=el("p",m.text);body.dir="auto";body.lang=m.language;const meta=el("small",(m.senderKind==="staff"?t.staff:t.guest)+" · "+date(m.createdAt));row.append(body,meta);log.append(row);
    }
    const footer=el("div",null,"connect-inbox-compose"),quick=el("div",null,"connect-inbox-quick");quick.setAttribute("role","group");quick.setAttribute("aria-label",t.quick);
    const form=el("form"),input=el("textarea");input.id="connect-inbox-reply";input.rows=2;input.maxLength=4000;input.dir="auto";input.setAttribute("aria-label",t.reply);input.placeholder=t.reply;input.value=draft;
    const send=el("button",t.send,"primary-button");send.type="submit";send.dataset.connectAction="send";
    const counter=el("span",null,"connect-inbox-counter");counter.dir="ltr";
    function update(){const n=Array.from(input.value.trim()).length;counter.textContent=format(n)+" / 2000";send.disabled=busy||!permissions.reply||n===0||n>2000;input.disabled=busy||!permissions.reply;}
    for(const k of ["q1","q2","q3"]){const b=button(t[k],"secondary-button",()=>{const next=(input.value.trim()?input.value.trim()+"\n":"")+t[k];if(Array.from(next).length>2000){ui.statusLine.textContent=t.invalid;return;}input.value=draft=next;pending=null;update();input.focus();});b.disabled=busy||!permissions.reply;quick.append(b);}
    input.addEventListener("input",()=>{draft=input.value;pending=null;update();});
    form.addEventListener("submit",event=>{event.preventDefault();if(send.disabled)return;const attempt=pending&&pending.text===draft?pending:{clientId:root.crypto.randomUUID(),text:draft,language:lang()};pending=attempt;mutate({type:"send",...attempt});});
    const formFoot=el("div",null,"connect-inbox-row-top");formFoot.append(counter,send);form.append(input,formFoot);footer.append(quick,form);if(!permissions.reply)footer.append(el("p",t.inactive,"connect-inbox-notice"));
    pane.replaceChildren(header,log,footer);update();log.scrollTop=bottom?log.scrollHeight:oldScroll;
    if(active==="connect-inbox-reply"&&!input.disabled)input.focus({preventScroll:true});else if(active==="connect-inbox-assignee"&&!select.disabled)select.focus({preventScroll:true});
  }
  async function open(id){
    if(busy||!syncIdentity()||!isPage())return;
    if(selection!==id){selection=id;detail=null;draft="";pending=null;generation++;ui.renderedVersion=null;renderList();renderDetail(true);}
    await refresh(true);
    if(selection===id&&isPage())doc.getElementById("connect-inbox-conversation-title")?.focus({preventScroll:true});
  }
  async function refresh(force=false){
    const a=syncIdentity();if(!a){if(isPage()&&!ui)showNotice();return;}
    if(isPage()&&!ui)build();
    if(refreshing||busy)return;
    refreshing=true;const run=generation,id=selection;
    try{
      const next=await engine.list(a);
      if(run!==generation||busy||!identity()||actor!==a)return;
      rows=next;
      if(isPage()&&ui&&id&&selection===id){
        if(!rows.some(r=>r.id===id)){selection=null;detail=null;draft="";pending=null;}
        else{const nextDetail=await engine.readStaff(a,id);if(run!==generation||busy||!identity()||actor!==a||selection!==id)return;detail=nextDetail;mark(detail.conversation,detail.messages);}
      }
      if(isPage()&&ui){if(ui.statusLine.textContent===w().loading||force)ui.statusLine.textContent="";renderList();renderDetail(force);}
      updateBadge();
    }catch(error){if(run===generation&&ui&&isPage()){ui.statusLine.textContent=w().error;if(error.message==="CONNECT_NOT_FOUND"){selection=null;detail=null;renderDetail(true);}}}
    finally{refreshing=false;if(run!==generation&&isPage()&&identity())root.setTimeout(()=>refresh(),0);}
  }
  async function mutate(command){
    const a=syncIdentity();if(!a||!detail||busy||!isPage())return;
    const c=detail.conversation;
    if(command.type==="assign"&&!model.roster.includes(command.assigneeId))return;
    if(!model.permissions(c,Date.now())[command.type==="send"?"reply":command.type])return;
    const run=++generation;busy=true;renderDetail(true);
    try{
      const next=await engine.command(a,c.id,{...command,expectedVersion:c.version});
      if(run!==generation||!identity()||actor!==a||!isPage())return;
      detail=next;if(command.type==="send"){draft="";pending=null;}ui.statusLine.textContent=w().saved;
    }catch(error){
      if(run===generation&&ui&&isPage()){ui.statusLine.textContent=error.message==="CONNECT_STALE"?w().stale:error.message==="CONNECT_INVALID_MESSAGE"?w().invalid:w().error;}
    }finally{busy=false;if(run===generation&&ui&&isPage()){renderDetail(true);await refresh();}root.setTimeout(()=>refresh(),0);}
  }
  function navigate(){
    generation++;
    if(!isPage()){selection=null;detail=null;draft="";pending=null;ui=null;host.replaceChildren(el("h1",w().title));host.firstChild.id="connect-inbox-title";return;}
    if(syncIdentity()){build();refresh();}else showNotice();
  }
  function refreshServiceCount(){
    const count=host.querySelector(".connect-inbox-service-count");if(!count||!isPage()||!identity())return;
    try{const values=root.RomanoDemoMembers.requests(root.localStorage,count.dataset.tableCode);count.textContent=w().requests+": "+format(Object.values(values).filter(s=>s==="pending"||s==="accepted").length);}catch{count.textContent=w().error;}
  }
  root.addEventListener("storage",e=>{if(e.key===null||e.key?.startsWith(root.RomanoDemoMembers?.requestPrefix||"\u0000"))refreshServiceCount();});
  doc.addEventListener("romano:table-services-changed",refreshServiceCount);
  doc.addEventListener("romano:admin-page-changed",navigate);
  doc.addEventListener("romano:language-changed",()=>{if(isPage()){if(syncIdentity()){build();refresh();}else showNotice();}updateBadge();});
  doc.addEventListener("romano:demo-membership-changed",()=>refresh());
  doc.addEventListener("visibilitychange",()=>{if(!doc.hidden)refresh();});
  engine.subscribe(()=>refresh());
  root.setInterval(()=>{if(!doc.hidden)refresh();},2500);
  // Clear immediately when the demo access gate closes, rather than leaving the transcript in the DOM.
  const app=doc.querySelector(".admin-app");
  if(app)new MutationObserver(()=>{if(!identity()){clear();if(isPage())showNotice();}}).observe(app,{attributes:true,attributeFilter:["inert"]});
  refresh();
};
if(typeof module==='object'&&module.exports)module.exports={copy,model};
else start(root,copy,model);
})(globalThis);
