/* Admin workspace features. Catalog data and persistence stay in admin.js. */
"use strict";
(() => {
    const selected = new Set();
    let visibleIds = [];
    const t = value => window.ROMANO_ADMIN_I18N.translate(value);
    const h = value => escapeHTML(value);
    const number = value => new Intl.NumberFormat(document.documentElement.lang).format(value);

    function renderReview() {
        const panel = document.querySelector("#workspace-review");
        const active = state.products.filter(p => p.active !== false);
        const categories = new Set(state.categories.map(c => c.id));
        const checks = [
            ["image", "بدون تصویر", active.filter(p => !p.image).length],
            ["price", "بدون قیمت", active.filter(p => !(p.price > 0)).length],
            ["description", "بدون توضیحات", active.filter(p => !p.description).length],
            ["category", "دسته‌بندی نامعتبر", active.filter(p => !categories.has(p.category)).length]
        ];
        panel.innerHTML = `<div class="review-heading"><div><span class="panel-eyebrow">${h(t("فقط محصولات فعال"))}</span><h2 id="workspace-review-title">${h(t("موارد نیازمند بررسی"))}</h2><p>${h(t("محصولات فعال را پیش از ارائه به مشتری بررسی کنید."))}</p></div><span class="review-symbol" aria-hidden="true">◈</span></div><div class="review-grid">${checks.map(([key, label, count]) => `<button type="button" class="review-item ${count ? 'needs-attention' : 'is-complete'}" data-review="${key}"><span>${h(t(label))}</span><strong>${number(count)}</strong><small>${h(t("مشاهده موارد"))} <span aria-hidden="true">↗</span></small></button>`).join("")}</div>`;
    }

    function updateSelection() {
        const existing = new Set(state.products.map(p => p.id));
        for (const id of selected) if (!existing.has(id)) selected.delete(id);
        visibleIds = [...document.querySelectorAll("[data-select-product]")].map(el => el.dataset.selectProduct);
        // Filter changes scope the selection to visible items: no hidden edits.
        for (const id of selected) if (!visibleIds.includes(id)) selected.delete(id);
        document.querySelectorAll("[data-select-product]").forEach(el => {
            el.checked = selected.has(el.dataset.selectProduct);
            el.closest(".admin-product-card").classList.toggle("is-selected", el.checked);
        });
        const toolbar = document.querySelector("#product-bulk-toolbar");
        toolbar.innerHTML = `<label class="bulk-select-all"><input type="checkbox" id="select-visible" ${!visibleIds.length ? 'disabled' : ''}><span>${h(t("انتخاب موارد نمایش‌داده‌شده"))}</span></label><span class="bulk-count" role="status">${number(selected.size)} ${h(t("انتخاب‌شده"))}</span><div class="bulk-actions" ${selected.size ? "" : "hidden"}><button type="button" class="secondary-button" data-bulk="active" ${!selected.size ? 'disabled' : ''}>${h(t("فعال‌سازی گروهی"))}</button><button type="button" class="secondary-button" data-bulk="inactive" ${!selected.size ? 'disabled' : ''}>${h(t("غیرفعال‌سازی گروهی"))}</button><button type="button" class="text-button" data-bulk="clear" ${!selected.size ? 'disabled' : ''}>${h(t("لغو انتخاب"))}</button></div>`;
        const selectAll = document.querySelector("#select-visible");
        selectAll.checked = visibleIds.length > 0 && selected.size === visibleIds.length;
        selectAll.indeterminate = selected.size > 0 && selected.size < visibleIds.length;
    }

    function init() {
        const toolbar = document.querySelector("#page-products .toolbar");
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "mobile-filter-toggle";
        toggle.textContent = "فیلتر و مرتب‌سازی";
        toggle.setAttribute("aria-expanded", "false");
        toggle.addEventListener("click", () => {
            const open = toolbar.classList.toggle("filters-open");
            toggle.setAttribute("aria-expanded", String(open));
        });
        toolbar.appendChild(toggle);
        const quality = document.createElement("select");
        quality.id = "product-quality-filter";
        quality.setAttribute("aria-label", "بررسی محتوا");
        quality.innerHTML = [["all","همه محتوا"],["image","بدون تصویر"],["price","بدون قیمت"],["description","بدون توضیحات"],["category","دسته‌بندی نامعتبر"]].map(([value,label]) => `<option value="${value}">${label}</option>`).join("");
        toolbar.appendChild(quality);
        quality.addEventListener("change", renderProducts);
        document.querySelector("#workspace-review").addEventListener("click", event => {
            const target = event.target.closest("[data-review]");
            if (!target) return;
            navigateTo("products");
            DOM.productSearch.value = "";
            DOM.productCategoryFilter.value = "all";
            document.querySelector("#rv4-product-status-filter").value = "active";
            quality.value = target.dataset.review;
            toolbar.classList.add("filters-open");
            toggle.setAttribute("aria-expanded", "true");
            renderProducts();
            DOM.productSearch.focus();
        });
        DOM.productList.addEventListener("change", event => {
            const input = event.target.closest("[data-select-product]");
            if (!input) return;
            if (input.checked) selected.add(input.dataset.selectProduct); else selected.delete(input.dataset.selectProduct);
            updateSelection();
        });
        document.querySelector("#product-bulk-toolbar").addEventListener("change", event => {
            if (event.target.id !== "select-visible") return;
            visibleIds.forEach(id => event.target.checked ? selected.add(id) : selected.delete(id));
            updateSelection();
            document.querySelector("#select-visible").focus();
        });
        document.querySelector("#product-bulk-toolbar").addEventListener("click", async event => {
            const action = event.target.closest("[data-bulk]")?.dataset.bulk;
            if (!action || saveInProgress) return;
            if (action === "clear") { selected.clear(); updateSelection(); return; }
            const ids = new Set(selected);
            if (!ids.size || !(await window.RomanoConfirm("وضعیت محصولات انتخاب‌شده تغییر کند؟"))) return;
            const previous = state.products;
            state.products = state.products.map(p => ids.has(p.id) ? { ...p, active: action === "active", updatedAt: new Date().toISOString() } : p);
            if (!(await saveProducts())) { state.products = previous; return; }
            selected.clear();
            renderAll();
        });
        renderReview();
        updateSelection();
    }
    document.addEventListener("romano:dashboard-rendered", renderReview);
    document.addEventListener("romano:products-rendered", updateSelection);
    document.addEventListener("romano:language-changed", () => {
        renderReview();
        updateSelection();
        // Reformat prices and dynamic counts in the chosen locale.
        if (adminInitialized) renderProducts();
    });
    document.addEventListener("DOMContentLoaded", init, { once: true });
})();
