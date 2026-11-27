/* Customer browsing controls. Uses the shared catalog and product renderer. */
"use strict";
(() => {
    let query = "", category = "all", order = "menu", onlyFavorites = false;
    let selected = new Set();
    let initialized = false;
    let openPanel = null, railMarkup = "";
    const byId = id => document.getElementById(id);
    const icons = { search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', filter: '<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="17" r="2"/>' };
    const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]}</svg>`;
    const key = () => `romano_favorites:${window.RomanoDemoBranches?.scope(restaurantSlug) ?? restaurantSlug}`;
    const t = (name, value) => window.ROMANO_I18N.ui(name, value);
    const esc = value => escapeHTML(value);
    const numeral = value => new Intl.NumberFormat(window.ROMANO_I18N.language).format(value);
    function readFavorites() {
        try { const stored = JSON.parse(localStorage.getItem(key()) || "[]"); selected = new Set(Array.isArray(stored) ? stored.filter(id => typeof id === "string").slice(0,2000) : []); } catch (_) { selected = new Set(); }
    }
    function normalize(value) {
        return String(value || "").toLocaleLowerCase(window.ROMANO_I18N.language).normalize("NFKD").replace(/\p{M}/gu, "").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/ı/g,"i").replace(/[\u200c\u0640]/g," ");
    }
    let cachedQuery = null, cachedLocale = null, terms = [];
    let searchIndex = new WeakMap();
    function queryTerms() {
        const locale = window.ROMANO_I18N.language;
        if (cachedQuery !== query || cachedLocale !== locale) {
            cachedQuery = query;
            cachedLocale = locale;
            terms = normalize(query).trim().split(/\s+/).filter(Boolean);
        }
        return terms;
    }
    function matches(product) {
        if (category !== "all" && product.category !== category) return false;
        if (onlyFavorites && !selected.has(product.id)) return false;
        const words = queryTerms();
        if (!words.length) return true;
        const locale = window.ROMANO_I18N.language;
        let entry = searchIndex.get(product);
        if (!entry || entry.locale !== locale) {
            const localized = window.ROMANO_I18N.localizeProduct(product);
            entry = { locale, text: normalize([localized.name,localized.description,localized.categoryName,product.name,product.description].join(" ")) };
            searchIndex.set(product, entry);
        }
        return words.every(word => entry.text.includes(word));
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
        const sortSelect=byId('menu-sort');
        const optionMarkup=[['menu','sortMenu'],['low','sortLow'],['high','sortHigh']].map(([value,k])=>`<option value="${value}">${esc(t(k))}</option>`).join('');
        if(sortSelect.dataset.locale!==window.ROMANO_I18N.language){sortSelect.innerHTML=optionMarkup;sortSelect.dataset.locale=window.ROMANO_I18N.language;}
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
        const nextMarkup = available.map(c=>{
            const name=window.ROMANO_I18N.localizeCategory(c).name;
            const photo=c.image ? `<img src="${escapeAttribute(c.image)}" alt="${escapeAttribute(name)}" loading="lazy" decoding="async">` : esc(getImageFallbackLabel(name));
            return `<button type="button" data-browse-category="${esc(c.id)}" aria-pressed="false"><span class="browse-rail-photo" aria-hidden="true">${photo}</span><span class="browse-rail-label">${esc(name)}</span><span class="browse-rail-count">${numeral(getProductsByCategory(c.id).length)}</span></button>`;
        }).join('');
        // Keep the horizontal scroll position and keyboard focus during live search.
        if (nextMarkup!==railMarkup) {
            const focus=rail.contains(document.activeElement)?document.activeElement.dataset.browseCategory:null;
            const offset=rail.scrollLeft;
            rail.innerHTML=nextMarkup; railMarkup=nextMarkup; rail.scrollLeft=offset;
            if(focus) [...rail.querySelectorAll('button')].find(b=>b.dataset.browseCategory===focus)?.focus({preventScroll:true});
        }
        rail.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.browseCategory===category)));
        byId('menu-search-toggle').setAttribute('aria-label',t('searchSr'));
        byId('menu-filter-toggle').setAttribute('aria-label',t(onlyFavorites||order!=='menu'||category!=='all'?'browseFiltersActive':'browseFilters'));
        byId('menu-filter-title').textContent=t('browseFilters');
        byId('menu-search-toggle').classList.toggle('has-value',Boolean(query.trim()));
        byId('menu-filter-toggle').classList.toggle('has-value',onlyFavorites||order!=='menu'||category!=='all');
        byId('menu-search-active').textContent=query.trim()?t('browseSearchActive',query.trim()):'';
        byId('menu-search-active').hidden=!query.trim();
        syncHearts();
        updateStatus();
    }
    function updateStatus() {
        if (!initialized) return;
        const count = menuProducts.filter(p=>isAvailableProduct(p)&&matches(p)).length;
        document.querySelector('#menu-result-count').textContent = t('resultCount', numeral(count));
        const messageKey = {loading:'menuLoading',offline:'menuOffline',unavailable:'menuUnavailable'}[menuDataMode];
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
    function setPanel(name, restoreFocus=false) {
        const previous=openPanel;
        openPanel=name;
        if(name)window.RamenOverlayHistory.enter("browse",()=>setPanel(null,true));
        else if(previous)window.RamenOverlayHistory.leave("browse");
        for(const id of ['search','filter']) {
            byId(`menu-${id}-panel`).hidden=name!==id;
            byId(`menu-${id}-toggle`).setAttribute('aria-expanded',String(name===id));
        }
        if(name==='search') byId('rv4-menu-search').focus({preventScroll:true});
        else if(name==='filter') byId('menu-sort').focus({preventScroll:true});
        else if(restoreFocus&&previous) byId(`menu-${previous}-toggle`).focus({preventScroll:true});
    }
    function selectCategory(id, reset=false) {
        if(!initialized || (id!=='all' && !menuCategories.some(c=>c.id===id && c.active!==false && getProductsByCategory(c.id).length)))return false;
        category=id;
        if(reset) {query='';order='menu';onlyFavorites=false;byId('rv4-menu-search').value='';setPanel(null);}
        redraw();
        return true;
    }
    function init() {
        if (initialized) return;
        initialized = true;
        readFavorites();
        const section = document.querySelector('#menu');
        const controls = document.createElement('div');
        controls.className='menu-browser';
        controls.innerHTML = `<div class="r17-browse-row"><div class="menu-icon-actions"><button type="button" id="menu-filter-toggle" aria-expanded="false" aria-controls="menu-filter-panel">${icon('filter')}</button></div><div id="rv4-category-rail" class="browse-category-rail" role="group"></div></div>
          <div id="menu-search-active" class="browse-query" hidden></div>
          <div id="menu-search-panel" class="browse-panel" hidden><div class="menu-search-field">${icon('search')}<label class="sr-only" for="rv4-menu-search"></label><input id="rv4-menu-search" type="search" autocomplete="off" aria-controls="menu-categories"></div></div>
          <div id="menu-filter-panel" class="browse-panel" hidden><h3 id="menu-filter-title"></h3><div class="menu-tools"><label for="menu-sort" id="menu-sort-label" class="sr-only"></label><select id="menu-sort"></select><button id="menu-favorites-toggle" type="button" aria-pressed="false"></button><button id="menu-reset" type="button"></button></div></div>`;
        const header = document.querySelector('#site-header');
        const host = document.querySelector('#r17-browse-host');
        (host || header).append(controls);
        const search = document.createElement('button');
        search.type = 'button';
        search.id = 'menu-search-toggle';
        search.setAttribute('aria-expanded','false');
        search.setAttribute('aria-controls','menu-search-panel');
        search.innerHTML = icon('search');
        controls.querySelector('.menu-icon-actions').append(search);
        const accessibleHeading = document.createElement('div');
        accessibleHeading.className = 'sr-only';
        accessibleHeading.innerHTML = '<h2 id="browse-title"></h2><span id="menu-result-count" role="status" aria-live="polite"></span><p id="browse-hint"></p>';
        section.prepend(accessibleHeading);
        // Keep the data-mode disclosure compact and adjacent to the browse controls.
        const status=document.createElement('div');status.id='menu-data-status';status.className='menu-data-status';status.setAttribute('role','status');status.innerHTML='<span></span><button type="button"></button>';section.prepend(status);
        section.setAttribute('aria-labelledby','browse-title');
        const live=document.createElement('div');live.id='menu-announcement';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.appendChild(live);
        const measure=()=>{
            const height = Math.ceil(header.getBoundingClientRect().height);
            document.documentElement.style.setProperty('--r17-header-height', height + 'px');
            const nav = document.querySelector('.ramen-bottom-nav');
            const reserve = nav && getComputedStyle(nav).display !== 'none' ? Math.ceil(nav.getBoundingClientRect().height + (parseFloat(getComputedStyle(nav).bottom) || 0)) : 0;
            document.documentElement.style.setProperty('--customer-nav-reserve', reserve + 'px');
            section.style.setProperty('--browse-header-offset', height + 'px');
            section.style.setProperty('--browse-bar-height', '0px');
        };
        if('ResizeObserver' in window){const observer=new ResizeObserver(measure);observer.observe(controls);const header=document.querySelector('.site-header');if(header)observer.observe(header);}
        window.addEventListener('resize',measure,{passive:true});measure();
        for(const id of ['search','filter']) byId(`menu-${id}-toggle`).addEventListener('click',()=>setPanel(openPanel===id?null:id,openPanel===id));
        header.addEventListener('keydown',event=>{if(event.key==='Escape'&&openPanel){event.preventDefault();event.stopPropagation();setPanel(null,true);}});
        document.addEventListener('click',event=>{if(openPanel&&!header.contains(event.target))setPanel(null,header.contains(document.activeElement));});
        const searchInput=controls.querySelector('#rv4-menu-search');
        const updateQuery=()=>{
            const previous=queryTerms().join(' ');
            query=searchInput.value;
            if(previous===queryTerms().join(' '))refreshLabels();
            else redraw();
        };
        searchInput.addEventListener('input',event=>{if(!event.isComposing)updateQuery();});
        searchInput.addEventListener('compositionend',updateQuery);
        controls.querySelector('#rv4-menu-search').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();setPanel(null,true);section.scrollIntoView({behavior:'auto',block:'start'});}});
        controls.querySelector('#menu-sort').addEventListener('change',event=>{order=event.target.value;redraw();});
        controls.querySelector('#menu-favorites-toggle').addEventListener('click',()=>{onlyFavorites=!onlyFavorites;redraw();});
        controls.querySelector('#menu-reset').addEventListener('click',()=>{query='';category='all';onlyFavorites=false;order='menu';controls.querySelector('input').value='';redraw();setPanel(null,true);});
        controls.querySelector('#rv4-category-rail').addEventListener('click',event=>{const button=event.target.closest('[data-browse-category]');if(!button)return;setPanel(null);selectCategory(category===button.dataset.browseCategory?'all':button.dataset.browseCategory);button.focus({preventScroll:true});section.scrollIntoView({behavior:'auto',block:'start'});});
        status.querySelector('button').addEventListener('click',()=>location.reload());
        document.addEventListener('click',event=>{
            const button=event.target.closest('[data-favorite-product]');if(!button)return;
            const id=button.dataset.favoriteProduct;if(!getProductById(id))return;
            if(selected.has(id))selected.delete(id);else selected.add(id);
            let saved=true;try{localStorage.setItem(key(),JSON.stringify([...selected]));}catch(_){saved=false;}
            announce(t(saved ? selected.has(id) ? 'favoriteSaved' : 'favoriteRemoved' : 'favoriteSession'));
            if(onlyFavorites)redraw();else refreshLabels();
        });
        document.addEventListener('romano:product-opened',()=>{
            setPanel(null);
            const content=DOM.productModal.querySelector('.modal-content');
            content.querySelector('.modal-favorite-row')?.remove();
            const row=document.createElement('div');row.className='modal-favorite-row';row.innerHTML=favoriteButton(window.RomanoActiveProduct.id);content.appendChild(row);
            const actions=content.querySelector('.rv4-modal-actions');if(actions)content.appendChild(actions);
        });
        document.addEventListener('romano:catalog-rendered',()=>{syncHearts();updateStatus();});
        document.addEventListener('romano:language-changed',refreshLabels);
        window.addEventListener('romano:data-updated',()=>{searchIndex=new WeakMap();refreshLabels();renderMenuCategories();});
        window.addEventListener('storage',event=>{if(event.key===key()||event.key===null){readFavorites();redraw();}});
        document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target.closest('input,textarea,select,[contenteditable]')&&!DOM.body.classList.contains('modal-open')&&!DOM.body.classList.contains('commerce-open')&&!document.querySelector('dialog[open]')){event.preventDefault();section.scrollIntoView({behavior:'auto',block:'start'});setPanel('search');}});
        refreshLabels();
    }
    window.RomanoMenuExperience=Object.freeze({init,matches,sort,favoriteButton,selectCategory});
})();
