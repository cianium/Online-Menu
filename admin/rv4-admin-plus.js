/* =========================================================
   ROMANO Admin Rv4.3 / UI+
========================================================= */
"use strict";

(() => {
    const ready = fn => document.readyState === "loading"
        ? document.addEventListener("DOMContentLoaded", fn, { once: true })
        : fn();

    ready(() => {
        initCommandPalette();
        initHeaderControls();
        initToasts();
        initKeyboardShortcuts();
        initSidebarA11y();
        initProductStatusFilter();
        initProductToolbar();
        initCategoryToolbar();
        initSettingsUX();
        initLogout();
        initImageFallbacks();
        initBackupTools();
        initModalFocusHandling();
    });

    function initHeaderControls() {
        const addButton = document.querySelector("#admin-add-product-shortcut");
        const dateNode = document.querySelector("#admin-current-date");

        addButton?.addEventListener("click", () => {
            if (typeof navigateTo === "function") navigateTo("products");
            window.setTimeout(() => {
                if (typeof openProductModal === "function") openProductModal();
            }, 40);
        });

        if (dateNode) {
            const updateDate = () => {
                try {
                    const lang = document.documentElement.lang || "fa";
                    const locale = lang === "en" ? "en-US" : lang === "tr" ? "tr-TR" : lang === "ar" ? "ar" : "fa-IR";
                    dateNode.textContent = new Intl.DateTimeFormat(locale, {
                        weekday: "long", day: "numeric", month: "long", year: "numeric"
                    }).format(new Date());
                } catch (error) {
                    dateNode.textContent = new Date().toLocaleDateString();
                }
            };
            updateDate();
            window.setInterval(updateDate, 60 * 60 * 1000);
            document.addEventListener("romano:language-changed", updateDate);
        }
    }

    function initToasts() {
        const stack = document.createElement("div");
        stack.className = "rv4-toast-stack";
        document.body.appendChild(stack);
        window.RomanoToast = (message, type = "success") => {
            const item = document.createElement("div");
            item.className = `rv4-toast is-${type}`;
            item.textContent = window.ROMANO_ADMIN_I18N?.translate?.(message) || message;
            stack.appendChild(item);
            setTimeout(() => { item.style.opacity = "0"; item.style.transform = "translateY(8px)"; }, 2600);
            setTimeout(() => item.remove(), 3000);
        };
    }

    function initCommandPalette() {
        const headerActions = document.querySelector(".header-actions");
        if (!headerActions || document.querySelector(".admin-command-trigger")) return;
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "admin-command-trigger";
        const shortcutLabel = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K";
        trigger.innerHTML = `جستجوی سریع <kbd>${shortcutLabel}</kbd>`;
        headerActions.prepend(trigger);

        const backdrop = document.createElement("div");
        backdrop.className = "rv4-command-backdrop";
        document.body.appendChild(backdrop);
        const panel = document.createElement("div");
        panel.className = "rv4-command";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", "جستجوی سریع پنل مدیریت");
        panel.innerHTML = `
            <label class="sr-only" for="rv4-command-input">جستجوی سریع</label>
            <input id="rv4-command-input" type="search" placeholder="محصول، صفحه یا عملیات را جستجو کنید…" autocomplete="off">
            <div class="rv4-command__list"></div>
        `;
        document.body.appendChild(panel);
        const input = panel.querySelector("input");
        const list = panel.querySelector(".rv4-command__list");
        const pages = [
            ["dashboard", "داشبورد", "صفحه"],
            ["products", "محصولات", "صفحه"],
            ["categories", "دسته‌بندی‌ها", "صفحه"],
            ["settings", "تنظیمات رستوران", "صفحه"]
        ];
        let previousFocus = null;
        const open = () => { previousFocus = document.activeElement; activeIndex = -1; panel.classList.add("is-open"); backdrop.classList.add("is-open"); input.value=""; render(""); setTimeout(()=>input.focus(),0); };
        const close = () => { panel.classList.remove("is-open"); backdrop.classList.remove("is-open"); const target = previousFocus; previousFocus = null; target?.focus?.(); };
        const getState = () => (typeof state !== "undefined" ? state : { products: [] });
        const render = query => {
            const q = query.trim().toLocaleLowerCase("fa");
            const items = [];
            pages.forEach(p => {
                if (!q || p[1].toLocaleLowerCase("fa").includes(q)) items.push({ kind:"page", id:p[0], title:p[1], meta:p[2] });
            });
            const products = Array.isArray(getState().products) ? getState().products : [];
            products.filter(p => !q || [p.name, p.categoryName, p.description, p.badge].join(" ").toLocaleLowerCase("fa").includes(q)).slice(0,8).forEach(p => {
                items.push({ kind:"product", id:p.id, title:p.name, meta:p.categoryName || "محصول" });
            });
            list.innerHTML = items.length ? items.map(item => `
                <button class="rv4-command__item" type="button" data-kind="${item.kind}" data-id="${escapeHtml(item.id)}">
                    <span>${escapeHtml(item.title)}</span><span class="rv4-command__meta">${escapeHtml(item.meta)}</span>
                </button>`).join("") : `<div style="padding:20px;color:#77716a">نتیجه‌ای پیدا نشد.</div>`;
        };
        let activeIndex = -1;
        const focusItem = index => {
            const items = [...list.querySelectorAll(".rv4-command__item")];
            if (!items.length) { activeIndex = -1; return; }
            activeIndex = (index + items.length) % items.length;
            items.forEach((item, i) => item.setAttribute("aria-selected", String(i === activeIndex)));
            items[activeIndex].focus();
        };
        const selectActive = () => {
            const item = list.querySelectorAll(".rv4-command__item")[activeIndex];
            if (item) item.click();
        };
        input.addEventListener("input", e => { activeIndex = -1; render(e.target.value); });
        input.addEventListener("keydown", e => {
            if (e.key === "ArrowDown") { e.preventDefault(); focusItem(activeIndex + 1); }
            if (e.key === "ArrowUp") { e.preventDefault(); focusItem(activeIndex - 1); }
            if (e.key === "Enter") { e.preventDefault(); selectActive(); }
        });
        list.addEventListener("keydown", e => {
            if (!e.target.closest(".rv4-command__item")) return;
            const items = [...list.querySelectorAll(".rv4-command__item")];
            const current = items.indexOf(e.target.closest(".rv4-command__item"));
            if (e.key === "ArrowDown") { e.preventDefault(); focusItem(current + 1); }
            if (e.key === "ArrowUp") { e.preventDefault(); focusItem(current - 1); }
            if (e.key === "Escape") { e.preventDefault(); close(); trigger.focus(); }
        });
        trigger.addEventListener("click", open);
        backdrop.addEventListener("click", close);
        panel.addEventListener("click", e => {
            const item = e.target.closest("[data-kind]");
            if (!item) return;
            close();
            if (item.dataset.kind === "page" && typeof navigateTo === "function") navigateTo(item.dataset.id);
            if (item.dataset.kind === "product" && typeof openProductModal === "function") { navigateTo("products"); setTimeout(()=>openProductModal(item.dataset.id), 40); }
        });
        document.addEventListener("keydown", e => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
            if (e.key === "Escape" && panel.classList.contains("is-open")) close();
        });
    }

    function initKeyboardShortcuts() {
        document.addEventListener("keydown", e => {
            const typing = ["INPUT","TEXTAREA","SELECT"].includes(e.target?.tagName);
            if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key.toLowerCase() === "n" && typeof openProductModal === "function") { e.preventDefault(); navigateTo("products"); setTimeout(()=>openProductModal(), 30); }
            if (e.key.toLowerCase() === "g" && e.shiftKey && typeof navigateTo === "function") { e.preventDefault(); navigateTo("dashboard"); }
        });
    }

    function initSidebarA11y() {
        const sidebar = document.querySelector("#sidebar");
        const opener = document.querySelector("#mobile-menu-button");
        if (!sidebar || !opener) return;
        const observer = new MutationObserver(() => {
            const open = sidebar.classList.contains("is-open");
            opener.setAttribute("aria-expanded", String(open));
            sidebar.setAttribute("aria-hidden", String(window.innerWidth < 1000 && !open));
        });
        observer.observe(sidebar, { attributes:true, attributeFilter:["class"] });
        const sync = () => {
            const open = sidebar.classList.contains("is-open");
            opener.setAttribute("aria-expanded", String(open));
            sidebar.setAttribute("aria-hidden", String(window.innerWidth < 1000 && !open));
        };
        window.addEventListener("resize", sync, { passive: true });
        sync();
    }

    function initProductStatusFilter() {
        const toolbar = document.querySelector(".toolbar");
        const search = document.querySelector("#product-search");
        if (!toolbar || !search || document.querySelector("#rv4-product-status-filter")) return;

        const select = document.createElement("select");
        select.id = "rv4-product-status-filter";
        select.setAttribute("aria-label", "فیلتر وضعیت محصول");
        select.innerHTML = `
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
            <option value="featured">انتخاب ویژه</option>
        `;
        toolbar.appendChild(select);

        // renderProducts now owns filtering. Re-render instead of hiding DOM
        // nodes, so the filter survives every CRUD/state refresh.
        const refresh = () => {
            if (typeof renderProducts === "function") renderProducts();
        };
        select.addEventListener("change", refresh);
        search.addEventListener("input", refresh);
        document.querySelector("#product-category-filter")?.addEventListener("change", refresh);
    }


    function initProductToolbar() {
        const toolbar = document.querySelector(".toolbar");
        const search = document.querySelector("#product-search");
        const category = document.querySelector("#product-category-filter");
        if (!toolbar || !search || !category || document.querySelector("#rv4-product-sort")) return;

        const sort = document.createElement("select");
        sort.id = "rv4-product-sort";
        sort.setAttribute("aria-label", "مرتب‌سازی محصولات");
        sort.innerHTML = `
            <option value="updated">ترتیب فعلی</option>
            <option value="name">نام (الفبا)</option>
            <option value="price-desc">قیمت (بیشتر)</option>
            <option value="price-asc">قیمت (کمتر)</option>
            <option value="featured">انتخاب ویژه</option>
            <option value="active">وضعیت</option>
        `;
        toolbar.appendChild(sort);

        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "admin-clear-filters";
        clear.textContent = "پاک‌کردن فیلتر";
        clear.setAttribute("aria-label", "پاک کردن جستجو و همه فیلترهای محصولات");
        toolbar.appendChild(clear);

        const refresh = () => typeof renderProducts === "function" && renderProducts();
        sort.addEventListener("change", refresh);
        clear.addEventListener("click", () => {
            search.value = "";
            category.value = "all";
            const status = document.querySelector("#rv4-product-status-filter");
            if (status) status.value = "all";
            sort.value = "updated";
            refresh();
            search.focus();
        });
    }

    function initCategoryToolbar() {
        const search = document.querySelector("#rv4-category-search");
        const sort = document.querySelector("#rv4-category-sort");
        if (!search || !sort) return;
        let timer = null;
        const refresh = () => typeof renderCategories === "function" && renderCategories();
        search.addEventListener("input", () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(refresh, 80);
        });
        sort.addEventListener("change", refresh);
    }

    function initSettingsUX() {
        const form = document.querySelector("#restaurant-settings-form");
        if (!form || form.dataset.rv4Ux === "true") return;
        form.dataset.rv4Ux = "true";

        const fields = [...form.querySelectorAll("input, textarea, select")];
        const actionRow = form.querySelector(".form-actions");
        if (!actionRow) return;

        const status = document.createElement("span");
        status.className = "settings-save-state";
        status.setAttribute("aria-live", "polite");
        actionRow.prepend(status);

        let baseline = new FormData(form);
        const serialize = data => JSON.stringify([...data.entries()]);
        const syncBaseline = () => {
            baseline = new FormData(form);
            form.classList.remove("is-dirty");
            status.textContent = "همه تغییرات ذخیره شده";
            status.classList.remove("is-dirty");
        };
        const update = () => {
            const dirty = serialize(new FormData(form)) !== serialize(baseline);
            form.classList.toggle("is-dirty", dirty);
            status.textContent = dirty ? "تغییرات ذخیره‌نشده" : "همه تغییرات ذخیره شده";
            status.classList.toggle("is-dirty", dirty);
        };
        fields.forEach(field => field.addEventListener("input", update));
        fields.forEach(field => field.addEventListener("change", update));
        form.addEventListener("submit", () => {
            window.setTimeout(syncBaseline, 30);
        });
        document.addEventListener("romano:settings-rendered", syncBaseline);
        window.addEventListener("beforeunload", event => {
            if (!form.classList.contains("is-dirty")) return;
            event.preventDefault();
            event.returnValue = "";
        });
        update();
    }

    function initLogout() {
        const button = document.querySelector("#admin-logout-button");
        if (!button || button.dataset.rv4Bound === "true") return;
        button.dataset.rv4Bound = "true";
        button.addEventListener("click", () => {
            if (window.confirm(window.ROMANO_ADMIN_I18N?.translate?.("از پنل مدیریت خارج شوید؟") || "از پنل مدیریت خارج شوید؟")) {
                if (typeof logoutAdmin === "function") logoutAdmin();
            }
        });
    }

    function initImageFallbacks() {
        const root = document.querySelector(".admin-app");
        if (!root) return;
        const replaceBroken = image => {
            if (!(image instanceof HTMLImageElement) || image.dataset.rv4Fallback === "true") return;
            image.dataset.rv4Fallback = "true";
            image.addEventListener("error", () => {
                image.hidden = true;
                image.closest(".admin-product-image, .category-admin-image")?.classList.add("has-image-error");
            }, { once: true });
        };
        root.querySelectorAll("img").forEach(replaceBroken);
        const observer = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            if (node.matches("img")) replaceBroken(node);
            node.querySelectorAll?.("img").forEach(replaceBroken);
        })));
        observer.observe(root, { childList: true, subtree: true });
    }

    function initBackupTools() {
        const settings = document.querySelector("#page-settings .settings-form");
        if (!settings || document.querySelector("#rv4-backup-tools")) return;
        const wrap = document.createElement("div");
        wrap.id = "rv4-backup-tools";
        wrap.className = "panel";
        wrap.style.marginTop = "18px";
        wrap.innerHTML = `
            <div class="panel-header">
                <div>
                    <span class="panel-eyebrow">DATA</span>
                    <h2>پشتیبان‌گیری</h2>
                </div>
            </div>
            <p style="color:#8f887f; margin:0 0 14px; line-height:1.9">
                از اطلاعات منو یک فایل پشتیبان محلی بگیرید یا آن را در همین مرورگر بازیابی کنید.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="secondary-button" type="button" data-rv4-export>خروجی JSON</button>
                <label class="secondary-button" style="cursor:pointer">
                    بازیابی JSON
                    <input data-rv4-import type="file" accept="application/json,.json" hidden>
                </label>
            </div>
        `;
        settings.parentElement?.appendChild(wrap);
        const toast = (msg, type = "success") => window.RomanoToast ? window.RomanoToast(msg, type) : window.alert(msg);
        wrap.querySelector("[data-rv4-export]").addEventListener("click", () => {
            if (typeof state === "undefined") return;
            const payload = {
                schema: "romano.menu-backup",
                schemaVersion: 1,
                appVersion: "Rv4.6",
                exportedAt: new Date().toISOString(),
                restaurant: state.restaurant,
                categories: state.categories,
                products: state.products
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `romano-backup-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 500);
            toast("نسخه پشتیبان آماده شد.");
        });
        wrap.querySelector("[data-rv4-import]").addEventListener("change", async event => {
            const file = event.target.files?.[0];
            if (!file || typeof state === "undefined") return;
            try {
                const payload = JSON.parse(await file.text());
                if (!isValidBackup(payload)) throw new Error("invalid");
                if (!window.confirm(window.ROMANO_ADMIN_I18N?.translate?.("این کار اطلاعات فعلی منو را با نسخه پشتیبان جایگزین می‌کند. ادامه می‌دهید؟") || "این کار اطلاعات فعلی منو را با نسخه پشتیبان جایگزین می‌کند. ادامه می‌دهید؟")) return;

                const categories = payload.categories.map(c => ({ ...c, id: String(c.id).trim(), name: String(c.name).trim() }));
                const categoryIds = new Set(categories.map(c => c.id));
                const products = payload.products.map(p => ({
                    ...p,
                    id: String(p.id).trim(),
                    name: String(p.name).trim(),
                    active: p.active !== false,
                    categoryName: p.categoryName || categories.find(c => c.id === p.category)?.name || ""
                }));

                if (products.some(p => p.category && !categoryIds.has(p.category))) throw new Error("invalid-category-reference");

                const previous = { restaurant: state.restaurant, categories: state.categories, products: state.products };
                const next = {
                    restaurant: {
                        ...state.restaurant,
                        ...payload.restaurant,
                        instagram: payload.restaurant.instagram === "#" ? "" : String(payload.restaurant.instagram || "").trim()
                    },
                    categories,
                    products
                };
                state.restaurant = next.restaurant;
                state.categories = next.categories;
                state.products = next.products;

                const saved = typeof saveStateBundle === "function" ? saveStateBundle(next) : false;
                if (!saved) {
                    state.restaurant = previous.restaurant;
                    state.categories = previous.categories;
                    state.products = previous.products;
                    throw new Error("storage-failed");
                }
                if (typeof renderAll === "function") renderAll();
                toast("پشتیبان با موفقیت بازیابی شد.");
            } catch (error) {
                console.error("ROMANO backup restore failed:", error);
                toast("فایل پشتیبان معتبر نیست یا ذخیره‌سازی انجام نشد.", "danger");
            } finally {
                event.target.value = "";
            }
        });
    }

    function initModalFocusHandling() {
        document.addEventListener("keydown", event => {
            if (event.key !== "Tab") return;
            const modal = document.querySelector(".admin-modal.is-open");
            if (!modal) return;
            const focusables = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
    }

    function isValidBackup(payload) {
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
        if (payload.schema !== "romano.menu-backup") return false;
        if (Number(payload.schemaVersion) !== 1) return false;
        if (!payload.restaurant || typeof payload.restaurant !== "object" || Array.isArray(payload.restaurant)) return false;
        if (!Array.isArray(payload.categories) || payload.categories.length > 200) return false;
        if (!Array.isArray(payload.products) || payload.products.length > 2000) return false;

        const stringField = (value, max) => typeof value === "string" && value.length <= max;
        const urlField = (value) => {
            if (value == null || value === "" || value === "#") return true;
            if (typeof value !== "string" || value.length > 500) return false;
            try {
                const url = new URL(value, location.href);
                return ["https:", "http:"].includes(url.protocol);
            } catch (_) {
                return false;
            }
        };
        const imageField = (value) => {
            if (value == null || value === "") return true;
            if (typeof value !== "string" || value.length > 1200000) return false;
            if (/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(value)) return true;
            try {
                const url = new URL(value, location.href);
                return url.protocol === "http:" || url.protocol === "https:";
            } catch (_) {
                return false;
            }
        };

        const r = payload.restaurant;
        if (!stringField(r.name, 120) || !stringField(r.tagline ?? "", 180) || !stringField(r.description ?? "", 1200) || !stringField(r.phone ?? "", 40) || !stringField(r.address ?? "", 500) || !urlField(r.instagram)) return false;

        const categoryIds = new Set();
        for (const category of payload.categories) {
            if (!category || typeof category !== "object") return false;
            const id = String(category.id || "").trim();
            const name = String(category.name || "").trim();
            if (!id || id.length > 120 || !name || name.length > 120 || categoryIds.has(id) || !imageField(category.image)) return false;
            categoryIds.add(id);
        }

        const productIds = new Set();
        for (const product of payload.products) {
            if (!product || typeof product !== "object") return false;
            const id = String(product.id || "").trim();
            const name = String(product.name || "").trim();
            if (!id || id.length > 160 || !name || name.length > 160 || productIds.has(id)) return false;
            if (product.category != null && product.category !== "" && typeof product.category !== "string") return false;
            if (product.active != null && typeof product.active !== "boolean") return false;
            if (product.featured != null && typeof product.featured !== "boolean") return false;
            if (product.price != null && (!Number.isFinite(Number(product.price)) || Number(product.price) < 0 || Number(product.price) > 1000000000000)) return false;
            if (!imageField(product.image)) return false;
            if (product.description != null && !stringField(product.description, 1200)) return false;
            if (product.badge != null && !stringField(product.badge, 80)) return false;
            productIds.add(id);
        }
        return true;
    }

    function escapeHtml(value) {
        return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    }
})();
