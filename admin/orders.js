/* Online-Menu-vq.3 live orders, KDS and branch payment settings. */
(() => {
  "use strict";
  let orders = [];
  let branches = [];
  let filter = "active";
  let timer = 0;
  const t = (key) => window.ROMANO_ADMIN_I18N?.get(key) || key;
  const locale = () => window.ROMANO_ADMIN_I18N?.language || "fa";
  const number = (value) => Number(value || 0).toLocaleString(locale() === "fa" ? "fa-IR" : locale());
  const terminal = new Set(["completed", "rejected", "cancelled"]);
  const labels = {
    submitted:"جدید", accepted:"پذیرفته شد", preparing:"در حال آماده‌سازی", ready:"آماده", served:"سرو شد", delivered:"تحویل شد", completed:"تکمیل", rejected:"رد شده", cancelled:"لغو شده"
  };
  const next = {
    submitted:["accepted","پذیرش سفارش"], accepted:["preparing","شروع آماده‌سازی"], preparing:["ready","اعلام آماده"], ready:["served","ثبت سرو"], served:["completed","تکمیل سفارش"], delivered:["completed","تکمیل سفارش"]
  };
  const safe = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const money = (minor, order = {}) => window.OnlineMenuMoney?.formatMinor
    ? window.OnlineMenuMoney.formatMinor(minor, {
        currency:order.currencyCode || "IRR",
        exponent:order.currencyExponent ?? 0,
        language:locale(),
      })
    : `${Math.round(Number(minor || 0) / 10).toLocaleString("fa-IR")} تومان`;
  const time = (value) => new Intl.DateTimeFormat(locale() === "fa" ? "fa-IR" : locale(), { hour:"2-digit", minute:"2-digit" }).format(new Date(value));

  function selectedOrders() {
    if (filter === "all") return orders;
    if (filter === "active") return orders.filter((order) => !terminal.has(order.status));
    if (filter === "preparing") return orders.filter((order) => ["accepted","preparing"].includes(order.status));
    return orders.filter((order) => order.status === filter);
  }

  function render() {
    const board = document.querySelector("#orders-board");
    if (!board) return;
    const active = orders.filter((order) => !terminal.has(order.status));
    const counts = { submitted:0, preparing:0, ready:0 };
    active.forEach((order) => { if (order.status === "submitted") counts.submitted++; if (["accepted","preparing"].includes(order.status)) counts.preparing++; if (order.status === "ready") counts.ready++; });
    document.querySelector("#orders-summary").innerHTML = `<span>${number(active.length)} ${safe(t("سفارش فعال"))}</span><span>${number(counts.submitted)} ${safe(t("جدید"))}</span><span>${number(counts.preparing)} ${safe(t("در آشپزخانه"))}</span><span>${number(counts.ready)} ${safe(t("آماده"))}</span>`;
    const badge = document.querySelector("#orders-nav-badge");
    badge.hidden = counts.submitted === 0;
    badge.textContent = String(counts.submitted);
    const rows = selectedOrders();
    if (!rows.length) { board.innerHTML = `<div class="orders-empty">${safe(t("سفارشی در این وضعیت وجود ندارد."))}</div>`; return; }
    board.innerHTML = rows.map((order) => {
      const action = next[order.status];
      const items = (order.items || []).map((item) => `<div class="order-ticket-item"><span><b>${number(item.quantity)}×</b> ${safe(item.name)}</span><span>${safe(money(item.lineTotalMinor, order))}</span></div>`).join("");
      return `<article class="order-ticket" data-status="${safe(order.status)}">
        <header class="order-ticket-head"><div><small>${safe(order.branchName || t("شعبه"))} · ${safe(order.tableName || "")}</small><h2>#${safe(order.orderNumber)}</h2></div><span class="order-status">${safe(t(labels[order.status] || order.status))}</span></header>
        <div class="order-ticket-items">${items}</div>
        ${order.notes ? `<p class="order-ticket-note">${safe(order.notes)}</p>` : ""}
        <span class="order-ticket-meta">${safe(time(order.submittedAt))} · ${t(order.paymentStatus === "paid" ? "پرداخت آنلاین ✓" : "پرداخت‌نشده")}</span>
        <footer class="order-ticket-footer"><strong>${safe(money(order.totalMinor, order))}</strong>${action ? `<button class="order-next" type="button" data-order-id="${safe(order.id)}" data-version="${safe(order.version)}" data-next="${safe(action[0])}">${safe(t(action[1]))}</button>` : ""}</footer>
      </article>`;
    }).join("");
    board.querySelectorAll(".order-next").forEach((button) => button.addEventListener("click", () => transition(button)));
  }

  async function refresh(silent = false) {
    if (!window.RomanoAPI?.enabled) {
      if (!silent) document.querySelector("#orders-board").innerHTML = `<div class="orders-empty">${safe(t("برای مشاهده سفارش‌های زنده، پنل را به سرویس سرور متصل کنید."))}</div>`;
      return;
    }
    try {
      const data = await window.RomanoAPI.orders();
      orders = Array.isArray(data?.orders) ? data.orders : [];
      render();
    } catch (error) {
      if (!silent) document.querySelector("#orders-board").innerHTML = `<div class="orders-empty">${safe(t("دریافت سفارش‌ها ناموفق بود."))}</div>`;
    }
  }

  async function transition(button) {
    button.disabled = true;
    try {
      await window.RomanoAPI.transitionOrder(button.dataset.orderId, Number(button.dataset.version), button.dataset.next);
      await refresh();
    } catch (error) {
      button.disabled = false;
      window.alert(t("تغییر وضعیت انجام نشد."));
    }
  }

  async function loadBranches() {
    if (!window.RomanoAPI?.enabled) return;
    try {
      const data = await window.RomanoAPI.branches();
      branches = Array.isArray(data?.branches) ? data.branches : [];
      const select = document.querySelector("#gateway-branch");
      select.innerHTML = branches.map((branch) => `<option value="${safe(branch.id)}">${safe(branch.name)}</option>`).join("");
      syncGateway();
    } catch { /* Settings remain unavailable until the server is connected. */ }
  }

  function syncGateway() {
    const id = document.querySelector("#gateway-branch")?.value;
    const branch = branches.find((item) => item.id === id);
    if (!branch) return;
    document.querySelector("#gateway-merchant-id").value = "";
    document.querySelector("#gateway-merchant-id").placeholder = branch.gateway?.merchantMasked || "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
    document.querySelector("#gateway-sandbox").checked = branch.gateway?.sandbox !== false;
    document.querySelector("#gateway-active").checked = branch.gateway?.active === true;
  }

  async function saveGateway(event) {
    event.preventDefault();
    const message = document.querySelector("#gateway-message");
    const branchId = document.querySelector("#gateway-branch").value;
    const merchantId = document.querySelector("#gateway-merchant-id").value.trim();
    if (!branchId || !merchantId) { message.textContent = t("برای تغییر تنظیمات، Merchant ID کامل را وارد کنید."); return; }
    try {
      await window.RomanoAPI.saveGateway(branchId, {
        provider:"zarinpal", merchantId,
        sandbox:document.querySelector("#gateway-sandbox").checked,
        active:document.querySelector("#gateway-active").checked,
      });
      message.textContent = t("تنظیمات درگاه با موفقیت ذخیره شد.");
      await loadBranches();
    } catch (error) { message.textContent = t("ذخیره تنظیمات ناموفق بود."); }
  }

  function init() {
    document.querySelector("#orders-refresh")?.addEventListener("click", () => refresh());
    document.querySelector('[data-page="orders"]')?.addEventListener("click", () => refresh());
    document.querySelectorAll("[data-order-filter]").forEach((button) => button.addEventListener("click", () => {
      filter = button.dataset.orderFilter;
      document.querySelectorAll("[data-order-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    }));
    document.addEventListener("romano:language-changed", () => { render(); });
    document.querySelector("#gateway-branch")?.addEventListener("change", syncGateway);
    document.querySelector("#gateway-settings-form")?.addEventListener("submit", saveGateway);
    window.setTimeout(() => { refresh(true); loadBranches(); }, 900);
    timer = window.setInterval(() => { if (document.querySelector("#page-orders")?.classList.contains("is-active")) refresh(true); }, 10_000);
    window.addEventListener("beforeunload", () => window.clearInterval(timer));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
