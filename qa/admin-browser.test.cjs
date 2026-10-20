/* Run with a local preview at ADMIN_TEST_URL (default: http://127.0.0.1:8765).
   Install playwright and its Chromium first. Optional CHROMIUM_EXECUTABLE_PATH. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let pw;
try { pw = require('playwright'); } catch (e) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw e;
  pw = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
}
const base = process.env.ADMIN_TEST_URL || 'http://127.0.0.1:8765';
const out = path.resolve(__dirname, '../docs/qa');
fs.mkdirSync(out, { recursive: true });
const results = [];
let browser;
async function check(name, action) { await action(); results.push(name); console.log('PASS', name); }
(async () => {
  browser = await pw.chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(base + '/admin/');
  await page.waitForFunction(() => typeof adminInitialized !== 'undefined' && adminInitialized && !document.querySelector('.admin-app').inert);
  await check('Local demo boot and seed catalog', async () => assert.equal(await page.evaluate(() => state.products.length), 21));
  await check('4 languages × 3 widths × 5 admin pages: direction and horizontal overflow', async () => {
    for (const lang of ['en','tr','ar','fa']) {
      await page.evaluate(lang => window.ROMANO_ADMIN_I18N.setLanguage(lang), lang);
      assert.equal(await page.getAttribute('html','dir'), ['fa','ar'].includes(lang) ? 'rtl' : 'ltr');
      for (const width of [1440,390,320]) {
        await page.setViewportSize({width,height:900});
        for (const section of ['dashboard','orders','products','categories','settings']) {
          await page.evaluate(section => navigateTo(section),section);
          await page.waitForTimeout(50);
          if(width < 1000) assert.equal(await page.locator("#sidebar").isVisible(),false);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1), false, `${lang}/${width}/${section}`);
        }
      }
    }
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(() => { window.ROMANO_ADMIN_I18N.setLanguage('en'); navigateTo('products'); });
  await check('Create product with decimal price and persist after reload', async () => {
    await page.locator('#add-product-button').click();
    await page.locator('#product-form [name=name]').fill('QA Product');
    await page.locator('#product-form-category').selectOption(await page.evaluate(() => state.categories[0].id));
    await page.locator('#product-form [name=price]').fill('12.34');
    await page.locator('#product-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#product-modal').classList.contains('is-open'));
    assert.equal(await page.evaluate(() => state.products.find(p=>p.name==='QA Product').price),12.34);
    await page.reload();
    await page.waitForFunction(() => adminInitialized && !document.querySelector('.admin-app').inert);
    assert.equal(await page.evaluate(() => state.products.filter(p=>p.name==='QA Product').length),1);
  });
  await check('Zero and decimal ratings survive product edits and reload', async () => {
    await page.evaluate(()=>navigateTo('products'));
    await page.locator('#product-search').fill('QA Product');
    for (const rating of ['0','4.5']) {
      await page.locator('[data-product-action=edit]').click();
      await page.locator('#product-form [name=rating]').fill(rating);
      await page.locator('#product-form button[type=submit]').click();
      await page.waitForFunction(()=>!document.querySelector('#product-modal').classList.contains('is-open'));
      await page.reload();
      await page.waitForFunction(()=>adminInitialized&&!document.querySelector('.admin-app').inert);
      assert.equal(await page.evaluate(()=>state.products.find(p=>p.name==='QA Product').rating),Number(rating));
      await page.evaluate(()=>navigateTo('products'));
      await page.locator('#product-search').fill('QA Product');
      await page.locator('[data-product-action=edit]').click();
      assert.equal(await page.locator('#product-form [name=rating]').inputValue(),rating);
      await page.locator('#product-modal button[data-close-modal]').first().click();
    }
    await page.locator('#product-search').fill('');
    await page.evaluate(()=>navigateTo('dashboard'));
  });
  await check('Mobile product form has readable inputs and reachable sticky save', async () => {
    await page.setViewportSize({width:320,height:640});
    await page.evaluate(()=>navigateTo('products'));
    await page.locator('#add-product-button').click();
    assert.equal(await page.locator('#product-form [name=name]').evaluate(n=>getComputedStyle(n).fontSize),'16px');
    const submit=page.locator('#product-form button[type=submit]');
    await page.locator('#product-modal.is-open').waitFor();
    assert.equal(await page.locator('#product-form [name=price]').getAttribute('placeholder'),'e.g. 250000');
    assert.ok(await submit.isVisible());
    await page.waitForFunction(()=>{
      const box=document.querySelector('#product-form button[type=submit]').getBoundingClientRect();
      return box.height>=44 && box.y>=0 && box.bottom<=innerHeight;
    });
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(out,'admin-mobile-edit-320.png')});
    await page.locator('#product-modal button[data-close-modal]').first().click();
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>navigateTo('dashboard'));
  });
  await check('Content review opens a correctly scoped filter', async () => {
    await page.locator('[data-review=image]').click();
    assert.equal(await page.locator('.admin-product-card').count(),1);
  });
  await check('Duplicate opens an inactive unsaved copy; dirty close can cancel or discard', async () => {
    await page.locator('[data-product-action=duplicate]').click();
    assert.equal(await page.locator('#product-form [name=active]').isChecked(),false);
    assert.equal(await page.evaluate(()=>state.products.length),22);
    await page.locator('#product-modal button[data-close-modal]').first().click();
    await page.locator('dialog[open] [value=cancel]').click();
    assert.equal(await page.locator('#product-modal').getAttribute('aria-hidden'),'false');
    await page.locator('#product-modal button[data-close-modal]').first().click();
    await page.locator('dialog[open] [value=confirm]').click();
    await page.waitForFunction(()=>!document.querySelector('#product-modal').classList.contains('is-open'));
  });
  await check('Confirm followed by Escape never confirms the second action', async () => {
    await page.evaluate(()=>{window.confirmResult=null; window.RomanoConfirm('تأیید عملیات').then(v=>window.confirmResult=v);});
    await page.locator('dialog[open] [value=confirm]').click();
    await page.waitForFunction(()=>window.confirmResult===true);
    await page.evaluate(()=>{window.confirmResult=null; window.RomanoConfirm('تأیید عملیات').then(v=>window.confirmResult=v);});
    await page.locator('dialog[open]').waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>window.confirmResult===false);
  });
  await check('Failed local write rolls back state and keeps form input', async () => {
    await page.locator('[data-product-action=edit]').click();
    await page.locator('#product-form [name=name]').fill('Unsaved QA');
    await page.evaluate(()=>{window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='romano_products')throw new DOMException('Full','QuotaExceededError');return window.realSet.call(this,k,v);};});
    await page.locator('#product-form button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('.admin-status-chip').dataset.status==='error');
    assert.equal(await page.evaluate(()=>state.products.some(p=>p.name==='Unsaved QA')),false);
    assert.equal(await page.locator('#product-form [name=name]').inputValue(),'Unsaved QA');
    await page.evaluate(()=>Storage.prototype.setItem=window.realSet);
    await page.locator('#product-form [name=name]').fill('QA Product');
    await page.locator('#product-form button[type=submit]').click();
    await page.waitForFunction(()=>!document.querySelector('#product-modal').classList.contains('is-open'));
  });
  await check('Bulk status change persists and scopes selection to visible products', async () => {
    await page.locator('[data-select-product]').check();
    await page.locator('[data-bulk=inactive]').click();
    await page.locator('dialog[open] [value=confirm]').click();
    await page.waitForFunction(()=>state.products.find(p=>p.name==='QA Product').active===false);
    assert.equal(await page.locator('.admin-product-card').count(),0);
    assert.match(await page.locator('.bulk-count').innerText(),/^0/);
  });
  await check('Settings dirty status clears only after successful save', async () => {
    await page.evaluate(()=>navigateTo('settings'));
    await page.locator('#restaurant-settings-form [name=name]').fill('QA Restaurant');
    assert.match(await page.locator('.settings-save-state').innerText(),/Unsaved/);
    await page.locator('#restaurant-settings-form button[type=submit]').click();
    await page.waitForFunction(()=>!document.querySelector('#restaurant-settings-form').classList.contains('is-dirty'));
  });
  await check('Backup import awaits failed storage and restores previous state', async () => {
    const backup=await page.evaluate(()=>({schema:'romano.menu-backup',schemaVersion:1,restaurant:{...state.restaurant,name:'Bad restore'},categories:state.categories,products:state.products}));
    await page.evaluate(()=>{window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='romano_products')throw new DOMException('Full','QuotaExceededError');return window.realSet.call(this,k,v);};});
    await page.locator('[data-rv4-import]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await page.locator('dialog[open] [value=confirm]').click();
    await page.waitForFunction(()=>document.querySelector('.admin-status-chip').dataset.status==='error');
    assert.equal(await page.evaluate(()=>state.restaurant.name),'QA Restaurant');
    await page.evaluate(()=>Storage.prototype.setItem=window.realSet);
  });
  await check('Category create, rename and delete; product delete persists',async()=>{
    await page.evaluate(()=>navigateTo('categories'));
    await page.locator('#add-category-button').click();
    await page.locator('#category-form [name=name]').fill('QA Category');
    await page.locator('#category-form button[type=submit]').click();
    await page.waitForFunction(()=>!document.querySelector('#category-modal').classList.contains('is-open'));
    let card=page.locator('.admin-category-card').filter({hasText:'QA Category'});
    await card.locator('[data-category-action=edit]').click();
    await page.locator('#category-form [name=name]').fill('QA Renamed');
    await page.locator('#category-form button[type=submit]').click();
    await page.waitForFunction(()=>!document.querySelector('#category-modal').classList.contains('is-open'));
    await page.locator('.admin-category-card').filter({hasText:'QA Renamed'}).locator('[data-category-action=delete]').click();
    await page.locator('dialog[open] [value=confirm]').click();
    await page.waitForFunction(()=>!state.categories.some(c=>c.name==='QA Renamed'));
    await page.evaluate(()=>navigateTo('products'));
    await page.locator('.admin-clear-filters').click();
    await page.locator('#product-search').fill('QA Product');
    await page.locator('[data-product-action=delete]').click();
    await page.locator('dialog[open] [value=confirm]').click();
    await page.waitForFunction(()=>!state.products.some(p=>p.name==='QA Product'));
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('romano_products')).some(p=>p.name==='QA Product')),false);
  });
  // Mocked HTTP contract tests exercise frontend handling, not PostgreSQL or authorization.
  const remote={restaurant:{name:'Remote',currency:'TRY'},categories:[],products:[]};
  let writes=0,failSave=false,delaySave=0,uploads=0;
  await context.route('**/api/v1/**',async route=>{
    const u=new URL(route.request().url());let data;
    if(u.pathname.endsWith('/auth/me'))data={user:{id:'u'}};
    else if(u.pathname.endsWith('/auth/csrf'))data={csrfToken:'test'};
    else if(u.pathname.endsWith('/admin/data'))data=remote;
    else if(u.pathname.endsWith('/admin/media')){uploads++;data={url:'/uploads/test.png'};}
    else if(u.pathname.endsWith('/admin/snapshot')){
      writes++;if(delaySave)await new Promise(r=>setTimeout(r,delaySave));
      if(failSave){await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'failed'}})});return;}
      Object.assign(remote,route.request().postDataJSON()); data={saved:true,data:remote};
    }
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});
  });
  await check('Empty server catalog never restores local demo data or auto-writes', async()=>{
    await page.reload();await page.waitForFunction(()=>adminInitialized&&!document.querySelector('.admin-app').inert);
    assert.equal(await page.evaluate(()=>state.products.length),0);
    assert.equal(await page.evaluate(()=>state.categories.length),0);
    assert.equal(writes,0);
  });
  await check('Server failure keeps category form and rolls back state; retry saves once',async()=>{
    await page.evaluate(()=>navigateTo('categories'));
    await page.locator('#add-category-button').click();
    await page.locator('#category-form [name=name]').fill('Remote category');
    failSave=true;
    await page.locator('#category-form button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('.admin-status-chip').dataset.status==='error');
    assert.equal(await page.evaluate(()=>state.categories.length),0);
    assert.equal(await page.locator('#category-form [name=name]').inputValue(),'Remote category');
    failSave=false;delaySave=150;
    await page.locator('#category-form button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('#category-form button[type=submit]').disabled);
    await page.waitForFunction(()=>!document.querySelector('#category-modal').classList.contains('is-open'));
    assert.equal(writes,2);
  });
  await check('Media upload happens once and persisted URLs replace inline images',async()=>{
    await page.evaluate(()=>navigateTo('products'));
    await page.locator('#add-product-button').click();
    await page.locator('#product-form [name=name]').fill('Media test');
    await page.locator('#product-form-category').selectOption(await page.evaluate(()=>state.categories[0].id));
    await page.locator('#product-form [name=price]').fill('25');
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9d0AAAAASUVORK5CYII=','base64');
    await page.locator('#product-image-file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});
    await page.waitForFunction(()=>document.querySelector('#product-form [name=image]').value.startsWith('data:image/'));
    await page.locator('#product-form button[type=submit]').click();
    await page.waitForFunction(()=>!document.querySelector('#product-modal').classList.contains('is-open'));
    assert.equal(uploads,1);
    assert.match(await page.evaluate(()=>formatPrice(25)), /TRY|₺/);
    assert.equal(await page.evaluate(()=>state.products[0].image),'/uploads/test.png');
    await page.locator('[data-product-action=toggle]').click();
    await page.waitForFunction(()=>!saveInProgress);
    assert.equal(uploads,1);
  });
  await check('Service outage is blocked instead of writable demo fallback',async()=>{
    await context.unrouteAll();
    await context.route('**/api/v1/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":{}}'}));
    await page.reload();await page.locator('#admin-load-error').waitFor();
    assert.equal(await page.evaluate(()=>document.querySelector('.admin-app').inert),true);
    assert.equal(await page.locator('#admin-mode-banner').isVisible(),false);
  });
  await context.unrouteAll();
  await page.evaluate(()=>localStorage.clear());
  await page.reload();await page.waitForFunction(()=>adminInitialized&&!document.querySelector('.admin-app').inert);
  await check('Final screenshots and no uncaught runtime errors',async()=>{
    for(const [lang,width,name,section] of [['en',1440,'admin-desktop-en','dashboard'],['fa',390,'admin-mobile-fa','products'],['tr',390,'admin-mobile-tr','dashboard'],['ar',1440,'admin-desktop-ar','products']]){
      await page.setViewportSize({width,height:900});
      await page.evaluate(({lang,section})=>{window.ROMANO_ADMIN_I18N.setLanguage(lang);navigateTo(section);},{lang,section});
      await page.waitForTimeout(300);
      await page.screenshot({path:path.join(out,name+'.png'),fullPage:section==='dashboard' && width>700});
    }
    assert.deepEqual(errors,[]);
  });
  fs.writeFileSync(path.join(out,'admin-browser-results.json'),JSON.stringify({passed:results.length,cases:results,errors,notes:'Chromium only. Server flows use a mocked HTTP contract; no real PostgreSQL test.'},null,2));
  await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exit(1);});
