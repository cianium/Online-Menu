/* Start a static preview; set ADMIN_TEST_URL and optionally CHROMIUM_EXECUTABLE_PATH.
   Requires Playwright. Public API responses below are mocked, not a database test. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let pw;try{pw=require('playwright')}catch(e){if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw e;pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright')}
const base=process.env.ADMIN_TEST_URL||'http://127.0.0.1:8765';
const out=path.resolve(process.env.BROWSER_EVIDENCE_DIR||path.join(__dirname,'../docs/qa'));fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];let browser;
async function check(name,fn){await fn();results.push(name);console.log('PASS',name)}
async function ready(p){
 await p.waitForFunction(()=>typeof menuDataMode!=='undefined'&&menuDataMode!=='loading'&&Boolean(document.querySelector('.main-navigation')?.__romanoFocus));
 await p.locator('#splash-screen').waitFor({state:'detached'});
}
(async()=>{
 browser=await pw.chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 ctx.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));
 const p=await ctx.newPage();await p.goto(base);await ready(p);
 const cards=p.locator('#menu .product-card');
 await check('Static demo boots with 21 products',async()=>{assert.equal(await cards.count(),21);assert.equal(await p.evaluate(()=>menuDataMode),'demo')});
 await check('Bottom navigation keeps the requested physical order and opens an independent contact dialog',async()=>{
  const expected=['cart','menu','home','featured','contact'];
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   for(const width of [320,390]){
    await p.setViewportSize({width,height:844});
    const actual=await p.locator('.ramen-bottom-link').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.ramenNav||'cart',x:n.getBoundingClientRect().left})).sort((a,b)=>a.x-b.x).map(n=>n.id));
    assert.deepEqual(actual,expected,lang+'/'+width);
   }
   const trigger=p.locator('[data-ramen-nav="contact"]');
   assert.equal(await trigger.getAttribute('role'),'button');
   assert.equal(await trigger.getAttribute('aria-controls'),null);
   await trigger.focus();
   await trigger.press('Space');
   const dialog=p.locator('#ramen-contact-dialog');
   assert.equal(await dialog.evaluate(d=>d.open),true);
   assert.equal(await trigger.getAttribute('aria-expanded'),'true');
   assert.equal(await trigger.getAttribute('aria-controls'),'ramen-contact-dialog');
   assert.ok((await dialog.locator('h2').innerText()).trim());
   assert.equal(await dialog.locator('a[href^="tel:"]').count(),0,'sample phone must not initiate a call');
   assert.equal(await dialog.locator('.ramen-contact-item > span[dir="ltr"]').count(),1);
   assert.equal(await dialog.locator('.ramen-contact-item > span[dir="ltr"]').evaluate(n=>getComputedStyle(n).direction),'ltr');
   assert.equal(await p.locator('[data-restaurant-phone]').evaluate(n=>getComputedStyle(n).direction),'ltr');
   await p.keyboard.press('Escape');
   await p.waitForFunction(()=>!document.querySelector('#ramen-contact-dialog').open && document.querySelector('[data-ramen-nav="contact"]').getAttribute('aria-expanded')==='false');
   assert.equal(await trigger.evaluate(n=>document.activeElement===n),true);
   assert.equal(await trigger.getAttribute('aria-controls'),null);
  }
  await p.evaluate(()=>ROMANO_I18N.setLanguage('fa',false));
  await p.setViewportSize({width:390,height:844});
 });
 await check('Bottom navigation follows native section anchors and manual scrolling',async()=>{
  const featured=p.locator('[data-ramen-nav="featured"]');
  await featured.click();
  await p.waitForFunction(()=>document.querySelector('[data-ramen-nav="featured"]').getAttribute('aria-current')==='location');
  assert.equal(await p.evaluate(()=>location.hash),'#featured');
  await p.evaluate(()=>document.getElementById('menu').scrollIntoView({behavior:'instant'}));
  await p.waitForFunction(()=>document.querySelector('[data-ramen-nav="menu"]').getAttribute('aria-current')==='location');
  await p.evaluate(()=>{history.replaceState(null,'',location.pathname+location.search);window.scrollTo({top:0,behavior:'instant'});});
 });
 await check('Category-first hamburger, guest profile and local-only rating in four languages',async()=>{
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   await p.setViewportSize({width:390,height:844});
   await p.locator('#menu-toggle').click();
   const nav=p.locator('#main-navigation');
   await nav.locator('.navigation-category-list a').first().waitFor({state:'visible'});
   await p.waitForFunction(()=>Math.abs(document.querySelector('#main-navigation .navigation-inner')?.getBoundingClientRect().x||0)<=1);
   assert.equal(await nav.locator('.navigation-category-media img').count(),7);
   const bounds=await nav.locator('.navigation-inner').boundingBox(),overlay=await nav.boundingBox();
   assert.ok(bounds&&overlay&&Math.abs(bounds.height-overlay.height)<=2&&Math.abs(bounds.width-overlay.width)<=2,JSON.stringify({bounds,overlay}));
   assert.ok(Math.abs(bounds.x)<=1&&Math.abs(overlay.x)<=1&&Math.abs(bounds.width-390)<=2&&Math.abs(overlay.width-390)<=2,JSON.stringify({bounds,overlay}));
   const contentBounds=await nav.locator('.navigation-inner').evaluate(node=>{const outer=node.getBoundingClientRect(),style=getComputedStyle(node),left=outer.left+parseFloat(style.paddingLeft),right=outer.right-parseFloat(style.paddingRight);return {left,right,children:[...node.children].map(child=>{const rect=child.getBoundingClientRect();return {className:child.className,left:rect.left,right:rect.right};})};});
   assert.ok(contentBounds.children.every(child=>child.left>=contentBounds.left-1&&child.right<=contentBounds.right+1),'Navigation content escapes viewport padding '+lang+': '+JSON.stringify(contentBounds));
   for(const child of contentBounds.children){
    assert.ok(Math.abs(child.left-contentBounds.left)<=1 && Math.abs(child.right-contentBounds.right)<=1,'Navigation column shrinks in '+lang+': '+JSON.stringify(child));
   }
   const thumbnails=await nav.locator('.navigation-category-media img').evaluateAll(async images=>{
    await Promise.all(images.map(img=>img.decode()));
    return images.map(img=>{const frame=img.parentElement.getBoundingClientRect(),rect=img.getBoundingClientRect();return Math.abs(frame.width-rect.width)<=1 && Math.abs(frame.height-rect.height)<=1;});
   });
   assert.ok(thumbnails.length>0 && thumbnails.every(Boolean),'Category images must fill their frames in '+lang);
   if(lang==='fa')await p.screenshot({path:path.join(out,'customer-navigation-fa-390.png')});
   const categoryBounds=await nav.locator('.navigation-categories').boundingBox();
   assert.ok(categoryBounds && categoryBounds.height>0);
   assert.equal(await nav.locator('[data-nav-panel="profile"]').getAttribute('aria-label')!==null,true);
   await nav.locator('[data-nav-panel="profile"]').click();
   const dialog=p.locator('#ramen-contact-dialog');await dialog.waitFor({state:'visible'});
   assert.equal(await nav.getAttribute('aria-hidden'),'true');
   assert.equal(await dialog.locator('input[type="password"]').count(),0);
   await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   await p.locator('#menu-toggle').click();await nav.locator('[data-nav-panel="feedback"]').click();
   await dialog.waitFor({state:'visible'});
   await dialog.locator('input[name="demo-rating"][value="4"]').check();
   await dialog.locator('.feedback-comment textarea').fill('<b>Demo comment</b>');
   await dialog.locator('.feedback-save').click();
   const review=await p.evaluate(()=>JSON.parse(localStorage.getItem('online_menu_demo_review_v2:romano')));assert.equal(review.rating,4);assert.equal(review.status,'pending');assert.equal(review.comment,'<b>Demo comment</b>');
   await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   await p.locator('#menu-toggle').click();await nav.locator('[data-nav-panel="chat"]').click();
   await dialog.waitFor({state:'visible'});assert.ok((await dialog.locator('.ramen-contact-note').last().innerText()).trim());
   await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  }
  await p.evaluate(()=>{localStorage.removeItem('online_menu_demo_rating:romano');localStorage.removeItem('online_menu_demo_review_v2:romano');ROMANO_I18N.setLanguage('fa',false);});
 });
 await check('Hamburger navigation covers the complete desktop viewport',async()=>{
  await p.setViewportSize({width:1440,height:900});
  await p.reload();await ready(p);
  await p.evaluate(()=>ROMANO_I18N.setLanguage('fa',false));
  await p.evaluate(()=>openNavigation());
  await p.waitForFunction(()=>document.querySelector('#main-navigation')?.classList.contains('is-open'));
  await p.waitForTimeout(550);
  const geometry=await p.locator('#main-navigation .navigation-inner').evaluate(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth}});
  assert.ok(Math.abs(geometry.x)<=1&&Math.abs(geometry.y)<=1,JSON.stringify(geometry));
  assert.ok(Math.abs(geometry.width-1440)<=2&&Math.abs(geometry.height-900)<=2,JSON.stringify(geometry));
  assert.equal(geometry.scrollWidth,geometry.clientWidth);
  await p.locator('#navigation-close').click();
  await p.setViewportSize({width:390,height:844});
 });
 await check('Existing demo member can resume in another tab with the same name and phone',async()=>{
  const memberContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const first=await memberContext.newPage();
  await first.goto(base+'/?qr=demo');await ready(first);
  const firstEntry=first.locator('#customer-entry');await firstEntry.waitFor({state:'visible'});
  await firstEntry.locator('input[name="name"]').fill('Sample Customer');
  await firstEntry.locator('input[name="phone"]').fill('+12025550140');
  await firstEntry.locator('button[type="submit"]').click();
  await firstEntry.waitForFunction(()=>!document.querySelector('#customer-entry')?.open);
  const memberId=await first.evaluate(()=>sessionStorage.getItem(RomanoDemoMembers.activeKey));assert.ok(memberId);
  const second=await memberContext.newPage();
  await second.goto(base+'/?qr=demo');await ready(second);
  const secondEntry=second.locator('#customer-entry');await secondEntry.waitFor({state:'visible'});
  await secondEntry.locator('input[name="name"]').fill(' Sample   Customer ');
  await secondEntry.locator('input[name="phone"]').fill('+12025550140');
  await secondEntry.locator('button[type="submit"]').click();
  await second.waitForFunction(()=>!document.querySelector('#customer-entry')?.open);
  assert.equal(await second.evaluate(()=>sessionStorage.getItem(RomanoDemoMembers.activeKey)),memberId);
  assert.equal(await secondEntry.locator('[role="alert"]').textContent(),'');
  await memberContext.close();
 });
 await check('Category image fallback uses localized category initials, not brand/developer copy',async()=>{
  const fallback=await p.evaluate(()=>{
   const category=menuCategories.find(item=>item.active!==false);
   const localized=ROMANO_I18N.localizeCategory(category);
   const card=createCategoryCard({...category,image:''},0);
   return {value:card.querySelector('.image-fallback')?.textContent,name:localized.name};
  });
  assert.equal(fallback.value,fallback.name.trim().charAt(0));
 });
 await check('Product image fallbacks use localized product initials, not internal brand copy',async()=>{
  const fallback=await p.evaluate(()=>{
   const raw=menuProducts.find(isAvailableProduct);
   const localized=ROMANO_I18N.localizeProduct(raw);
   const card=createProductCard({...raw,image:''});
   const cardValue=card.querySelector('.image-fallback')?.textContent;
   const originalImage=raw.image;
   raw.image='';
   openProductModal(raw.id);
   const modalValue=document.querySelector('.modal-image-wrapper .image-fallback')?.textContent;
   closeProductModal();
   raw.image=originalImage;
   const broken=document.createElement('img');
   broken.alt=localized.name;
   const wrapper=document.createElement('div');
   wrapper.appendChild(broken);
   document.body.appendChild(wrapper);
   handleImageError(broken);
   const brokenValue=wrapper.querySelector('.image-fallback')?.textContent;
   wrapper.remove();
   return {name:localized.name,cardValue,modalValue,brokenValue};
  });
  const initial=Array.from(fallback.name.trim())[0];
  assert.equal(fallback.cardValue,initial);
  assert.equal(fallback.modalValue,initial);
  assert.equal(fallback.brokenValue,initial);
 });
 await check('Category cards and browsing rail respect RTL/LTR layout and touch behavior',async()=>{
  const categoryCard=p.locator('#categories-grid .category-card').first();
  const rail=p.locator('#rv4-category-rail');
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   const name=(await categoryCard.locator('.category-name').textContent()).trim();
   assert.equal(await p.locator('#categories-grid').getByRole('button',{name,exact:true}).count(),1);
   const arrow=await categoryCard.locator('.category-arrow').evaluate(node=>getComputedStyle(node).transform);
   assert.equal(arrow,['fa','ar'].includes(lang)?'matrix(-1, 0, 0, 1, 0, 0)':'none');
   assert.equal(await rail.evaluate(node=>getComputedStyle(node).scrollSnapType.includes('inline')),true,lang+' category rail snap');
   const buttons=rail.locator('button');
   assert.ok(await buttons.count()>1);
   assert.ok(await buttons.first().evaluate(node=>node.getBoundingClientRect().height>=44),lang+' category filter touch target');
  }
 });
 await check('Compact full-bleed product card matches the premium reference and remains accessible',async()=>{
  const card=cards.first(),button=card.locator('.product-card-button'),favorite=card.locator('[data-favorite-product]');
  await card.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
  assert.ok((await button.textContent()).trim());assert.equal(await button.isVisible(),true);
  const geometry=await card.evaluate(node=>{const card=node.getBoundingClientRect(),image=node.querySelector('.product-image-wrapper').getBoundingClientRect(),body=node.querySelector('.product-body').getBoundingClientRect(),heading=node.querySelector('.product-heading-row').getBoundingClientRect(),price=node.querySelector('.product-price').getBoundingClientRect(),cta=node.querySelector('.product-card-button').getBoundingClientRect(),heart=node.querySelector('[data-favorite-product]').getBoundingClientRect(),hit=document.elementFromPoint(heart.left+heart.width/2,heart.top+heart.height/2);return{card:{top:card.top,bottom:card.bottom,width:card.width,height:card.height},image:{width:image.width,height:image.height},body:{top:body.top,bottom:body.bottom},heading:{top:heading.top,bottom:heading.bottom},price:{top:price.top,bottom:price.bottom},ctaWidth:cta.width,heartHit:Boolean(hit&&hit.closest('[data-favorite-product]'))}});
  assert.ok(Math.abs(geometry.card.width-geometry.image.width)<=3&&Math.abs(geometry.card.height-geometry.image.height)<=3,JSON.stringify(geometry));
  assert.ok(geometry.card.height/geometry.card.width>=1.3&&geometry.card.height/geometry.card.width<=1.45,JSON.stringify(geometry));
  assert.ok(geometry.card.height<=430&&geometry.body.top>=geometry.card.top-2&&geometry.body.bottom<=geometry.card.bottom+2,JSON.stringify(geometry));
  assert.ok(geometry.price.top<geometry.heading.bottom&&geometry.price.bottom>geometry.heading.top);
  assert.ok(geometry.ctaWidth>geometry.card.width*.25);assert.equal(geometry.heartHit,true);
  await button.click();await p.waitForTimeout(450);const modal=await p.locator('.product-modal .modal-container').boundingBox();assert.ok(modal);assert.ok(Math.abs((modal.y+modal.height)-844)<2,JSON.stringify(modal));await p.keyboard.press('Escape');
 });
 await check('Product card metadata and modal close control follow RTL/LTR direction',async()=>{
  const expected={fa:'rtl',ar:'rtl',en:'ltr',tr:'ltr'};
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   const topline=cards.first().locator('.product-topline');
   assert.equal(await topline.evaluate(node=>getComputedStyle(node).direction),expected[lang],lang+' product metadata direction');
   const categoryLabel=cards.first().locator('.product-category');
   assert.equal(await categoryLabel.evaluate(node=>getComputedStyle(node).direction),expected[lang],lang+' product category direction');
   if(expected[lang]==='rtl')assert.ok(['normal','0px'].includes(await categoryLabel.evaluate(node=>getComputedStyle(node).letterSpacing)),lang+' product category must not use Latin tracking');
   await cards.first().locator('.product-card-button').click();
   assert.equal(await p.locator('.rv4-back-top').evaluate(node=>getComputedStyle(node).visibility),'hidden',lang+' back-to-top must be hidden while modal is open');
   assert.equal(await p.locator('.rv4-back-top').evaluate(node=>getComputedStyle(node).pointerEvents),'none',lang+' back-to-top must not intercept modal interaction');
   const geometry=await p.locator('.product-modal .modal-container').evaluate(container=>{
    const panel=container.getBoundingClientRect(),close=container.querySelector('.modal-close').getBoundingClientRect();
    return {panelLeft:panel.left,panelRight:panel.right,closeLeft:close.left,closeRight:close.right};
   });
   if(expected[lang]==='rtl')assert.ok(geometry.closeRight>=geometry.panelRight-20,lang+' modal close must sit at inline-start/right: '+JSON.stringify(geometry));
   else assert.ok(geometry.closeLeft<=geometry.panelLeft+20,lang+' modal close must sit at inline-start/left: '+JSON.stringify(geometry));
   await p.keyboard.press('Escape');
   assert.equal(await p.locator('.product-modal').getAttribute('aria-hidden'),'true');
  }
 });
 await check('Cart supports add, quantity and sample registration at checkout',async()=>{
  const cartButton=p.locator('#ramen-bottom-cart');
  await cartButton.click();
  assert.equal(await p.locator('.commerce-items .commerce-empty').isVisible(),true);
  assert.equal(await p.locator('#commerce-checkout').isVisible(),false);
  await p.locator('[data-commerce-close]').last().click();
  const add=cards.first().locator('.commerce-card-add');assert.equal(await add.isVisible(),true);await add.click();
  assert.equal(await p.locator('#commerce-checkout').isVisible(),true);
  assert.equal(await p.locator('#r17-cart-feedback').getAttribute('data-state'),'added');
  assert.ok(await p.locator('#r17-cart-feedback').isVisible());
  assert.ok((await p.locator('#r17-cart-feedback .r17-feedback-product').textContent()).trim());
  assert.equal(await p.locator('#r17-cart-feedback .r17-feedback-count').textContent(),await p.evaluate(()=>new Intl.NumberFormat(document.documentElement.lang).format(1)));
  assert.equal(await cartButton.isVisible(),true);assert.equal(await p.locator('.ramen-bottom-cart-count').textContent(),await p.evaluate(()=>new Intl.NumberFormat(document.documentElement.lang).format(1)));
  await cartButton.click();assert.equal(await p.locator('#commerce-drawer').getAttribute('aria-hidden'),'false');
  await check('Cart drawer traps keyboard focus and restores its opener',async()=>{
   await p.keyboard.press('Shift+Tab');
   assert.equal(await p.evaluate(()=>document.activeElement?.id),'commerce-submit');
   await p.keyboard.press('Tab');
   assert.equal(await p.evaluate(()=>document.activeElement?.classList.contains('commerce-close')),true);
   await p.keyboard.press('Escape');
   assert.equal(await p.locator('#commerce-drawer').getAttribute('aria-hidden'),'true');
   assert.equal(await p.evaluate(()=>document.activeElement?.id),'ramen-bottom-cart');
   await cartButton.click();
  });
  await p.locator('.commerce-quantity button[data-cart-change="1"]').click();assert.equal(await p.locator('.commerce-quantity b').textContent(),'2');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.cartChange),'1');
  assert.equal(await p.locator('.site-wrapper').evaluate(n=>n.inert),true);
  assert.equal(await p.locator('#commerce-options').isVisible(),true);
  const summary=await p.locator('#commerce-submit').boundingBox();assert.ok(summary && summary.y+summary.height<=844);
  await p.screenshot({path:path.join(out,'customer-cart-filled-fa-390.png')});
  await p.locator('#commerce-submit').click();
  const entry=p.locator('#customer-entry');
  await entry.waitFor({state:'visible'});
  assert.equal(await entry.locator('input').count(),2);
  await p.screenshot({path:path.join(out,'customer-entry-fa-390.png')});
  await p.keyboard.press('Escape');
  await entry.waitFor({state:'hidden'});
  await cartButton.click();
  assert.equal(await p.locator('.commerce-quantity b').textContent(),'2');
  await p.locator('[data-cart-remove]').click();
  assert.equal(await p.locator('#commerce-checkout').isVisible(),false);
  await p.locator('[data-commerce-close]').last().click();
 });
 await check('Language changes close an open cart without leaving the page inert',async()=>{
  const cartButton=p.locator('#ramen-bottom-cart');
  await cartButton.click();
  assert.equal(await p.locator('body').evaluate(node=>node.classList.contains('commerce-open')),true);
  await p.evaluate(()=>ROMANO_I18N.setLanguage('tr'));
  await p.waitForFunction(()=>!document.body.classList.contains('commerce-open'));
  assert.equal(await p.locator('#commerce-drawer').getAttribute('aria-hidden'),'true');
  assert.equal(await p.evaluate(()=>document.activeElement?.id),'ramen-bottom-cart');
 });
 const searchToggle=p.locator('#menu-search-toggle'),filterToggle=p.locator('#menu-filter-toggle');
 const openSearch=async()=>{if(await searchToggle.getAttribute('aria-expanded')!=='true')await searchToggle.click();};
 const openFilters=async()=>{if(await filterToggle.getAttribute('aria-expanded')!=='true')await filterToggle.click();};
 const resetFilters=async()=>{await openFilters();await p.locator('#menu-reset').click();};
 await check('Search, category, price order and reset',async()=>{
  await p.evaluate(()=>ROMANO_I18N.setLanguage('en'));
  await openSearch();assert.equal(await p.locator('#rv4-menu-search').evaluate(n=>n===document.activeElement),true);
  await p.locator('#rv4-menu-search').fill('pizza');assert.equal(await cards.count(),3);
  await openFilters();assert.equal(await searchToggle.getAttribute('aria-expanded'),'false');
  await p.locator('#menu-sort').selectOption('low');
  const prices=await p.evaluate(()=>[...document.querySelectorAll('#menu .product-card')].map(c=>getProductById(c.dataset.productId).price));assert.deepEqual(prices,[...prices].sort((a,b)=>a-b));
  await openSearch();await p.locator('#rv4-menu-search').fill('no-product-xyz');assert.equal(await cards.count(),0);assert.equal(await p.locator('#menu-empty').count(),1);
  await resetFilters();assert.equal(await cards.count(),21);
  await p.locator('[data-browse-category]').nth(1).click();assert.equal(await cards.count(),3);await resetFilters();
 });
 await check('Favorites persist, filter and clear',async()=>{
  await cards.first().locator('[data-favorite-product]').click();assert.equal(await p.locator('.product-modal').getAttribute('aria-hidden'),'true');
  await openFilters();await p.locator('#menu-favorites-toggle').click();assert.equal(await cards.count(),1);
  await p.reload();await ready(p);await openFilters();await p.locator('#menu-favorites-toggle').click();assert.equal(await cards.count(),1);
  await p.keyboard.press('Escape');await cards.first().locator('[data-favorite-product]').click();assert.equal(await cards.count(),0);assert.equal(await p.locator('#menu-empty').count(),1);await resetFilters();
 });
 await check('Compact catalog toolbar, disclosures and card layout remain accessible in four languages',async()=>{
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   for(const width of [320,390,768,1440]){
    await p.setViewportSize({width,height:844});
    await p.evaluate(()=>document.querySelector('#menu').scrollIntoView({block:'start',behavior:'instant'}));
    await p.waitForFunction(()=>document.querySelector('#menu').style.getPropertyValue('--browse-bar-height'));
    assert.equal(await p.locator('#menu-search-panel').isVisible(),false);
    assert.equal(await p.locator('#menu-filter-panel').isVisible(),false);
    for(const trigger of [searchToggle,filterToggle]){const r=await trigger.boundingBox();assert.ok(r&&r.width>=44&&r.height>=44,JSON.stringify({lang,width,id:await trigger.getAttribute("id"),rect:r}));assert.ok(await trigger.getAttribute('aria-label'));}
    await p.evaluate(()=>window.scrollBy({top:260,behavior:'instant'}));
    const pinned=await p.evaluate(()=>{const header=document.querySelector('.site-header'),h=header.getBoundingClientRect(),bar=header.querySelector('.menu-browser').getBoundingClientRect();return{gap:bar.bottom-h.bottom,height:bar.height}});
    assert.ok(Math.abs(pinned.gap)<=2,JSON.stringify({lang,width,pinned}));assert.ok(pinned.height<180);
    const grid=await cards.first().evaluate(n=>{const rail=n.parentElement,style=getComputedStyle(rail);return {flow:style.gridAutoFlow,overflow:style.overflowX,scroll:rail.scrollWidth,client:rail.clientWidth,card:n.getBoundingClientRect().width};});
    assert.equal(grid.flow,'column');assert.equal(grid.overflow,'auto');assert.ok(grid.card<=grid.client);if(width<=767)assert.ok(grid.scroll>grid.client);
    await openSearch();await p.locator('#rv4-menu-search').fill('xyz$&<test>');
    assert.ok((await p.locator('#menu-search-active').textContent()).includes('xyz$&<test>'));
    await p.keyboard.press('Escape');assert.equal(await searchToggle.getAttribute('aria-expanded'),'false');assert.equal(await searchToggle.evaluate(n=>n===document.activeElement),true);
    await resetFilters();assert.equal(await cards.count(),21);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
  }
  await p.setViewportSize({width:390,height:844});
 });
 await check('Every featured dish uses the shared card renderer without duplication',async()=>{
  assert.equal(await p.locator('#signature-dish').count(),0);
  assert.equal(await p.locator('#featured-products .product-card .product-card-button').count(),await p.locator('#featured-products .product-card').count());
  assert.equal(await p.locator('#featured-products .product-card .commerce-card-add').count(),await p.evaluate(()=>getFeaturedProducts().filter(product=>product.price>0).length));
  const ids=await p.evaluate(()=>[document.querySelector('[data-signature-product]')?.dataset.signatureProduct,...Array.from(document.querySelectorAll('#featured-products .product-card'),n=>n.dataset.productId)].filter(Boolean));
  assert.equal(ids.length,new Set(ids).size);assert.equal(ids.length,await p.evaluate(()=>getFeaturedProducts().length));
 });
 await check('Category shortcut restores results even after a conflicting search',async()=>{
  await openSearch();await p.locator('#rv4-menu-search').fill('no-product-xyz');assert.equal(await cards.count(),0);
  await p.keyboard.press('Escape');await p.locator('#categories-grid .category-card').first().click();
  assert.equal(await cards.count(),3);assert.equal(await p.locator('#rv4-menu-search').inputValue(),'');
  await resetFilters();assert.equal(await cards.count(),21);
 });
 await check('Modal focus, inert background, Escape and URL restoration',async()=>{
  await cards.first().locator('.product-card-button').click();assert.match(await p.evaluate(()=>location.hash),/^#product-/);
  assert.equal(await p.locator('#main-content').evaluate(n=>n.inert),true);
  await p.waitForFunction(()=>document.activeElement.classList.contains('modal-close'));
  await p.keyboard.press('Shift+Tab');assert.equal(await p.locator('.product-modal').evaluate(n=>n.contains(document.activeElement)),true);
  await p.keyboard.press('Tab');assert.equal(await p.locator('.modal-close').evaluate(n=>n===document.activeElement),true);
  await p.keyboard.press('Escape');assert.equal(await p.locator('.product-modal').getAttribute('aria-hidden'),'true');assert.equal(await p.locator('#main-content').evaluate(n=>n.inert),false);assert.doesNotMatch(await p.evaluate(()=>location.hash),/^#product-/);
  assert.equal(await cards.first().locator('.product-card-button').evaluate(n=>n===document.activeElement),true);
  // The explicit opener must also survive a DOM replacement during a catalog refresh.
  const button=cards.first().locator('.product-card-button');
  const id=await cards.first().getAttribute('data-product-id');
  await button.focus();await button.press('Enter');
  await p.waitForFunction(()=>document.activeElement.classList.contains('modal-close'));
  await p.evaluate(()=>renderMenuCategories());
  const updatedCard=p.locator('#menu .product-card[data-product-id="'+id+'"]');
  assert.equal(await updatedCard.locator('.commerce-card-add').count(),1,'cart action rebuilt synchronously');
  await p.keyboard.press('Escape');
  const updatedButton=updatedCard.locator('.product-card-button');
  assert.equal(await updatedButton.evaluate(n=>n===document.activeElement),true,'focus restored after catalog render');
  // Wait two rendering frames to verify no delayed reparenting steals focus.
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await updatedButton.evaluate(n=>n===document.activeElement),true,'focus stable after rendering frames');
 });
 await check('Four languages at nine widths from 320 to 1920px: direction, overflow and modal',async()=>{
  for(const lang of ['en','tr','ar','fa'])for(const width of [320,360,375,390,430,768,1024,1440,1920]){
   await p.setViewportSize({width,height:900});await p.evaluate(lang=>ROMANO_I18N.setLanguage(lang),lang);
   assert.equal(await p.locator('html').getAttribute('dir'),['fa','ar'].includes(lang)?'rtl':'ltr');
   const expectedFont=['fa','ar'].includes(lang)?'Vazirmatn':'Inter';
   const expectedDisplay=['fa','ar'].includes(lang)?'Vazirmatn':'Playfair Display';
   assert.match(await p.locator('body').evaluate(node=>getComputedStyle(node).fontFamily),new RegExp(expectedFont));
   assert.match(await p.locator('.hero-title').first().evaluate(node=>getComputedStyle(node).fontFamily),new RegExp(expectedDisplay));
   assert.ok(Number.parseFloat(await p.locator('.hero-eyebrow').first().evaluate(node=>getComputedStyle(node).fontSize))>=11);
   assert.ok(Number.parseFloat(await p.locator('[data-ramen-label="menu"]').evaluate(node=>getComputedStyle(node).fontSize))>=11);
   const heroMeta={fa:'کافه و رستوران',en:'Cafe & Restaurant',tr:'Kafe & Restoran',ar:'مقهى ومطعم'}[lang];
   assert.equal((await p.locator('.hero-eyebrow').textContent()).trim(),heroMeta);
   const labels={fa:{home:'خانه',menu:'منو',featured:'ویژه‌ها',contact:'ارتباط',cart:'سبد',cartAria:'سبد سفارش',menuEyebrow:'منوی رستوران',categories:'انتخاب شما',featuredTitle:'انتخاب ویژه.',story:'ساده نیست خاص است'},en:{home:'Home',menu:'Menu',featured:'Featured',contact:'Contact',cart:'Cart',cartAria:'Your order',menuEyebrow:'RESTAURANT MENU',categories:'Your Choice',featuredTitle:'Featured Selection.',story:'It is not ordinary.'},tr:{home:'Ana Sayfa',menu:'Menü',featured:'Öne çıkanlar',contact:'İletişim',cart:'Sepet',cartAria:'Siparişiniz',menuEyebrow:'RESTORAN MENÜSÜ',categories:'Sizin Seçiminiz',featuredTitle:'Özel Seçim.',story:'Sıradan değil özel.'},ar:{home:'الرئيسية',menu:'القائمة',featured:'المميز',contact:'اتصل بنا',cart:'السلة',cartAria:'طلبك',menuEyebrow:'قائمة المطعم',categories:'اختيارك',featuredTitle:'اختيار مميز.',story:'الأمر ليس عاديًا.'}}[lang];
   for(const key of ['home','menu','featured','contact','cart']) assert.equal(await p.locator('[data-ramen-label="'+key+'"]').textContent(),labels[key]);
   const normalizedText=selector=>p.locator(selector).innerText().then(value=>value.replace(/\s+/g,' ').trim());
   assert.equal(await p.locator('#menu-browser-eyebrow').textContent(),labels.menuEyebrow);
   assert.equal(await normalizedText('#categories .section-title'),labels.categories);
   assert.equal(await normalizedText('#featured .section-title'),labels.featuredTitle);
   assert.equal(await p.locator('.story-section,.contact-section').count(),0);
   assert.equal(await p.locator('footer #contact').count(),1);
   assert.equal(await p.locator('#ramen-header-cart').getAttribute('aria-label'),labels.cartAria);
   const headerBoxes=await p.locator('.header-container .brand, #romano-language-toggle, #ramen-header-cart, #menu-toggle').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {name:node.className||node.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
   assert.equal(headerBoxes.length,4,JSON.stringify(headerBoxes));
   const headerDirection=await p.locator('.header-container').evaluate(node=>getComputedStyle(node).direction);
   assert.equal(headerDirection,lang==='fa'||lang==='ar'?'rtl':'ltr','Header direction mismatch '+lang+'/'+width);
   const brandParts=await p.locator('.brand-logo, .brand-content').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,display:getComputedStyle(node).display,width:r.width};}));
   assert.equal(brandParts.length,2);
   assert.notEqual(brandParts[0].display,'none','Brand mark remains visible at '+lang+'/'+width);
   assert.ok(await p.locator('#romano-language-toggle .language-toggle-icon').isVisible(),'Missing language icon '+lang+'/'+width);
   if(lang==='fa'||lang==='ar')assert.ok(brandParts[0].left>brandParts[1].left,'RTL brand logo must follow wordmark '+lang+'/'+width);
   else assert.ok(brandParts[0].left<brandParts[1].left,'LTR brand logo must precede wordmark '+lang+'/'+width);
   const wordmark=await p.locator('.brand-name').evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);return {text:node.textContent.trim(),textWidth:range.getBoundingClientRect().width,clientWidth:node.clientWidth};});
   assert.ok(wordmark.clientWidth>0&&wordmark.textWidth<=wordmark.clientWidth+1,'Restaurant wordmark is clipped '+lang+'/'+width+': '+JSON.stringify(wordmark));
   for(let i=0;i<headerBoxes.length;i++)for(let j=i+1;j<headerBoxes.length;j++){
    const a=headerBoxes[i],b=headerBoxes[j];
    const separated=a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1;
    assert.ok(separated,'Header controls overlap '+lang+'/'+width+': '+JSON.stringify(headerBoxes));
   }
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${lang}/${width}`);
   assert.ok(await p.locator('#rv4-menu-search').getAttribute('placeholder'));
   const bounds=await cards.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert.ok(bounds.every(w=>w>125),`Readable card widths ${lang}/${width}: ${bounds}`);
   await cards.first().locator('.product-card-button').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.keyboard.press('Escape');
  }
  for(const [lang,width]of [['fa',390],['en',1440],['ar',390],['tr',390]]){
   await p.setViewportSize({width,height:1000});await p.evaluate(l=>ROMANO_I18N.setLanguage(l),lang);
   await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(150);
   await p.screenshot({path:path.join(out,`customer-hero-${lang}-${width}.png`)});
   await p.evaluate(()=>window.scrollTo({top:document.querySelector('#menu').getBoundingClientRect().top+scrollY-85,behavior:'instant'}));await p.waitForTimeout(200);
   await p.screenshot({path:path.join(out,`customer-menu-${lang}-${width}.png`)});
   if((lang==='fa'&&width===390)||(lang==='en'&&width===1440)){
    await cards.first().locator('.product-card-button').click();await p.locator('.product-modal').waitFor({state:'visible'});await p.waitForTimeout(250);
    await p.screenshot({path:path.join(out,`customer-product-modal-${lang}-${width}.png`)});
    await p.locator('.product-modal .modal-close').click();
    await p.locator('.product-modal').waitFor({state:'hidden'});
    const cartButton=width<700?p.locator('#ramen-bottom-cart'):p.locator('#ramen-header-cart');
    await cartButton.click();await p.locator('#commerce-drawer.is-open').waitFor({state:'visible'});
    assert.equal(await p.locator('#commerce-drawer').getAttribute('aria-hidden'),'false');
    await p.waitForTimeout(350);
    const drawerBox=await p.locator('#commerce-drawer').boundingBox();
    assert.ok(drawerBox&&drawerBox.width>300&&drawerBox.x>=0&&drawerBox.x+drawerBox.width<=width, 'Cart drawer did not finish entering the viewport: '+JSON.stringify(drawerBox));
    await p.screenshot({path:path.join(out,`customer-cart-${lang}-${width}.png`)});
    await p.locator('#commerce-drawer .commerce-close').click();
    await p.waitForFunction(()=>document.querySelector('#commerce-drawer')?.getAttribute('aria-hidden')==='true');
   }
  }
 });
 await check('Demo cross-tab changes remove unavailable open product',async()=>{
  const id=await cards.first().getAttribute('data-product-id');await cards.first().locator('.product-card-button').click();
  const other=await ctx.newPage();await other.goto(base);await ready(other);
  await other.evaluate(id=>localStorage.setItem('romano_products',JSON.stringify(menuProducts.map(x=>x.id===id?{...x,active:false}:x))),id);
  await p.waitForFunction(()=>document.querySelectorAll('#menu .product-card').length===20);
  assert.equal(await p.locator('.product-modal').getAttribute('aria-hidden'),'true');await other.close();
 });
 const data={restaurant:{name:'Test Kitchen',tagline:'کافه و رستوران',description:'Fresh public menu',address:'QA restaurant address',currency:'TRY'},categories:[{id:'food',name:'Food'},{id:'hidden',name:'Hidden',active:false}],products:[{id:'late',category:'food',name:'Fresh dish',price:100,rating:0},{id:'unsafe',category:'food',name:'<img src=x onerror=alert(1)>',price:0},{id:'hidden-item',category:'hidden',name:'Secret',price:10},{id:'inactive',category:'food',name:'Inactive',active:false},{id:'orphan',category:'missing',name:'Orphan'}]};
 let status=200,payload=data,delay=0;
 await ctx.route('**/api/v1/public/**',async route=>{if(delay)await new Promise(r=>setTimeout(r,delay));await route.fulfill({status,contentType:'application/json',body:JSON.stringify({data:payload})})});
 await check('Delayed public deep link preserves query; hidden items excluded and HTML escaped',async()=>{
  delay=2300;await p.goto(base+'/?restaurant=test#product-late');await ready(p);delay=0;
  await p.waitForFunction(()=>document.querySelector('.product-modal').classList.contains('is-open'));
  assert.equal(await p.evaluate(()=>menuDataMode),'public');assert.equal(await cards.count(),2);assert.equal(await cards.locator('.product-name img').count(),0);
  assert.equal(await cards.first().locator('.product-rating').count(),0);assert.match(await p.title(),/Test Kitchen/);
  await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>location.search),'?restaurant=test');assert.doesNotMatch(await p.evaluate(()=>location.hash),/^#product-/);
  assert.ok(await cards.nth(1).locator('.price-unavailable').textContent());
 });
 await check('Admin storage cannot overwrite public menu',async()=>{
  await p.evaluate(()=>{localStorage.setItem('romano_products','[]');dispatchEvent(new StorageEvent('storage',{key:'romano_products',newValue:'[]'}))});assert.equal(await cards.count(),2);
 });
 await check('Server failure uses recent public cache only for same restaurant',async()=>{
  status=503;await p.reload();await ready(p);assert.equal(await p.evaluate(()=>menuDataMode),'offline');assert.equal(await cards.count(),2);assert.equal(await p.locator('#menu-data-status button').isVisible(),true);
  await p.goto(base+'/?restaurant=other');await ready(p);assert.equal(await p.evaluate(()=>menuDataMode),'unavailable');assert.equal(await cards.count(),0);
 });
 await check('Expired cache and JSON 404 fail closed',async()=>{
  await p.evaluate(()=>{const key='romano_public_menu:test',d=JSON.parse(localStorage.getItem(key));d.savedAt=Date.now()-86400001;localStorage.setItem(key,JSON.stringify(d))});
  await p.goto(base+'/?restaurant=test');await ready(p);assert.equal(await p.evaluate(()=>menuDataMode),'unavailable');assert.equal(await cards.count(),0);
  status=200;await p.reload();await ready(p);status=404;await p.reload();await ready(p);assert.equal(await p.evaluate(()=>menuDataMode),'unavailable');assert.equal(await cards.count(),0);
 });
 await check('Empty public catalog never restores seed products',async()=>{
  status=200;payload={restaurant:{...data.restaurant,address:'',tagline:''},categories:[],products:[]};await p.reload();await ready(p);assert.equal(await p.evaluate(()=>menuDataMode),'public');assert.equal(await cards.count(),0);assert.equal(await p.locator('#menu-empty').count(),1);
  assert.equal((await p.locator('.footer-address').textContent()).trim(),'','Missing public address must not restore demo address');
  assert.equal((await p.locator('.hero-eyebrow').textContent()).trim(),'','Missing public tagline must not restore demo tagline');
  assert.equal((await p.locator('.footer-brand p').textContent()).trim(),'');
  payload={restaurant:data.restaurant,categories:[],products:[]};await p.reload();await ready(p);
 });
 await check('Blocked storage still permits browsing and session favorites',async()=>{
  const c=await browser.newContext({serviceWorkers:'block'});await c.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')}});
  const s=await c.newPage();s.on('pageerror',e=>errors.push(String(e)));await s.goto(base);await ready(s);assert.equal(await s.locator('#menu .product-card').count(),21);
  await s.locator('#menu .product-card [data-favorite-product]').first().click();assert.equal(await s.locator('#menu .product-card [data-favorite-product]').first().getAttribute('aria-pressed'),'true');await c.close();
 });
 await check('Mobile back-to-top control stays clear of bottom navigation',async()=>{
  await p.setViewportSize({width:390,height:900});
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await p.waitForFunction(()=>!document.querySelector('.rv4-back-top')?.classList.contains('is-visible'));
   await p.evaluate(()=>window.scrollBy({top:-80,behavior:'instant'}));
   await p.waitForFunction(()=>document.querySelector('.rv4-back-top')?.classList.contains('is-visible'));
  const topBox=await p.locator('.rv4-back-top').boundingBox();
  const navBox=await p.locator('.ramen-bottom-nav').boundingBox();
  assert.ok(topBox && navBox && topBox.y+topBox.height<=navBox.y-8,JSON.stringify({topBox,navBox}));
  await p.locator('#ramen-bottom-cart').click();
  assert.equal(await p.locator('.rv4-back-top').evaluate(node=>getComputedStyle(node).pointerEvents),'none');
  await p.keyboard.press('Escape');
  await p.evaluate(()=>window.scrollTo(0,0));
 });
 await check('Desktop and mobile cart entry points remain visible',async()=>{
  await p.setViewportSize({width:1440,height:900});
  const headerCart=p.locator('#ramen-header-cart');
  assert.equal(await headerCart.isVisible(),true);
  const cartBox=await headerCart.boundingBox();
  const menuBox=await p.locator('#menu-toggle').boundingBox();
  assert.ok(cartBox && cartBox.width>=40 && cartBox.height>=40 && cartBox.x>=0 && cartBox.x+cartBox.width<=1440,JSON.stringify({cartBox,menuBox}));
  assert.ok(menuBox && (cartBox.x+cartBox.width<=menuBox.x-4 || menuBox.x+menuBox.width<=cartBox.x-4),JSON.stringify({cartBox,menuBox}));
  await p.setViewportSize({width:390,height:900});
  assert.equal(await p.locator('#ramen-bottom-cart').isVisible(),true);
 });
 await check('Navigation footer and CTA follow the selected language direction and font',async()=>{
  const expected={fa:{dir:'rtl',font:'Vazirmatn'},ar:{dir:'rtl',font:'Vazirmatn'},en:{dir:'ltr',font:'Inter'},tr:{dir:'ltr',font:'Inter'}};
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   const nav=p.locator('#main-navigation');
   if(await nav.getAttribute('aria-hidden')==='true')await p.locator('#menu-toggle').click();
   await p.waitForFunction(()=>document.querySelector('#main-navigation')?.getAttribute('aria-hidden')==='false');
   const footer=p.locator('.navigation-footer');
   const cta=p.locator('.navigation-menu-cta');
   assert.equal(await footer.evaluate(node=>getComputedStyle(node).direction),expected[lang].dir,lang+' footer direction');
   assert.equal(await cta.evaluate(node=>getComputedStyle(node).direction),expected[lang].dir,lang+' CTA direction');
   assert.match(await footer.evaluate(node=>getComputedStyle(node).fontFamily),new RegExp(expected[lang].font),lang+' footer font');
   assert.match(await cta.evaluate(node=>getComputedStyle(node).fontFamily),new RegExp(expected[lang].font),lang+' CTA font');
   assert.ok((await cta.boundingBox()).height>=40,lang+' CTA touch target');
   assert.ok((await cta.textContent()).trim().length>0,lang+' CTA label');
   await p.locator('#navigation-close').click();
   await p.waitForFunction(()=>document.querySelector('#main-navigation')?.getAttribute('aria-hidden')==='true');
  }
 });
 await check('Hero and consolidated footer stay localized and direction-aware',async()=>{
  const expected={
   fa:{tagline:'کافه و رستوران',footerBrand:'کافه و رستوران',contact:'ارتباط با ما',follow:'ما را دنبال کنید',powered:'قدرت‌گرفته از ROMANO',story:'ساده نیست خاص است',contactTitle:'منتظر شما هستیم.'},
   en:{tagline:'Cafe & Restaurant',footerBrand:'Cafe & Restaurant',contact:'Contact',follow:'Follow us',powered:'Powered by ROMANO',story:'It is not ordinary.',contactTitle:'We are waiting for you.'},
   tr:{tagline:'Kafe & Restoran',footerBrand:'Kafe & Restoran',contact:'İletişim',follow:'Bizi takip edin',powered:'ROMANO ile desteklenmektedir',story:'Sıradan değil özel.',contactTitle:'Sizi bekliyoruz.'},
   ar:{tagline:'مقهى ومطعم',footerBrand:'مقهى ومطعم',contact:'تواصل معنا',follow:'تابعنا',powered:'مدعوم بواسطة رومانو',story:'الأمر ليس عاديًا.',contactTitle:'بانتظاركم.'}
  };
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   const e=expected[lang],dir=['fa','ar'].includes(lang)?'rtl':'ltr',font=dir==='rtl'?'Vazirmatn':'Inter';
   const text=selector=>p.locator(selector).innerText().then(v=>v.replace(/\s+/g,' ').trim());
   assert.equal((await text('.hero-eyebrow')),e.tagline,lang+' hero tagline');
   assert.equal(await p.locator('.hero-content').evaluate(n=>getComputedStyle(n).direction),dir,lang+' hero direction');
   assert.equal(await p.locator('.hero-title').evaluate(n=>getComputedStyle(n).textAlign),'start',lang+' hero title alignment');
   assert.match(await p.locator('.hero-content').evaluate(n=>getComputedStyle(n).fontFamily),new RegExp(font),lang+' hero font');
   assert.equal(await p.locator('.story-section,.contact-section').count(),0);
   assert.equal(await text('.footer-address'),data.restaurant.address,lang+' actual restaurant address');
   assert.equal(await text('.footer-logo'),await text('.header-container .brand-name'));
   assert.equal(await text('.footer-brand p'),e.footerBrand,lang+' footer brand');
   const headings=p.locator('.site-footer .footer-heading');
   assert.equal((await headings.nth(0).innerText()).trim(),e.contact,lang+' footer contact heading');
   assert.equal((await headings.nth(1).innerText()).trim(),e.follow,lang+' footer social heading');
   if(dir==='rtl')assert.ok(['normal','0px'].includes(await headings.first().evaluate(n=>getComputedStyle(n).letterSpacing)),lang+' footer heading must not use Latin tracking');
   assert.equal((await text('.footer-bottom span')),e.powered,lang+' footer attribution');
   const creator=p.locator('.footer-creator');
   assert.equal(await creator.innerText(),{fa:'ساخته‌شده توسط کیان خیاط.',en:'Made by Kian Khayat.',tr:'Kian Khayat tarafından yapıldı.',ar:'من تصميم وتطوير كيان خياط.'}[lang]);
   assert.equal(await creator.getAttribute('href'),'https://kiankhayat.me');
   assert.equal(await creator.getAttribute('target'),'_blank');
   assert.match(await creator.getAttribute('rel'),/\bnoopener\b/);
   assert.match(await creator.getAttribute('rel'),/\bnoreferrer\b/);
   assert.equal(await p.locator('.site-footer .footer-main').evaluate(n=>getComputedStyle(n).direction),dir,lang+' footer direction');
   assert.match(await p.locator('.site-footer').evaluate(n=>getComputedStyle(n).fontFamily),new RegExp(font),lang+' footer font');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,lang+' hero/footer horizontal overflow');
  }
 });
 await check('Hero eyebrow is semantic, localized and direction-aware in all four languages',async()=>{
  const readEyebrow=()=>p.locator('.hero-eyebrow').textContent();
  assert.equal(await p.locator('.hero-section').evaluate(el=>getComputedStyle(el,'::before').content),'none');
  await p.evaluate(()=>ROMANO_I18N.setLanguage('en',false));
  assert.equal((await readEyebrow()).trim(),'Cafe & Restaurant');
  assert.equal(await p.locator('.hero-eyebrow').evaluate(el=>getComputedStyle(el).direction),'ltr');
  assert.equal(await p.locator('.hero-title').evaluate(el=>getComputedStyle(el).textAlign),'start');
  await p.evaluate(()=>ROMANO_I18N.setLanguage('tr',false));
  assert.equal((await readEyebrow()).trim(),'Kafe & Restoran');
  await p.evaluate(()=>ROMANO_I18N.setLanguage('fa',false));
  assert.equal((await readEyebrow()).trim(),'کافه و رستوران');
  assert.equal(await p.locator('.hero-eyebrow').evaluate(el=>getComputedStyle(el).direction),'rtl');
  await p.evaluate(()=>ROMANO_I18N.setLanguage('ar',false));
  assert.equal((await readEyebrow()).trim(),'مقهى ومطعم');
  assert.equal(await p.locator('.hero-eyebrow').evaluate(el=>getComputedStyle(el).direction),'rtl');
 });
 await check('Configured restaurant tagline is consistent in Hero and footer in four languages',async()=>{
  const custom={fa:'آشپزخانه آزمایشی',en:'QA Kitchen',tr:'Test Mutfağı',ar:'مطبخ تجريبي'};
  payload={restaurant:{...data.restaurant,tagline:custom.fa,translations:Object.fromEntries(Object.entries(custom).map(([lang,tagline])=>[lang,{tagline}]))},categories:[],products:[]};
  await p.reload();await ready(p);
  for(const lang of ['fa','en','tr','ar']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   assert.equal((await p.locator('.hero-eyebrow').textContent()).trim(),custom[lang]);
   assert.equal((await p.locator('.footer-brand p').textContent()).trim(),custom[lang]);
  }
 });
 await check('Only the requested localized creator credit appears in the footer; commerce remains ROMANO',async()=>{
  assert.equal(await p.locator('a[href*="kiankhayat.me"]').count(),1);
  const credit=p.locator('.footer-bottom a.footer-creator[href="https://kiankhayat.me"]');
  assert.equal(await credit.count(),1);
  assert.equal(await credit.getAttribute('rel'),'noopener noreferrer');
  assert.equal(await p.locator('.commerce-drawer small').textContent(),'ROMANO');
 });
 await check('No uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 fs.writeFileSync(path.join(out,'customer-browser-results.json'),JSON.stringify({passed:results.length,cases:results,errors,notes:'Chromium, static preview and mocked public API. Service workers blocked. No real PostgreSQL or production test.'},null,2));
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exit(1)});
