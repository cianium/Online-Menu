/* Customer browsing controls. Uses the shared catalog and product renderer. */
"use strict";
(() => {
    let query = "", category = "all", order = "menu", onlyFavorites = false;
    let selected = new Set();
    let initialized = false;
    const key = () => `romano_favorites:${restaurantSlug}`;
    const t = (name, value) => window.ROMANO_I18N.ui(name, value);
    const esc = value => escapeHTML(value);
    const numeral = value => new Intl.NumberFormat(window.ROMANO_I18N.language).format(value);
    function readFavorites() {
        try { const stored = JSON.parse(localStorage.getItem(key()) || "[]"); selected = new Set(Array.isArray(stored) ? stored.filter(id => typeof id === "string").slice(0,2000) : []); } catch (_) { selected = new Set(); }
    }
    function normalize(value) {
        return String(value || "").toLocaleLowerCase(window.ROMANO_I18N.language).normalize("NFKD").replace(/\p{M}/gu, "").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/ı/g,"i").replace(/[\u200c\u0640]/g," ");
    }
    function matches(product) {
        if (category !== "all" && product.category !== category) return false;
        if (onlyFavorites && !selected.has(product.id)) return false;
        const localized = window.ROMANO_I18N.localizeProduct(product);
        const text = normalize([localized.name,localized.description,localized.categoryName,product.name,product.description].join(" "));
        return normalize(query).trim().split(/\s+/).every(word => text.includes(word));
    }
    function sort(items) {
        if (order === "menu") return items;
        return [...items].sort((a,b) => {
            if (!(a.price>0)) return b.price>0 ? 1 : 0;
            if (!(b.price>0)) return -1;
            return order === "low" ? a.price-b.price : b.price-a.price;
        });
    }
    function favoriteButton(id) {
        const saved = selected.has(id);
        return `<button type="button" class="menu-favorite" data-favorite-product="${esc(id)}" aria-pressed="${saved}" aria-label="${esc(t(saved ? 'removeFavorite' : 'saveFavorite'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 5.5a5 5 0 0 0-7.1 0L12 6.9l-1.4-1.4a5 5 0 0 0-7.1 7.1L12 21l8.5-8.4a5 5 0 0 0 0-7.1Z"/></svg></button>`;
    }
    function syncHearts() {
        document.querySelectorAll('[data-favorite-product]').forEach(button => {
            const saved = selected.has(button.dataset.favoriteProduct);
            button.setAttribute('aria-pressed', String(saved));
            button.setAttribute('aria-label', t(saved ? 'removeFavorite' : 'saveFavorite'));
        });
    }
    function announce(message) {
        const node = document.querySelector('#menu-announcement');
        node.textContent = message;
        clearTimeout(node._timer);
        node._timer = setTimeout(()=>node.textContent="",5000);
    }
    function refreshLabels() {
        if (!initialized) return;
        const input = document.querySelector('#rv4-menu-search');
        input.placeholder = t('searchMenu');
        document.querySelector('[for=rv4-menu-search]').textContent = t('searchSr');
        document.querySelector('#browse-title').textContent = t('menuIntro');
        document.querySelector('#browse-hint').textContent = t('menuHint');
        document.querySelector('#menu-sort-label').textContent = t('sortLabel');
        document.querySelector('#menu-sort').innerHTML = [['menu','sortMenu'],['low','sortLow'],['high','sortHigh']].map(([value,k])=>`<option value="${value}">${esc(t(k))}</option>`).join('');
        document.querySelector('#menu-sort').value = order;
        document.querySelector('#menu-reset').textContent = t('clearFilters');
        const count = menuProducts.filter(p=>isAvailableProduct(p)&&selected.has(p.id)).length;
        const favorite = document.querySelector('#menu-favorites-toggle');
        favorite.textContent = `${t('favorites')} · ${numeral(count)}`;
        favorite.setAttribute('aria-pressed', String(onlyFavorites));
        const available = menuCategories.filter(c=>c.active!==false&&getProductsByCategory(c.id).length);
        if (category !== "all" && !available.some(c=>c.id===category)) category="all";
        const rail = document.querySelector('#rv4-category-rail');
        rail.setAttribute('aria-label', t('categories'));
        rail.innerHTML = `<button type="button" data-browse-category="all" aria-pressed="${category==='all'}">${esc(t('allCategories'))}</button>` + available.map(c=>`<button type="button" data-browse-category="${esc(c.id)}" aria-pressed="${category===c.id}">${esc(window.ROMANO_I18N.localizeCategory(c).name)} <span>${numeral(getProductsByCategory(c.id).length)}</span></button>`).join('');
        syncHearts();
        updateStatus();
    }
    function updateStatus() {
        if (!initialized) return;
        const count = menuProducts.filter(p=>isAvailableProduct(p)&&matches(p)).length;
        document.querySelector('#menu-result-count').textContent = t('resultCount', numeral(count));
        const messageKey = {loading:'menuLoading',demo:'menuDemo',offline:'menuOffline',unavailable:'menuUnavailable'}[menuDataMode];
        const status = document.querySelector('#menu-data-status');
        status.hidden = !messageKey;
        status.querySelector('span').textContent = messageKey ? t(messageKey) : '';
        status.querySelector('button').textContent = t('retry');
        status.querySelector('button').hidden = !['offline','unavailable'].includes(menuDataMode);
        document.querySelector('#menu').setAttribute('aria-busy', String(menuDataMode==='loading'));
        document.querySelector('#menu-empty')?.remove();
        if (!count && !['loading','unavailable'].includes(menuDataMode)) {
            const hasProducts = menuProducts.some(isAvailableProduct);
            const noFavorites = onlyFavorites && !menuProducts.some(p=>isAvailableProduct(p)&&selected.has(p.id));
            const title = !hasProducts ? 'emptyMenu' : noFavorites ? 'noFavorites' : 'noMatches';
            const hint = !hasProducts ? 'emptyMenuHint' : noFavorites ? 'noFavoritesHint' : 'noMatchesHint';
            const empty = document.createElement('div');
            empty.id='menu-empty'; empty.className='menu-empty';
            empty.innerHTML=`<h3>${esc(t(title))}</h3><p>${esc(t(hint))}</p>`;
            DOM.menuCategories.appendChild(empty);
        }
    }
    function redraw() { refreshLabels(); renderMenuCategories(); initializeCategoryObserver(); }
    function init() {
        if (initialized) return;
        initialized = true;
        readFavorites();
        const section = document.querySelector('#menu');
        const controls = document.createElement('div');
        controls.className='menu-browser';
        controls.innerHTML = `<div class="menu-browser-heading"><div><span class="section-eyebrow">ROMANO</span><h2 id="browse-title"></h2><p id="browse-hint"></p></div></div>
          <div id="menu-data-status" class="menu-data-status" role="status"><span></span><button type="button"></button></div>
          <div class="menu-controls"><div class="menu-search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><label class="sr-only" for="rv4-menu-search"></label><input id="rv4-menu-search" type="search" autocomplete="off" aria-controls="menu-categories"></div><button id="menu-favorites-toggle" type="button" aria-pressed="false"></button></div>
          <div id="rv4-category-rail" class="browse-category-rail"></div>
          <div class="menu-tools"><span id="menu-result-count" role="status" aria-live="polite"></span><label for="menu-sort" id="menu-sort-label" class="sr-only"></label><select id="menu-sort"></select><button id="menu-reset" type="button"></button></div>`;
        section.prepend(controls);
        section.setAttribute('aria-labelledby','browse-title');
        const live=document.createElement('div');live.id='menu-announcement';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.appendChild(live);
        controls.querySelector('#rv4-menu-search').addEventListener('input',event=>{query=event.target.value;redraw();});
        controls.querySelector('#menu-sort').addEventListener('change',event=>{order=event.target.value;redraw();});
        controls.querySelector('#menu-favorites-toggle').addEventListener('click',()=>{onlyFavorites=!onlyFavorites;redraw();});
        controls.querySelector('#menu-reset').addEventListener('click',()=>{query='';category='all';onlyFavorites=false;order='menu';controls.querySelector('input').value='';redraw();controls.querySelector('input').focus();});
        controls.querySelector('#rv4-category-rail').addEventListener('click',event=>{const button=event.target.closest('[data-browse-category]');if(!button)return;category=button.dataset.browseCategory;redraw();controls.querySelectorAll('[data-browse-category]').forEach(b=>{if(b.dataset.browseCategory===category)b.focus();});});
        controls.querySelector('#menu-data-status button').addEventListener('click',()=>location.reload());
        document.addEventListener('click',event=>{
            const button=event.target.closest('[data-favorite-product]');if(!button)return;
            const id=button.dataset.favoriteProduct;if(!getProductById(id))return;
            if(selected.has(id))selected.delete(id);else selected.add(id);
            let saved=true;try{localStorage.setItem(key(),JSON.stringify([...selected]));}catch(_){saved=false;}
            announce(t(saved ? selected.has(id) ? 'favoriteSaved' : 'favoriteRemoved' : 'favoriteSession'));
            if(onlyFavorites)redraw();else refreshLabels();
        });
        document.addEventListener('romano:product-opened',()=>{
            const content=DOM.productModal.querySelector('.modal-content');
            content.querySelector('.modal-favorite-row')?.remove();
            const row=document.createElement('div');row.className='modal-favorite-row';row.innerHTML=favoriteButton(window.RomanoActiveProduct.id);content.appendChild(row);
        });
        document.addEventListener('romano:catalog-rendered',()=>{syncHearts();updateStatus();});
        document.addEventListener('romano:language-changed',refreshLabels);
        window.addEventListener('romano:data-updated',()=>{refreshLabels();renderMenuCategories();});
        window.addEventListener('storage',event=>{if(event.key===key()||event.key===null){readFavorites();redraw();}});
        document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target.closest('input,textarea,select,[contenteditable]')&&!DOM.body.classList.contains('modal-open')){event.preventDefault();controls.querySelector('input').focus();}});
        refreshLabels();
    }
    window.RomanoMenuExperience=Object.freeze({init,matches,sort,favoriteButton});
})();
