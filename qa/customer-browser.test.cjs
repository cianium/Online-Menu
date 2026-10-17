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
 browser=await pw.chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 ctx.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));
 const p=await ctx.newPage();await p.goto(base);await ready(p);
 const cards=p.locator('#menu .product-card');
 await check('Static demo boots with 21 products',async()=>{assert.equal(await cards.count(),21);assert.equal(await p.evaluate(()=>menuDataMode),'demo')});
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
 await check('Four languages at 320, 390 and 1440px: direction, overflow and modal',async()=>{
  for(const lang of ['en','tr','ar','fa'])for(const width of [320,390,1440]){
   await p.setViewportSize({width,height:900});await p.evaluate(lang=>ROMANO_I18N.setLanguage(lang),lang);
   assert.equal(await p.locator('html').getAttribute('dir'),['fa','ar'].includes(lang)?'rtl':'ltr');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${lang}/${width}`);
   assert.ok(await p.locator('#rv4-menu-search').getAttribute('placeholder'));
   const bounds=await cards.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert.ok(bounds.every(w=>w>125),`Readable card widths ${lang}/${width}: ${bounds}`);
   await cards.first().locator('.product-card-button').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.keyboard.press('Escape');
  }
  for(const [lang,width]of [['fa',390],['en',1440],['ar',390],['tr',390]]){
   await p.setViewportSize({width,height:1000});await p.evaluate(l=>ROMANO_I18N.setLanguage(l),lang);
   await p.evaluate(()=>window.scrollTo({top:document.querySelector('#menu').getBoundingClientRect().top+scrollY-85,behavior:'instant'}));await p.waitForTimeout(200);await p.screenshot({path:path.join(out,`customer-${lang}-${width}.png`)});
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
 await check('No uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 fs.writeFileSync(path.join(out,'customer-browser-results.json'),JSON.stringify({passed:results.length,cases:results,errors,notes:'Chromium, static preview and mocked public API. Service workers blocked. No real PostgreSQL or production test.'},null,2));
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exit(1)});
