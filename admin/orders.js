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
      syncBranchManagement();
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


  function opsMessage(key) {
    const el=document.querySelector("#ops-message");
    if(el) el.textContent=key ? t(key) : "";
  }

  function syncBranchManagement() {
    const select=document.querySelector("#ops-branch");
    if(!select) return;
    const selected=select.value;
    select.innerHTML=branches.map((branch) => `<option value="${safe(branch.id)}">${safe(branch.name)}</option>`).join("");
    if(branches.some((item)=>item.id===selected)) select.value=selected;
    const branch=branches.find((item)=>item.id===select.value);
    const checkbox=document.querySelector("#ops-qr-enabled");
    checkbox.checked=branch?.qr_ordering_enabled===true;
    checkbox.disabled=!branch;
    document.querySelector("#ops-save-branch").disabled=!branch;
    document.querySelector("#create-table-form button[type=submit]").disabled=!branch;
    refreshTables();
  }

  function renderQrResult(parent, table, url) {
    document.querySelectorAll("#ops-tables .ops-qr-result").forEach(node => node.remove());
    if(typeof window.QRCode!=="function") throw new Error("QR_RENDERER_UNAVAILABLE");
    const container=document.createElement("div");
    container.className="ops-qr-result";
    const heading=document.createElement("h3");
    heading.textContent=`${t("QR میز")} · ${table.display_name}`;
    const note=document.createElement("p");
    note.textContent=t("برای دیدن منو و ثبت سفارش اسکن کنید.");
    const qr=document.createElement("div");
    qr.className="ops-qr-image";
    const input=document.createElement("input");
    input.type="url";input.dir="ltr";input.readOnly=true;input.value=url;
    input.setAttribute("aria-label",t("لینک سفارش میز"));
    const buttons=document.createElement("div");
    buttons.className="ops-qr-buttons";
    const copy=document.createElement("button");
    copy.type="button";copy.textContent=t("کپی لینک");
    copy.addEventListener("click",async()=>{
      try { await navigator.clipboard.writeText(url);opsMessage("لینک کپی شد."); }
      catch { input.focus();input.select();opsMessage("برای کپی، لینک را انتخاب کنید."); }
    });
    const print=document.createElement("button");
    print.type="button";print.textContent=t("چاپ QR");
    print.addEventListener("click",()=>window.print());
    buttons.append(copy,print);
    container.append(heading,note,qr,input,buttons);
    parent.append(container);
    try {
      new window.QRCode(qr,{
        text:url,width:240,height:240,
        colorDark:"#142B2A",colorLight:"#FFFFFF",
        correctLevel:window.QRCode.CorrectLevel.M
      });
    }catch(error){container.remove();throw error;}
  }

  async function refreshTables() {
    const select=document.querySelector("#ops-branch");
    const host=document.querySelector("#ops-tables");
    if(!host) return;
    const selected=select?.value || "";
    if(!selected) {host.textContent=t("برای شروع یک شعبه بسازید.");return;}
    try {
      const result=await window.RomanoAPI.tables(selected);
      if(select.value!==selected) return;
      const tables=Array.isArray(result?.tables)?result.tables:[];
      if(!tables.length){host.textContent=t("میزی ثبت نشده است.");return;}
      host.innerHTML=tables.map((table)=>`
        <div class="ops-table">
          <div class="ops-table-info"><strong>${safe(table.display_name)}</strong>
            <small> · ${safe(table.code)} · ${safe(t(table.active?"میز فعال":"میز غیرفعال"))}</small>
          </div>
          <div class="ops-table-actions">
            <button type="button" data-table-qr="${safe(table.id)}" ${table.active?"":"disabled"}>${safe(t("دریافت لینک QR"))}</button>
            <button type="button" data-table-status="${safe(table.id)}" data-active="${table.active?"true":"false"}">${safe(t(table.active?"غیرفعال‌کردن میز":"فعال‌کردن میز"))}</button>
            <button type="button" data-table-rotate="${safe(table.id)}">${safe(t("باطل‌کردن QR قبلی"))}</button>
          </div>
        </div>`).join("");
      const byId=new Map(tables.map(table=>[table.id,table]));
      host.querySelectorAll("[data-table-qr]").forEach(button=>button.addEventListener("click",async()=>{
        button.disabled=true;opsMessage("");
        try {
          const output=await window.RomanoAPI.tableQr(selected,button.dataset.tableQr);
          if(select.value!==selected) return;
          const table=byId.get(button.dataset.tableQr);
          if(!table || typeof output?.qrUrl!=="string") throw new Error("INVALID_QR_RESPONSE");
          renderQrResult(button.closest(".ops-table"),table,output.qrUrl);
        }catch{opsMessage("ساخت QR انجام نشد.");}
        finally{button.disabled=false;}
      }));
      host.querySelectorAll("[data-table-status]").forEach(button=>button.addEventListener("click",async()=>{
        const active=button.dataset.active!=="true";
        if(!active && !window.confirm(t("غیرفعال‌کردن میز، سفارش‌گیری از این میز را متوقف می‌کند. ادامه می‌دهید؟"))) return;
        button.disabled=true;opsMessage("");
        try{
          await window.RomanoAPI.setTableActive(selected,button.dataset.tableStatus,active);
          if(select.value===selected){await refreshTables();opsMessage("وضعیت میز ذخیره شد.");}
        }catch{opsMessage("تغییر وضعیت میز انجام نشد.");}
        finally{button.disabled=false;}
      }));
      host.querySelectorAll("[data-table-rotate]").forEach(button=>button.addEventListener("click",async()=>{
        if(!window.confirm(t("QR قبلی و نشست‌های فعال این میز باطل می‌شوند. ادامه می‌دهید؟")))return;
        button.disabled=true;opsMessage("");
        try{
          await window.RomanoAPI.rotateTableQr(selected,button.dataset.tableRotate);
          if(select.value===selected){await refreshTables();opsMessage("QR قبلی باطل شد. کد جدید را چاپ کنید.");}
        }catch{opsMessage("باطل‌کردن QR انجام نشد.");}
        finally{button.disabled=false;}
      }));
    } catch { host.textContent=t("عملیات انجام نشد."); }
  }

  async function addBranch(event) {
    event.preventDefault();
    const form=event.currentTarget;
    const button=form.querySelector("button");
    button.disabled=true;opsMessage("");
    try {
      const input=new FormData(form);
      await window.RomanoAPI.createBranch({
        name:String(input.get("branchName")||"").trim(),
        slug:String(input.get("branchSlug")||"").trim(),
        priceMultiplier:Number(input.get("priceMultiplier")),
        currencyCode:"IRR",currencyExponent:0
      });
      form.reset();
      await loadBranches();
      opsMessage("شعبه ایجاد شد.");
    }catch{opsMessage("عملیات انجام نشد.");}
    finally{button.disabled=false;}
  }

  async function addTable(event) {
    event.preventDefault();
    const form=event.currentTarget;
    const button=form.querySelector("button");
    const branchId=document.querySelector("#ops-branch")?.value;
    if(!branchId)return;
    button.disabled=true;opsMessage("");
    try {
      const input=new FormData(form);
      await window.RomanoAPI.createTable(branchId,{
        code:String(input.get("tableCode")||"").trim(),
        name:String(input.get("tableName")||"").trim()
      });
      form.reset();await refreshTables();opsMessage("میز ایجاد شد.");
    }catch{opsMessage("عملیات انجام نشد.");}
    finally{button.disabled=false;}
  }

  async function saveOrderingStatus() {
    const branchId=document.querySelector("#ops-branch")?.value;
    const enabled=document.querySelector("#ops-qr-enabled")?.checked===true;
    if(!branchId)return;
    const button=document.querySelector("#ops-save-branch");
    button.disabled=true;opsMessage("");
    try{
      await window.RomanoAPI.branchSettings(branchId,{qrOrderingEnabled:enabled});
      await loadBranches();opsMessage("وضعیت ذخیره شد.");
    }catch{opsMessage("عملیات انجام نشد.");}
    finally{button.disabled=false;}
  }

  function init() {
    document.querySelector("#orders-refresh")?.addEventListener("click", () => refresh());
    document.querySelector('[data-page="orders"]')?.addEventListener("click", () => refresh());
    document.querySelectorAll("[data-order-filter]").forEach((button) => button.addEventListener("click", () => {
      filter = button.dataset.orderFilter;
      document.querySelectorAll("[data-order-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    }));
    document.addEventListener("romano:language-changed", () => { render(); syncBranchManagement(); });
    document.querySelector("#ops-branch")?.addEventListener("change", syncBranchManagement);
    document.querySelector("#create-branch-form")?.addEventListener("submit", addBranch);
    document.querySelector("#create-table-form")?.addEventListener("submit", addTable);
    document.querySelector("#ops-save-branch")?.addEventListener("click", saveOrderingStatus);
    document.querySelector("#gateway-branch")?.addEventListener("change", syncGateway);
    document.querySelector("#gateway-settings-form")?.addEventListener("submit", saveGateway);
    window.setTimeout(() => { refresh(true); loadBranches(); }, 900);
    timer = window.setInterval(() => { if (document.querySelector("#page-orders")?.classList.contains("is-active")) refresh(true); }, 10_000);
    window.addEventListener("beforeunload", () => window.clearInterval(timer));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
