"use strict";

/* =========================================================
   ROMANO ADMIN PANEL
   MVP v1
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEYS = {

    restaurant:
        "romano_restaurant",

    categories:
        "romano_categories",

    products:
        "romano_products"

};


const ROMANO_NATIVE_ALERT = window.alert.bind(window);
const ROMANO_NATIVE_CONFIRM = window.confirm.bind(window);
if (!window.__ROMANO_DIALOG_I18N_BOUND__) {
    window.__ROMANO_DIALOG_I18N_BOUND__ = true;
    window.alert = message => ROMANO_NATIVE_ALERT(window.ROMANO_ADMIN_I18N?.translate?.(String(message ?? "")) || message);
    window.confirm = message => ROMANO_NATIVE_CONFIRM(window.ROMANO_ADMIN_I18N?.translate?.(String(message ?? "")) || message);
}


const RomanoStorage = {
    get(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.error("Storage read error:", error);
            return fallback;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("Storage write error:", error);
            return false;
        }
    },

    transaction(entries) {
        const previous = new Map();
        try {
            entries.forEach(([key, value]) => {
                previous.set(key, localStorage.getItem(key));
                localStorage.setItem(key, JSON.stringify(value));
            });
            return true;
        } catch (error) {
            console.error("Storage transaction error:", error);
            for (const [key, raw] of previous) {
                try {
                    if (raw === null) localStorage.removeItem(key);
                    else localStorage.setItem(key, raw);
                } catch (_) {}
            }
            return false;
        }
    }
};


/* =========================================================
   APPLICATION STATE
========================================================= */

const state = {

    restaurant:
        null,

    categories:
        [],

    products:
        [],

    currentPage:
        "dashboard",

    editingProductId:
        null,

    editingCategoryId:
        null

};


/* =========================================================
   DOM REFERENCES
========================================================= */

const DOM = {

    sidebar:
        document.querySelector("#sidebar"),

    sidebarOverlay:
        document.querySelector("#sidebar-overlay"),

    sidebarClose:
        document.querySelector("#sidebar-close"),

    mobileMenuButton:
        document.querySelector("#mobile-menu-button"),

    currentPageTitle:
        document.querySelector("#current-page-title"),

    navItems:
        document.querySelectorAll(".nav-item"),

    adminPages:
        document.querySelectorAll(".admin-page"),

    statProducts:
        document.querySelector("#stat-products"),

    statCategories:
        document.querySelector("#stat-categories"),

    statFeatured:
        document.querySelector("#stat-featured"),

    statActive:
        document.querySelector("#stat-active"),

    statInactive:
        document.querySelector("#stat-inactive"),

    statOrphanProducts:
        document.querySelector("#stat-orphan-products"),

    statContactStatus:
        document.querySelector("#stat-contact-status"),

    restaurantSummary:
        document.querySelector("#restaurant-summary"),

    recentProducts:
        document.querySelector("#recent-products"),

    productList:
        document.querySelector("#products-admin-list"),

    productSearch:
        document.querySelector("#product-search"),

    productCategoryFilter:
        document.querySelector("#product-category-filter"),

    productListSummary:
        document.querySelector("#product-list-summary"),

    addProductButton:
        document.querySelector("#add-product-button"),

    productModal:
        document.querySelector("#product-modal"),

    productModalTitle:
        document.querySelector("#product-modal-title"),

    productForm:
        document.querySelector("#product-form"),

    productFormCategory:
        document.querySelector("#product-form-category"),

    productImagePreview:
        document.querySelector("#product-image-preview"),

    productImagePlaceholder:
        document.querySelector("#product-image-placeholder"),

    productImageFile:
        document.querySelector("#product-image-file"),

    productImageRemove:
        document.querySelector("#product-image-remove"),

    categoriesList:
        document.querySelector("#categories-admin-list"),

    addCategoryButton:
        document.querySelector("#add-category-button"),

    categoryModal:
        document.querySelector("#category-modal"),

    categoryModalTitle:
        document.querySelector("#category-modal-title"),

    categoryForm:
        document.querySelector("#category-form"),

    categoryImagePreview:
        document.querySelector("#category-image-preview"),

    categoryImagePlaceholder:
        document.querySelector("#category-image-placeholder"),

    categoryImageFile:
        document.querySelector("#category-image-file"),

    categoryImageRemove:
        document.querySelector("#category-image-remove"),

    settingsForm:
        document.querySelector("#restaurant-settings-form")

};


/* =========================================================
   ACCESS GATE

   Google-first admin access UI. This release deliberately
   removes the client-side password form from the interface.

   IMPORTANT:
   This is still a frontend gate until server-side auth/RBAC
   is connected. The Google ID token is verified against
   Google's tokeninfo endpoint, but the allowed-email check
   remains client-side for this static build.
========================================================= */


// Google sign-in is intentionally server-owned in production.


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeAdmin() {

    await loadState();

    initializeNavigation();

    initializeSidebar();

    initializeProductManagement();

    initializeCategoryManagement();

    initializeImageUploadFields();

    initializeSettings();

    renderAll();

}


/* =========================================================
   LOAD STATE
========================================================= */

async function loadState() {
    let restaurant = RomanoStorage.get(STORAGE_KEYS.restaurant, structuredClone(restaurantData));
    let categoriesState = RomanoStorage.get(STORAGE_KEYS.categories, structuredClone(categories));
    let productsState = RomanoStorage.get(STORAGE_KEYS.products, structuredClone(products));

    if (window.RomanoAPI?.enabled) {
        try {
            const remote = await window.RomanoAPI.adminData();
            if (remote?.restaurant) {
                restaurant = { ...restaurantData, ...remote.restaurant };
                restaurant.instagram = remote.restaurant.instagram || remote.restaurant.instagram_url || "";
            }
            if (Array.isArray(remote?.categories) && remote.categories.length) categoriesState = remote.categories;
            if (Array.isArray(remote?.products) && remote.products.length) productsState = remote.products;
            RomanoStorage.transaction([[STORAGE_KEYS.restaurant, restaurant], [STORAGE_KEYS.categories, categoriesState], [STORAGE_KEYS.products, productsState]]);
        } catch (error) {
            if (error?.status === 401) { logoutAdmin(); return; }
            console.warn("Remote admin data unavailable; keeping local mirror.", error);
        }
    }

    state.restaurant = restaurant && typeof restaurant === "object" && !Array.isArray(restaurant)
        ? { ...restaurantData, ...restaurant }
        : structuredClone(restaurantData);
    state.categories = Array.isArray(categoriesState) ? categoriesState : structuredClone(categories);
    state.products = Array.isArray(productsState) ? productsState : structuredClone(products);

    normalizeProducts();

    // First server-backed run: promote the existing local seed into the tenant database.
    if (window.RomanoAPI?.enabled && state.categories.length && state.products.length && !state.restaurant.__remoteBootstrapped) {
        try { await syncRemoteSnapshot(); } catch (error) { console.warn("Initial remote bootstrap deferred:", error); }
    }
}

function normalizeProducts() {
    state.categories = state.categories
        .filter(category => category && typeof category === "object")
        .map(category => ({
            ...category,
            id: String(category.id || "").trim(),
            name: String(category.name || "").trim(),
            image: String(category.image || "").trim()
        }))
        .filter(category => category.id && category.name);

    const categoryMap = new Map(state.categories.map(category => [category.id, category.name]));

    state.products = state.products
        .filter(product => product && typeof product === "object")
        .map(product => ({
            ...product,
            id: String(product.id || "").trim(),
            name: String(product.name || "").trim(),
            category: String(product.category || "").trim(),
            categoryName: categoryMap.get(String(product.category || "").trim()) || String(product.categoryName || "").trim(),
            price: Number.isFinite(Number(product.price)) && Number(product.price) > 0 ? Number(product.price) : 0,
            active: product.active !== false,
            featured: product.featured === true,
            description: String(product.description || "").trim(),
            badge: String(product.badge || "").trim(),
            rating: product.rating || "★★★★★",
            image: String(product.image || "").trim(),
            createdAt: typeof product.createdAt === "string" ? product.createdAt : "",
            updatedAt: typeof product.updatedAt === "string" ? product.updatedAt : ""
        }))
        .filter(product => product.id && product.name);
}


/* =========================================================
   SAVE STATE
========================================================= */

async function saveRestaurant() {
    const success = RomanoStorage.set(STORAGE_KEYS.restaurant, state.restaurant);
    warnIfStorageFull(success);
    if (!success) return false;
    if (window.RomanoAPI?.enabled) await syncRemoteSnapshot();
    return true;
}

async function saveCategories() {
    const success = RomanoStorage.set(STORAGE_KEYS.categories, state.categories);
    warnIfStorageFull(success);
    if (!success) return false;
    if (window.RomanoAPI?.enabled) await syncRemoteSnapshot();
    return true;
}

async function saveProducts() {
    const success = RomanoStorage.set(STORAGE_KEYS.products, state.products);
    warnIfStorageFull(success);
    if (!success) return false;
    if (window.RomanoAPI?.enabled) await syncRemoteSnapshot();
    return true;
}

async function saveStateBundle({ restaurant = state.restaurant, categories = state.categories, products = state.products } = {}) {
    const success = RomanoStorage.transaction([[STORAGE_KEYS.restaurant, restaurant], [STORAGE_KEYS.categories, categories], [STORAGE_KEYS.products, products]]);
    warnIfStorageFull(success);
    if (!success) return false;
    if (window.RomanoAPI?.enabled) await syncRemoteSnapshot({ restaurant, categories, products });
    return true;
}

async function syncRemoteSnapshot(snapshot = {}) {
    if (!window.RomanoAPI?.enabled) return true;
    const categoriesValue = snapshot.categories || state.categories;
    const productsValue = snapshot.products || state.products;
    const payload = {
        restaurant: (() => { const r = snapshot.restaurant || state.restaurant || {}; return { name: r.name || "ROMANO", tagline: r.tagline || "", description: r.description || "", phone: r.phone || "", address: r.address || "", instagram: r.instagram === "#" ? "" : (r.instagram || ""), currency: r.currency || undefined }; })(),
        categories: categoriesValue.map((c, index) => ({ id: String(c.id || `category-${index}`), name: String(c.name || "").trim(), image: String(c.image || ""), sortOrder: Number(c.sortOrder ?? index) || 0, active: c.active !== false })),
        products: productsValue.map((p, index) => ({ id: String(p.id || `product-${index}`), name: String(p.name || "").trim(), category: String(p.category || ""), image: String(p.image || ""), description: String(p.description || ""), price: Math.max(0, Number(p.price) || 0), rating: typeof p.rating === "number" ? p.rating : String(p.rating || "").replace(/[^0-9.]/g, "").slice(0,3) || 0, badge: String(p.badge || ""), featured: p.featured === true, active: p.active !== false, sortOrder: Number(p.sortOrder ?? index) || 0 }))
    };
    const result = await window.RomanoAPI.saveSnapshot(payload);
    if (result?.data) {
        RomanoStorage.transaction([[STORAGE_KEYS.restaurant, result.data.restaurant], [STORAGE_KEYS.categories, result.data.categories], [STORAGE_KEYS.products, result.data.products]]);
    }
    return true;
}

/**
 * localStorage has a small quota (a few MB, browser-
 * dependent), and uploaded images are the most likely thing
 * to fill it. A failed write is silent otherwise — this
 * turns it into a message the admin can actually act on.
 */

function warnIfStorageFull(success) {

    if (success) {
        return;
    }


    window.alert(
        "فضای ذخیره‌سازی مرورگر پر شده و تغییرات ذخیره نشد. " +
        "عکس چند محصول/دسته‌بندی را با فایل کوچک‌تری جایگزین کنید یا موارد قدیمی را حذف کنید."
    );

}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {

    renderDashboard();

    renderProductFilters();

    renderProducts();

    renderCategories();

    renderSettings();

}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {

    DOM.navItems.forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    const page =
                        item.dataset.page;

                    navigateTo(page);

                }
            );

        }
    );


    document
        .querySelectorAll("[data-page-target]")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        navigateTo(
                            button.dataset.pageTarget
                        );

                    }
                );

            }
        );

}


function navigateTo(page) {

    const validPages = [

        "dashboard",
        "products",
        "categories",
        "settings"

    ];


    if (!validPages.includes(page)) {
        return;
    }


    state.currentPage =
        page;


    DOM.navItems.forEach(
        item => {

            const active = item.dataset.page === page;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-current", active ? "page" : "false");

        }
    );


    DOM.adminPages.forEach(
        section => {

            section.classList.toggle(
                "is-active",
                section.id === `page-${page}`
            );

        }
    );


    const titles = {

        dashboard:
            "داشبورد",

        products:
            "محصولات",

        categories:
            "دسته‌بندی‌ها",

        settings:
            "تنظیمات رستوران"

    };


    DOM.currentPageTitle.textContent =
        titles[page];


    closeSidebar();

}


/* =========================================================
   SIDEBAR
========================================================= */

let sidebarPreviousFocus = null;

function initializeSidebar() {

    DOM.mobileMenuButton?.addEventListener(
        "click",
        openSidebar
    );


    DOM.sidebarClose?.addEventListener(
        "click",
        closeSidebar
    );


    DOM.sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && DOM.sidebar?.classList.contains("is-open")) {
            event.preventDefault();
            closeSidebar();
        }
    });

}


function openSidebar() {

    sidebarPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : DOM.mobileMenuButton;

    DOM.sidebar?.classList.add(
        "is-open"
    );

    DOM.sidebarOverlay?.classList.add(
        "is-visible"
    );

    DOM.mobileMenuButton?.setAttribute(
        "aria-expanded",
        "true"
    );

}


function closeSidebar() {

    DOM.sidebar?.classList.remove(
        "is-open"
    );

    DOM.sidebarOverlay?.classList.remove(
        "is-visible"
    );

    DOM.mobileMenuButton?.setAttribute(
        "aria-expanded",
        "false"
    );

    const target = sidebarPreviousFocus;
    sidebarPreviousFocus = null;
    requestAnimationFrame(() => target?.focus?.());

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    if (DOM.statProducts) {

        DOM.statProducts.textContent =
            state.products.length;

    }


    if (DOM.statCategories) {

        DOM.statCategories.textContent =
            state.categories.length;

    }


    if (DOM.statFeatured) {

        DOM.statFeatured.textContent =
            state.products.filter(
                product =>
                    product.featured === true &&
                    product.active !== false
            ).length;

    }


    if (DOM.statActive) {

        DOM.statActive.textContent =
            state.products.filter(
                product =>
                    product.active !== false
            ).length;

    }

    if (DOM.statInactive) {
        DOM.statInactive.textContent = state.products.filter(product => product.active === false).length;
    }

    if (DOM.statOrphanProducts) {
        const categoryIds = new Set(state.categories.map(category => category.id));
        DOM.statOrphanProducts.textContent = state.products.filter(product => product.category && !categoryIds.has(product.category)).length;
    }

    if (DOM.statContactStatus) {
        const hasContact = Boolean(String(state.restaurant?.phone || "").trim() || String(state.restaurant?.instagram || "").trim());
        DOM.statContactStatus.textContent = hasContact ? "ثبت شده" : "نیازمند تکمیل";
        DOM.statContactStatus.classList.toggle("is-warning", !hasContact);
    }


    renderRestaurantSummary();

    renderRecentProducts();

}


function renderRestaurantSummary() {

    if (!DOM.restaurantSummary) {
        return;
    }


    const restaurant =
        state.restaurant;


    DOM.restaurantSummary.innerHTML = `

        <div class="summary-row">

            <span class="summary-label">
                نام
            </span>

            <span class="summary-value">
                ${escapeHTML(restaurant.name)}
            </span>

        </div>


        <div class="summary-row">

            <span class="summary-label">
                تلفن
            </span>

            <span
                class="summary-value"
                dir="ltr"
            >
                ${escapeHTML(restaurant.phone)}
            </span>

        </div>


        <div class="summary-row">

            <span class="summary-label">
                آدرس
            </span>

            <span class="summary-value">
                ${escapeHTML(restaurant.address)}
            </span>

        </div>

    `;

}


function renderRecentProducts() {

    if (!DOM.recentProducts) {
        return;
    }


    const recent =
        state.products
            .slice(-5)
            .reverse();


    if (recent.length === 0) {

        DOM.recentProducts.innerHTML =
            `
                <span class="summary-label">
                    محصولی وجود ندارد.
                </span>
            `;

        return;

    }


    DOM.recentProducts.innerHTML =
        recent
            .map(
                product => `

                    <div class="recent-product">

                        <span class="recent-product-name">
                            ${escapeHTML(product.name)}
                        </span>

                        <span class="recent-product-category">
                            ${escapeHTML(
                                product.categoryName || ""
                            )}
                        </span>

                    </div>

                `
            )
            .join("");

}


/* =========================================================
   PRODUCT MANAGEMENT
========================================================= */

function initializeProductManagement() {

    DOM.addProductButton?.addEventListener(
        "click",
        () => openProductModal()
    );


    DOM.productForm?.addEventListener(
        "submit",
        handleProductSubmit
    );


    DOM.productSearch?.addEventListener(
        "input",
        renderProducts
    );


    DOM.productCategoryFilter?.addEventListener(
        "change",
        renderProducts
    );


    DOM.productModal
        ?.querySelectorAll("[data-close-modal]")
        .forEach(
            element => {

                element.addEventListener(
                    "click",
                    closeProductModal
                );

            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                DOM.productModal?.classList.contains(
                    "is-open"
                )
            ) {

                closeProductModal();

            }

        }
    );

}


function renderProductFilters() {

    if (
        !DOM.productCategoryFilter ||
        !DOM.productFormCategory
    ) {
        return;
    }


    const currentValue =
        DOM.productCategoryFilter.value;


    DOM.productCategoryFilter.innerHTML = `

        <option value="all">
            همه دسته‌بندی‌ها
        </option>

        ${
            state.categories
                .map(
                    category => `

                        <option
                            value="${escapeAttribute(
                                category.id
                            )}"
                        >
                            ${escapeHTML(
                                category.name
                            )}
                        </option>

                    `
                )
                .join("")
        }

    `;


    DOM.productCategoryFilter.value =
        state.categories.some(
            category =>
                category.id === currentValue
        )
            ? currentValue
            : "all";


    DOM.productFormCategory.innerHTML =
        state.categories
            .map(
                category => `

                    <option
                        value="${escapeAttribute(
                            category.id
                        )}"
                    >
                        ${escapeHTML(
                            category.name
                        )}
                    </option>

                `
            )
            .join("");

}


function renderProducts() {

    if (
        !DOM.productList ||
        !DOM.productSearch ||
        !DOM.productCategoryFilter
    ) {
        return;
    }


    const search =
        DOM.productSearch.value
            .trim()
            .toLocaleLowerCase("fa");


    const category =
        DOM.productCategoryFilter.value;

    const statusFilter =
        document.querySelector("#rv4-product-status-filter")?.value || "all";

    const sortFilter =
        document.querySelector("#rv4-product-sort")?.value || "updated";
    const currentLocale = window.ROMANO_ADMIN_I18N?.language || "fa";

    const filtered =
        state.products.filter(
            product => {

                const searchableText = [
                    product.name,
                    product.categoryName,
                    product.description,
                    product.badge
                ].map(value => String(value || "").toLocaleLowerCase("fa")).join(" ");

                const matchesSearch =
                    !search ||
                    searchableText.includes(search);


                const matchesCategory =
                    category === "all" ||
                    product.category === category;

                const matchesStatus =
                    statusFilter === "all" ||
                    (statusFilter === "active" && product.active !== false) ||
                    (statusFilter === "inactive" && product.active === false) ||
                    (statusFilter === "featured" && product.featured === true && product.active !== false);

                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesStatus
                );

            }
        );

    const sorted = [...filtered].sort((a, b) => {
        if (sortFilter === "name") return String(a.name || "").localeCompare(String(b.name || ""), currentLocale);
        if (sortFilter === "price-desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
        if (sortFilter === "price-asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
        if (sortFilter === "featured") return Number(b.featured === true) - Number(a.featured === true);
        if (sortFilter === "active") return Number(b.active !== false) - Number(a.active !== false);
        return (Date.parse(b.updatedAt || b.createdAt || "") || 0) - (Date.parse(a.updatedAt || a.createdAt || "") || 0);
    });

    if (DOM.productListSummary) {
        const activeCount = state.products.filter(product => product.active !== false).length;
        const total = state.products.length;
        const filterText = sorted.length === total ? "همه محصولات" : `${sorted.length} مورد از ${total}`;
        DOM.productListSummary.innerHTML = `<span>${escapeHTML(filterText)}</span><span class="admin-list-summary__active">${activeCount} فعال</span>`;
    }

    if (sorted.length === 0) {

        DOM.productList.innerHTML = `

            <div class="admin-empty-state panel">
                <span class="admin-empty-state__icon" aria-hidden="true">⌕</span>
                <strong>محصولی پیدا نشد</strong>
                <span>با تغییر عبارت جستجو یا فیلتر، دوباره امتحان کنید.</span>
            </div>

        `;

        return;

    }


    DOM.productList.innerHTML =
        sorted
            .map(createAdminProductCard)
            .join("");


    bindProductActions();

}


function createAdminProductCard(product) {

    const status =
        product.active !== false
            ? "فعال"
            : "غیرفعال";


    const featured =
        product.featured === true
            ? " · ویژه"
            : "";


    const price =
        product.price > 0
            ? formatPrice(product.price)
            : "قیمت ثبت نشده";


    const safeId = escapeAttribute(product.id);
    const category = escapeHTML(product.categoryName || "بدون دسته‌بندی");
    const featuredBadge = product.featured === true
        ? '<span class="product-featured-badge">ویژه</span>'
        : '';
    const toggleLabel = product.active !== false ? "غیرفعال‌کردن" : "فعال‌کردن";
    const imageMarkup = product.image
        ? `<img src="${escapeAttribute(resolveAdminAssetUrl(product.image))}" alt="${escapeAttribute(product.name)}" loading="lazy">`
        : `<span class="product-image-fallback" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"></rect><circle cx="9" cy="10" r="1.5"></circle><path d="m5.5 17 4.1-4 3 2.8 2.1-2 3.8 3.2"></path></svg></span>`;

    return `

        <article
            class="admin-product-card"
            data-product-id="${safeId}"
        >

            <div class="admin-product-main">
                <div class="admin-product-image">
                    ${imageMarkup}
                </div>

                <div class="admin-product-info">
                    <h3 class="admin-product-name">${escapeHTML(product.name)}</h3>
                    <div class="admin-product-meta">
                        <span>${category}</span>
                        <span class="meta-separator" aria-hidden="true">•</span>
                        <span>${escapeHTML(price)}</span>
                    </div>
                    <div class="admin-product-status-row">
                        <span class="admin-status-badge ${product.active !== false ? 'is-active' : 'is-inactive'}">
                            <span class="status-dot" aria-hidden="true"></span>
                            ${status}
                        </span>
                        ${featuredBadge}
                    </div>
                </div>
            </div>

            <div class="admin-product-actions">
                <button class="icon-button" type="button" aria-label="ویرایش ${escapeAttribute(product.name)}" data-product-action="edit" data-product-id="${safeId}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 16.8-.8 3.5 3.5-.8L18.6 8.1a1.8 1.8 0 0 0 0-2.5l-.2-.2a1.8 1.8 0 0 0-2.5 0L4.5 16.8Z"></path><path d="m14.8 6.2 3 3"></path></svg><span class="action-label">ویرایش</span>
                </button>

                <button class="icon-button toggle-button ${product.active !== false ? 'is-on' : 'is-off'}" type="button" aria-label="${toggleLabel} ${escapeAttribute(product.name)}" data-product-action="toggle" data-product-id="${safeId}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 6.5h9a5.5 5.5 0 0 1 0 11h-9a5.5 5.5 0 0 1 0-11Z"></path><circle cx="16" cy="12" r="2.2"></circle></svg><span class="action-label">${product.active !== false ? "خاموش" : "فعال"}</span>
                </button>

                <button class="icon-button danger" type="button" aria-label="حذف ${escapeAttribute(product.name)}" data-product-action="delete" data-product-id="${safeId}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 7h13M9.5 7V4.8h5V7M8 10v7.5M12 10v7.5M16 10v7.5M7 7l.7 12.1h8.6L17 7"></path></svg><span class="action-label">حذف</span>
                </button>
            </div>

        </article>

    `;

}


function bindProductActions() {

    DOM.productList
        ?.querySelectorAll(
            "[data-product-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.productId;

                        const action =
                            button.dataset.productAction;


                        if (action === "edit") {

                            openProductModal(id);

                        }


                        if (action === "toggle") {

                            toggleProduct(id);

                        }


                        if (action === "delete") {

                            deleteProduct(id);

                        }

                    }
                );

            }
        );

}


/* =========================================================
   PRODUCT MODAL
========================================================= */

function openProductModal(productId = null) {

    if (
        !DOM.productModal ||
        !DOM.productForm
    ) {
        return;
    }


    state.editingProductId =
        productId;


    DOM.productForm.reset();


    DOM.productForm.elements.id.value =
        productId || "";


    if (productId) {

        const product =
            state.products.find(
                item =>
                    item.id === productId
            );


        if (!product) {

            state.editingProductId =
                null;

            return;

        }


        DOM.productModalTitle.textContent =
            "ویرایش محصول";


        DOM.productForm.elements.name.value =
            product.name || "";


        DOM.productForm.elements.category.value =
            product.category || "";


        DOM.productForm.elements.price.value =
            product.price || "";


        DOM.productForm.elements.image.value =
            product.image || "";


        DOM.productForm.elements.description.value =
            product.description || "";


        DOM.productForm.elements.badge.value =
            product.badge || "";


        DOM.productForm.elements.rating.value =
            product.rating || "★★★★★";


        DOM.productForm.elements.featured.checked =
            product.featured === true;


        DOM.productForm.elements.active.checked =
            product.active !== false;

    } else {

        DOM.productModalTitle.textContent =
            "افزودن محصول";


        DOM.productForm.elements.rating.value =
            "★★★★★";


        DOM.productForm.elements.active.checked =
            true;

    }


    updateImagePreview(
        "product",
        DOM.productForm.elements.image.value
    );


    DOM.productModal.classList.add(
        "is-open"
    );


    DOM.productModal.setAttribute(
        "aria-hidden",
        "false"
    );

    requestAnimationFrame(() => DOM.productModal.querySelector("[data-close-modal]")?.focus());

    document.body.style.overflow =
        "hidden";

}


function closeProductModal() {

    if (!DOM.productModal) {
        return;
    }


    DOM.productModal.classList.remove(
        "is-open"
    );


    DOM.productModal.setAttribute(
        "aria-hidden",
        "true"
    );


    state.editingProductId =
        null;


    document.body.style.overflow =
        "";

}


/* =========================================================
   PRODUCT CREATE / UPDATE
========================================================= */

async function handleProductSubmit(event) {

    event.preventDefault();


    if (!DOM.productForm) {
        return;
    }


    const form =
        new FormData(
            DOM.productForm
        );


    const name =
        String(
            form.get("name") || ""
        ).trim();

    if (!name) {

        window.alert(
            "لطفاً نام محصول را وارد کنید."
        );

        return;

    }


    const categoryId =
        String(
            form.get("category") || ""
        );


    const category =
        state.categories.find(
            item =>
                item.id === categoryId
        );


    if (!category) {

        window.alert(
            "لطفاً یک دسته‌بندی معتبر انتخاب کنید."
        );

        return;

    }


    const existingProduct = state.editingProductId
        ? state.products.find(item => item.id === state.editingProductId)
        : null;
    const now = new Date().toISOString();

    const product = {

        id:
            form.get("id") ||
            createId(name),

        createdAt:
            existingProduct?.createdAt || now,

        updatedAt:
            now,

        name,

        category:
            category.id,

        categoryName:
            category.name,

        image:
            String(
                form.get("image") || ""
            ).trim(),

        description:
            String(
                form.get("description") || ""
            ).trim(),

        price:
            Math.max(0, Number(form.get("price")) || 0),

        rating:
            form.get("rating") ||
            "★★★★★",

        badge:
            form.get("badge") ||
            "",

        featured:
            form.has("featured"),

        active:
            form.has("active")

    };


    const previousProducts = state.products;

    if (state.editingProductId) {
        state.products = state.products.map(item =>
            item.id === state.editingProductId ? { ...item, ...product } : item
        );
    } else {
        state.products = [...state.products, product];
    }

    if (!(await saveProducts())) {
        state.products = previousProducts;
        renderAll();
        return;
    }

    renderAll();
    closeProductModal();

}


async function toggleProduct(productId) {
    const previousProducts = state.products;
    state.products = state.products.map(product =>
        product.id === productId
            ? { ...product, active: product.active === false, updatedAt: new Date().toISOString() }
            : product
    );

    if (!(await saveProducts())) {
        state.products = previousProducts;
        return;
    }

    renderAll();
}


async function deleteProduct(productId) {

    const product =
        state.products.find(
            item =>
                item.id === productId
        );


    if (!product) {
        return;
    }


    const confirmed =
        window.confirm(
            `آیا از حذف «${product.name}» مطمئن هستید؟`
        );


    if (!confirmed) {
        return;
    }


    const previousProducts = state.products;
    state.products = state.products.filter(item => item.id !== productId);

    if (!(await saveProducts())) {
        state.products = previousProducts;
        return;
    }

    renderAll();

}


/* =========================================================
   CATEGORY MANAGEMENT
========================================================= */

function initializeCategoryManagement() {

    DOM.addCategoryButton?.addEventListener(
        "click",
        () => openCategoryModal()
    );


    DOM.categoryForm?.addEventListener(
        "submit",
        handleCategorySubmit
    );


    DOM.categoryModal
        ?.querySelectorAll("[data-close-category-modal]")
        .forEach(
            element => {

                element.addEventListener(
                    "click",
                    closeCategoryModal
                );

            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                DOM.categoryModal?.classList.contains(
                    "is-open"
                )
            ) {

                closeCategoryModal();

            }

        }
    );

}


function renderCategories() {

    if (!DOM.categoriesList) {
        return;
    }


    const categoryLocale = window.ROMANO_ADMIN_I18N?.language || "fa";
    const categoryQuery =
        document.querySelector("#rv4-category-search")?.value.trim().toLocaleLowerCase(categoryLocale) || "";
    const categorySort =
        document.querySelector("#rv4-category-sort")?.value || "order";

    const categoryItems = state.categories
        .map((category, index) => ({
            category,
            index,
            count: state.products.filter(product => product.category === category.id).length
        }))
        .filter(item => !categoryQuery || String(item.category.name).toLocaleLowerCase(categoryLocale).includes(categoryQuery))
        .sort((a, b) => {
            if (categorySort === "name") return a.category.name.localeCompare(b.category.name, categoryLocale);
            if (categorySort === "count-desc") return b.count - a.count || a.index - b.index;
            if (categorySort === "count-asc") return a.count - b.count || a.index - b.index;
            return a.index - b.index;
        });

    const filteredCategories = categoryItems.map(item => ({ ...item.category, __productCount: item.count, __originalIndex: item.index }));

    const categorySummary = document.querySelector("#category-list-summary");
    if (categorySummary) {
        categorySummary.textContent = `${filteredCategories.length} دسته از ${state.categories.length}`;
    }

    if (state.categories.length === 0 || filteredCategories.length === 0) {

        DOM.categoriesList.innerHTML = `

            <div class="admin-empty-state panel">
                <span class="admin-empty-state__icon" aria-hidden="true">◫</span>
                <strong>${state.categories.length ? "دسته‌بندی‌ای با این جستجو پیدا نشد" : "هنوز دسته‌بندی‌ای ثبت نشده است"}</strong>
                <span>${state.categories.length ? "عبارت جستجو یا مرتب‌سازی را تغییر دهید." : "برای مرتب‌سازی منو، اولین دسته‌بندی را اضافه کنید."}</span>
            </div>

        `;

        return;

    }


    DOM.categoriesList.innerHTML =
        filteredCategories
            .map(
                (category, index) => `

                    <article
                        class="admin-category-card"
                        data-category-id="${escapeAttribute(
                            category.id
                        )}"
                    >

                        <div class="category-admin-info">
                            <span class="category-admin-index">${String(index + 1).padStart(2, "0")}</span>
                            <div class="category-admin-image">
                                ${category.image ? `<img src="${escapeAttribute(resolveAdminAssetUrl(category.image))}" alt="" loading="lazy">` : `<span aria-hidden="true">◫</span>`}
                            </div>
                            <div class="category-admin-copy">
                                <span class="category-admin-name">${escapeHTML(category.name)}</span>
                                <span class="category-admin-meta">${category.__productCount || 0} محصول</span>
                            </div>
                        </div>


                        <div class="admin-category-actions">

                            <button class="icon-button" type="button" aria-label="ویرایش ${escapeAttribute(category.name)}" data-category-action="edit" data-category-id="${escapeAttribute(category.id)}">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 16.8-.8 3.5 3.5-.8L18.6 8.1a1.8 1.8 0 0 0 0-2.5l-.2-.2a1.8 1.8 0 0 0-2.5 0L4.5 16.8Z"></path><path d="m14.8 6.2 3 3"></path></svg><span class="action-label">ویرایش</span>
                            </button>

                            <button class="icon-button danger" type="button" aria-label="حذف ${escapeAttribute(category.name)}" data-category-action="delete" data-category-id="${escapeAttribute(category.id)}">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 7h13M9.5 7V4.8h5V7M8 10v7.5M12 10v7.5M16 10v7.5M7 7l.7 12.1h8.6L17 7"></path></svg><span class="action-label">حذف</span>
                            </button>

                        </div>

                    </article>

                `
            )
            .join("");


    DOM.categoriesList
        .querySelectorAll(
            "[data-category-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.categoryId;

                        const action =
                            button.dataset.categoryAction;


                        if (action === "edit") {

                            openCategoryModal(id);

                        }


                        if (action === "delete") {

                            deleteCategory(id);

                        }

                    }
                );

            }
        );

}


/* =========================================================
   CATEGORY MODAL
========================================================= */

function openCategoryModal(categoryId = null) {

    if (
        !DOM.categoryModal ||
        !DOM.categoryForm
    ) {
        return;
    }


    state.editingCategoryId =
        categoryId;


    DOM.categoryForm.reset();


    DOM.categoryForm.elements.id.value =
        categoryId || "";


    if (categoryId) {

        const category =
            state.categories.find(
                item =>
                    item.id === categoryId
            );


        if (!category) {

            state.editingCategoryId =
                null;

            return;

        }


        DOM.categoryModalTitle.textContent =
            "ویرایش دسته‌بندی";


        DOM.categoryForm.elements.name.value =
            category.name || "";


        DOM.categoryForm.elements.image.value =
            category.image || "";

    } else {

        DOM.categoryModalTitle.textContent =
            "افزودن دسته‌بندی";

    }


    updateImagePreview(
        "category",
        DOM.categoryForm.elements.image.value
    );


    DOM.categoryModal.classList.add(
        "is-open"
    );


    DOM.categoryModal.setAttribute(
        "aria-hidden",
        "false"
    );

    requestAnimationFrame(() => DOM.categoryModal.querySelector("[data-close-category-modal]")?.focus());

    document.body.style.overflow =
        "hidden";

}


function closeCategoryModal() {

    if (!DOM.categoryModal) {
        return;
    }


    DOM.categoryModal.classList.remove(
        "is-open"
    );


    DOM.categoryModal.setAttribute(
        "aria-hidden",
        "true"
    );


    state.editingCategoryId =
        null;


    document.body.style.overflow =
        "";

}


/**
 * Create or update a category from the modal form.
 *
 * Category names are checked for duplicates by NAME, not by
 * generated id — the id always carries a Date.now() suffix
 * for uniqueness, so comparing by id can never detect two
 * categories that share a display name.
 */

async function handleCategorySubmit(event) {

    event.preventDefault();


    if (!DOM.categoryForm) {
        return;
    }


    const form =
        new FormData(
            DOM.categoryForm
        );


    const name =
        String(
            form.get("name") || ""
        ).trim();


    if (!name) {

        window.alert(
            "نام دسته‌بندی نمی‌تواند خالی باشد."
        );

        return;

    }


    const image =
        String(
            form.get("image") || ""
        ).trim();


    const duplicate =
        state.categories.some(
            item =>
                item.id !== state.editingCategoryId &&
                item.name.trim().toLowerCase() ===
                    name.toLowerCase()
        );


    if (duplicate) {

        window.alert(
            "دسته‌بندی دیگری با این نام وجود دارد."
        );

        return;

    }


    const previousCategories = state.categories;
    const previousProducts = state.products;

    if (state.editingCategoryId) {
        state.categories = state.categories.map(item =>
            item.id === state.editingCategoryId ? { ...item, name, image } : item
        );
        state.products = state.products.map(product =>
            product.category === state.editingCategoryId ? { ...product, categoryName: name } : product
        );
    } else {
        state.categories = [...state.categories, { id: createId(name), name, image }];
    }

    if (!(await saveStateBundle())) {
        state.categories = previousCategories;
        state.products = previousProducts;
        renderAll();
        return;
    }

    renderAll();
    closeCategoryModal();

}


/* =========================================================
   IMAGE UPLOAD

   Reads a file from <input type="file">, downsizes it on an
   off-screen canvas, and stores the result as a base64 data
   URL directly on the hidden "image" field of whichever form
   it belongs to. No server involved — the encoded image
   becomes part of the same JSON blob already saved to
   localStorage.

   This trades real cross-device storage (still not possible
   without a backend) for a much better admin workflow: no
   more typing file paths or manually copying files into
   assets/. Because localStorage has a small quota (usually a
   few MB per browser), every image is resized/compressed
   before saving, and writes are checked so a full quota
   fails with a clear message instead of silently losing data.
========================================================= */

const IMAGE_UPLOAD_TARGETS = {

    product: {

        fileInput:
            () => DOM.productImageFile,

        preview:
            () => DOM.productImagePreview,

        placeholder:
            () => DOM.productImagePlaceholder,

        removeButton:
            () => DOM.productImageRemove,

        hiddenField:
            () => DOM.productForm?.elements.image

    },

    category: {

        fileInput:
            () => DOM.categoryImageFile,

        preview:
            () => DOM.categoryImagePreview,

        placeholder:
            () => DOM.categoryImagePlaceholder,

        removeButton:
            () => DOM.categoryImageRemove,

        hiddenField:
            () => DOM.categoryForm?.elements.image

    }

};


function initializeImageUploadFields() {

    Object.keys(IMAGE_UPLOAD_TARGETS).forEach(
        kind => {

            const target =
                IMAGE_UPLOAD_TARGETS[kind];

            const fileInput =
                target.fileInput();

            const removeButton =
                target.removeButton();


            fileInput?.addEventListener(
                "change",
                async event => {

                    const file =
                        event.target.files?.[0];


                    if (!file) {
                        return;
                    }


                    if (file.size > 12 * 1024 * 1024) {
                        window.alert("حجم فایل تصویر نباید بیشتر از ۱۲ مگابایت باشد.");
                        fileInput.value = "";
                        return;
                    }


                    if (
                        !file.type.startsWith(
                            "image/"
                        )
                    ) {

                        window.alert(
                            "لطفاً یک فایل تصویری انتخاب کنید."
                        );

                        fileInput.value =
                            "";

                        return;

                    }


                    try {

                        const dataUrl =
                            await compressImageFile(
                                file
                            );


                        const hiddenField =
                            target.hiddenField();


                        if (hiddenField) {

                            hiddenField.value =
                                dataUrl;

                        }


                        updateImagePreview(
                            kind,
                            dataUrl
                        );

                    } catch (error) {

                        console.error(
                            "Image compression error:",
                            error
                        );

                        window.alert(
                            "پردازش این عکس ممکن نشد. فایل دیگری را امتحان کنید."
                        );

                    } finally {

                        fileInput.value =
                            "";

                    }

                }
            );


            removeButton?.addEventListener(
                "click",
                () => {

                    const hiddenField =
                        target.hiddenField();


                    if (hiddenField) {

                        hiddenField.value =
                            "";

                    }


                    updateImagePreview(
                        kind,
                        ""
                    );

                }
            );

        }
    );

}


/**
 * Show/hide the preview image, placeholder text, and remove
 * button for one form ("product" or "category") based on the
 * current image value — a data URL, a legacy asset path, or
 * an empty string.
 */

function updateImagePreview(kind, value) {

    const target =
        IMAGE_UPLOAD_TARGETS[kind];


    if (!target) {
        return;
    }


    const preview =
        target.preview();

    const placeholder =
        target.placeholder();

    const removeButton =
        target.removeButton();


    const hasImage =
        Boolean(value);


    if (preview) {

        preview.src =
            hasImage ? resolveAdminAssetUrl(value) : "";

        preview.hidden =
            !hasImage;

    }


    if (placeholder) {

        placeholder.hidden =
            hasImage;

    }


    if (removeButton) {

        removeButton.hidden =
            !hasImage;

    }

}


/**
 * Downscale an image file to at most maxDimension on its
 * longest side and re-encode it as a compressed JPEG data
 * URL, keeping localStorage usage per image small.
 */

function compressImageFile(
    file,
    maxDimension = 900,
    quality = 0.72
) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onerror =
                () => reject(reader.error);


            reader.onload = () => {

                const image =
                    new Image();


                image.onerror =
                    () => reject(
                        new Error(
                            "Could not read image."
                        )
                    );


                image.onload = () => {

                    const scale =
                        Math.min(
                            1,
                            maxDimension /
                                Math.max(
                                    image.width,
                                    image.height
                                )
                        );


                    const canvas =
                        document.createElement(
                            "canvas"
                        );

                    canvas.width =
                        Math.round(
                            image.width * scale
                        );

                    canvas.height =
                        Math.round(
                            image.height * scale
                        );


                    const context =
                        canvas.getContext("2d");

                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                    resolve(
                        canvas.toDataURL(
                            "image/jpeg",
                            quality
                        )
                    );

                };


                image.src =
                    reader.result;

            };


            reader.readAsDataURL(file);

        }
    );

}


/* =========================================================
   DELETE CATEGORY
========================================================= */

async function deleteCategory(categoryId) {

    const productCount =
        state.products.filter(
            product =>
                product.category === categoryId
        ).length;


    if (productCount > 0) {

        window.alert(
            "این دسته‌بندی دارای محصول است. ابتدا محصولات آن را جابه‌جا یا حذف کنید."
        );

        return;

    }


    const category =
        state.categories.find(
            item =>
                item.id === categoryId
        );


    if (!category) {
        return;
    }


    const confirmed =
        window.confirm(
            `آیا دسته «${category.name}» حذف شود؟`
        );


    if (!confirmed) {
        return;
    }


    const previousCategories = state.categories;
    state.categories = state.categories.filter(item => item.id !== categoryId);

    if (!(await saveCategories())) {
        state.categories = previousCategories;
        return;
    }

    renderAll();

}


/* =========================================================
   SETTINGS
========================================================= */

function initializeSettings() {

    DOM.settingsForm?.addEventListener(
        "submit",
        handleSettingsSubmit
    );

}


function renderSettings() {

    const form =
        DOM.settingsForm;


    if (!form) {
        return;
    }


    form.elements.name.value =
        state.restaurant.name || "";


    form.elements.tagline.value =
        state.restaurant.tagline || "";


    form.elements.description.value =
        state.restaurant.description || "";


    form.elements.phone.value =
        state.restaurant.phone || "";


    form.elements.address.value =
        state.restaurant.address || "";


    form.elements.instagram.value =
        state.restaurant.instagram === "#" ? "" : (state.restaurant.instagram || "");

    document.dispatchEvent(new CustomEvent("romano:settings-rendered"));

}


async function handleSettingsSubmit(event) {

    event.preventDefault();


    const form =
        new FormData(
            DOM.settingsForm
        );


    const name =
        String(
            form.get("name") || ""
        ).trim();


    const instagram =
        String(
            form.get("instagram") || ""
        ).trim();


    if (instagram && instagram !== "#") {

        try {

            const url = new URL(instagram);

            if (!["https:", "http:"].includes(url.protocol)) {
                throw new Error("invalid-protocol");
            }

        } catch (_) {

            window.alert(
                "لینک Instagram معتبر نیست."
            );

            return;

        }

    }


    if (!name) {

        window.alert(
            "نام رستوران الزامی است."
        );

        return;

    }


    const previousRestaurant = state.restaurant;
    state.restaurant = {
        ...state.restaurant,
        name: name.slice(0, 120),
        tagline: String(form.get("tagline") || "").trim().slice(0, 180),
        description: String(form.get("description") || "").trim().slice(0, 1200),
        phone: String(form.get("phone") || "").trim().slice(0, 40),
        address: String(form.get("address") || "").trim().slice(0, 500),
        instagram: instagram === "#" ? "" : instagram.slice(0, 500)
    };

    if (!(await saveRestaurant())) {
        state.restaurant = previousRestaurant;
        renderSettings();
        return;
    }

    renderDashboard();
    window.alert("تنظیمات با موفقیت ذخیره شد.");

}


/* =========================================================
   ADMIN SESSION
========================================================= */

async function logoutAdmin() {
    try {
        if (window.RomanoAPI?.enabled) await window.RomanoAPI.logout();
    } catch (error) { console.error("Admin logout error:", error); }
    window.location.reload();
}

/* =========================================================
   HELPERS
========================================================= */

function resolveAdminAssetUrl(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (/^(?:data:|blob:|https?:|\/|\.\.\/)/i.test(raw)) return raw;
    if (raw.startsWith("./assets/")) return `../${raw.slice(2)}`;
    if (raw.startsWith("assets/")) return `../${raw}`;
    return raw;
}


function createId(value) {

    const base =
        String(value || "")
            .toLowerCase()
            .trim()
            .replace(
                /[^a-z0-9\u0600-\u06ff]+/gi,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );


    const entropy =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).slice(2, 10);

    return (
        (base || "item") +
        "-" +
        Date.now() +
        "-" +
        entropy
    );

}


function formatPrice(price) {

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        return window.ROMANO_ADMIN_I18N?.get?.("قیمت ثبت نشده") || "قیمت ثبت نشده";
    }

    const language = window.ROMANO_ADMIN_I18N?.language || document.documentElement.lang || "fa";
    const locale =
        language === "en" ? "en-US" :
        language === "tr" ? "tr-TR" :
        language === "ar" ? "ar" :
        "fa-IR";
    const currency = window.ROMANO_ADMIN_I18N?.get?.("تومان") || " تومان";

    return new Intl.NumberFormat(locale).format(numericPrice) + currency;
}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

    return escapeHTML(value);

}