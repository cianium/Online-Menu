/* Start a static preview; set ADMIN_TEST_URL and optionally CHROMIUM_EXECUTABLE_PATH.
   Requires Playwright. Public API responses below are mocked, not a database test. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let pw;try{pw=require('playwright')}catch(e){if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw e;pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright')}
const base=process.env.ADMIN_TEST_URL||'http://127.0.0.1:8765';
const out=path.resolve(__dirname,'../docs/qa');fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];let browser;
async function check(name,fn){await fn();results.push(name);console.log('PASS',name)}
async function ready(p){await p.waitForFunction(()=>typeof menuDataMode!=='undefined'&&menuDataMode!=='loading');await p.locator('#splash-screen').waitFor({state:'detached'});}
(async()=>{
 browser=await pw.chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 ctx.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));
 const p=await ctx.newPage();await p.goto(base);await ready(p);
 const cards=p.locator('#menu .product-card');
 await check('Static demo boots with 21 products',async()=>{assert.equal(await cards.count(),21);assert.equal(await p.evaluate(()=>menuDataMode),'demo')});
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
   const box=await categoryCard.evaluate(node=>{
    const card=node.getBoundingClientRect(),index=node.querySelector('.category-index').getBoundingClientRect();
    return {cardLeft:card.left,cardRight:card.right,indexLeft:index.left,indexRight:index.right,indexWidth:index.width};
   });
   if(['fa','ar'].includes(lang))assert.ok(box.indexRight>(box.cardLeft+box.cardRight)/2,lang+' category index must align to inline-start/right: '+JSON.stringify(box));
   else assert.ok(box.indexRight<(box.cardLeft+box.cardRight)/2,lang+' category index must align to inline-start/left: '+JSON.stringify(box));
   assert.equal(await rail.evaluate(node=>getComputedStyle(node).scrollSnapType.includes('inline')),true,lang+' category rail snap');
   const buttons=rail.locator('button');
   assert.ok(await buttons.count()>1);
   assert.ok(await buttons.first().evaluate(node=>node.getBoundingClientRect().height>=44),lang+' category filter touch target');
  }
 });
 await check('Image-first card CTA and favorite remain accessible',async()=>{
  const card=cards.first(),button=card.locator('.product-card-button'),favorite=card.locator('[data-favorite-product]');
  await card.scrollIntoViewIfNeeded();
  assert.ok((await button.textContent()).trim());assert.equal(await button.isVisible(),true);
  const geometry=await card.evaluate(node=>{const card=node.getBoundingClientRect(),image=node.querySelector('.product-image-wrapper').getBoundingClientRect(),cta=node.querySelector('.product-card-button').getBoundingClientRect(),heart=node.querySelector('[data-favorite-product]').getBoundingClientRect(),hit=document.elementFromPoint(heart.left+heart.width/2,heart.top+heart.height/2);return{card:{width:card.width,height:card.height},image:{width:image.width,height:image.height},ctaWidth:cta.width,heartHit:Boolean(hit&&hit.closest('[data-favorite-product]'))}});
  assert.ok(Math.abs(geometry.card.width-geometry.image.width)<1&&Math.abs(geometry.card.height-geometry.image.height)<1);assert.ok(geometry.ctaWidth>geometry.card.width*.35);assert.equal(geometry.heartHit,true);
  await button.click();await p.waitForTimeout(450);const modal=await p.locator('.product-modal .modal-container').boundingBox();assert.ok(modal);assert.ok(Math.abs((modal.y+modal.height/2)-844/2)<2,JSON.stringify(modal));await p.keyboard.press('Escape');
 });
 await check('Product card metadata and modal close control follow RTL/LTR direction',async()=>{
  const expected={fa:'rtl',ar:'rtl',en:'ltr',tr:'ltr'};
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   const topline=cards.first().locator('.product-topline');
   assert.equal(await topline.evaluate(node=>getComputedStyle(node).direction),expected[lang],lang+' product metadata direction');
   const categoryLabel=cards.first().locator('.product-category');
   assert.equal(await categoryLabel.evaluate(node=>getComputedStyle(node).direction),expected[lang],lang+' product category direction');
   if(expected[lang]==='rtl')assert.equal(await categoryLabel.evaluate(node=>getComputedStyle(node).letterSpacing),'0px',lang+' product category must not use Latin tracking');
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
 await check('Cart supports add, quantity and QR-gated checkout',async()=>{
  const cartButton=p.locator('#ramen-bottom-cart');
  await cartButton.click();
  assert.equal(await p.locator('.commerce-items .commerce-empty').isVisible(),true);
  assert.equal(await p.locator('#commerce-checkout').isVisible(),false);
  await p.locator('[data-commerce-close]').last().click();
  const add=cards.first().locator('.commerce-card-add');assert.equal(await add.isVisible(),true);await add.click();
  assert.equal(await p.locator('#commerce-checkout').isVisible(),true);
  assert.equal(await cartButton.isVisible(),true);assert.equal(await p.locator('.ramen-bottom-cart-count').textContent(),'1');
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
  await p.screenshot({path:path.join(out,'customer-cart-filled-fa-390.png')});
  await p.locator('#commerce-submit').click();assert.ok((await p.locator('#commerce-message').textContent()).trim());
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
 await check('Search, category, price order and reset',async()=>{
  await p.evaluate(()=>ROMANO_I18N.setLanguage('en'));
  await p.locator('#rv4-menu-search').fill('pizza');assert.equal(await cards.count(),3);
  await p.locator('#menu-sort').selectOption('low');
  const prices=await p.evaluate(()=>[...document.querySelectorAll('#menu .product-card')].map(c=>getProductById(c.dataset.productId).price));assert.deepEqual(prices,[...prices].sort((a,b)=>a-b));
  await p.locator('#rv4-menu-search').fill('no-product-xyz');assert.equal(await cards.count(),0);assert.equal(await p.locator('#menu-empty').count(),1);
  await p.locator('#menu-reset').click();assert.equal(await cards.count(),21);
  await p.locator('[data-browse-category]').nth(1).click();assert.equal(await cards.count(),3);await p.locator('#menu-reset').click();
 });
 await check('Favorites persist, filter and clear',async()=>{
  await cards.first().locator('[data-favorite-product]').click();assert.equal(await p.locator('.product-modal').getAttribute('aria-hidden'),'true');
  await p.locator('#menu-favorites-toggle').click();assert.equal(await cards.count(),1);
  await p.reload();await ready(p);await p.locator('#menu-favorites-toggle').click();assert.equal(await cards.count(),1);
  await cards.first().locator('[data-favorite-product]').click();assert.equal(await cards.count(),0);assert.equal(await p.locator('#menu-empty').count(),1);await p.locator('#menu-reset').click();
 });
 await check('Modal focus, inert background, Escape and URL restoration',async()=>{
  await cards.first().locator('.product-card-button').click();assert.match(await p.evaluate(()=>location.hash),/^#product-/);
  assert.equal(await p.locator('#main-content').evaluate(n=>n.inert),true);
  await p.waitForFunction(()=>document.activeElement.classList.contains('modal-close'));
  await p.keyboard.press('Escape');assert.equal(await p.locator('.product-modal').getAttribute('aria-hidden'),'true');assert.equal(await p.locator('#main-content').evaluate(n=>n.inert),false);assert.doesNotMatch(await p.evaluate(()=>location.hash),/^#product-/);
 });
 await check('Four languages at 320, 390, 768, 1024 and 1440px: direction, overflow and modal',async()=>{
  for(const lang of ['en','tr','ar','fa'])for(const width of [320,390,768,1024,1440]){
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
   assert.equal(await normalizedText('#story .section-title'),labels.story);
   assert.equal(await p.locator('#ramen-header-cart').getAttribute('aria-label'),labels.cartAria);
   const headerBoxes=await p.locator('.header-container .brand, #romano-language-toggle, #ramen-header-cart, #menu-toggle').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {name:node.className||node.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
   assert.equal(headerBoxes.length,4,JSON.stringify(headerBoxes));
   const headerDirection=await p.locator('.header-container').evaluate(node=>getComputedStyle(node).direction);
   assert.equal(headerDirection,lang==='fa'||lang==='ar'?'rtl':'ltr','Header direction mismatch '+lang+'/'+width);
   const brandParts=await p.locator('.brand-logo, .brand-content').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,display:getComputedStyle(node).display,width:r.width};}));
   assert.equal(brandParts.length,2);
   if(width<=360)assert.equal(brandParts[0].display,'none','Compact header intentionally hides logo at '+lang+'/'+width);
   else if(lang==='fa'||lang==='ar')assert.ok(brandParts[0].left>brandParts[1].left,'RTL brand logo must follow wordmark '+lang+'/'+width);
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
 const data={restaurant:{name:'Test Kitchen',description:'Fresh public menu',currency:'TRY'},categories:[{id:'food',name:'Food'},{id:'hidden',name:'Hidden',active:false}],products:[{id:'late',category:'food',name:'Fresh dish',price:100,rating:0},{id:'unsafe',category:'food',name:'<img src=x onerror=alert(1)>',price:0},{id:'hidden-item',category:'hidden',name:'Secret',price:10},{id:'inactive',category:'food',name:'Inactive',active:false},{id:'orphan',category:'missing',name:'Orphan'}]};
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
  status=200;payload={restaurant:data.restaurant,categories:[],products:[]};await p.reload();await ready(p);assert.equal(await p.evaluate(()=>menuDataMode),'public');assert.equal(await cards.count(),0);assert.equal(await p.locator('#menu-empty').count(),1);
 });
 await check('Blocked storage still permits browsing and session favorites',async()=>{
  const c=await browser.newContext({serviceWorkers:'block'});await c.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')}});
  const s=await c.newPage();s.on('pageerror',e=>errors.push(String(e)));await s.goto(base);await ready(s);assert.equal(await s.locator('#menu .product-card').count(),21);
  await s.locator('#menu .product-card [data-favorite-product]').first().click();assert.equal(await s.locator('#menu .product-card [data-favorite-product]').first().getAttribute('aria-pressed'),'true');await c.close();
 });
 await check('Mobile back-to-top control stays clear of bottom navigation',async()=>{
  await p.setViewportSize({width:390,height:900});
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
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
 await check('Hero, story, contact and footer content stay localized and direction-aware',async()=>{
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
   assert.equal(await text('#story .section-title'),e.story,lang+' story title');
   assert.equal(await text('#contact .section-title'),e.contactTitle,lang+' contact title');
   assert.equal(await text('.footer-brand p'),e.footerBrand,lang+' footer brand');
   const headings=p.locator('.site-footer .footer-heading');
   assert.equal((await headings.nth(0).innerText()).trim(),e.contact,lang+' footer contact heading');
   assert.equal((await headings.nth(1).innerText()).trim(),e.follow,lang+' footer social heading');
   if(dir==='rtl')assert.ok(['normal','0px'].includes(await headings.first().evaluate(n=>getComputedStyle(n).letterSpacing)),lang+' footer heading must not use Latin tracking');
   assert.equal((await text('.footer-bottom span')),e.powered,lang+' footer attribution');
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
 await check('No developer credits or internal release labels remain',async()=>{
  assert.equal(await p.locator('.footer-bottom a[href*="kiankhayat.me"]').count(),0);
  assert.equal(await p.locator('.commerce-drawer small').textContent(),'ROMANO');
 });
 await check('No uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 fs.writeFileSync(path.join(out,'customer-browser-results.json'),JSON.stringify({passed:results.length,cases:results,errors,notes:'Chromium, static preview and mocked public API. Service workers blocked. No real PostgreSQL or production test.'},null,2));
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exit(1)});
