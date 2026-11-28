/* Start a static preview; set ADMIN_TEST_URL and optionally CHROMIUM_EXECUTABLE_PATH.
   Requires Playwright. Public API responses below are mocked, not a database test. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let pw;try{pw=require('playwright')}catch(e){if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw e;pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright')}
const base=process.env.ADMIN_TEST_URL||'http://127.0.0.1:8765';
const out=path.resolve(process.env.BROWSER_EVIDENCE_DIR||path.join(__dirname,'../docs/qa'));fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];let browser;
// getBoundingClientRect can report 43.999996 for a 44 CSS-pixel control.
// Only tolerate floating-point noise, not actual subpixel target shrinkage.
const atLeastCssPixels=(value,minimum)=>Number.isFinite(value)&&value>=minimum-0.0001;
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
 await check('Static demo boots with 21 products without loading chat assets',async()=>{assert.equal(await cards.count(),21);assert.equal(await p.evaluate(()=>menuDataMode),'demo');assert.equal(await p.evaluate(()=>Boolean(window.RomanoConnectCore||window.RomanoCustomerChat||window.RomanoConnectLive)),false);assert.equal(await p.locator('link[href$="css/connect.css"]').count(),0)});
 await check('Customer brand is RAMEN in all four locales including legacy catalog data',async()=>{
  for(const lang of ['fa','en','tr','ar']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   const name=['fa','ar'].includes(lang)?'رامن':'RAMEN';
   assert.equal((await p.locator('.brand-name').innerText()).trim(),name);
   assert.equal((await p.locator('.footer-logo').innerText()).trim(),name);
   assert.ok((await p.title()).includes(name));
   const values=await p.evaluate(()=>[ROMANO_I18N.localizeRestaurant({name:'ROMANO',address:'ROMANO restaurant'}).name,ROMANO_I18N.localizeRestaurant({name:'رمانو',address:'ROMANO restaurant'}).address,ROMANO_I18N.localizeProduct({id:'custom',name:'ROMANO dish',description:'Sauce ROMANO'}).description]);
   assert.ok(values.every(value=>value.includes(name)&&!/romano|رمانو|رومانو/i.test(value)));
   assert.equal(await p.locator('.commerce-drawer small').textContent(),'RAMEN');
  }
  await p.evaluate(()=>ROMANO_I18N.setLanguage('fa',false));
 });
 await check('Saved RAMEN address, contact dialog, navigation footer and cart brand stay localized',async()=>{
  const legacy='اصفهان، میدان انقلاب، بر گذر چهارباغ عباسی، بعد از مادی نیاصرم، کافه رستوران رامن';
  await p.evaluate(address=>localStorage.setItem('romano_restaurant',JSON.stringify({...restaurantConfig,name:'رامن',address})),legacy);
  try{
   await p.reload();await ready(p);
   for(const lang of ['en','tr','ar','fa']){
    await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
    const expected=await p.evaluate(()=>ROMANO_I18N.displayBrand(ROMANO_I18N.restaurant.address[ROMANO_I18N.language]));
    assert.equal((await p.locator('.footer-address').innerText()).trim(),expected,lang+' footer address');
    assert.equal(await p.locator('.footer-address').getAttribute('dir'),'auto');
    const trigger=p.locator('[data-ramen-nav="contact"]');await trigger.focus();await trigger.press('Space');
    const dialog=p.locator('#ramen-contact-dialog');await dialog.waitFor({state:'visible'});
    await dialog.locator('#connect-message-input').waitFor({state:'visible'});
    assert.equal(await dialog.locator('[data-connect-contact],.ramen-contact-item,.connect-language').count(),0);
    assert.equal(await dialog.locator('.connect-call').count(),1);
    await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#ramen-contact-dialog').open);
    await p.locator('#menu-toggle').click();
    assert.equal(await p.locator('.navigation-footer-meta,.navigation-menu-cta').count(),0);
    assert.equal(await p.locator('#navigation-rating .hero-stars span').count(),5);
    await p.locator('#navigation-close').click();
    await p.waitForFunction(()=>document.querySelector('#main-navigation').getAttribute('aria-hidden')==='true');
    assert.equal(await p.locator('.commerce-drawer small').textContent(),'RAMEN');
    assert.doesNotMatch(await p.locator('.footer-bottom span').textContent(),/romano|رومانو|رمانو/i);
   }
  }finally{await p.evaluate(()=>{localStorage.removeItem('romano_restaurant');ROMANO_I18N.setLanguage('fa',false);});await p.reload();await ready(p);}
 });
 await check('Compact header and hero expose a real, moderated local rating in four languages',async()=>{
  const rating=p.locator('#hero-rating');
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   await p.waitForFunction(()=>!document.querySelector('#hero-rating').hidden);
   assert.equal(await p.locator('.menu-icon-actions #menu-search-toggle').count(),1);
   assert.equal(await p.locator('.header-container #menu-search-toggle').count(),0);
   assert.equal(await p.locator('.hero-button-icon').count(),0);
   assert.equal(await rating.locator('.hero-stars span').count(),5);
   assert.equal(await rating.locator('.is-filled').count(),0);
   assert.equal(await rating.locator('.hero-stars').textContent(),'☆☆☆☆☆');
    assert.equal(await rating.locator('.hero-rating-copy,.hero-rating-detail').count(),0);
    assert.ok(await rating.getAttribute('aria-label'));
    assert.equal(await rating.evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.equal(await rating.evaluate(n=>getComputedStyle(n).borderTopWidth),'0px');
    assert.equal(await p.locator('#navigation-rating .hero-stars').textContent(),'☆☆☆☆☆');
    assert.equal(await p.locator('#navigation-rating .hero-rating-copy,#navigation-rating .hero-rating-detail').count(),0);
   const geometry=await p.evaluate(()=>{const c=document.querySelector('.hero-content').getBoundingClientRect(),b=document.querySelector('.hero-button').getBoundingClientRect(),h=document.querySelector('.hero-section').getBoundingClientRect();return {content:c.bottom,button:b.top,end:b.bottom,hero:h.bottom};});
   assert.ok(geometry.button>=geometry.content-1&&geometry.end<=geometry.hero+1);
  }
  await p.evaluate(()=>{const model=RomanoDemoReview;const review=model.submit(localStorage,'romano',4,'Sample review','qa-hero-rating');model.moderate(localStorage,'romano',review,'approved');window.dispatchEvent(new StorageEvent('storage',{key:model.key('romano')}));});
  assert.equal(await rating.locator('.is-filled').count(),4);assert.equal(await p.locator('#navigation-rating .is-filled').count(),4);
  assert.ok((await rating.getAttribute('aria-label')).includes(await p.evaluate(()=>new Intl.NumberFormat(ROMANO_I18N.language,{style:'percent'}).format(.8))));
  await rating.click();await p.locator('#ramen-contact-dialog').waitFor({state:'visible'});await p.keyboard.press('Escape');
  await p.evaluate(()=>{localStorage.removeItem(RomanoDemoReview.key('romano'));window.dispatchEvent(new StorageEvent('storage',{key:RomanoDemoReview.key('romano')}));ROMANO_I18N.setLanguage('fa',false);});
  assert.equal(await rating.locator('.is-filled').count(),0);
 });
 await check('Customer image sources reject unsupported protocols and URL credentials',async()=>{
  const result=await p.evaluate(()=>({
   rejected:['javascript:alert(1)','data:image/svg+xml,<svg/>','file:///etc/passwd','https://user:password@example.test/a.png','blob:'+location.origin+'/sample'].map(getSafeImageSource),
   local:getSafeImageSource('assets/images/hero/hero.jpg'),
   data:getSafeImageSource('data:image/png;base64,AA==')
  }));
  assert.deepEqual(result.rejected,['','','','','']);
  assert.ok(result.local.endsWith('/assets/images/hero/hero.jpg'));
  assert.equal(result.data,'data:image/png;base64,AA==');
 });
 await check('Customer navigation honors the motion preference for every locale',async()=>{
  try{
   for(const lang of ['fa','ar','en','tr']){
    await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
    for(const preference of ['reduce','no-preference']){
     await p.emulateMedia({reducedMotion:preference});
     assert.equal(await p.evaluate(()=>customerScrollBehavior()),preference==='reduce'?'auto':'smooth');
    }
   }
  }finally{
   await p.emulateMedia({reducedMotion:'no-preference'});
   await p.evaluate(()=>ROMANO_I18N.setLanguage('fa',false));
  }
 });
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
   await dialog.locator('#connect-message-input').waitFor({state:'visible'});
   assert.equal(await dialog.evaluate(d=>d.classList.contains('connect-dialog')),true);
   for(const selector of ['.connect-timeline','.connect-chips','.connect-bottom'])assert.equal(await dialog.locator(selector).getAttribute('tabindex'),'0');
   await p.waitForFunction(()=>Boolean(document.querySelector('#connect-message-input'))&&!document.querySelector('#connect-message-input').disabled);
   assert.equal(await dialog.locator('[data-connect-contact],.connect-language,.ramen-contact-item').count(),0);
   assert.equal(await dialog.locator('.hp-service-action').count(),4);
   assert.equal(await dialog.locator('.hp-service-action:disabled').count(),4,'no table context must not simulate requests');
   assert.equal(await dialog.locator('a[href^="tel:"]').count(),0,'sample phone must not initiate a call');
   assert.equal(await dialog.locator('.connect-call').isDisabled(),true);
   assert.equal(await p.locator('[data-restaurant-phone]').evaluate(n=>getComputedStyle(n).direction),'ltr');
   assert.equal(await dialog.locator('[data-contact-feedback]').count(),0);
   assert.equal(await dialog.locator('.connect-compose .connect-send svg').count(),1);
   await p.keyboard.press('Escape');
   await p.waitForFunction(()=>!document.querySelector('#ramen-contact-dialog').open && document.querySelector('[data-ramen-nav="contact"]').getAttribute('aria-expanded')==='false');
   assert.equal(await trigger.evaluate(n=>document.activeElement===n),true);
   assert.equal(await trigger.getAttribute('aria-controls'),null);
  }
  await p.evaluate(()=>ROMANO_I18N.setLanguage('fa',false));
  await p.setViewportSize({width:390,height:844});
 });
 await check('Dedicated catalog entry, home, featured, Back and reload preserve one session in four languages',async()=>{
   for(const lang of ['fa','ar','en','tr']){
    await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
    await p.locator('[data-ramen-nav="home"]').click();
    assert.equal(await p.locator('#menu').isVisible(),false);
    assert.equal(await p.locator('#home').isVisible(),true);
    const original=await p.evaluate(()=>location.search);
    await p.locator('.hero-button').click();
    assert.equal(await p.evaluate(()=>location.hash),'#menu');
    assert.equal(await p.locator('#home').isVisible(),false);
    assert.equal(await p.locator('#featured').isVisible(),false);
    assert.equal(await p.locator('#menu').isVisible(),true);
    assert.equal(await cards.count(),21);
    assert.equal(await p.evaluate(()=>location.search),original);
    assert.equal(await p.locator('html').getAttribute('lang'),lang);
    await p.waitForFunction(()=>document.querySelector('[data-ramen-nav="menu"]').getAttribute('aria-current')==='location');
    await p.goBack();await p.locator('#home').waitFor({state:'visible'});
    await p.locator('[data-ramen-nav="menu"]').click();await p.locator('#menu').waitFor({state:'visible'});
    await p.reload();await ready(p);await p.locator('#menu').waitFor({state:'visible'});
    await p.locator('[data-ramen-nav="featured"]').click();await p.locator('#featured').waitFor({state:'visible'});
    assert.equal(await p.evaluate(()=>location.hash),'#featured');
    assert.equal(await p.locator('#menu').isVisible(),false);
   }
   await p.locator('[data-ramen-nav="home"]').click();
  });
  await check('Header and hamburger categories enter the catalog and preserve a favorite across views',async()=>{
   const category=p.locator('#rv4-category-rail [data-browse-category]').first();
   const id=await category.getAttribute('data-browse-category');
   await category.click();
   await p.locator('#menu').waitFor({state:'visible'});
   assert.ok(await cards.count()>0);
   assert.equal(await cards.evaluateAll((nodes,id)=>nodes.every(n=>getProductById(n.dataset.productId).category===id),id),true);
   const productId=await cards.first().getAttribute('data-product-id');
   await cards.first().locator('[data-favorite-product]').click();
   await p.locator('[data-ramen-nav="home"]').click();
   assert.equal(await p.locator('#menu').isVisible(),false);
   await p.locator('#menu-toggle').click();
   const shortcut=p.locator('#main-navigation a[data-category-link="true"][href^="#category-"]').first();
   await shortcut.waitFor({state:'visible'});
   const categoryId=(await shortcut.getAttribute('href')).slice('#category-'.length);
   await shortcut.click();
   await p.locator('#menu').waitFor({state:'visible'});
   assert.ok(await cards.count()>0);
   assert.equal(await cards.evaluateAll((nodes,id)=>nodes.every(n=>getProductById(n.dataset.productId).category===id),categoryId),true);
   await p.locator('[data-ramen-nav="home"]').click();
   await p.locator('[data-ramen-nav="menu"]').click();
   assert.equal(await cards.count(),21);
   const favorite=p.locator('#menu .product-card[data-product-id="'+productId+'"] [data-favorite-product]');
   assert.equal(await favorite.getAttribute('aria-pressed'),'true');
   await favorite.click();
   await p.locator('[data-ramen-nav="home"]').click();
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
   const dialog=p.locator('#ramen-contact-dialog'),entry=p.locator('#customer-entry');
   await entry.waitFor({state:'visible'});assert.equal(await nav.getAttribute('aria-hidden'),'true');
   assert.equal(await entry.locator('input[type="password"]').count(),0);
   await p.screenshot({path:path.join(out,'customer-profile-entry-'+lang+'-390.png')});
   await p.keyboard.press('Escape');await entry.waitFor({state:'hidden'});
   await p.locator('#menu-toggle').click();await nav.locator('[data-nav-panel="feedback"]').click();
   await dialog.waitFor({state:'visible'});
   await dialog.locator('input[name="demo-rating"][value="4"]').check();
   await dialog.locator('.feedback-comment textarea').fill('<b>Demo comment</b>');
   await dialog.locator('.feedback-save').click();
   const review=await p.evaluate(()=>JSON.parse(localStorage.getItem('online_menu_demo_review_v2:romano')));assert.equal(review.rating,4);assert.equal(review.status,'pending');assert.equal(review.comment,'<b>Demo comment</b>');
   await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   await p.locator('#menu-toggle').click();await nav.locator('#navigation-service-toggle').click();await nav.locator('[data-nav-panel="chat"]').click();
   await dialog.locator('#connect-message-input').waitFor({state:'visible'});assert.ok((await dialog.locator('.ramen-contact-note').last().innerText()).trim());
   assert.equal(await dialog.evaluate(d=>d.classList.contains('connect-dialog')),true);
   const input=dialog.locator('#connect-message-input');
   await p.waitForFunction(()=>!document.querySelector('#connect-message-input')?.disabled);
   await input.fill('   ');
   assert.equal(await dialog.locator('.connect-count').textContent(),'0 / 2000');
   assert.equal(await dialog.locator('.connect-send').isDisabled(),true);
   await input.fill('  '+ 'a'.repeat(2000)+'  ');
   assert.equal(await dialog.locator('.connect-count').textContent(),'2000 / 2000');
   assert.equal(await dialog.locator('.connect-send').isEnabled(),true);
   await input.fill('a'.repeat(2001));
   assert.equal(await dialog.locator('.connect-send').isDisabled(),true);
   await input.fill('Draft '+lang);
   await p.evaluate(()=>window.dispatchEvent(new Event('romano:data-updated')));
   assert.equal(await input.inputValue(),'Draft '+lang,'catalog refresh must preserve the active draft');
   assert.equal(await input.evaluate(n=>n===document.activeElement),true);
   await input.fill('<b>Demo chat</b>');
   await dialog.locator('.connect-send').click();
   await p.waitForFunction(()=>document.querySelector('.connect-bubble:last-of-type')?.textContent==='<b>Demo chat</b>'||Array.from(document.querySelectorAll('.connect-bubble')).at(-1)?.textContent==='<b>Demo chat</b>');
   assert.equal(await dialog.locator('.connect-bubble').last().textContent(),'<b>Demo chat</b>');
   assert.equal(await dialog.locator('.connect-bubble b').count(),0);
   assert.equal(await dialog.locator('.connect-language').count(),0);
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang==='en'?'fa':'en');
   await p.waitForFunction(()=>Array.from(document.querySelectorAll('.connect-bubble')).at(-1)?.textContent==='<b>Demo chat</b>');
   assert.equal(await dialog.locator('.connect-bubble').last().textContent(),'<b>Demo chat</b>');
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  }
  await p.evaluate(()=>{localStorage.removeItem('online_menu_demo_rating:romano');localStorage.removeItem('online_menu_demo_review_v2:romano');ROMANO_I18N.setLanguage('fa',false);});
 });
 await check('Connect IndexedDB survives reload and receives a same-origin staff reply',async()=>{
  await p.setViewportSize({width:390,height:844});await p.reload();await ready(p);
  const trigger=p.locator('[data-ramen-nav="contact"]');await trigger.click();
  const dialog=p.locator('#ramen-contact-dialog');
  await p.waitForFunction(()=>document.querySelector('#connect-message-input')&&!document.querySelector('#connect-message-input').disabled);
  await dialog.locator('#connect-message-input').fill('R24 demo persistence check');
  await dialog.locator('.connect-send').click();
  await p.waitForFunction(()=>Array.from(document.querySelectorAll('.connect-bubble')).at(-1)?.textContent==='R24 demo persistence check');
  const guest=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('romano_connect_guest_v1')));
  await p.reload();await ready(p);await trigger.click();
  await p.waitForFunction(()=>Array.from(document.querySelectorAll('.connect-bubble')).at(-1)?.textContent==='R24 demo persistence check');
  const staffTab=await ctx.newPage();
  try{
   await staffTab.goto(base);await ready(staffTab);
   await staffTab.evaluate(()=>RomanoConnectAssets.loadEngine());
   await staffTab.evaluate(async guest=>{
    const engine=RomanoConnectDemo,a={id:'qa-staff',role:'manager',restaurantId:'romano',branchId:guest.branchId};
    const data=await engine.readStaff(a,guest.conversationId);
    await engine.command(a,guest.conversationId,{type:'send',clientId:crypto.randomUUID(),text:'R24 demo staff reply',language:'en',expectedVersion:data.conversation.version});
   },guest);
   await p.waitForFunction(()=>Array.from(document.querySelectorAll('.connect-message.is-staff .connect-bubble')).some(n=>n.textContent==='R24 demo staff reply'));
   const isolated=await staffTab.evaluate(async()=>{const s=RomanoConnectDemo.sessionForCurrent();return (await RomanoConnectDemo.get(s)).messages.length;});
   assert.equal(isolated,0);
  }finally{await staffTab.close();}
  await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
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
  await first.waitForFunction(()=>!document.querySelector('#customer-entry')?.open);
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
   assert.ok(atLeastCssPixels(await buttons.first().evaluate(node=>node.getBoundingClientRect().height),44),lang+' category filter touch target');
  }
 });
 await p.evaluate(()=>navigateCustomerView("menu"));
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
 await check('Product share excludes table and payment context in all four languages',async()=>{
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   await cards.first().locator('.product-card-button').click();
   const original=await p.evaluate(()=>{
    const original=location.href;
    const url=new URL(original);
    for(const [key,value] of Object.entries({restaurant:'sample',demoBranch:'sample-branch',demoTable:'A1',qr:'sample-private-token',payment:'ok',order:'sample-order',ref:'sample-ref',extra:'sample-extra'}))url.searchParams.set(key,value);
    history.replaceState(history.state,'',url.href);
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__qaShare=data}});
    window.__qaShare=null;
    return original;
   });
   try{
    await p.locator('[data-rv4-share]').click();
    await p.waitForFunction(()=>Boolean(window.__qaShare));
    const share=await p.evaluate(()=>window.__qaShare);
    const url=new URL(share.url);
    assert.deepEqual([...url.searchParams.keys()],['restaurant']);
    assert.equal(url.searchParams.get('restaurant'),'sample');
    assert.equal(url.searchParams.has('demoBranch'),false);
    assert.match(url.hash,/^#product-/);
   }finally{
    await p.evaluate(original=>{history.replaceState(history.state,'',original);delete navigator.share;delete window.__qaShare;},original);
    await p.keyboard.press('Escape');
   }
  }
 });
 await check('Copy product link falls back safely and gives localized feedback',async()=>{
  const failure={fa:'کپی نشد؛ دوباره تلاش کنید',ar:'تعذر النسخ؛ حاول مجددًا',en:'Copy failed; try again',tr:'Kopyalanamadı; tekrar deneyin'};
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   await cards.first().locator('.product-card-button').click();
   await p.evaluate(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}});
    document.execCommand=()=>{window.__qaCopied=document.activeElement.value;return true;};
   });
   try{
    const copy=p.locator('[data-rv4-copy]');
    await copy.click();
    await p.waitForFunction(()=>Boolean(window.__qaCopied));
    assert.match(await p.evaluate(()=>window.__qaCopied),/#product-/);
    await p.waitForFunction(()=>document.querySelector('[data-rv4-copy]').getAttribute('aria-label')===ROMANO_I18N.ui('copied'));
    assert.equal(await copy.evaluate(n=>document.activeElement===n),true);
    assert.equal(await p.locator('#product-modal textarea[readonly]').count(),0);
    await p.evaluate(()=>{document.execCommand=()=>{throw Error('unavailable')};});
    await copy.click();
    await p.waitForFunction(message=>document.querySelector('[data-rv4-copy]').getAttribute('aria-label')===message,failure[lang]);
    assert.equal(await p.locator('#product-modal textarea[readonly]').count(),0);
   }finally{
    await p.evaluate(()=>{delete navigator.clipboard;delete document.execCommand;delete window.__qaCopied;});
    await p.keyboard.press('Escape');
   }
  }
 });
 await check('Cart supports add, quantity and sample registration at checkout',async()=>{
  const cartButton=p.locator('#ramen-bottom-cart');
  await cartButton.click();
  assert.equal(await p.locator('.commerce-items .commerce-empty').isVisible(),true);
  assert.equal(await p.locator('#commerce-checkout').isVisible(),false);
  await p.locator('#hp-continue').click();
  assert.equal(new URL(p.url()).hash,'#menu');
  assert.equal(await p.locator('#hp-cart-context').isHidden(),true);
  const add=cards.first().locator('.commerce-card-add');assert.equal(await add.isVisible(),true);await add.click();
  assert.equal(await p.locator('#commerce-checkout').isVisible(),true);
  assert.equal(await p.locator('#r17-cart-feedback').getAttribute('data-state'),'added');
  await p.locator('#r17-cart-feedback').waitFor({state:'visible',timeout:1000});
  assert.ok(await p.locator('#r17-cart-feedback').isVisible());
  assert.ok((await p.locator('#r17-cart-feedback .r17-feedback-product').textContent()).trim());
  assert.equal(await p.locator('#r17-cart-feedback .r17-feedback-count').textContent(),await p.evaluate(()=>new Intl.NumberFormat(document.documentElement.lang).format(1)));
  assert.equal(await cartButton.isVisible(),true);assert.equal(await p.locator('.ramen-bottom-cart-count').textContent(),await p.evaluate(()=>new Intl.NumberFormat(document.documentElement.lang).format(1)));
  await cartButton.click();assert.equal(await p.locator('#commerce-drawer').getAttribute('aria-hidden'),'false');
  await check('Cart drawer traps keyboard focus and restores its opener',async()=>{
   await p.keyboard.press('Shift+Tab');
   assert.equal(await p.evaluate(()=>document.activeElement?.id),'commerce-submit');
   await p.keyboard.press('Tab');
   assert.equal(await p.evaluate(()=>document.activeElement?.dataset.cartChange),'-1');
   await p.keyboard.press('Escape');
   assert.equal(await p.locator('#commerce-drawer').getAttribute('aria-hidden'),'true');
   assert.equal(await p.evaluate(()=>document.activeElement?.id),'ramen-bottom-cart');
   await cartButton.click();
  });
  await p.locator('.commerce-quantity button[data-cart-change="1"]').click();assert.equal(await p.locator('.commerce-quantity b').textContent(),'2');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.cartChange),'1');
  assert.equal(await p.locator('[data-hp-note],.commerce-close,[data-cart-remove]').count(),0);
  const suggestions=p.locator('.hp-suggestion');
  assert.ok(await suggestions.count()>0);
  assert.equal(await p.locator('.hp-suggestion-media').count(),await suggestions.count());
  assert.ok(await p.locator('.hp-suggestion-media img').count()>0);
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
  await p.waitForFunction(()=>document.querySelector('#commerce-drawer').classList.contains('is-open'));
  assert.equal(await p.locator('.commerce-quantity b').textContent(),'2');
  const minus=p.locator('[data-cart-change="-1"]');
  await minus.click();assert.equal(await p.locator('[data-cart-remove]').count(),0);
  await minus.click();assert.equal(await p.locator('.commerce-quantity b').textContent(),'0');
  assert.equal(await p.locator('#commerce-checkout').isVisible(),false);
  assert.equal(await p.locator('.commerce-quantity [data-cart-remove] svg').count(),1);
  assert.equal(await p.locator('[data-cart-remove]').isVisible(),true);
  await p.locator('[data-cart-change="1"]').click();
  assert.equal(await p.locator('[data-cart-remove]').count(),0);
  await minus.click();await p.locator('[data-cart-remove]').click();
  assert.equal(await p.locator('#hp-undo').isVisible(),true);
  await p.locator('#hp-undo-button').click();
  assert.equal(await p.locator('.commerce-quantity b').textContent(),'1');
  await minus.click();await p.locator('[data-cart-remove]').click();
  assert.equal(await p.locator('#commerce-checkout').isVisible(),false);
  await p.locator('#hp-continue').click();
 });
 await check('Native Back closes each customer overlay without leaving the menu',async()=>{
  const back=async(selector,closed)=>{await p.waitForFunction(()=>Boolean(history.state?.__ramenCustomerOverlay));await p.evaluate(()=>history.back());await p.waitForFunction(({selector,closed})=>{const node=document.querySelector(selector);return node&&(closed==='hidden'?node.hidden:closed==='dialog'?!node.open:node.getAttribute('aria-hidden')==='true');},{selector,closed});assert.equal(await p.evaluate(()=>Boolean(history.state?.__ramenCustomerOverlay)),false);};
  const original=await p.evaluate(()=>location.pathname+location.search);
  for(const lang of ['fa','en','tr','ar']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   await p.locator('#menu-toggle').click();await back('#main-navigation','aria');
   await p.locator('#menu-search-toggle').click();await back('#menu-search-panel','hidden');
   await p.locator('#menu-filter-toggle').click();await back('#menu-filter-panel','hidden');
   await p.locator('#ramen-header-cart').click();await back('#commerce-drawer','aria');
   const trigger=p.locator('[data-ramen-nav="contact"]');await trigger.focus();await trigger.press('Space');await back('#ramen-contact-dialog','dialog');
   await cards.first().locator('.product-card-button').click();await back('#product-modal','aria');
   assert.equal(await p.evaluate(()=>location.pathname+location.search),original);
   assert.doesNotMatch(await p.evaluate(()=>location.hash),/^#product-/);
  }
  await p.evaluate(()=>ROMANO_I18N.setLanguage('fa',false));
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
  await openSearch();
  await p.locator('#rv4-menu-search').evaluate(input=>{
   input.value='pizza';input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
  });
  assert.equal(await cards.count(),21);
  await p.locator('#rv4-menu-search').evaluate(input=>input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'pizza'})));
  assert.equal(await cards.count(),3);
  await cards.first().evaluate(card=>card.dataset.qaIdentity='preserved');
  await p.locator('#rv4-menu-search').fill(' pizza ');
  assert.equal(await cards.first().getAttribute('data-qa-identity'),'preserved');
  await resetFilters();
  await p.locator('[data-browse-category]').first().click();assert.equal(await cards.count(),3);await resetFilters();
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
   for(const width of [320,390,768,1440,1920]){
    await p.setViewportSize({width,height:844});
    await p.evaluate(()=>document.querySelector('#menu').scrollIntoView({block:'start',behavior:'instant'}));
    await p.waitForFunction(()=>document.querySelector('#menu').style.getPropertyValue('--browse-bar-height'));
    assert.equal(await p.locator('#menu-search-panel').isVisible(),false);
    assert.equal(await p.locator('#menu-filter-panel').isVisible(),false);
    for(const trigger of [searchToggle,filterToggle]){const r=await trigger.boundingBox();assert.ok(r&&atLeastCssPixels(r.width,44)&&atLeastCssPixels(r.height,44),JSON.stringify({lang,width,id:await trigger.getAttribute("id"),rect:r}));assert.ok(await trigger.getAttribute('aria-label'));}
    const sizes=await p.locator('#rv4-category-rail button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
     assert.ok(sizes.length&&sizes.every(h=>Math.abs(h-44)<0.01),'Category rail touch targets match header');
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
  await p.keyboard.press('Escape');await p.evaluate(()=>navigateCustomerView("home"));await p.locator('#categories-grid .category-card').first().click();
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
   await p.setViewportSize({width,height:900});await p.evaluate(lang=>{ROMANO_I18N.setLanguage(lang);navigateCustomerView("home",{focus:false});},lang);
   assert.equal(await p.locator('html').getAttribute('dir'),['fa','ar'].includes(lang)?'rtl':'ltr');
   const expectedFont=['fa','ar'].includes(lang)?'Vazirmatn':'Inter';
   const expectedDisplay=['fa','ar'].includes(lang)?'Vazirmatn':'Playfair Display';
   assert.match(await p.locator('body').evaluate(node=>getComputedStyle(node).fontFamily),new RegExp(expectedFont));
   assert.match(await p.locator('.hero-title').first().evaluate(node=>getComputedStyle(node).fontFamily),new RegExp(expectedDisplay));
   assert.ok(Number.parseFloat(await p.locator('.hero-eyebrow').first().evaluate(node=>getComputedStyle(node).fontSize))>=11);
   assert.ok(Number.parseFloat(await p.locator('[data-ramen-label="menu"]').evaluate(node=>getComputedStyle(node).fontSize))>=11);
   const heroMeta={fa:'کافه و رستوران',en:'Cafe & Restaurant',tr:'Kafe & Restoran',ar:'مقهى ومطعم'}[lang];
   assert.equal((await p.locator('.hero-eyebrow').textContent()).trim(),heroMeta);
   assert.equal(await p.locator('.hero-eyebrow').evaluate(n=>getComputedStyle(n,'::before').content),'none','No decorative line in '+lang);
   const labels={fa:{home:'خانه',menu:'منو',featured:'ویژه‌ها',contact:'ارتباط',cart:'سبد',cartAria:'سبد سفارش',menuEyebrow:'منوی رستوران',categories:'انتخاب شما',featuredTitle:'انتخاب ویژه.',story:'ساده نیست خاص است'},en:{home:'Home',menu:'Menu',featured:'Featured',contact:'Contact',cart:'Cart',cartAria:'Your order',menuEyebrow:'RESTAURANT MENU',categories:'Your Choice',featuredTitle:'Featured Selection.',story:'It is not ordinary.'},tr:{home:'Ana Sayfa',menu:'Menü',featured:'Öne çıkanlar',contact:'İletişim',cart:'Sepet',cartAria:'Siparişiniz',menuEyebrow:'RESTORAN MENÜSÜ',categories:'Sizin Seçiminiz',featuredTitle:'Özel Seçim.',story:'Sıradan değil özel.'},ar:{home:'الرئيسية',menu:'القائمة',featured:'المميز',contact:'اتصل بنا',cart:'السلة',cartAria:'طلبك',menuEyebrow:'قائمة المطعم',categories:'اختيارك',featuredTitle:'اختيار مميز.',story:'الأمر ليس عاديًا.'}}[lang];
   for(const key of ['home','menu','featured','contact','cart']) assert.equal(await p.locator('[data-ramen-label="'+key+'"]').textContent(),labels[key]);
   const normalizedText=selector=>p.locator(selector).innerText().then(value=>value.replace(/\s+/g,' ').trim());
   assert.equal(await p.locator('#site-header #menu-browser-eyebrow,#site-header #menu-result-count,#site-header #menu-data-status,#site-header [data-browse-category="all"]').count(),0);
   assert.equal(await normalizedText('#categories .section-title'),labels.categories);
   assert.equal(await normalizedText('#featured .section-title'),labels.featuredTitle);
   assert.equal(await p.locator('.story-section,.contact-section').count(),0);
   assert.equal(await p.locator('footer #contact').count(),1);
   assert.equal(await p.locator('#ramen-header-cart').getAttribute('aria-label'),labels.cartAria);
   const headerBoxes=await p.locator('.header-container .brand, #romano-language-toggle, #menu-search-toggle, #ramen-header-cart, #menu-toggle').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {name:node.className||node.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
   assert.equal(headerBoxes.length,5,JSON.stringify(headerBoxes));
   const hamburger=await p.locator('#menu-toggle').evaluate(button=>{const b=button.getBoundingClientRect();return {button:{x:b.x,y:b.y,w:b.width,h:b.height},lines:[...button.children].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})};});
   assert.equal(hamburger.lines.length,3);
   for(const line of hamburger.lines){assert.ok(Math.abs(line.w-18)<1&&Math.abs(line.h-2)<1);assert.ok(Math.abs(line.x+line.w/2-hamburger.button.x-hamburger.button.w/2)<1);}
   assert.ok(Math.abs(hamburger.lines[1].y-hamburger.lines[0].y-6)<1&&Math.abs(hamburger.lines[2].y-hamburger.lines[1].y-6)<1);
   assert.ok(Math.abs(hamburger.lines[1].y+1-hamburger.button.y-hamburger.button.h/2)<1);
   const headerDirection=await p.locator('.header-container').evaluate(node=>getComputedStyle(node).direction);
   assert.equal(headerDirection,lang==='fa'||lang==='ar'?'rtl':'ltr','Header direction mismatch '+lang+'/'+width);
   const brandParts=await p.locator('.brand-logo, .brand-content').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,display:getComputedStyle(node).display,width:r.width};}));
   assert.equal(brandParts.length,2);
   assert.notEqual(brandParts[0].display,'none','Brand mark remains visible at '+lang+'/'+width);
   assert.equal(await p.locator('#romano-language-label').innerText(),lang.toUpperCase());
   assert.equal(await p.locator('#romano-language-toggle .language-toggle-icon').count(),0);
   const hero=await p.locator('.hero-content').boundingBox();
   const usableWidth=await p.locator('.hero-section').evaluate(n=>n.clientWidth);
   assert.ok(hero&&hero.width>=Math.min(usableWidth-32,700)-1,'Hero track collapsed '+lang+'/'+width+': '+JSON.stringify({hero,usableWidth}));
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
   await p.evaluate(()=>navigateCustomerView("menu",{focus:false}));
    const bounds=await cards.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert.ok(bounds.every(w=>w>125),`Readable card widths ${lang}/${width}: ${bounds}`);
   await cards.first().locator('.product-card-button').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.keyboard.press('Escape');
  }
  for(const [lang,width]of [['fa',390],['en',1440],['ar',390],['tr',390]]){
   await p.setViewportSize({width,height:1000});await p.evaluate(l=>ROMANO_I18N.setLanguage(l),lang);
   await p.evaluate(()=>navigateCustomerView("home",{focus:false}));await p.waitForTimeout(150);
   await p.screenshot({path:path.join(out,`customer-hero-${lang}-${width}.png`)});
   await p.evaluate(()=>navigateCustomerView("menu",{focus:false}));await p.waitForTimeout(200);
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
    await p.locator('#hp-continue').click();
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
  const s=await c.newPage();s.on('pageerror',e=>errors.push(String(e)));await s.goto(base);await ready(s);await s.locator('.hero-button').click();await s.locator('#menu').waitFor({state:'visible'});assert.equal(await s.locator('#menu .product-card').count(),21);
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
  assert.ok(cartBox && atLeastCssPixels(cartBox.width,40) && atLeastCssPixels(cartBox.height,40) && cartBox.x>=0 && cartBox.x+cartBox.width<=1440,JSON.stringify({cartBox,menuBox}));
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
   const cta=p.locator('[data-nav-panel="feedback"]');
   assert.equal(await footer.evaluate(node=>getComputedStyle(node).direction),expected[lang].dir,lang+' footer direction');
   assert.equal(await cta.evaluate(node=>getComputedStyle(node).direction),expected[lang].dir,lang+' CTA direction');
   assert.match(await footer.evaluate(node=>getComputedStyle(node).fontFamily),new RegExp(expected[lang].font),lang+' footer font');
   assert.match(await cta.evaluate(node=>getComputedStyle(node).fontFamily),new RegExp(expected[lang].font),lang+' CTA font');
   assert.ok(atLeastCssPixels((await cta.boundingBox())?.height,40),lang+' CTA touch target');
   assert.ok((await cta.textContent()).trim().length>0,lang+' CTA label');
   const toggle=nav.locator('#navigation-service-toggle'),options=nav.locator('#navigation-service-options');
   assert.equal(await nav.locator('#navigation-rating .hero-stars span').count(),5);
   await toggle.click();assert.equal(await options.isVisible(),true);
   assert.equal(await options.locator('button').count(),3);
   await p.keyboard.press('Escape');assert.equal(await options.isVisible(),false);assert.equal(await nav.getAttribute('aria-hidden'),'false');
   await toggle.click();await p.evaluate(()=>history.back());await options.waitFor({state:'hidden'});assert.equal(await nav.getAttribute('aria-hidden'),'false');
   await toggle.click();await options.locator('[data-nav-panel="waiter"]').click();const waiter=p.locator('#ramen-contact-dialog');await waiter.waitFor({state:'visible'});await waiter.locator('[data-panel-state="ready"]').waitFor({state:'visible'});await waiter.locator('.hp-service-action').first().waitFor({state:'visible'});assert.equal(await waiter.locator('.hp-service-action').count(),1);await p.keyboard.press('Escape');await waiter.waitFor({state:'hidden'});await p.locator('#menu-toggle').click();
   await p.locator('#navigation-close').click();
   await p.waitForFunction(()=>document.querySelector('#main-navigation')?.getAttribute('aria-hidden')==='true');
  }
 });
 await check('Hero and consolidated footer stay localized and direction-aware',async()=>{
  await p.evaluate(()=>navigateCustomerView("home",{focus:false}));
  const expected={
   fa:{tagline:'کافه و رستوران',footerBrand:'کافه و رستوران',contact:'ارتباط با ما',follow:'ما را دنبال کنید',powered:'قدرت‌گرفته از RAMEN',story:'ساده نیست خاص است',contactTitle:'منتظر شما هستیم.'},
   en:{tagline:'Cafe & Restaurant',footerBrand:'Cafe & Restaurant',contact:'Contact',follow:'Follow us',powered:'Powered by RAMEN',story:'It is not ordinary.',contactTitle:'We are waiting for you.'},
   tr:{tagline:'Kafe & Restoran',footerBrand:'Kafe & Restoran',contact:'İletişim',follow:'Bizi takip edin',powered:'RAMEN ile desteklenmektedir',story:'Sıradan değil özel.',contactTitle:'Sizi bekliyoruz.'},
   ar:{tagline:'مقهى ومطعم',footerBrand:'مقهى ومطعم',contact:'تواصل معنا',follow:'تابعنا',powered:'مدعوم بواسطة رامن',story:'الأمر ليس عاديًا.',contactTitle:'بانتظاركم.'}
  };
  for(const lang of ['fa','ar','en','tr']){
   await p.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
   const e=expected[lang],dir=['fa','ar'].includes(lang)?'rtl':'ltr',font=dir==='rtl'?'Vazirmatn':'Inter';
   const text=selector=>p.locator(selector).innerText().then(v=>v.replace(/\s+/g,' ').trim());
   assert.equal((await text('.hero-eyebrow')),e.tagline,lang+' hero tagline');
   assert.equal(await p.locator('.hero-content').evaluate(n=>getComputedStyle(n).direction),dir,lang+' hero direction');
   assert.equal(await p.locator('.hero-title').evaluate(n=>getComputedStyle(n).textAlign),'center',lang+' hero title alignment');
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
  assert.equal(await p.locator('.hero-title').evaluate(el=>getComputedStyle(el).textAlign),'center');
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
 await check('Only the requested localized creator credit appears in the footer; commerce remains RAMEN',async()=>{
  assert.equal(await p.locator('a[href*="kiankhayat.me"]').count(),1);
  const credit=p.locator('.footer-bottom a.footer-creator[href="https://kiankhayat.me"]');
  assert.equal(await credit.count(),1);
  assert.equal(await credit.getAttribute('rel'),'noopener noreferrer');
  assert.equal(await p.locator('.commerce-drawer small').textContent(),'RAMEN');
 });

 await check('Unified connected sign-in: new and returning customers, staff invite, OTP failure and role-based destination',async()=>{
  const authContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  authContext.on('page',page=>page.on('pageerror',e=>errors.push(String(e))));
  const fixture={restaurant:{name:'QA Kitchen',tagline:'Cafe',description:'QA only',address:'QA address',currency:'TRY'},categories:[],products:[]};
  const accounts=new Map(),calls=[];let session=null,challenge=null,serial=0,adminReads=0;
  const customerPhone='+989123450001',staffPhone='+989123450002',accessKey='x'.repeat(43);
  await authContext.route('**/api/v1/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.slice('/api/v1'.length),method=req.method();
   const body=method==='POST'?req.postDataJSON():null;
   calls.push({path,method,body});
   const answer=(data,status=200,code=null)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({data,error:code?{code,message:'QA mock'}:null})});
   if(path.startsWith('/public/'))return answer(fixture);
   if(path==='/auth/me')return answer(session);
   if(path==='/auth/csrf')return answer({csrfToken:'qa-csrf-token'});
   if(path==='/auth/phone/status')return answer({enabled:true});
   if(path.startsWith('/auth/phone/')&&method==='POST'){
    assert.ok(req.headers()['x-csrf-token'],'CSRF header required');
    if(path.endsWith('/lookup'))return answer({needsName:!accounts.has(body.phone)});
    if(path.endsWith('/start')||path.endsWith('/enroll-admin')){
     if(path.endsWith('/enroll-admin')&&(!body.accessKey||!body.name))return answer(null,400,'PHONE_AUTH_INVALID');
     if(path.endsWith('/start')&&Object.hasOwn(body,'accessKey'))return answer(null,400,'PHONE_AUTH_INVALID');
     if(body.accessKey&&!(body.phone===staffPhone&&body.accessKey===accessKey))return answer(null,400,'PHONE_AUTH_INVALID');
     if(!accounts.has(body.phone)&&!body.name)return answer(null,409,'PHONE_AUTH_NAME_REQUIRED');
     challenge={id:'qa-challenge-'+(++serial),phone:body.phone,name:body.name,staff:body.accessKey===accessKey};
     return answer({challenge:challenge.id,expiresIn:300,resendAfter:60});
    }
    if(path.endsWith('/verify')){
     if(!challenge||body.challenge!==challenge.id||body.code!=='123456')return answer(null,401,'PHONE_AUTH_CODE_INVALID');
     let account=accounts.get(challenge.phone);
     if(!account){account={user:{id:challenge.phone,displayName:challenge.name},role:challenge.staff?'admin':'customer'};accounts.set(challenge.phone,account);}
     session={user:account.user,membership:account.role==='admin'?{restaurant_id:'qa',role:'manager'}:null};
     challenge=null;return answer({...account,csrfToken:'qa-rotated-csrf'});
    }
   }
   if(path==='/auth/logout'){session=null;return answer({loggedOut:true});}
   if(path==='/admin/data'){adminReads++;return session?.membership?answer(fixture):answer(null,403,'FORBIDDEN');}
   return answer(null,404,'NOT_FOUND');
  });
  try{
   const page=await authContext.newPage(),root=new URL('/',base).href,entry=page.locator('#phone-auth-entry'),submit=entry.locator('button[type=submit]');
   await page.goto(root+'?login=1');await ready(page);await entry.waitFor({state:'visible'});
   for(const lang of ['fa','en','tr','ar']){
    await entry.locator('select').selectOption(lang);
    assert.equal(await page.locator('html').getAttribute('dir'),['fa','ar'].includes(lang)?'rtl':'ltr');
    assert.ok((await entry.locator('h1').innerText()).trim());
    assert.equal(await entry.locator('input[name=phone]').isVisible(),true);
    assert.equal(await entry.locator('input[name=name]').count(),0);
   }
   await entry.locator('select').selectOption('en');
   await entry.locator('input[name=phone]').fill(customerPhone);await submit.click();
   const name=entry.locator('input[name=name]');await name.waitFor({state:'visible'});
   assert.equal(await entry.locator('input[name=accessKey]').count(),0);
   assert.equal(await entry.locator('input[name=code]').count(),0);
   await name.fill('QA Customer');await submit.click();
   const code=entry.locator('input[name=code]');await code.waitFor({state:'visible'});
   assert.equal(await entry.getByRole('button',{name:'Resend code'}).isDisabled(),true);
   await code.fill('000000');await submit.click();await entry.getByRole('alert').waitFor({state:'visible'});
   assert.equal(await accounts.size,0);
   await code.fill('۱۲۳۴۵۶');await submit.click();await entry.waitFor({state:'detached'});
   assert.equal(new URL(page.url()).searchParams.has('login'),false);
   assert.equal(new URL(page.url()).pathname,'/');
   assert.equal(session.membership,null);
   // Simulate a new browser session with the same already-registered number.
   session=null;await page.goto(root+'?login=1');await ready(page);await entry.waitFor({state:'visible'});
   await entry.locator('input[name=phone]').fill(customerPhone);await submit.click();await code.waitFor({state:'visible'});
   assert.equal(await entry.locator('input[name=name]').count(),0);
   assert.deepEqual(calls.filter(c=>c.path.endsWith('/start')).at(-1).body,{phone:customerPhone});
   await code.fill('123456');await submit.click();await entry.waitFor({state:'detached'});assert.equal(accounts.size,1);
   // A customer visiting /admin/ cannot enter the dashboard.
   await page.goto(new URL('admin/',root).href);await page.waitForURL(url=>url.pathname==='/');
   assert.equal(adminReads,0);
   // A signed-out staff member enters through the exact same page.
   session=null;await page.goto(new URL('admin/',root).href);await page.waitForURL(url=>url.pathname==='/'&&url.searchParams.get('login')==='1');await ready(page);
   await entry.waitFor({state:'visible'});
   await entry.getByRole('button',{name:'Admin registration',exact:true}).click();
   assert.equal(await entry.locator('h1').innerText(),'Admin registration');
   await entry.locator('input[name=phone]').fill(staffPhone);await name.fill('QA Staff');
   const key=entry.locator('input[name=accessKey]');await key.waitFor({state:'visible'});
   assert.equal(await key.getAttribute('required'),'');
   await key.fill('y'.repeat(43));await submit.click();await entry.getByRole('alert').waitFor({state:'visible'});
   assert.equal(accounts.size,1);
   await key.fill(accessKey);await submit.click();await code.waitFor({state:'visible'});
   await code.fill('123456');await submit.click();
   await page.waitForURL(url=>url.pathname==='/admin/');
   await page.waitForFunction(()=>typeof adminInitialized!=='undefined'&&adminInitialized&&!document.querySelector('.admin-app').inert);
   assert.equal(session.membership.role,'manager');assert.ok(adminReads>0);
   assert.equal(accounts.size,2);
   assert.ok(calls.some(c=>c.path.endsWith('/enroll-admin')&&c.body.accessKey===accessKey));
   session=null;await page.goto(root+'?login=1');await ready(page);await entry.waitFor({state:'visible'});
   await entry.locator('input[name=phone]').fill(staffPhone);await submit.click();await code.waitFor({state:'visible'});
   assert.equal(await entry.locator('input[name=accessKey]').count(),0);
   assert.deepEqual(calls.filter(c=>c.path.endsWith('/start')).at(-1).body,{phone:staffPhone});
   await code.fill('123456');await submit.click();await page.waitForURL(url=>url.pathname==='/admin/');
   assert.ok(calls.filter(c=>c.path.endsWith('/verify')).every(c=>Object.keys(c.body).sort().join(',')==='challenge,code'));
   assert.ok(!page.url().includes(accessKey));
  }finally{await authContext.close();}
 });
 await check('No uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 fs.writeFileSync(path.join(out,'customer-browser-results.json'),JSON.stringify({passed:results.length,cases:results,errors,notes:'Chromium, static preview and mocked public API. Service workers blocked. No real PostgreSQL or production test.'},null,2));
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exit(1)});
