/* Online-Menu-vq.3 customer commerce: cart, QR session, ordering and tracking. */
(() => {
  "use strict";

  const text = {
    fa: { add:"افزودن", cart:"سبد سفارش", empty:"هنوز چیزی انتخاب نکرده‌اید.", total:"جمع سفارش", checkout:"ثبت سفارش", scan:"برای ثبت سفارش، QR روی میز را اسکن کنید.", note:"توضیحات سفارش", noteHint:"مثلاً بدون پیاز یا سس جدا", later:"پرداخت در رستوران", online:"پرداخت آنلاین", close:"بستن", remove:"حذف", table:"میز", sending:"در حال ثبت…", tracking:"پیگیری سفارش", order:"سفارش", retry:"تلاش دوباره", sessionError:"QR میز معتبر نیست یا منقضی شده است.", submitError:"ثبت سفارش انجام نشد. دوباره تلاش کنید.", paymentError:"سفارش ثبت شد، اما اتصال به درگاه ممکن نشد.", submitted:"ثبت شده", accepted:"تأیید شد", preparing:"در حال آماده‌سازی", ready:"آماده تحویل", served:"سرو شد", delivered:"تحویل شد", completed:"تکمیل شد", rejected:"رد شد", cancelled:"لغو شد", paid:"پرداخت موفق", failed:"پرداخت ناموفق", cancelledPay:"پرداخت لغو شد", view:"مشاهده سفارش" },
    en: { add:"Add", cart:"Your order", empty:"Your cart is empty.", total:"Order total", checkout:"Place order", scan:"Scan the QR code on your table to order.", note:"Order notes", noteHint:"For example, sauce on the side", later:"Pay at restaurant", online:"Pay online", close:"Close", remove:"Remove", table:"Table", sending:"Placing order…", tracking:"Track order", order:"Order", retry:"Try again", sessionError:"This table QR code is invalid or expired.", submitError:"We could not place the order. Please try again.", paymentError:"Order placed, but the payment gateway could not be opened.", submitted:"Submitted", accepted:"Accepted", preparing:"Preparing", ready:"Ready", served:"Served", delivered:"Delivered", completed:"Completed", rejected:"Rejected", cancelled:"Cancelled", paid:"Payment successful", failed:"Payment failed", cancelledPay:"Payment cancelled", view:"View order" },
    tr: { add:"Ekle", cart:"Siparişiniz", empty:"Sepetiniz boş.", total:"Toplam", checkout:"Siparişi ver", scan:"Sipariş vermek için masadaki QR kodunu tarayın.", note:"Sipariş notu", noteHint:"Örneğin sos ayrı", later:"Restoranda öde", online:"Online öde", close:"Kapat", remove:"Sil", table:"Masa", sending:"Gönderiliyor…", tracking:"Siparişi takip et", order:"Sipariş", retry:"Tekrar dene", sessionError:"Masa QR kodu geçersiz veya süresi dolmuş.", submitError:"Sipariş verilemedi. Tekrar deneyin.", paymentError:"Sipariş alındı ancak ödeme sayfası açılamadı.", submitted:"Gönderildi", accepted:"Onaylandı", preparing:"Hazırlanıyor", ready:"Hazır", served:"Servis edildi", delivered:"Teslim edildi", completed:"Tamamlandı", rejected:"Reddedildi", cancelled:"İptal edildi", paid:"Ödeme başarılı", failed:"Ödeme başarısız", cancelledPay:"Ödeme iptal edildi", view:"Siparişi gör" },
    ar: { add:"أضف", cart:"طلبك", empty:"السلة فارغة.", total:"المجموع", checkout:"إرسال الطلب", scan:"امسح رمز QR الموجود على الطاولة للطلب.", note:"ملاحظات الطلب", noteHint:"مثلاً الصلصة منفصلة", later:"الدفع في المطعم", online:"الدفع عبر الإنترنت", close:"إغلاق", remove:"حذف", table:"طاولة", sending:"جارٍ الإرسال…", tracking:"تتبع الطلب", order:"طلب", retry:"حاول مجدداً", sessionError:"رمز الطاولة غير صالح أو منتهي.", submitError:"تعذر إرسال الطلب. حاول مرة أخرى.", paymentError:"تم إرسال الطلب، لكن تعذر فتح بوابة الدفع.", submitted:"تم الإرسال", accepted:"تم القبول", preparing:"قيد التحضير", ready:"جاهز", served:"تم التقديم", delivered:"تم التسليم", completed:"مكتمل", rejected:"مرفوض", cancelled:"ملغي", paid:"تم الدفع بنجاح", failed:"فشل الدفع", cancelledPay:"تم إلغاء الدفع", view:"عرض الطلب" }
  };

  const lang = () => window.ROMANO_I18N?.language || "fa";
  const t = (key) => text[lang()]?.[key] || text.fa[key] || key;
  const tenant = () => typeof restaurantSlug === "string" ? restaurantSlug : "romano";
  const cartKey = () => `online_menu_cart_vq3:${tenant()}`;
  const orderKey = () => `online_menu_last_order_vq3:${tenant()}`;
  const orderRequestKey = () => `online_menu_order_request_vq3:${tenant()}`;
  const paymentRequestKey = (orderId) => `online_menu_payment_request_vq3:${tenant()}:${orderId}`;
  let cart = read(cartKey(), {});
  let tableSession = read(`online_menu_table_vq3:${tenant()}`, null);
  let activeOrder = read(orderKey(), null);
  let pollTimer = 0;
  let submitting = false;

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
  function product(id) {
    return (typeof menuProducts !== "undefined" ? menuProducts : []).find((item) => item.id === id && item.active !== false);
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
  function count() { return Object.values(cart).reduce((sum, quantity) => sum + Number(quantity || 0), 0); }
  function total() { return Object.entries(cart).reduce((sum, [id, quantity]) => sum + (product(id)?.price || 0) * quantity, 0); }
  function announce(message) {
    const live = document.querySelector("#commerce-live");
    if (live) live.textContent = message;
  }

  const navTranslations={
    fa:{home:"خانه",menu:"منو",featured:"ویژه‌ها",contact:"ارتباط",cart:"سبد"},
    en:{home:"Home",menu:"Menu",featured:"Featured",contact:"Contact",cart:"Cart"},
    tr:{home:"Ana Sayfa",menu:"Menü",featured:"Öne çıkanlar",contact:"İletişim",cart:"Sepet"},
    ar:{home:"الرئيسية",menu:"القائمة",featured:"المميز",contact:"اتصل بنا",cart:"السلة"}
  };
  function updateCustomerNavigation() {
    const words=navTranslations[lang()] || navTranslations.fa;
    document.querySelectorAll("[data-ramen-label]").forEach(el=>{
      const value=words[el.dataset.ramenLabel];
      if(value) el.textContent=value;
    });
    const amount=count();
    for(const selector of [".ramen-header-cart-count",".ramen-bottom-cart-count"]){
      const badge=document.querySelector(selector);
      if(!badge) continue;
      badge.textContent=amount>99?"99+":String(amount);
      badge.hidden=amount===0;
    }
    const accessible=amount ? `${t("cart")}، ${amount}` : t("cart");
    for(const id of ["ramen-header-cart","ramen-bottom-cart"]){
      const button=document.getElementById(id);
      if(button) button.setAttribute("aria-label",accessible);
    }
  }
  function initializeCustomerNavigation(){
    for(const id of ["ramen-header-cart","ramen-bottom-cart"]){
      document.getElementById(id)?.addEventListener("click",openDrawer);
    }
    document.querySelectorAll(".ramen-bottom-link[href]").forEach(link=>{
      link.addEventListener("click",()=>{
        document.querySelectorAll(".ramen-bottom-link[href]").forEach(item=>{
          const active=item===link;
          item.classList.toggle("is-current",active);
          if(active)item.setAttribute("aria-current","page");
          else item.removeAttribute("aria-current");
        });
      });
    });
    updateCustomerNavigation();
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
          <div><small>ONLINE-MENU · vq.3</small><h2 id="commerce-title">${safe(t("cart"))}</h2></div>
          <button class="commerce-close" type="button" data-commerce-close aria-label="${safe(t("close"))}">×</button>
        </header>
        <div class="commerce-order-status" id="commerce-order-status" hidden></div>
        <div class="commerce-items" id="commerce-items"></div>
        <div class="commerce-checkout" id="commerce-checkout">
          <label class="commerce-note"><span>${safe(t("note"))}</span><textarea id="commerce-notes" maxlength="1000" rows="2" placeholder="${safe(t("noteHint"))}"></textarea></label>
          <fieldset class="commerce-pay-method"><legend>${safe(t("total"))}</legend>
            <label><input type="radio" name="commerce-payment" value="later" checked> <span>${safe(t("later"))}</span></label>
            <label hidden><input type="radio" name="commerce-payment" value="online" disabled> <span>${safe(t("online"))}</span></label>
          </fieldset>
          <div class="commerce-total-row"><span>${safe(t("total"))}</span><strong id="commerce-total"></strong></div>
          <p class="commerce-message" id="commerce-message" role="alert"></p>
          <button class="commerce-submit" id="commerce-submit" type="button">${safe(t("checkout"))}</button>
        </div>
      </section>
      <div class="sr-only" id="commerce-live" aria-live="polite"></div>
      <div class="commerce-payment-toast" id="commerce-payment-toast" role="status" hidden></div>`);
    document.querySelector("#commerce-cart-bar").addEventListener("click", openDrawer);
    document.querySelectorAll("[data-commerce-close]").forEach((button) => button.addEventListener("click", closeDrawer));
    document.querySelector("#commerce-submit").addEventListener("click", submitOrder);
    document.addEventListener("keydown", (event) => {
      const drawer=document.querySelector("#commerce-drawer");
      if(!drawer?.classList.contains("is-open")) return;
      if(event.key==="Escape"){event.preventDefault();closeDrawer();return;}
      if(event.key!=="Tab") return;
      const focusables=Array.from(drawer.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'))
        .filter(element=>!element.closest("[hidden],[inert]") && element.getClientRects().length>0);
      if(!focusables.length){event.preventDefault();drawer.focus();return;}
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey && (document.activeElement===first || !drawer.contains(document.activeElement))){
        event.preventDefault();last.focus();
      }else if(!event.shiftKey && (document.activeElement===last || !drawer.contains(document.activeElement))){
        event.preventDefault();first.focus();
      }
    });
  }

  let cartFocusOrigin = null;
  function openDrawer() {
    const drawer = document.querySelector("#commerce-drawer");
    const backdrop = document.querySelector(".commerce-backdrop");
    if (!drawer || drawer.classList.contains("is-open")) return;
    cartFocusOrigin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    render();
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    drawer.classList.add("is-open");
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("is-open"));
    document.body.classList.add("commerce-open");
    document.querySelector("#commerce-cart-bar").setAttribute("aria-expanded", "true");
    for(const id of ["ramen-header-cart","ramen-bottom-cart"])document.getElementById(id)?.setAttribute("aria-expanded","true");
    drawer.querySelector(".commerce-close")?.focus();
  }
  function closeDrawer() {
    const drawer = document.querySelector("#commerce-drawer");
    if (!drawer?.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    drawer.inert = true;
    drawer.setAttribute("aria-hidden", "true");
    const backdrop = document.querySelector(".commerce-backdrop");
    backdrop?.classList.remove("is-open");
    window.setTimeout(() => { if (backdrop) backdrop.hidden = true; }, 220);
    document.body.classList.remove("commerce-open");
    document.querySelector("#commerce-cart-bar").setAttribute("aria-expanded", "false");
    for(const id of ["ramen-header-cart","ramen-bottom-cart"])document.getElementById(id)?.setAttribute("aria-expanded","false");
    if(cartFocusOrigin?.isConnected && !cartFocusOrigin.closest("[inert]")) cartFocusOrigin.focus();
    cartFocusOrigin=null;
  }

  function add(id) {
    if (!product(id)) return;
    cart[id] = Math.min(99, Number(cart[id] || 0) + 1);
    save(cartKey(), cart);
    render();
    announce(`${localized(product(id)).name}: ${t("add")}`);
  }
  function change(id, delta) {
    const next = Number(cart[id] || 0) + delta;
    if (next <= 0) delete cart[id]; else cart[id] = Math.min(99, next);
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
    document.querySelector("#commerce-total").textContent = money(total());
    const host = document.querySelector("#commerce-items");
    const rows = Object.entries(cart).map(([id, quantity]) => {
      const item = product(id);
      if (!item) return "";
      const view = localized(item);
      return `<article class="commerce-item">
        ${item.image ? `<img src="${safe(item.image)}" alt="">` : ""}
        <div><h3>${safe(view.name)}</h3><span>${safe(money(item.price * quantity))}</span>
          <div class="commerce-quantity" aria-label="${safe(view.name)}"><button type="button" data-cart-change="-1" data-product-id="${safe(id)}">−</button><b>${quantity}</b><button type="button" data-cart-change="1" data-product-id="${safe(id)}">+</button></div>
        </div>
        <button class="commerce-remove" type="button" data-cart-remove data-product-id="${safe(id)}">${safe(t("remove"))}</button>
      </article>`;
    }).join("");
    host.innerHTML = rows || `<p class="commerce-empty">${safe(t("empty"))}</p>`;
    host.querySelectorAll("[data-cart-change]").forEach((button) => button.addEventListener("click", () => change(button.dataset.productId, Number(button.dataset.cartChange))));
    host.querySelectorAll("[data-cart-remove]").forEach((button) => button.addEventListener("click", () => { delete cart[button.dataset.productId]; save(cartKey(), cart); render(); }));
    const submit = document.querySelector("#commerce-submit");
    submit.disabled = amount === 0 || submitting;
    submit.textContent = submitting ? t("sending") : t("checkout");
    renderStatus();
    renderSession();
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
        details.before(actions);
        actions.append(details, button);
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
      modalContent.append(modalAdd);
      modalAdd.addEventListener("click", () => { if (window.RomanoActiveProduct?.id) add(window.RomanoActiveProduct.id); });
    }
    if (modalAdd) modalAdd.textContent = `+ ${t("add")}`;
  }

  async function openQrSession() {
    const params = new URLSearchParams(location.search);
    const qrToken = params.get("qr");
    if (!qrToken) return;
    try {
      const response = await fetch("/api/v1/orders/session", {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ qrToken }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) throw new Error("QR_SESSION_FAILED");
      tableSession = body.data;
      save(`online_menu_table_vq3:${tenant()}`, tableSession);
      params.delete("qr");
      history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
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
    if (!tableSession) { showMessage(t("scan")); return; }
    submitting = true; render(); showMessage("");
    const payment = document.querySelector('input[name="commerce-payment"]:checked')?.value || "later";
    try {
      const draft = {
        language: lang(),
        notes: document.querySelector("#commerce-notes")?.value.trim() || null,
        items: Object.entries(cart).sort(([left], [right]) => left.localeCompare(right)).map(([productId, quantity]) => ({ productId, quantity, modifiers: [] })),
      };
      const fingerprint = JSON.stringify({ sessionId:tableSession.sessionId, ...draft });
      const payload = { ...draft, idempotencyKey:persistentIdempotency(orderRequestKey(), "order", fingerprint) };
      const response = await fetch("/api/v1/orders/submit", {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data?.id) throw new Error(body?.error?.code || "ORDER_FAILED");
      activeOrder = body.data;
      save(orderKey(), activeOrder);
      remove(orderRequestKey());
      cart = {}; save(cartKey(), cart);
      render(); startPolling();
      if (payment === "online") await startPayment(activeOrder.id);
    } catch (error) {
      if (String(error?.message).includes("TABLE_SESSION")) {
        tableSession = null; save(`online_menu_table_vq3:${tenant()}`, null);
      }
      showMessage(t("submitError"));
    } finally { submitting = false; render(); }
  }

  async function startPayment(orderId) {
    const storageKey = paymentRequestKey(orderId);
    try {
      const response = await fetch("/api/v1/payments/start", {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ orderId, idempotencyKey:persistentIdempotency(storageKey, "payment", orderId) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data?.redirectUrl) throw new Error(body?.error?.code || "PAYMENT_FAILED");
      location.assign(body.data.redirectUrl);
    } catch (error) {
      if (["PAYMENT_ATTEMPT_FINALIZED", "PAYMENT_PROVIDER_REJECTED", "ORDER_ALREADY_PAID"].includes(String(error?.message))) remove(storageKey);
      showMessage(t("paymentError"));
    }
  }

  async function pollOrder() {
    if (!activeOrder?.id) return;
    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(activeOrder.id)}`, { credentials: "include", headers: { accept: "application/json" } });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.data) { activeOrder = body.data; save(orderKey(), activeOrder); render(); }
      if (["completed", "rejected", "cancelled"].includes(activeOrder.status)) stopPolling();
    } catch { /* Keep the last known status while offline. */ }
  }
  function startPolling() { stopPolling(); pollOrder(); pollTimer = window.setInterval(pollOrder, 8000); }
  function stopPolling() { if (pollTimer) window.clearInterval(pollTimer); pollTimer = 0; }

  function paymentReturn() {
    const params = new URLSearchParams(location.search);
    const state = params.get("payment");
    if (!state) return;
    const returnedOrderId = params.get("order");
    if (returnedOrderId) remove(paymentRequestKey(returnedOrderId));
    const toast = document.querySelector("#commerce-payment-toast");
    const copy = state === "success" ? t("paid") : state === "cancelled" ? t("cancelledPay") : t("failed");
    toast.textContent = params.get("ref") ? `${copy} · ${params.get("ref")}` : copy;
    toast.hidden = false;
    window.setTimeout(() => { toast.hidden = true; }, 7000);
    params.delete("payment"); params.delete("ref"); params.delete("order");
    history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
  }

  function init() {
    buildShell(); initializeCustomerNavigation(); render(); enhanceProducts(); openQrSession(); paymentReturn();
    if (activeOrder?.id && !["completed", "rejected", "cancelled"].includes(activeOrder.status)) startPolling();
    document.addEventListener("click", (event) => {
      if (event.target.closest(".product-card-button,[data-signature-product]")) window.setTimeout(enhanceProducts, 20);
    });
    window.addEventListener("romano:data-updated", () => { enhanceProducts(); render(); });
    document.addEventListener("romano:language-changed", () => window.setTimeout(() => { document.querySelector("#commerce-cart-bar")?.remove(); document.querySelector("#commerce-drawer")?.remove(); document.querySelector(".commerce-backdrop")?.remove(); document.querySelector("#commerce-session")?.remove(); document.querySelector("#commerce-live")?.remove(); document.querySelector("#commerce-payment-toast")?.remove(); buildShell(); updateCustomerNavigation(); enhanceProducts(); render(); }, 0));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.RomanoCommerce = Object.freeze({ add, open: openDrawer });
})();
