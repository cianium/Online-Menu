/* Online-Menu customer commerce: cart, QR session, ordering and tracking. */
(() => {
  "use strict";

  const text = {
    fa: { add:"افزودن", cart:"سبد سفارش", empty:"هنوز چیزی انتخاب نکرده‌اید.", total:"جمع سفارش", checkout:"ثبت سفارش", scan:"برای ثبت سفارش، QR روی میز را اسکن کنید.", note:"توضیحات سفارش", noteHint:"مثلاً بدون پیاز یا سس جدا", later:"پرداخت در رستوران", online:"پرداخت آنلاین", close:"بستن", remove:"حذف", table:"میز", sending:"در حال ثبت…", tracking:"پیگیری سفارش", order:"سفارش", retry:"تلاش دوباره", sessionError:"QR میز معتبر نیست یا منقضی شده است.", submitError:"ثبت سفارش انجام نشد. دوباره تلاش کنید.", paymentError:"سفارش ثبت شد، اما اتصال به درگاه ممکن نشد.", submitted:"ثبت شده", accepted:"تأیید شد", preparing:"در حال آماده‌سازی", ready:"آماده تحویل", served:"سرو شد", delivered:"تحویل شد", completed:"تکمیل شد", rejected:"رد شد", cancelled:"لغو شد", paid:"پرداخت موفق",paymentUnverified:"نتیجه پرداخت هنوز از سرور تأیید نشده است.", failed:"پرداخت ناموفق", cancelledPay:"پرداخت لغو شد", view:"مشاهده سفارش" },
    en: { add:"Add", cart:"Your order", empty:"Your cart is empty.", total:"Order total", checkout:"Place order", scan:"Scan the QR code on your table to order.", note:"Order notes", noteHint:"For example, sauce on the side", later:"Pay at restaurant", online:"Pay online", close:"Close", remove:"Remove", table:"Table", sending:"Placing order…", tracking:"Track order", order:"Order", retry:"Try again", sessionError:"This table QR code is invalid or expired.", submitError:"We could not place the order. Please try again.", paymentError:"Order placed, but the payment gateway could not be opened.", submitted:"Submitted", accepted:"Accepted", preparing:"Preparing", ready:"Ready", served:"Served", delivered:"Delivered", completed:"Completed", rejected:"Rejected", cancelled:"Cancelled", paid:"Payment successful",paymentUnverified:"The payment result has not been verified by the server.", failed:"Payment failed", cancelledPay:"Payment cancelled", view:"View order" },
    tr: { add:"Ekle", cart:"Siparişiniz", empty:"Sepetiniz boş.", total:"Toplam", checkout:"Siparişi ver", scan:"Sipariş vermek için masadaki QR kodunu tarayın.", note:"Sipariş notu", noteHint:"Örneğin sos ayrı", later:"Restoranda öde", online:"Online öde", close:"Kapat", remove:"Sil", table:"Masa", sending:"Gönderiliyor…", tracking:"Siparişi takip et", order:"Sipariş", retry:"Tekrar dene", sessionError:"Masa QR kodu geçersiz veya süresi dolmuş.", submitError:"Sipariş verilemedi. Tekrar deneyin.", paymentError:"Sipariş alındı ancak ödeme sayfası açılamadı.", submitted:"Gönderildi", accepted:"Onaylandı", preparing:"Hazırlanıyor", ready:"Hazır", served:"Servis edildi", delivered:"Teslim edildi", completed:"Tamamlandı", rejected:"Reddedildi", cancelled:"İptal edildi", paid:"Ödeme başarılı",paymentUnverified:"Ödeme sonucu henüz sunucu tarafından doğrulanmadı.", failed:"Ödeme başarısız", cancelledPay:"Ödeme iptal edildi", view:"Siparişi gör" },
    ar: { add:"أضف", cart:"طلبك", empty:"السلة فارغة.", total:"المجموع", checkout:"إرسال الطلب", scan:"امسح رمز QR الموجود على الطاولة للطلب.", note:"ملاحظات الطلب", noteHint:"مثلاً الصلصة منفصلة", later:"الدفع في المطعم", online:"الدفع عبر الإنترنت", close:"إغلاق", remove:"حذف", table:"طاولة", sending:"جارٍ الإرسال…", tracking:"تتبع الطلب", order:"طلب", retry:"حاول مجدداً", sessionError:"رمز الطاولة غير صالح أو منتهي.", submitError:"تعذر إرسال الطلب. حاول مرة أخرى.", paymentError:"تم إرسال الطلب، لكن تعذر فتح بوابة الدفع.", submitted:"تم الإرسال", accepted:"تم القبول", preparing:"قيد التحضير", ready:"جاهز", served:"تم التقديم", delivered:"تم التسليم", completed:"مكتمل", rejected:"مرفوض", cancelled:"ملغي", paid:"تم الدفع بنجاح",paymentUnverified:"لم يتحقق الخادم بعد من نتيجة الدفع.", failed:"فشل الدفع", cancelledPay:"تم إلغاء الدفع", view:"عرض الطلب" }
  };

  const lang = () => window.ROMANO_I18N?.language || "fa";
  const t = (key) => text[lang()]?.[key] || text.fa[key] || key;
  const tenant = () => window.RomanoDemoBranches?.scope("romano") ?? (typeof restaurantSlug === "string" ? restaurantSlug : "romano");
  const standalone = window.RomanoPublicAPI.standalone;
  // Keep chat assets outside the initial menu payload. Fixed local paths support subpath hosting.
  const connectAssets = (() => {
    const base = new URL("../", document.currentScript.src), pending = new Map();
    let rotateGuest = false;
    function asset(path, ready, style = false) {
      if (ready()) return Promise.resolve();
      if (pending.has(path)) return pending.get(path);
      const job = new Promise((resolve, reject) => {
        const node = document.createElement(style ? "link" : "script");
        if (style) { node.rel = "stylesheet"; node.href = new URL(path, base).href; }
        else { node.src = new URL(path, base).href; node.async = false; }
        const finish = ok => {
          clearTimeout(timer); node.onload = node.onerror = null;
          if (ok && ready()) resolve(); else { node.remove(); reject(Error("CONNECT_ASSET")); }
        };
        const timer = setTimeout(() => finish(false), 10000);
        node.onload = () => finish(true); node.onerror = () => finish(false);
        document.head.append(node);
      }).finally(() => pending.delete(path));
      pending.set(path, job); return job;
    }
    const loadLive = () => asset("js/connect-live.js", () => Boolean(window.RomanoConnectLive));
    const loadPanelStyle=()=>asset("css/connect.css",()=>[...document.styleSheets].some(sheet=>sheet.href===new URL("css/connect.css",base).href),true);
    const loadPanels = () => Promise.all([loadPanelStyle(),asset("js/customer-panels.js", () => Boolean(window.RomanoCustomerPanels))]);
    async function loadEngine() {
      await asset("js/connect-core.js", () => Boolean(window.RomanoConnectCore));
      await asset("js/connect-demo.js", () => Boolean(window.RomanoConnectDemo));
      if (rotateGuest) { rotateGuest = false; try { RomanoConnectDemo.forget(); } catch {} }
    }
    async function loadChat() {
      await Promise.all([loadEngine(), loadLive(), asset("css/connect.css", () =>
        [...document.styleSheets].some(sheet => sheet.href === new URL("css/connect.css", base).href), true)]);
      await asset("js/connect-customer.js", () => Boolean(window.RomanoCustomerChat));
    }
    function forgetGuest() {
      if (window.RomanoCustomerChat) { RomanoCustomerChat.clear(); return; }
      if (window.RomanoConnectDemo) { try { RomanoConnectDemo.forget(); } catch {} return; }
      rotateGuest = true;
      try { sessionStorage.removeItem("romano_connect_guest_v1"); } catch {}
    }
    return Object.freeze({loadEngine,loadLive,loadChat,loadPanels,forgetGuest});
  })();
  window.RomanoConnectAssets = connectAssets;
  const isDemo = () => typeof menuDataMode !== "undefined" && menuDataMode === "demo";
  const cartKey = () => `online_menu_cart_vq3:${tenant()}`;
  const orderKey = () => `online_menu_last_order_vq3:${tenant()}`;
  const orderRequestKey = () => `online_menu_order_request_vq3:${tenant()}`;
  const paymentRequestKey = (orderId) => `online_menu_payment_request_vq3:${tenant()}:${orderId}`;
  let cart = normalizeCart(read(cartKey(), {}));
  let tableSession = standalone ? null : read(`online_menu_table_vq3:${tenant()}`, null);
  let activeOrder = standalone ? null : read(orderKey(), null);
  let cartFocusOrigin = null;
  let cartKeyboardBound = false;
  let cartBackground = [];
  let pollTimer = 0;
  let polling = false;
  let paymentPending = false;
  let submitting = false;
  let demoOrderSaved = false;

  function read(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable. */ }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
  }
  function safe(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  }
  function normalizeCart(value) {
    const result = Object.create(null);
    if (!value || typeof value !== "object" || Array.isArray(value)) return result;
    for (const [id, quantity] of Object.entries(value)) {
      if (id && Number.isSafeInteger(quantity) && quantity > 0) result[id] = Math.min(99, quantity);
    }
    return result;
  }
  function product(id) {
    const item = typeof getProductById === "function" ? getProductById(id) : null;
    return item && Number.isFinite(item.price) && item.price > 0 ? item : null;
  }
  function visibleCartEntries() {
    return Object.entries(cart).filter(([id]) => product(id));
  }
  function reconcileCart() {
    // Loading, unavailable and offline menus are not authoritative enough to discard a saved cart.
    if (typeof menuDataMode === "undefined" || !["demo", "public"].includes(menuDataMode)) return;
    const valid = Object.fromEntries(visibleCartEntries());
    for(const id of zeroItems)if(!product(id))zeroItems.delete(id);
    if (Object.keys(valid).length === Object.keys(cart).length) return;
    cart = normalizeCart(valid);
    save(cartKey(), cart);
  }
  function localized(item) { return window.ROMANO_I18N?.localizeProduct?.(item) || item; }
  function money(value) { return typeof formatPrice === "function" ? formatPrice(value) : Number(value || 0).toLocaleString(lang()); }
  function orderMoney(order) {
    return window.OnlineMenuMoney?.formatMinor
      ? window.OnlineMenuMoney.formatMinor(order?.totalMinor, {
          currency:order?.currencyCode || "IRR",
          exponent:order?.currencyExponent ?? 0,
          language:lang(),
        })
      : money(Number(order?.totalMinor || 0) / 10);
  }
  function count() { return visibleCartEntries().reduce((sum, [, quantity]) => sum + quantity, 0); }
  function total() { return visibleCartEntries().reduce((sum, [id, quantity]) => sum + product(id).price * quantity, 0); }
  function announce(message) {
    const live = document.querySelector("#commerce-live");
    if (live) live.textContent = message;
  }

  const navTranslations={
    fa:{home:"خانه",menu:"منو",featured:"ویژه‌ها",contact:"چت",cart:"سبد"},
    en:{home:"Home",menu:"Menu",featured:"Featured",contact:"Chat",cart:"Cart"},
    tr:{home:"Ana Sayfa",menu:"Menü",featured:"Öne çıkanlar",contact:"Sohbet",cart:"Sepet"},
    ar:{home:"الرئيسية",menu:"القائمة",featured:"المميز",contact:"محادثة",cart:"السلة"}
  };
  function updateCustomerNavigation() {
    const words=navTranslations[lang()] || navTranslations.fa;
    document.querySelectorAll("[data-ramen-label]").forEach(el=>{
      const value=words[el.dataset.ramenLabel];
      if(value) el.textContent=value;
    });
    const amount=count();
    const displayCount=new Intl.NumberFormat(lang()).format(Math.min(amount,99))+(amount>99?"+":"");
    for(const selector of [".ramen-header-cart-count",".ramen-bottom-cart-count",".navigation-cart-count"]){
      const badge=document.querySelector(selector);
      if(!badge) continue;
      badge.textContent=displayCount;
      badge.hidden=amount===0;
    }
    const cartLabel=label=>amount?`${label} · ${displayCount}`:label;
    document.getElementById('ramen-header-cart')?.setAttribute('aria-label',cartLabel(t('cart')));
    document.getElementById('ramen-bottom-cart')?.setAttribute('aria-label',cartLabel(words.cart));
    document.querySelector('[data-nav-panel="cart"]')?.setAttribute('aria-label',cartLabel(words.cart));
  }
  function initializeCustomerNavigation(){
    for(const id of ["ramen-header-cart","ramen-bottom-cart"]){
      document.getElementById(id)?.addEventListener("click",openDrawer);
    }
    const links = [...document.querySelectorAll('.ramen-bottom-link[data-ramen-nav]')].filter(link => link.dataset.ramenNav !== 'contact');
    const sections = links.map(link => ({ link, section: document.getElementById(link.dataset.ramenNav) })).filter(item => item.section);
    const activate = link => links.forEach(item => {
      const active = item === link;
      item.classList.toggle('is-current', active);
      if (active) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
    // Keep native fragment navigation, including browser Back/Forward and reduced-motion CSS.
    links.forEach(link => link.addEventListener('click', () => activate(link)));
    let scheduled = false;
    const sync = () => {
      scheduled = false;
      const offset = (document.getElementById('site-header')?.getBoundingClientRect().bottom || 0) + 32;
      const ordered = sections.filter(item => !item.section.hidden).map(item => ({...item, top:item.section.getBoundingClientRect().top})).sort((a,b)=>a.top-b.top);
      const active = ordered.filter(item => item.top <= offset).at(-1) || ordered[0];
      if (active) activate(active.link);
    };
    const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(sync); } };
    window.addEventListener('scroll', schedule, {passive:true});
    window.addEventListener('resize', schedule, {passive:true});
    window.addEventListener('romano:data-updated', schedule);
    window.addEventListener('romano:customer-view-changed', schedule);
    schedule();
    initializeContactPanel();
    updateCustomerNavigation();
  }

  const contactWords = {
    fa:{title:"ارتباط با رستوران",close:"بستن",phone:"تماس تلفنی",missing:"اطلاعات ارتباطی ثبت نشده است.",nav:"ناوبری سریع",demo:"حالت آزمایشی؛ فقط اطلاعات نمونه نمایش داده می‌شود."},
    en:{title:"Contact the restaurant",close:"Close",phone:"Call",missing:"No contact information is configured.",nav:"Quick navigation",demo:"Demo mode; sample information only."},
    tr:{title:"Restoranla iletişim",close:"Kapat",phone:"Ara",missing:"İletişim bilgileri henüz eklenmedi.",nav:"Hızlı gezinme",demo:"Demo modu; yalnızca örnek bilgiler."},
    ar:{title:"التواصل مع المطعم",close:"إغلاق",phone:"اتصال",missing:"لم تُضف معلومات التواصل.",nav:"التنقل السريع",demo:"وضع تجريبي؛ بيانات نموذجية فقط."}
  };
  const panelWords = {
    fa:{loadError:"بارگذاری این بخش انجام نشد. دوباره تلاش کنید.",profile:"پروفایل",guest:"شما به عنوان مهمان در حال مرور منو هستید. حساب کاربری فعال نیست.",chat:"چت",feedback:"ثبت امتیاز و رضایت",draft:"امتیاز آزمایشی فقط در این مرورگر؛ برای رستوران ارسال نمی‌شود.",unavailable:"ثبت نظر واقعی هنوز فعال نیست.",save:"ذخیره امتیاز محلی",saved:"امتیاز فقط در این مرورگر ذخیره شد.",storageError:"ذخیره محلی ممکن نیست.",rating:"امتیاز",comment:"نظر اختیاری (حداکثر ۵۰۰ نویسه؛ بدون اطلاعات شخصی)",less:"کاهش تعداد",more:"افزایش تعداد",methods:"روش پرداخت"},
    en:{loadError:"This section could not load. Please try again.",profile:"Profile",guest:"You are browsing as a guest. Customer accounts are not enabled.",chat:"Chat",feedback:"Rating & feedback",draft:"Demo rating stays in this browser and is not sent to the restaurant.",unavailable:"Online review submission is not enabled.",save:"Save local rating",saved:"Rating saved in this browser only.",storageError:"Local storage is unavailable.",rating:"Rating",comment:"Optional feedback (500 characters; no personal information)",less:"Decrease quantity",more:"Increase quantity",methods:"Payment method"},
    tr:{loadError:"Bu bölüm yüklenemedi. Tekrar deneyin.",profile:"Profil",guest:"Misafir olarak menüye göz atıyorsunuz. Müşteri hesabı etkin değil.",chat:"Sohbet",feedback:"Puan ve geri bildirim",draft:"Deneme puanı yalnızca bu tarayıcıda kalır; restorana gönderilmez.",unavailable:"Çevrimiçi yorum gönderimi etkin değil.",save:"Yerel puanı kaydet",saved:"Puan yalnızca bu tarayıcıya kaydedildi.",storageError:"Yerel depolama kullanılamıyor.",rating:"Puan",comment:"İsteğe bağlı yorum (500 karakter; kişisel bilgi yazmayın)",less:"Miktarı azalt",more:"Miktarı artır",methods:"Ödeme yöntemi"},
    ar:{loadError:"تعذر تحميل هذا القسم. حاول مجدداً.",profile:"الملف الشخصي",guest:"تتصفح القائمة كضيف. حسابات العملاء غير مفعلة.",chat:"محادثة",feedback:"التقييم والملاحظات",draft:"التقييم التجريبي يبقى في هذا المتصفح ولا يرسل للمطعم.",unavailable:"إرسال التقييمات عبر الإنترنت غير مفعل.",save:"حفظ التقييم المحلي",saved:"حُفظ التقييم في هذا المتصفح فقط.",storageError:"التخزين المحلي غير متاح.",rating:"التقييم",comment:"تعليق اختياري (500 حرف؛ دون معلومات شخصية)",less:"تقليل الكمية",more:"زيادة الكمية",methods:"طريقة الدفع"}
  };
  const panelText = () => panelWords[lang()] || panelWords.fa;
  // All new customer-facing copy is localized; no demo action reaches restaurant staff.
  const hospitality = {
    fa:{services:"خدمات مهمان",quick:"خدمات میز",waiter:"فراخوان گارسون",bill:"درخواست صورتحساب",water:"درخواست آب",napkin:"درخواست دستمال",local:"درخواست‌ها فقط در این مرورگر شبیه‌سازی می‌شوند و به پرسنل ارسال نمی‌شوند.",unconnected:"خدمات آنلاین میز هنوز فعال نیست.",selectTable:"برای خدمات میز، QR معتبر میز را باز کنید.",request:"درخواست آزمایشی ثبت شد",cancel:"لغو درخواست",review:"ثبت نظر و امتیاز",suggest:"سفارش خود را کامل کنید",unit:"قیمت واحد",undo:"بازگرداندن",removed:"محصول حذف شد",continue:"بازگشت به منو",summary:"خلاصه سفارش",noteLocal:"فقط توضیحات ساختگی وارد کنید.",demo:"نسخه آزمایشی؛ سفارش ارسال نمی‌شود."},
    en:{services:"Guest services",quick:"Table services",waiter:"Call waiter",bill:"Request bill",water:"Request water",napkin:"Request napkins",local:"Requests are simulated in this browser only; nothing is sent to staff.",unconnected:"Online table services are not enabled.",selectTable:"Open a valid table QR to use table services.",request:"Sample request saved",cancel:"Cancel request",review:"Rating & feedback",suggest:"Complete your order",unit:"Unit price",undo:"Undo",removed:"Item removed",continue:"Back to menu",summary:"Order summary",noteLocal:"Use fictional notes only.",demo:"Demo only; orders are not sent."},
    tr:{services:"Misafir hizmetleri",quick:"Masa hizmetleri",waiter:"Garson çağır",bill:"Hesap iste",water:"Su iste",napkin:"Peçete iste",local:"İstekler yalnızca bu tarayıcıda simüle edilir; personele gönderilmez.",unconnected:"Çevrimiçi masa hizmetleri etkin değil.",selectTable:"Masa hizmetleri için geçerli masa QR kodunu açın.",request:"Örnek istek kaydedildi",cancel:"İsteği iptal et",review:"Puan ve geri bildirim",suggest:"Siparişinizi tamamlayın",unit:"Birim fiyat",undo:"Geri al",removed:"Ürün kaldırıldı",continue:"Menüye dön",summary:"Sipariş özeti",noteLocal:"Yalnızca kurgusal not yazın.",demo:"Demo; siparişler gönderilmez."},
    ar:{services:"خدمات الضيوف",quick:"خدمات الطاولة",waiter:"استدعاء النادل",bill:"طلب الفاتورة",water:"طلب الماء",napkin:"طلب المناديل",local:"تُحاكى الطلبات في هذا المتصفح فقط ولا تُرسل للموظفين.",unconnected:"خدمات الطاولة عبر الإنترنت غير مفعلة.",selectTable:"افتح رمز QR صالحًا للطاولة لاستخدام الخدمات.",request:"حُفظ الطلب التجريبي",cancel:"إلغاء الطلب",review:"التقييم والملاحظات",suggest:"أكمل طلبك",unit:"سعر الوحدة",undo:"تراجع",removed:"تم حذف المنتج",continue:"العودة إلى القائمة",summary:"ملخص الطلب",noteLocal:"اكتب ملاحظات وهمية فقط.",demo:"نسخة تجريبية؛ لا تُرسل الطلبات."}
  };
  const h = key => hospitality[lang()]?.[key] || hospitality.fa[key];
  let lastRemoved = null;
  let orderNotes = "";
  const zeroItems=new Set();
  let couponCode="",appliedCoupon="";
  const extra={"fa":["تخفیف نمونه","کد تخفیف","اعمال","کد نامعتبر یا بدون تخفیف","امتیاز نمونه","","پذیرفته شد","انجام شد","","","","حذف تخفیف"],"en":["Sample discount","Promo code","Apply","Invalid code or no discount","Sample points","","Accepted","Completed","","","","Remove discount"],"tr":["Örnek indirim","İndirim kodu","Uygula","Geçersiz kod veya indirim yok","Örnek puan","","Kabul edildi","Tamamlandı","","","","İndirimi kaldır"],"ar":["خصم تجريبي","رمز الخصم","تطبيق","رمز غير صالح أو لا يوجد خصم","نقاط تجريبية","","تم القبول","مكتمل","","","","إزالة الخصم"]};
  const x=i=>(extra[lang()]||extra.fa)[i];
  const bundleText=()=>({fa:"پیشنهاد ترکیبی",en:"Bundle offer",tr:"Kombinasyon teklifi",ar:"عرض المجموعة"}[lang()]||"Bundle offer");
  const subtotalText=()=>({fa:"جمع محصولات",en:"Subtotal",tr:"Ara toplam",ar:"المجموع الفرعي"}[lang()]||"Subtotal");
  const config=()=>{try{return isDemo()?window.RomanoDemoMembers.settings(localStorage):null;}catch{return null;}};
  function eligible(cfg){return cfg&&window.RomanoDemoMembers.eligibleBundle(cfg.bundle,visibleCartEntries().map(([productId,quantity])=>({productId,quantity})));}
  function discount(){const cfg=config();return cfg&&appliedCoupon&&cfg.coupon===appliedCoupon&&eligible(cfg)?window.RomanoDemoMembers.discountFor(total(),cfg.percent,restaurantConfig.currency):0;}
  function guestContext() {
    if (isDemo()) {
      try {
        const model=window.RomanoDemoBranches, branch=model?.context();
        const table=branch?.tables.find(row=>row.code===model.table);
        return {table:window.ROMANO_I18N.displayBrand(table?.name || ""), code:table?.code || ""};
      } catch { return {}; }
    }
    return {table:window.ROMANO_I18N.displayBrand(tableSession?.table?.name || tableSession?.table?.code || ""),code:""};
  }
  function restaurantDialUrl(){
    const raw=String(restaurantConfig?.phone||"").trim();
    if(!/^[+\d\s().-]{5,25}$/.test(raw))return "";
    const number=raw.replace(/[^+\d]/g,"");
    // The bundled fictitious number must never launch a call.
    if(!/^\+?[1-9]\d{6,14}$/.test(number)&&!/^0\d{7,14}$/.test(number))return "";
    if(isDemo()&&/^(?:\+98|0)31[0]+$/.test(number))return "";
    return ["demo","public","offline"].includes(menuDataMode)?"tel:"+number:"";
  }
  function dialRestaurant(){
    const url=restaurantDialUrl();if(url)location.href=url;
    else announce((contactWords[lang()]||contactWords.fa).missing);
  }
  function contextLabel() {
    const context=guestContext();
    return context.table ? (/^(?:میز|Table|Masa|طاولة)\b/i.test(context.table)||/^(?:میز|طاولة)\s/.test(context.table)?context.table:t("table")+" "+context.table) : "";
  }
  function renderSuggestions() {
    const host=document.querySelector("#hp-suggestions");if(!host)return;
    const selected=visibleCartEntries();
    const groups=new Set(selected.map(([id])=>product(id)?.category));
    // Category diversity is a suggestion heuristic, not a personalized or AI recommendation.
    const candidates=[];
    if(selected.length && typeof menuProducts!=="undefined" && Array.isArray(menuProducts)){
      const suggestedGroups=new Set(groups);
      const cfg=config();
      for(const id of [...new Set([...(cfg?.bundle||[]),...(cfg?.suggestions||[])])]){const item=product(id);if(item&&!cart[id]&&!zeroItems.has(id)&&candidates.length<3){candidates.push(item);suggestedGroups.add(item.category);}}
      for(const item of menuProducts){
        if(candidates.length>=3)break;
        if(item.active===false || !product(item.id) || cart[item.id] || zeroItems.has(item.id) || candidates.some(p=>p.id===item.id) || suggestedGroups.has(item.category))continue;
        candidates.push(item);suggestedGroups.add(item.category);
        if(candidates.length===3)break;
      }
    }
    const previous=document.activeElement?.dataset?.hpAdd;
    const offset=host.querySelector(".hp-suggestion-grid")?.scrollLeft||0;
    host.hidden=!candidates.length;
    host.replaceChildren();
    if(!candidates.length){if(previous && document.querySelector("#commerce-drawer.is-open"))document.querySelector("#commerce-submit")?.focus();return;}
    const title=document.createElement("h3");title.textContent=h("suggest");host.append(title);
    const grid=document.createElement("div");grid.className="hp-suggestion-grid";
    for(const item of candidates){
      const card=document.createElement("article");card.className="hp-suggestion";
      const name=document.createElement("strong");name.textContent=localized(item).name;
      const price=document.createElement("span");price.textContent=money(item.price);
      const button=document.createElement("button");button.type="button";button.dataset.hpAdd=item.id;button.textContent="+ "+t("add");button.disabled=submitting;
      button.setAttribute("aria-label",t("add")+": "+name.textContent);button.addEventListener("click",()=>add(item.id));
      const media=document.createElement("div");media.className="hp-suggestion-media";
      const fallback=document.createElement("span");fallback.className="image-fallback";fallback.textContent=getImageFallbackLabel(name.textContent);fallback.setAttribute("aria-hidden","true");media.append(fallback);
      const src=getSafeImageSource(item.image);
      if(src){const image=document.createElement("img");image.src=src;image.alt="";image.width=160;image.height=112;image.loading="lazy";image.decoding="async";image.addEventListener("error",()=>image.remove(),{once:true});media.append(image);}
      card.append(media,name,price,button);grid.append(card);
    }
    host.append(grid);grid.scrollLeft=offset;
    if(previous && document.querySelector("#commerce-drawer.is-open"))(grid.querySelector("button")||document.querySelector("#commerce-submit"))?.focus({preventScroll:true});
  }
  function removeCartItem(id) {
    if(submitting||!zeroItems.has(id)||cart[id])return;
    lastRemoved={id,quantity:1};zeroItems.delete(id);
    render();announce(h("removed"));
  }
  const ratingWords={
    fa:["رضایت مشتریان","هنوز امتیاز تأییدشده‌ای ثبت نشده","بر اساس ۱ نظر نمونه تأییدشده در این مرورگر","امتیاز مشتریان در دسترس نیست"],
    en:["Customer satisfaction","No approved ratings yet","Based on 1 approved sample review in this browser","Customer ratings unavailable"],
    tr:["Müşteri memnuniyeti","Henüz onaylı puan yok","Bu tarayıcıdaki 1 onaylı örnek yoruma göre","Müşteri puanları mevcut değil"],
    ar:["رضا العملاء","لا توجد تقييمات معتمدة بعد","استنادًا إلى تقييم تجريبي معتمد واحد في هذا المتصفح","تقييمات العملاء غير متاحة"]
  };
  function renderHeroRating(){
    const node=document.querySelector("#hero-rating");if(!node)return;
    const words=ratingWords[lang()]||ratingWords.fa;
    let score=null;
    if(isDemo())try{const r=window.RomanoDemoReview.read(localStorage,tenant());if(r?.status==="approved")score=r.rating;}catch{/* no fabricated rating */}
    node.hidden=false;
    node.disabled=!isDemo();
    node.querySelectorAll(".hero-stars > span").forEach((star,index)=>{const filled=score!==null&&index<score;star.textContent=filled?"★":"☆";star.classList.toggle("is-filled",filled);});
    const percent=score===null?"—":new Intl.NumberFormat(lang(),{style:"percent",maximumFractionDigits:0}).format(score/5);
    const detail=score!==null?words[2]:isDemo()?words[1]:words[3];
    node.setAttribute("aria-label",[words[0],percent,detail,h("review")].join(" · "));
    const nav=document.querySelector("#navigation-rating");
    nav.replaceChildren(...[...node.children].map(child=>{const copy=child.cloneNode(true);copy.removeAttribute("id");copy.querySelectorAll("[id]").forEach(n=>n.removeAttribute("id"));return copy;}));
    nav.hidden=false;
    nav.setAttribute("aria-label",[words[0],percent,detail].join(" · "));
    document.querySelector("#navigation-service-toggle").setAttribute("aria-label",h("services"));
    const call=document.querySelector('[data-nav-panel="contact"]');call.textContent=(contactWords[lang()]||contactWords.fa).phone;call.disabled=!restaurantDialUrl();
    document.querySelector('[data-nav-panel="waiter"]').textContent=h("waiter");
  }
  function initializeContactPanel() {
    const trigger = document.querySelector('[data-ramen-nav="contact"]');
    if (!trigger || typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'ramen-contact-dialog';
    dialog.className = 'ramen-contact-dialog';
    dialog.setAttribute('aria-labelledby','ramen-contact-title');
    document.body.append(dialog);
    // Preserve the native contact anchor as a fallback on browsers without dialog support.
    // The enhanced trigger acts as a button, with both Enter and Space activation.
    trigger.setAttribute('role','button');
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-expanded','false');
    const updateLabel = () => document.querySelector('.ramen-bottom-nav')?.setAttribute('aria-label',(contactWords[lang()] || contactWords.fa).nav);
    const close = () => { if (dialog.open) dialog.close(); };
    let origin = null, activePanel = null, panelRevision = 0;
    const profileId=()=>window.RomanoCustomerEntry?.current()?.id||"";
    let connectProfile=profileId();
    const openPanel = (panel='chat', opener=trigger, replace=false, restoreLanguage=false) => {
      if (dialog.open && !replace) return;
      const wasOpen=dialog.open, revision=++panelRevision;
      if(panel!=='chat')window.RomanoCustomerChat?.suspend();
      if(!wasOpen)origin=opener;
      activePanel=panel;
      const words = contactWords[lang()] || contactWords.fa;
      const element = (tag, value, cls) => { const node=document.createElement(tag); if(value)node.textContent=value; if(cls)node.className=cls; return node; };
      const header=element('header',null,'ramen-contact-head');
      const labels=panelText();
      const chat=window.RomanoCustomerChat;
      const heading=element('h2',panel==='chat'&&chat?chat.words(lang()).title:panel==='waiter'?h('waiter'):labels[panel]||words.title);heading.id='ramen-contact-title';
      const dismiss=element('button',undefined,'ramen-contact-close');dismiss.type='button';dismiss.setAttribute('aria-label',words.close);dismiss.addEventListener('click',close);
      const closeGlyph=element('span','×');closeGlyph.setAttribute('aria-hidden','true');dismiss.append(closeGlyph);
      header.append(heading,dismiss);
      const content=element('div',null,'ramen-contact-content');
      const mode=typeof menuDataMode !== 'undefined' ? menuDataMode : 'loading';
      const demo=mode==='demo';
      dialog.classList.toggle('r27-profile-page',panel==='profile');
      dialog.classList.toggle('connect-dialog',panel==='chat'&&Boolean(chat&&window.RomanoCustomerPanels));
      const panels=window.RomanoCustomerPanels;
      if(panels&&(panel!=='chat'||chat)){
        content.dataset.panelState='ready';
        panels.render({panel,content,element,demo,mode,labels,words,chat,profileId,lang,h,x,panelText,guestContext,contextLabel,config,tenant,renderHeroRating,close,openPanel,origin,dialog,isDemo,restaurantDialUrl});
      }else{
        content.dataset.panelState='loading';
        const loading=element('p',({fa:'در حال بارگذاری…',en:'Loading…',tr:'Yükleniyor…',ar:'جارٍ التحميل…'})[lang()],'ramen-contact-note');loading.setAttribute('role','status');
        const retry=element('button',t('retry'),'feedback-save');retry.type='button';retry.hidden=true;
        retry.addEventListener('click',()=>openPanel(panel,origin,true));content.append(loading,retry);
        if(panel==='chat'&&restaurantDialUrl()){const contactButton=element('a',words.phone,'feedback-save');contactButton.href=restaurantDialUrl();content.append(contactButton);}
        const load=panel==='chat'?Promise.all([connectAssets.loadPanels(),connectAssets.loadChat()]):connectAssets.loadPanels();
        load.then(()=>{
          if(dialog.open&&activePanel===panel&&revision===panelRevision)openPanel(panel,origin,true);
        }).catch(()=>{
          if(dialog.open&&activePanel===panel&&revision===panelRevision){content.dataset.panelState='error';loading.textContent=labels.loadError;retry.hidden=false;}
        });
      }
      dialog.replaceChildren(header,content);
      if(!wasOpen){dialog.showModal();window.RamenOverlayHistory.enter('contact',close);document.body.classList.add('ramen-contact-open');}
      if(origin===trigger){trigger.setAttribute('aria-controls',dialog.id);trigger.setAttribute('aria-expanded','true');}
      const focusTarget=dismiss;
      focusTarget.focus({preventScroll:true});
    };
    document.querySelector("#hero-rating")?.addEventListener("click",event=>openPanel("feedback",event.currentTarget));
    trigger.addEventListener('click',event=>{event.preventDefault();openPanel();});
    trigger.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();openPanel();}});
    document.addEventListener('romano:open-customer-panel',event=>{
      const panel=event.detail?.panel;
      if(panel==='cart')openDrawer();
      else if(panel==='contact')dialRestaurant();
      else if(panel==='profile'&&isDemo()&&!window.RomanoCustomerEntry?.current()){window.RomanoCustomerEntry.open(false,()=>{if(window.RomanoCustomerEntry.current())openPanel('profile',document.querySelector('#menu-toggle'));});}
      else if(['chat','profile','feedback','waiter'].includes(panel))openPanel(panel,document.querySelector('#menu-toggle'));
    });
    dialog.addEventListener('close',()=>{panelRevision++;window.RamenOverlayHistory.leave('contact');document.body.classList.remove('ramen-contact-open');trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-controls');window.RomanoCustomerChat?.suspend();if(origin?.isConnected&&!origin.closest('[inert]'))origin.focus({preventScroll:true});origin=null;activePanel=null;});
    document.addEventListener('romano:language-changed',()=>{if(dialog.open&&activePanel==='chat')openPanel('chat',origin,true);else close();updateLabel();});
    document.addEventListener('romano:connect-session-changed',()=>{window.RomanoCustomerChat?.clear();if(dialog.open&&activePanel==='chat')openPanel('chat',origin,true);});
    document.addEventListener('romano:demo-membership-changed',()=>{const next=profileId();if(next===connectProfile)return;connectProfile=next;connectAssets.forgetGuest();if(dialog.open&&activePanel==='chat')openPanel('chat',origin,true);});
    let lastPanelMode=typeof menuDataMode==='undefined'?'loading':menuDataMode;
    window.addEventListener('romano:data-updated',()=>{
      const mode=typeof menuDataMode==='undefined'?'loading':menuDataMode;
      if(mode!==lastPanelMode){
        lastPanelMode=mode;
        window.RomanoCustomerChat?.clear();
        if(dialog.open&&activePanel==='chat')openPanel('chat',origin,true);
      }
    });
    updateLabel();
  }

  function buildShell() {
    if (document.querySelector("#commerce-cart-bar")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="commerce-session" id="commerce-session" role="status" hidden></div>
      <button class="commerce-cart-bar" id="commerce-cart-bar" type="button" aria-controls="commerce-drawer" aria-expanded="false" hidden>
        <span class="commerce-cart-count" aria-hidden="true">0</span>
        <span class="commerce-cart-label">${safe(t("cart"))}</span>
        <strong class="commerce-cart-total"></strong>
      </button>
      <div class="commerce-backdrop" data-commerce-close hidden></div>
      <section class="commerce-drawer" id="commerce-drawer" role="dialog" aria-modal="true" aria-labelledby="commerce-title" aria-hidden="true" tabindex="-1" inert>
        <header class="commerce-drawer-head">
          <div><small>RAMEN</small><h2 id="commerce-title" tabindex="-1">${safe(t("cart"))}</h2><p class="hp-context" id="hp-cart-context"></p></div>
        </header>
        <div class="commerce-scroll">
        <div class="commerce-order-status" id="commerce-order-status" hidden></div>
        <p class="ramen-contact-note" id="commerce-demo-status" role="status" hidden></p>
        <div class="commerce-items" id="commerce-items"></div>
        <div class="hp-undo" id="hp-undo" hidden><span>${safe(h("removed"))}</span><button type="button" id="hp-undo-button">${safe(h("undo"))}</button></div>
        <section class="hp-suggestions" id="hp-suggestions" hidden></section>
        <div class="commerce-options" id="commerce-options">
          <label class="commerce-note"><span>${safe(t("note"))}</span><textarea id="commerce-notes" maxlength="1000" rows="2" placeholder="${safe(t("noteHint"))}">${safe(orderNotes)}</textarea><span id="hp-note-local" hidden>${safe(h("noteLocal"))}</span></label>
          <div id="hp-offer" hidden><label for="hp-code">${safe(x(1))}</label><div class="hp-code-row"><input id="hp-code" maxlength="24" value="${safe(couponCode)}" dir="ltr" autocomplete="off"><button type="button" id="hp-apply">${safe(x(2))}</button></div><p id="hp-bundle" class="hp-context" hidden></p><p id="hp-coupon-status" role="status"></p></div>
          <p id="hp-points" class="hp-context" hidden></p>
          <fieldset class="commerce-pay-method"><legend>${safe(panelText().methods)}</legend>
            <label><input type="radio" name="commerce-payment" value="later" checked> <span>${safe(t("later"))}</span></label>
            <label hidden><input type="radio" name="commerce-payment" value="online" disabled> <span>${safe(t("online"))}</span></label>
          </fieldset>
        </div></div>
        <button class="hp-continue" type="button" id="hp-continue">${safe(h("continue"))}</button>
        <div class="commerce-checkout" id="commerce-checkout">
          <div class="hp-summary">${safe(h("summary"))}</div><div class="commerce-total-row" id="hp-subtotal" hidden><span>${safe(subtotalText())}</span><strong id="hp-subtotal-value"></strong></div><div class="commerce-total-row" id="hp-discount" hidden><span>${safe(x(0))}</span><strong id="hp-discount-value"></strong></div><div class="commerce-total-row"><span>${safe(t("total"))}</span><strong id="commerce-total"></strong></div>
          <p class="commerce-message" id="commerce-message" role="alert"></p>
          <button class="commerce-submit" id="commerce-submit" type="button">${safe(t("checkout"))}</button>
        </div>
      </section>
      <div class="sr-only" id="commerce-live" aria-live="polite"></div>
      <div class="commerce-payment-toast" id="commerce-payment-toast" role="status" hidden></div>`);
    document.querySelector("#commerce-cart-bar").addEventListener("click", openDrawer);
    document.querySelectorAll("[data-commerce-close]").forEach((button) => button.addEventListener("click", closeDrawer));
    document.querySelector("#commerce-submit").addEventListener("click", submitOrder);
    document.querySelector("#hp-continue").addEventListener("click",()=>{closeDrawer();navigateCustomerView("menu");});
    document.querySelector("#hp-code").addEventListener("input",event=>{couponCode=event.target.value;});
    document.querySelector("#hp-apply").addEventListener("click",()=>{
      if(submitting)return;
      const cfg=config(),code=couponCode.trim().toUpperCase();
      if(appliedCoupon){appliedCoupon="";couponCode="";document.querySelector("#hp-code").value="";render();return;}
      if(!cfg?.coupon||code!==cfg.coupon||!eligible(cfg)||!window.RomanoDemoMembers.discountFor(total(),cfg.percent,restaurantConfig.currency)){document.querySelector("#hp-coupon-status").textContent=x(3);return;}
      appliedCoupon=code;render();
    });
    document.querySelector("#commerce-notes").addEventListener("input",event=>{orderNotes=event.target.value;});
    document.querySelector("#hp-undo-button").addEventListener("click",()=>{
      if(!lastRemoved||submitting)return;
      const {id,quantity}=lastRemoved;lastRemoved=null;zeroItems.delete(id);
      if(product(id)?.active!==false && product(id)){cart[id]=Math.min(99,(cart[id]||0)+quantity);save(cartKey(),cart);}
      render();document.querySelector("#commerce-items button:not([disabled])")?.focus({preventScroll:true});
    });
    bindDrawerKeyboard();
  }

  function bindDrawerKeyboard() {
    if (cartKeyboardBound) return;
    cartKeyboardBound = true;
    document.addEventListener("keydown", (event) => {
      const drawer = document.querySelector("#commerce-drawer");
      if (!drawer?.classList.contains("is-open")) return;
      if (event.key === "Escape") { event.preventDefault(); closeDrawer(); return; }
      if (event.key !== "Tab") return;
      const focusables = Array.from(drawer.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'))
        .filter(element => !element.closest("[hidden],[inert]") && element.getClientRects().length > 0);
      if (!focusables.length) { event.preventDefault(); drawer.focus(); return; }
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || !focusables.includes(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !focusables.includes(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    });
  }

  function openDrawer() {
    const drawer = document.querySelector("#commerce-drawer");
    const backdrop = document.querySelector(".commerce-backdrop");
    if (!drawer || drawer.classList.contains("is-open") || document.querySelector(".main-navigation.is-open,.product-modal.is-open,dialog[open]")) return;
    cartFocusOrigin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    render();
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    drawer.classList.add("is-open");
    backdrop.hidden = false;
    requestAnimationFrame(() => { if (drawer.classList.contains("is-open")) backdrop.classList.add("is-open"); });
    document.body.classList.add("commerce-open");
    cartBackground = [...document.querySelectorAll(".site-wrapper,.ramen-bottom-nav")].map(node=>({node,previous:node.inert}));
    cartBackground.forEach(({node})=>{node.inert=true;});
    document.querySelector("#commerce-cart-bar").setAttribute("aria-expanded", "true");
    for(const id of ["ramen-header-cart","ramen-bottom-cart"])document.getElementById(id)?.setAttribute("aria-expanded","true");
    window.RamenOverlayHistory.enter("cart",closeDrawer);
    drawer.querySelector("#commerce-title")?.focus({preventScroll:true});
  }
  function closeDrawer() {
    const drawer = document.querySelector("#commerce-drawer");
    if (!drawer?.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    window.RamenOverlayHistory.leave("cart");
    zeroItems.clear();
    drawer.inert = true;
    drawer.setAttribute("aria-hidden", "true");
    const backdrop = document.querySelector(".commerce-backdrop");
    backdrop?.classList.remove("is-open");
    window.setTimeout(() => { if (backdrop && !drawer.classList.contains("is-open")) backdrop.hidden = true; }, 220);
    document.body.classList.remove("commerce-open");
    cartBackground.forEach(({node,previous})=>{node.inert=previous;});
    cartBackground=[];
    document.querySelector("#commerce-cart-bar").setAttribute("aria-expanded", "false");
    for(const id of ["ramen-header-cart","ramen-bottom-cart"])document.getElementById(id)?.setAttribute("aria-expanded","false");
    if (cartFocusOrigin?.isConnected && cartFocusOrigin!==document.body && !cartFocusOrigin.closest("[inert]")) cartFocusOrigin.focus({preventScroll:true});
    else document.querySelector("#ramen-header-cart")?.focus({preventScroll:true});
    cartFocusOrigin = null;
    render();
  }

  const feedbackWords = {
    fa:["به سبد اضافه شد","حداکثر تعداد انتخاب شده است"],
    ar:["تمت الإضافة إلى السلة","تم بلوغ الحد الأقصى"],
    en:["Added to your cart","Maximum quantity reached"],
    tr:["Sepete eklendi","En yüksek adede ulaşıldı"]
  };
  let feedbackTimer = 0;
  function showAddFeedback(item, added) {
    const message = (feedbackWords[lang()] || feedbackWords.fa)[added?0:1];
    let toast = document.getElementById("r17-cart-feedback");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "r17-cart-feedback";
      toast.className = "r17-cart-feedback";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-atomic", "true");
      toast.innerHTML = '<span class="r17-feedback-icon" aria-hidden="true"></span><div><strong></strong><span class="r17-feedback-product"></span></div><bdi class="r17-feedback-count"></bdi>';
      document.body.append(toast);
    }
    toast.querySelector(".r17-feedback-icon").textContent = added ? "✓" : "!";
    toast.querySelector("strong").textContent = message;
    toast.querySelector(".r17-feedback-product").textContent = localized(item).name;
    toast.querySelector(".r17-feedback-count").textContent = new Intl.NumberFormat(lang()).format(count());
    toast.dataset.state = added ? "added" : "limit";
    toast.classList.remove("is-visible");
    void toast.offsetWidth;
    toast.classList.add("is-visible");
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(()=>toast.classList.remove("is-visible"), 3200);
    if (added && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const node of document.querySelectorAll("#ramen-header-cart,#ramen-bottom-cart")) {
        node.classList.remove("r17-cart-pulse");
        void node.offsetWidth;
        node.classList.add("r17-cart-pulse");
      }
    }
  }
  function add(id) {
    const item = product(id);
    if (!item || !(item.price > 0)) return;
    if(submitting)return;
    const previous = Number(cart[id] || 0);
    if (previous >= 99) { showAddFeedback(item, false); return; }
    demoOrderSaved=false;
    zeroItems.delete(id);
    cart[id] = previous + 1;
    save(cartKey(), cart);
    render();
    showAddFeedback(item, true);
  }
  function change(id, delta) {
    const next = Number(cart[id] || 0) + delta;
    if(submitting)return;
    if(!product(id)||(!cart[id]&&!zeroItems.has(id)))return;
    if(next<=0){if(!cart[id])return;delete cart[id];zeroItems.add(id);}else{zeroItems.delete(id);cart[id]=Math.min(99,next);}
    save(cartKey(), cart);
    render();
  }

  function render() {
    const bar = document.querySelector("#commerce-cart-bar");
    if (!bar) return;
    const amount = count();
    updateCustomerNavigation();
    bar.hidden = true;
    bar.querySelector(".commerce-cart-count").textContent = String(amount);
    bar.querySelector(".commerce-cart-label").textContent = activeOrder && amount === 0 ? t("view") : t("cart");
    bar.querySelector(".commerce-cart-total").textContent = amount ? money(total()) : `#${activeOrder?.orderNumber || ""}`;
    const cfg=config(), savings=discount();
    if(!savings)appliedCoupon="";
    document.querySelector("#commerce-total").textContent = money(total()-savings);
    document.querySelector("#hp-offer").hidden=!cfg?.coupon;
    document.querySelector("#hp-code").disabled=submitting||Boolean(appliedCoupon);
    document.querySelector("#hp-apply").disabled=submitting;
    document.querySelector("#hp-apply").textContent=x(appliedCoupon?11:2);
    document.querySelector("#hp-coupon-status").textContent=savings?cfg.percent+"% · "+appliedCoupon:"";
    const bundle=document.querySelector("#hp-bundle"),bundleItems=(cfg?.bundle||[]).map(id=>product(id));
    bundle.hidden=!bundleItems.length||bundleItems.some(item=>!item);
    bundle.textContent=bundle.hidden?"":bundleText()+": "+bundleItems.map(item=>localized(item).name).join(" + ");
    document.querySelector("#hp-subtotal").hidden=!savings;
    document.querySelector("#hp-subtotal-value").textContent=savings?money(total()):"";
    document.querySelector("#hp-discount").hidden=!savings;
    document.querySelector("#hp-discount-value").textContent=savings?money(savings):"";
    const points=document.querySelector("#hp-points");
    points.hidden=!cfg?.points;points.textContent=cfg?.points?x(4)+": +"+new Intl.NumberFormat(lang()).format(cfg.points):"";
    const member=window.RomanoCustomerEntry?.current()||window.RomanoPhoneAuth?.customer();
    const memberName=member?.name||member?.displayName;
    const cartTitles={fa:["سبد خرید شما","سبد خرید "],en:["Your cart","Cart — "],tr:["Sepetiniz","Sepet — "],ar:["سلة مشترياتك","سلة مشتريات "]};
    const titleWords=cartTitles[lang()]||cartTitles.fa;
    const title=document.querySelector("#commerce-title");title.replaceChildren(document.createTextNode(memberName?titleWords[1]:titleWords[0]));
    if(memberName){const name=document.createElement("bdi");name.textContent=memberName;title.append(name);}
    const context=document.querySelector("#hp-cart-context");context.textContent=contextLabel();context.hidden=!context.textContent;
    document.querySelector("#hp-undo").hidden=!lastRemoved || !product(lastRemoved.id);
    document.querySelector("#hp-undo-button").disabled=submitting;
    document.querySelector("#hp-continue").disabled=submitting;
    document.querySelector("#commerce-notes").disabled=submitting;
    renderSuggestions();
    const host = document.querySelector("#commerce-items");
    const focused = document.activeElement;
    const previousControl = focused?.closest('#commerce-items button') ? {id:focused.dataset.productId,change:focused.dataset.cartChange,remove:focused.hasAttribute('data-cart-remove')} : null;
    const priorOrder=new Map([...host.querySelectorAll("[data-cart-row]")].map((node,index)=>[node.dataset.cartRow,index]));
    const entries=[...visibleCartEntries(),...[...zeroItems].filter(id=>!cart[id]&&product(id)).map(id=>[id,0])];
    entries.sort(([a],[b])=>(priorOrder.get(a)??Infinity)-(priorOrder.get(b)??Infinity));
    const rows = entries.map(([id, quantity]) => {
      const item = product(id);
      if (!item) return "";
      const view = localized(item);
      const src=getSafeImageSource(item.image);
      return `<article class="commerce-item${quantity===0?' is-zero':''}" data-cart-row="${safe(id)}">
        <div class="commerce-item-media"><span class="image-fallback" aria-hidden="true">${safe(getImageFallbackLabel(view.name))}</span>${src ? `<img src="${safe(src)}" alt="" width="64" height="64" decoding="async">` : ""}</div>
        <div class="hp-item-copy"><h3>${safe(view.name)}</h3><span class="hp-unit">${safe(h("unit"))}: ${safe(money(item.price))}</span><strong class="hp-line-total">${safe(money(item.price * quantity))}</strong>
          <div class="commerce-quantity" aria-label="${safe(view.name)}"><button type="button" ${quantity===0?'data-cart-remove class="cart-trash"':'data-cart-change="-1"'} data-product-id="${safe(id)}" aria-label="${safe(quantity===0?t("remove"):panelText().less)}: ${safe(view.name)}" ${submitting?"disabled":""}>${quantity===0?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7"/></svg>':'−'}</button><b>${quantity}</b><button type="button" data-cart-change="1" data-product-id="${safe(id)}" aria-label="${safe(panelText().more)}: ${safe(view.name)}" ${submitting||quantity>=99?"disabled":""}>+</button></div>
        </div>
      </article>`;
    }).join("");
    host.innerHTML = rows || `<p class="commerce-empty">${safe(t("empty"))}</p>`;
    host.classList.toggle("is-empty", !rows);
    const checkout = document.querySelector("#commerce-checkout");
    if (checkout) checkout.hidden = amount === 0;
    document.querySelector("#commerce-options").hidden = amount === 0;
    host.querySelectorAll(".commerce-item-media img").forEach(img=>{if(img.complete&&!img.naturalWidth)img.remove();else img.addEventListener("error",()=>img.remove(),{once:true});});
    host.querySelectorAll("[data-cart-change]").forEach((button) => button.addEventListener("click", () => change(button.dataset.productId, Number(button.dataset.cartChange))));
    host.querySelectorAll("[data-cart-remove]").forEach((button) => button.addEventListener("click", () => removeCartItem(button.dataset.productId)));
    if(previousControl && document.querySelector('#commerce-drawer.is-open')) {
      const next=[...host.querySelectorAll('button')].find(b=>b.dataset.productId===previousControl.id && b.dataset.cartChange===previousControl.change && b.hasAttribute('data-cart-remove')===previousControl.remove);
      const zeroRemove=[...host.querySelectorAll('[data-cart-remove]')].find(b=>b.dataset.productId===previousControl.id);
      ((next && !next.disabled ? next : null) || zeroRemove || (!document.querySelector("#hp-undo").hidden&&document.querySelector("#hp-undo-button")) || host.querySelector('button:not([disabled])') || document.querySelector('#hp-continue'))?.focus({preventScroll:true});
    }
    const submit = document.querySelector("#commerce-submit");
    submit.disabled = amount === 0 || submitting;
    submit.textContent = submitting ? t("sending") : ({fa:"پرداخت",en:"Payment",tr:"Ödeme",ar:"الدفع"}[lang()]||"Payment");
    renderStatus();
    renderSession();
    renderModalQuantity();
  }

  function renderPaymentMethods() {
    const online=document.querySelector('input[name="commerce-payment"][value="online"]');
    const later=document.querySelector('input[name="commerce-payment"][value="later"]');
    if(!online) return;
    const enabled=tableSession?.paymentOnlineEnabled===true;
    online.disabled=!enabled;
    if(online.closest("label")) online.closest("label").hidden=!enabled;
    if(!enabled && online.checked && later) later.checked=true;
  }

  function renderSession() {
    const badge = document.querySelector("#commerce-session");
    if (!badge) return;
    badge.hidden = !tableSession;
    badge.textContent = tableSession ? `${t("table")} · ${tableSession.table?.name || tableSession.table?.code || ""}` : "";
    renderPaymentMethods();
    const demo=isDemo();
    const notice=document.querySelector('#commerce-demo-status');
    if(notice){notice.hidden=!demo;notice.textContent=demo?(demoOrderSaved?window.RomanoCustomerEntry.t("saved"):h("demo")):"";}
    const pay=document.querySelector('.commerce-pay-method');
    if(pay)pay.hidden=demo;
    const notes=document.querySelector('.commerce-note');
    if(notes)notes.hidden=false;
    document.querySelector("#hp-note-local").hidden=!demo;
    if(demo)badge.hidden=true;
    const message=document.querySelector('#commerce-message');
    if(message && !demo && !tableSession && count()>0 && !message.textContent)message.textContent=t('scan');
    if(message && (demo||tableSession) && message.textContent===t('scan'))message.textContent='';
  }
  function renderStatus() {
    const host = document.querySelector("#commerce-order-status");
    if (!host) return;
    host.hidden = !activeOrder;
    if (!activeOrder) return;
    const canRetryPayment = activeOrder.paymentStatus === "failed" && activeOrder.paymentMethod === "online";
    host.innerHTML = `<small>${safe(t("order"))} #${safe(activeOrder.orderNumber)}</small><strong>${safe(t(activeOrder.status) || activeOrder.status)}</strong><span>${safe(orderMoney(activeOrder))}</span>${canRetryPayment ? `<button type="button" class="commerce-payment-retry" data-commerce-payment-retry>${safe(t("retry"))}</button>` : ""}`;
    host.querySelector("[data-commerce-payment-retry]")?.addEventListener("click", () => startPayment(activeOrder.id));
    document.querySelector("#commerce-checkout").hidden = count() === 0;
  }

  function enhanceProducts() {
    document.querySelectorAll(".product-card[data-product-id]").forEach((card) => {
      if (card.querySelector(".commerce-card-add")) return;
      const item = product(card.dataset.productId);
      if (!item || item.price <= 0) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "commerce-card-add";
      button.textContent = `+ ${t("add")}`;
      button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); add(card.dataset.productId); });
      const details = card.querySelector(".product-card-button");
      const body = card.querySelector(".product-body");
      if (details && body) {
        const actions = document.createElement("div");
        actions.className = "commerce-card-actions";
        const restoreDetailsFocus = document.activeElement === details;
        details.before(actions);
        actions.append(details, button);
        // Moving a focused node between parents can reset focus in Chromium.
        if (restoreDetailsFocus && !details.closest("[inert]")) details.focus({preventScroll:true});
      } else {
        body?.append(button);
      }
    });
    const modalContent = document.querySelector(".product-modal .modal-content");
    let modalAdd = modalContent?.querySelector(".commerce-modal-add");
    if (modalContent && !modalAdd) {
      modalAdd = document.createElement("button");
      modalAdd.type = "button";
      modalAdd.className = "commerce-modal-add";
      const actions=modalContent.querySelector('.rv4-modal-actions');
      if(actions)actions.before(modalAdd);else modalContent.append(modalAdd);
      modalAdd.addEventListener("click", () => { if (window.RomanoActiveProduct?.id) add(window.RomanoActiveProduct.id); });
    }
    if(modalAdd)renderModalQuantity();
  }
  function renderModalQuantity(){
    const addButton=document.querySelector(".commerce-modal-add"),id=window.RomanoActiveProduct?.id;
    if(!addButton)return;
    addButton.textContent="+ "+t("add");
    let control=document.querySelector(".modal-cart-quantity");
    if(!control){
      control=document.createElement("div");control.className="modal-cart-quantity";control.hidden=true;
      const minus=document.createElement("button"),value=document.createElement("b"),plus=document.createElement("button");
      minus.type=plus.type="button";minus.textContent="−";plus.textContent="+";
      minus.onclick=()=>{const current=window.RomanoActiveProduct?.id;if(current)change(current,-1);};
      plus.onclick=()=>{const current=window.RomanoActiveProduct?.id;if(current)add(current);};
      control.append(minus,value,plus);addButton.after(control);
    }
    const amount=id?cart[id]||0:0, item=id?product(id):null;
    addButton.hidden=amount>0;addButton.disabled=!item||submitting;
    control.hidden=!amount;control.querySelector("b").textContent=new Intl.NumberFormat(lang()).format(amount);
    const [minus,plus]=control.querySelectorAll("button");minus.setAttribute("aria-label",panelText().less);plus.setAttribute("aria-label",panelText().more);
    minus.disabled=submitting;plus.disabled=submitting||amount>=99;
  }

  async function openQrSession() {
    const params = new URLSearchParams(location.search);
    const qrToken = params.get("qr");
    if (!qrToken || window.RomanoCustomerEntry?.isDemoQr() || standalone) return;
    if(window.RomanoConnectLive)window.RomanoConnectLive.clearBinding();
    else try{sessionStorage.removeItem("romano_connect_binding_v1");}catch{}
    const liveAssets=connectAssets.loadLive().catch(()=>null);
    document.dispatchEvent(new CustomEvent("romano:connect-session-changed"));
    try {
      const response = await fetch("/api/v1/orders/session", {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ qrToken }), signal: AbortSignal.timeout(10000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) throw new Error("QR_SESSION_FAILED");
      const {connectBinding,...tableData}=body.data;
      await liveAssets;
      window.RomanoConnectLive?.setBinding(connectBinding);
      tableSession = tableData;
      save(`online_menu_table_vq3:${tenant()}`, tableSession);
      document.dispatchEvent(new CustomEvent("romano:connect-session-changed"));
      params.delete("qr");
      history.replaceState(history.state, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
      render();
    } catch {
      tableSession = null;
      save(`online_menu_table_vq3:${tenant()}`, null);
      showMessage(t("sessionError"));
    }
  }

  function newIdempotency(prefix) {
    const uuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}:${uuid}`;
  }
  function persistentIdempotency(storageKey, prefix, fingerprint) {
    const existing = read(storageKey, null);
    if (existing?.fingerprint === fingerprint && typeof existing.key === "string") return existing.key;
    const key = newIdempotency(prefix);
    save(storageKey, { key, fingerprint, createdAt:Date.now() });
    return key;
  }
  function showMessage(message) {
    const element = document.querySelector("#commerce-message");
    if (element) element.textContent = message;
    announce(message);
  }

  async function submitOrder() {
    if (submitting || !count()) return;
    if (isDemo()) {
      const entry=window.RomanoCustomerEntry;
      if(!entry.current()){
        closeDrawer();
        if(!entry.open(false,openDrawer))openDrawer();
        return;
      }
      submitting=true;render();showMessage('');
      try {
        const members=window.RomanoDemoMembers, memberId=entry.current()?.id;
        if(guestContext().code)await connectAssets.loadEngine().catch(()=>{});
        if(!isDemo()||!memberId||entry.current()?.id!==memberId)throw Error("ORDER_CONTEXT_CHANGED");
        const order=await members.mutate(()=>{
          if(!isDemo()||entry.current()?.id!==memberId)throw Error("ORDER_CONTEXT_CHANGED");
          cart=normalizeCart(read(cartKey(),cart));
          const items=visibleCartEntries().map(([id,quantity])=>({productId:id,name:localized(product(id)).name,quantity,price:product(id).price}));
          if(!items.length)return null;
          const saved=members.addOrder(localStorage,sessionStorage,items,total()-discount(),restaurantConfig.currency,orderNotes.trim(),appliedCoupon);
          cart=normalizeCart({});save(cartKey(),cart);lastRemoved=null;orderNotes="";zeroItems.clear();appliedCoupon=couponCode="";document.querySelector("#hp-code").value="";document.querySelector("#commerce-notes").value="";
          return saved;
        });
        if(order){
          demoOrderSaved=true;
          announce(entry.t("saved"));
          if(document.querySelector("#commerce-drawer.is-open"))document.querySelector("#commerce-title")?.focus({preventScroll:true});
          // Update an existing chat's verified order context without affecting the saved order.
          try{const engine=window.RomanoConnectDemo;if(engine&&order.connectVisitId){const s=engine.sessionForCurrent();if(s.visitId===order.connectVisitId)await engine.get(s);}}catch{/* later chat refresh reconciles */}
          document.dispatchEvent(new CustomEvent("romano:demo-membership-changed"));
        }
      } catch {showMessage(entry.t("orderError"));}
      finally{submitting=false;render();}
      return;
    }
    if (!tableSession) { showMessage(t("scan")); return; }
    if (typeof menuDataMode === "undefined" || menuDataMode !== "public") { showMessage(t("submitError")); return; }
    submitting = true; render(); showMessage("");
    const payment = document.querySelector('input[name="commerce-payment"]:checked')?.value || "later";
    try {
      const draft = {
        language: lang(),
        notes: document.querySelector("#commerce-notes")?.value.trim() || null,
        items: visibleCartEntries().sort(([left], [right]) => left.localeCompare(right)).map(([productId, quantity]) => ({ productId, quantity, modifiers: [] })),
      };
      const fingerprint = JSON.stringify({ sessionId:tableSession.sessionId, ...draft });
      const payload = { ...draft, idempotencyKey:persistentIdempotency(orderRequestKey(), "order", fingerprint) };
      const response = await fetch("/api/v1/orders/submit", {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data?.id) throw new Error(body?.error?.code || "ORDER_FAILED");
      activeOrder = body.data;
      save(orderKey(), activeOrder);
      remove(orderRequestKey());
      cart = normalizeCart({}); save(cartKey(), cart);lastRemoved=null;zeroItems.clear();orderNotes="";document.querySelector("#commerce-notes").value="";
      render(); startPolling();
      if (payment === "online") await startPayment(activeOrder.id);
    } catch (error) {
      if (String(error?.message).includes("TABLE_SESSION")) {
        tableSession = null; save(`online_menu_table_vq3:${tenant()}`, null);
      }
      showMessage(t("submitError"));
    } finally { submitting = false; render(); }
  }

  function paymentRedirect(value) {
    if (typeof value !== "string" || !value) return null;
    try {
      const url = new URL(value);
      const allowed = ["https://payment.zarinpal.com", "https://sandbox.zarinpal.com"];
      if (!allowed.includes(url.origin) || url.username || url.password || url.search || url.hash || !/^\/pg\/StartPay\/[A-Za-z0-9_-]+$/.test(url.pathname)) return null;
      return url.href;
    } catch { return null; }
  }

  async function startPayment(orderId) {
    if (paymentPending) return;
    paymentPending = true;
    const storageKey = paymentRequestKey(orderId);
    try {
      const response = await fetch("/api/v1/payments/start", {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ orderId, idempotencyKey:persistentIdempotency(storageKey, "payment", orderId) }), signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data?.redirectUrl) throw new Error(body?.error?.code || "PAYMENT_FAILED");
      const redirect = paymentRedirect(body.data.redirectUrl);
      if (!redirect) throw new Error("INVALID_PAYMENT_REDIRECT");
      location.assign(redirect);
    } catch (error) {
      if (["PAYMENT_ATTEMPT_FINALIZED", "PAYMENT_PROVIDER_REJECTED", "ORDER_ALREADY_PAID"].includes(String(error?.message))) remove(storageKey);
      showMessage(t("paymentError"));
    } finally { paymentPending = false; }
  }

  async function pollOrder() {
    const id=activeOrder?.id;
    if (!id || polling || document.hidden) return;
    polling = true;
    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(id)}`, { credentials: "include", headers: { accept: "application/json" }, signal:AbortSignal.timeout(7000) });
      const body = await response.json().catch(() => null);
      if (activeOrder?.id!==id) return;
      if (response.ok && body?.data?.id===id) { activeOrder = body.data; save(orderKey(), activeOrder); render(); }
      if (["completed", "rejected", "cancelled"].includes(activeOrder.status)) stopPolling();
    } catch { /* Keep the last known status while offline. */ }
    finally { polling = false; }
  }
  function startPolling() { stopPolling(); pollOrder(); pollTimer = window.setInterval(pollOrder, 8000); }
  function stopPolling() { if (pollTimer) window.clearInterval(pollTimer); pollTimer = 0; }

  async function paymentReturn() {
    const params = new URLSearchParams(location.search);
    if (!params.has("payment")) return;
    const returnedOrderId = params.get("order");
    // Callback query parameters are untrusted hints, never proof of a payment.
    params.delete("payment"); params.delete("ref"); params.delete("order");
    history.replaceState(history.state, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
    let result="paymentUnverified";
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if(returnedOrderId && uuid.test(returnedOrderId) && activeOrder?.id===returnedOrderId){
      try{
        const response=await fetch(`/api/v1/orders/${encodeURIComponent(returnedOrderId)}`,{credentials:"include",cache:"no-store",headers:{accept:"application/json"},signal:AbortSignal.timeout(8000)});
        if(response.ok && (response.headers.get("content-type")||"").includes("application/json")){
          const body=await response.json();
          const verified=body?.data;
          if(verified?.id===returnedOrderId && activeOrder?.id===returnedOrderId){
            if(verified.paymentStatus==="paid")result="paid";
            else if(verified.paymentStatus==="failed")result="failed";
            if(result!=="paymentUnverified"){
              activeOrder=verified;save(orderKey(),activeOrder);remove(paymentRequestKey(returnedOrderId));render();
            }
          }
        }
      }catch{/* Offline or unauthorized: the result remains unverified. */}
    }
    const toast = document.querySelector("#commerce-payment-toast");
    if(!toast)return;
    toast.textContent=t(result);toast.hidden=false;
    window.setTimeout(()=>{toast.hidden=true;},7000);
  }

  function init() {
    buildShell(); initializeCustomerNavigation(); render(); enhanceProducts();renderHeroRating();
    if (!standalone) {
      openQrSession(); paymentReturn();
      if (activeOrder?.id && !["completed", "rejected", "cancelled"].includes(activeOrder.status)) startPolling();
    }
    // Enhance synchronously at the actual render boundary, not on a delayed click.
    // This keeps the cart actions present after filtering/refresh and avoids moving
    // the opener after the product dialog has already restored keyboard focus.
    document.addEventListener("visibilitychange", () => { if (!document.hidden && pollTimer) pollOrder(); });
    document.addEventListener("romano:catalog-rendered", enhanceProducts);
    document.addEventListener("romano:product-opened", enhanceProducts);
    window.addEventListener("romano:data-updated", () => { reconcileCart(); enhanceProducts(); render();renderHeroRating(); });
    document.addEventListener("romano:demo-membership-changed",render);
    document.addEventListener("romano:customer-auth-changed",render);
    document.addEventListener("romano:language-changed",renderHeroRating);
    window.addEventListener("storage", event => {
      if(event.key===null||event.key===window.RomanoDemoReview.key(tenant()))renderHeroRating();
      const service=document.querySelector(".hp-services[data-request-key]");
      if(service && (event.key===null||event.key===service.dataset.requestKey))service.dispatchEvent(new Event("hp-request-updated"));
      if(event.key===window.RomanoDemoMembers?.settingsKey){render();return;}
      if (event.key !== null && event.key !== cartKey()) return;
      cart = normalizeCart(read(cartKey(), {}));
      for(const id of zeroItems)if(cart[id])zeroItems.delete(id);
      lastRemoved=null;
      reconcileCart(); render();
    });
    document.addEventListener("romano:language-changed", () => window.setTimeout(() => { document.getElementById("r17-cart-feedback")?.remove(); clearTimeout(feedbackTimer); if (document.querySelector("#commerce-drawer")?.classList.contains("is-open")) closeDrawer(); document.querySelector("#commerce-cart-bar")?.remove(); document.querySelector("#commerce-drawer")?.remove(); document.querySelector(".commerce-backdrop")?.remove(); document.querySelector("#commerce-session")?.remove(); document.querySelector("#commerce-live")?.remove(); document.querySelector("#commerce-payment-toast")?.remove(); buildShell(); updateCustomerNavigation(); enhanceProducts(); render(); }, 0));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.RomanoCommerce = Object.freeze({ add, open: openDrawer });
})();
