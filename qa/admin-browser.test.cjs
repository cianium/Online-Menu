const {loginDemoAdmin}=require('./demo-admin-login.cjs');
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
const out = path.resolve(process.env.BROWSER_EVIDENCE_DIR || path.join(__dirname, '../docs/qa'));
fs.mkdirSync(out, { recursive: true });
const results = [];
let browser;
async function check(name, action) { await action(); results.push(name); console.log('PASS', name); }
(async () => {
  browser = await pw.chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  // Axe is injected by this test suite. The standalone integration suite enforces CSP.
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',bypassCSP:true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(base + '/admin/');
  await page.locator('#admin-gate').waitFor({state:'visible'});
  await check('Demo admin ID/password gate rejects incorrect credentials and localizes form',async()=>{
    assert.equal(await page.locator('.admin-app').evaluate(n=>n.inert),true);
    for(const lang of ['fa','ar','en','tr']){
      await page.locator('#admin-gate-language').selectOption(lang);
      assert.equal(await page.locator('html').getAttribute('dir'),['fa','ar'].includes(lang)?'rtl':'ltr');
      for(const width of [320,390,1440]){
        await page.setViewportSize({width,height:844});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      }
    }
    await page.locator('#admin-gate-email').fill('demo-admin');
    await page.locator('#admin-gate-password').fill('wrong-password');
    await page.locator('#admin-gate-submit').click();
    assert.equal(await page.locator('#admin-gate-error').isVisible(),true);
    assert.equal(await page.locator('.admin-app').evaluate(n=>n.inert),true);
    await page.locator('#admin-gate-language').selectOption('fa');
    await loginDemoAdmin(page);
  });
  await check('Local demo boot and seed catalog', async () => assert.equal(await page.evaluate(() => state.products.length), 21));
  await check('Sample revenue filters and accessible empty state in four locales',async()=>{
    await page.evaluate(()=>navigateTo('dashboard'));
    for(const lang of ['fa','en','tr','ar']){
      await page.evaluate(l=>ROMANO_ADMIN_I18N.setLanguage(l),lang);
      await page.locator('#revenue-period').selectOption('7');
      assert.equal(await page.locator('#revenue-content').isVisible(),true);
      assert.equal(await page.locator('#revenue-table-body tr').count(),7);
      assert.equal(await page.locator('#revenue-bars span').count(),7);
      assert.equal(await page.locator('#revenue-export').isEnabled(),true);
    }
    await page.locator('#revenue-period').selectOption('30');
  });
  await check('Sample revenue populated chart, currency filter, CSV download and no customer identity in export',async()=>{
    await page.evaluate(()=>{
      ROMANO_ADMIN_I18N.setLanguage('en');navigateTo('dashboard');
      const now=new Date(),before=new Date(now);before.setDate(now.getDate()-7);
      const order=(id,createdAt,total,currency)=>({id,createdAt:createdAt.toISOString(),total,currency,items:[{name:'Synthetic QA dish',price:total,quantity:1}]});
      const key=RomanoDemoMembers.key;
      localStorage.setItem(key,JSON.stringify([{id:'qa-revenue',name:'Synthetic QA member',phone:'12025550199',createdAt:before.toISOString(),orders:[order('qa-a',now,100,'IRT'),order('qa-b',before,50,'IRT'),order('qa-c',now,25,'TRY')]}]));
      document.dispatchEvent(new CustomEvent('romano:demo-membership-changed'));
    });
    try{
      await page.locator('#revenue-period').selectOption('7');
      await page.locator('#revenue-currency').selectOption('IRT');
      assert.equal(await page.locator('#revenue-total').textContent(),'100 Toman');
      assert.equal(await page.locator('#revenue-count').textContent(),'1');
      assert.equal(await page.locator('#revenue-change').textContent(),'+100%');
      await page.locator('#revenue-bucket').selectOption('6');
      assert.match(await page.locator('#revenue-detail').textContent(),/100 Toman/);
      const downloadPromise=page.waitForEvent('download');
      await page.locator('#revenue-export').click();
      const download=await downloadPromise;
      assert.match(download.suggestedFilename(),/^ramen-sample-orders-IRT-/);
      const csv=fs.readFileSync(await download.path(),'utf8');
      assert.match(csv,/,IRT,100,1,100/);
      assert.doesNotMatch(csv,/Synthetic QA member|12025550199|Synthetic QA dish|TRY/);
      await page.locator('#revenue-currency').selectOption('TRY');
      assert.equal(await page.locator('#revenue-count').textContent(),'1');
      assert.equal(await page.locator('#revenue-change').textContent(),'—');
      await page.locator('#revenue-currency').selectOption('IRT');
      for(const width of [320,1440]){
        await page.setViewportSize({width,height:900});
        await page.locator('.overview-revenue').scrollIntoViewIfNeeded();
        assert.ok(await page.locator('.overview-revenue').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
        await page.locator('.overview-revenue').screenshot({path:path.join(out,'admin-revenue-'+width+'.png')});
      }
    }finally{
      await page.evaluate(()=>{localStorage.removeItem(RomanoDemoMembers.key);document.dispatchEvent(new CustomEvent('romano:demo-membership-changed'));});
      await page.locator('#revenue-period').selectOption('30');
    }
  });
  await check('Compact admin header keeps only the requested controls and preserves logout',async()=>{
    await page.setViewportSize({width:320,height:900});
    for(const lang of ['fa','ar','en','tr']){
      await page.evaluate(l=>ROMANO_ADMIN_I18N.setLanguage(l),lang);
      const header=page.locator('.admin-header');
      assert.equal(await header.locator('.admin-header-brand').textContent(),'ROMANO');
      assert.equal(await header.locator('#admin-add-product-shortcut,#admin-logout-button').count(),0);
      const controls=header.locator('button,a[href]');
      assert.equal(await controls.count(),4);
      for(const control of await controls.all()){
        const rect=await control.boundingBox();assert.ok(rect && rect.width>=44 && rect.height>=44,JSON.stringify({lang,label:await control.getAttribute("aria-label"),rect}));
        assert.ok((await control.getAttribute('aria-label'))?.trim(),lang);
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang);
      await header.locator('[data-page-target="settings"]').click();
      assert.equal(await page.locator('#page-settings').isVisible(),true);
      await page.locator('#mobile-menu-button').click();
      assert.equal(await page.locator('#sidebar #admin-logout-button').isVisible(),true);
      await page.locator('#sidebar-close').click();
    }
    await page.evaluate(()=>{ROMANO_ADMIN_I18N.setLanguage('fa');navigateTo('dashboard');});
    await page.setViewportSize({width:1440,height:1000});
  });
await check('Admin interface contains no developer credits or internal release labels', async () => {
 assert.equal(await page.locator('.creator-signature').count(), 0);
 const visibleText = await page.locator('.admin-app').innerText();
 assert.doesNotMatch(visibleText, /Cian Khayat|ONLINE-MENU vq\.3|ADMIN CONSOLE|LIVE OPERATIONS|QR TABLE SETUP|DIRECT SETTLEMENT/);
});
await check('Admin metadata typography meets the readable size floor', async () => {
 const brandSize = Number.parseFloat(await page.locator('.admin-brand-label').evaluate(node => getComputedStyle(node).fontSize));
 const eyebrowSize = Number.parseFloat(await page.locator('.page-eyebrow').first().evaluate(node => getComputedStyle(node).fontSize));
 assert.ok(brandSize >= 11 && eyebrowSize >= 11, JSON.stringify({brandSize,eyebrowSize}));
});
await check('Persian admin section labels are fully localized', async () => {
 const visibleText = await page.locator('.admin-app').innerText();
 assert.doesNotMatch(visibleText, /\bOVERVIEW\b|\bMENU HEALTH\b|\bMENU MANAGEMENT\b|\bMENU STRUCTURE\b|\bRESTAURANT CONFIGURATION\b|\bSECURE SERVER AUTHENTICATION\b|\bAUTHORIZED USERS ONLY\b/);
});
await check('Order filter group accessible name is localized in all four languages', async () => {
 const expected = {fa:'فیلتر وضعیت سفارش',en:'Order status filters',tr:'Sipariş durumu filtreleri',ar:'تصفية حالة الطلب'};
 for (const lang of ['fa','en','tr','ar']) {
  await page.evaluate(lang => window.ROMANO_ADMIN_I18N.setLanguage(lang), lang);
  assert.equal(await page.locator('.orders-filters').getAttribute('aria-label'), expected[lang]);
 }
});
  await check('4 languages × 9 widths × 6 admin pages: direction and horizontal overflow', async () => {
    for (const lang of ['en','tr','ar','fa']) {
      await page.evaluate(lang => window.ROMANO_ADMIN_I18N.setLanguage(lang), lang);
      assert.equal(await page.getAttribute('html','dir'), ['fa','ar'].includes(lang) ? 'rtl' : 'ltr');
      const expectedFont = ['fa','ar'].includes(lang) ? 'Vazirmatn' : 'Inter';
      const expectedDisplay = ['fa','ar'].includes(lang) ? 'Vazirmatn' : 'Playfair Display';
      assert.match(await page.locator('body').evaluate(node => getComputedStyle(node).fontFamily), new RegExp(expectedFont));
      assert.match(await page.locator('#dashboard-title').evaluate(node => getComputedStyle(node).fontFamily), new RegExp(expectedDisplay));
      const expectedBrand = {fa:'مدیریت',en:'Management',tr:'Yönetim',ar:'الإدارة'}[lang];
      assert.equal(await page.locator('.admin-brand-label').textContent().then(value=>value.trim()), expectedBrand);
      assert.equal(await page.locator('.admin-brand').getAttribute('aria-labelledby'), 'admin-brand-name admin-brand-label');
      assert.equal(await page.locator('.admin-brand-name').textContent().then(value=>value.trim()), 'ROMANO');
      assert.equal(await page.locator('.admin-footer-brand strong').textContent().then(value=>value.trim()), 'ROMANO');
      assert.match(await page.title(), /ROMANO|رومانو/);
      for (const width of [1920,1440,1024,768,430,390,375,360,320]) {
        await page.setViewportSize({width,height:900});
        for (const section of ['dashboard','orders','products','categories','settings','loyalty']) {
          await page.evaluate(section => navigateTo(section),section);
          await page.waitForTimeout(50);
          if(width < 1000) assert.equal(await page.locator("#sidebar").isVisible(),false);
          const overflow = await page.evaluate(() => {
            const offenders = [...document.querySelectorAll('body *')].map(node => {
              const rect = node.getBoundingClientRect();
              const style = getComputedStyle(node);
              return {
                tag: node.tagName.toLowerCase(),
                id: node.id,
                className: typeof node.className === 'string' ? node.className : '',
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                scrollWidth: node.scrollWidth,
                clientWidth: node.clientWidth,
                display: style.display,
                position: style.position
              };
            }).filter(item => item.right > innerWidth + 1 || item.left < -1 || item.scrollWidth > item.clientWidth + 1)
              .sort((a, b) => b.right - a.right)
              .slice(0, 20);
            return { viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, offenders };
          });
          assert.equal(overflow.documentWidth > overflow.viewportWidth + 1, false, `${lang}/${width}/${section}: ${JSON.stringify(overflow)}`);
        }
      }
    }
  });
  await check('Mobile bottom navigation, drawer focus and requested physical order', async () => {
    await page.setViewportSize({width:390,height:844});
    for (const lang of ['fa','en','ar','tr']) {
      await page.evaluate(l=>ROMANO_ADMIN_I18N.setLanguage(l),lang);
      const nav=page.locator('.admin-bottom-nav');
      const buttons=nav.locator('button');
      assert.deepEqual(await buttons.evaluateAll(nodes=>nodes.map(n=>n.dataset.page)),['loyalty','products','dashboard','categories','settings']);
      const boxes=await Promise.all((await buttons.all()).map(b=>b.boundingBox()));
      assert.ok(boxes.every((b,i)=>b&&b.height>=44&&(i===0||b.x>boxes[i-1].x)),lang);
      await nav.locator('[data-page=loyalty]').click();
      assert.equal(await page.locator('#page-loyalty').isVisible(),true);
      assert.equal(await nav.locator('[data-page=loyalty]').getAttribute('aria-current'),'page');
      await page.locator('#mobile-menu-button').click();
      assert.equal(await page.locator('.admin-main').evaluate(el=>el.inert),true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.admin-main').evaluate(el=>el.inert),false);
      await page.waitForFunction(()=>document.activeElement.id==='mobile-menu-button');
    }
  });
  await check('Local rule drafts create, edit, toggle, persist and delete without sending SMS', async () => {
    await page.evaluate(()=>{ROMANO_ADMIN_I18N.setLanguage('en');navigateTo('loyalty');});
    await page.locator('#loyalty-add').click();
    const form=page.locator('#loyalty-form');
    await form.locator('[name=name]').fill('QA birthday');
    await form.locator('[name=reward]').selectOption('percent');
    await form.locator('[name=value]').fill('15');
    await form.locator('[name=message]').fill('<b>Local only</b>');
    assert.equal(await page.locator('#loyalty-message-preview').textContent(),'<b>Local only</b>');
    assert.equal(await page.locator('#loyalty-message-preview b').count(),0);
    assert.equal(await page.locator('#loyalty-add').isDisabled(),true);
    await form.locator('[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('#loyalty-form').hidden);
    assert.equal(await page.locator('.loyalty-preview').textContent(),'<b>Local only</b>');
    assert.equal(await page.locator('.loyalty-preview b').count(),0);
    await page.locator('[data-rule-action=edit]').click();
    await form.locator('[name=value]').fill('20');
    await form.locator('[type=submit]').click();
    await page.locator('[data-rule-action=toggle]').click();
    await page.reload();
    await page.waitForFunction(()=>adminInitialized&&!document.querySelector('.admin-app').inert);
    await page.evaluate(()=>navigateTo('loyalty'));
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('online_menu_loyalty_drafts_v1:romano'))[0].value),20);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('online_menu_loyalty_drafts_v1:romano'))[0].enabled),true);
    await page.locator('[data-rule-action=delete]').click();
    await page.locator('dialog[open] [value=confirm]').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('online_menu_loyalty_drafts_v1:romano')).length===0);
  });
  await check('Branch creation removed; standalone settings cannot submit live operations in any locale',async()=>{
    await page.evaluate(()=>navigateTo('settings'));
    for(const lang of ['fa','en','tr','ar']){
      await page.evaluate(l=>ROMANO_ADMIN_I18N.setLanguage(l),lang);
      assert.equal(await page.locator('#create-branch-form,[name=branchName],[name=branchSlug],[name=priceMultiplier]').count(),0);
      assert.equal(await page.evaluate(()=>typeof RomanoAPI.createBranch),'undefined');
      assert.equal(await page.locator('#ops-branch').isDisabled(),true);
      assert.equal(await page.locator('#create-table-form button').isDisabled(),true);
      assert.equal(await page.locator('#ops-save-branch').isDisabled(),true);
      assert.equal(await page.locator('#gateway-settings-form button').isDisabled(),true);
      assert.ok((await page.locator('#ops-tables').innerText()).trim());
    }
  });
  await check('Grouped settings validate contact and discard unsaved input without writing',async()=>{
    await page.evaluate(()=>{ROMANO_ADMIN_I18N.setLanguage('en');navigateTo('settings');});
    const form=page.locator('#restaurant-settings-form');const previous=await form.locator('[name=phone]').inputValue();
    const before=await page.evaluate(()=>localStorage.getItem('romano_restaurant'));
    await form.locator('[name=phone]').fill('bad phone');await form.locator('[type=submit]').click();
    assert.equal(await form.locator('[name=phone]').getAttribute('aria-invalid'),'true');
    assert.equal(await page.locator('#settings-validation').textContent(),'Invalid phone number.');
    assert.equal(await page.evaluate(()=>localStorage.getItem('romano_restaurant')),before);
    await page.locator('#settings-reset').click();await page.locator('dialog[open] [value=cancel]').click();
    await page.locator('dialog[open]').waitFor({state:'hidden'});
    assert.equal(await form.locator('[name=phone]').inputValue(),'bad phone');
    await page.locator('#settings-reset').click();await page.locator('dialog[open] [value=confirm]').click();
    await page.waitForFunction(value=>document.querySelector('#restaurant-settings-form [name=phone]').value===value&&!document.querySelector('#restaurant-settings-form').classList.contains('is-dirty'),previous);
    assert.equal(await form.locator('[name=phone]').inputValue(),previous);
    assert.equal(await page.evaluate(()=>localStorage.getItem('romano_restaurant')),before);
    assert.equal(await form.locator('[name=phone]').getAttribute('aria-invalid'),null);
  });
  await check('Local rating requires approval and category reorder persists', async () => {
    await page.evaluate(()=>{RomanoDemoReview.submit(localStorage,'romano',4,'<b>Local comment</b>','test-review-1');navigateTo('dashboard');});
    assert.equal(await page.locator('#overview-rating-value').textContent(),'—');
    assert.equal(await page.locator('#overview-rating-comment').textContent(),'<b>Local comment</b>');assert.equal(await page.locator('#overview-rating-comment b').count(),0);
    await page.locator('[data-rating-action=approve]').click();
    assert.match(await page.locator('#overview-rating-value').textContent(),/4.*5/);
    await page.evaluate(()=>{RomanoDemoReview.submit(localStorage,'romano',4,'Same score, new review','test-review-2');navigateTo('dashboard');});
    assert.equal(await page.locator('#overview-rating-value').textContent(),'—');
    await page.locator('[data-rating-action=reject]').click();
    assert.equal(await page.locator('#overview-rating-value').textContent(),'—');
    await page.evaluate(()=>{localStorage.removeItem('online_menu_demo_rating:romano');localStorage.removeItem('online_menu_demo_rating_moderation:romano');localStorage.removeItem('online_menu_demo_review_v2:romano');navigateTo('categories');});
    const ids=await page.evaluate(()=>state.categories.map(c=>c.id));
    await page.locator('.admin-category-card').nth(1).locator('[data-category-action=up]').click();
    await page.waitForFunction(ids=>state.categories[0].id===ids[1]&&!saveInProgress,ids);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('romano_categories'))[0].id),ids[1]);
    await page.locator('.admin-category-card').first().locator('[data-category-action=down]').click();
    await page.waitForFunction(ids=>state.categories[0].id===ids[0]&&!saveInProgress,ids);
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
    const imageButton=page.locator('#product-modal .image-upload-button');
    assert.equal(await imageButton.count(),1);
    await imageButton.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest'}));
    const imageBox=await imageButton.boundingBox();
    const actionsBox=await page.locator('#product-form .form-actions').boundingBox();
    assert.ok(imageBox && actionsBox && imageBox.y+imageBox.height<=actionsBox.y-4,JSON.stringify({imageBox,actionsBox}));
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
    await page.waitForFunction(()=>!saveInProgress&&state.products.find(p=>p.name==='QA Product').active===false&&JSON.parse(localStorage.getItem('romano_products')).find(p=>p.name==='QA Product').active===false&&document.querySelectorAll('.admin-product-card').length===0);
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
    await page.waitForFunction(()=>!saveInProgress&&!state.categories.some(c=>c.name==='QA Renamed')&&!JSON.parse(localStorage.getItem('romano_categories')).some(c=>c.name==='QA Renamed'));
    await page.evaluate(()=>navigateTo('products'));
    await page.locator('.admin-clear-filters').click();
    await page.locator('#product-search').fill('QA Product');
    await page.locator('[data-product-action=delete]').click();
    await page.locator('dialog[open] [value=confirm]').click();
    await page.waitForFunction(()=>!saveInProgress&&!state.products.some(p=>p.name==='QA Product')&&!JSON.parse(localStorage.getItem('romano_products')).some(p=>p.name==='QA Product'));
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('romano_products')).some(p=>p.name==='QA Product')),false);
  });
  // Mocked HTTP contract tests exercise frontend handling, not PostgreSQL or authorization.
  const remote={restaurant:{name:'Remote',currency:'TRY'},categories:[],products:[]};
  let writes=0,failSave=false,delaySave=0,uploads=0,branchPosts=0;
  await context.route('**/api/v1/**',async route=>{
    const u=new URL(route.request().url());let data;
    if(u.pathname.endsWith('/auth/me'))data={user:{id:'u'}};
    else if(u.pathname.endsWith('/auth/csrf'))data={csrfToken:'test'};
    else if(u.pathname.endsWith('/admin/data'))data=remote;
    else if(u.pathname.endsWith('/admin/branches')){
      if(route.request().method()==='POST')branchPosts++;
      data={branches:[{id:'existing',name:'Configured restaurant',qr_ordering_enabled:true}]};
    }
    else if(u.pathname.endsWith('/admin/branches/existing/tables'))data={tables:[{id:'t1',code:'T1',display_name:'Table 1',active:true}]};
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
    assert.equal(await page.locator('#revenue-content').isVisible(),false);
    assert.equal(await page.locator('#revenue-export').isDisabled(),true);
  });
  await check('Connected settings retain preconfigured restaurant, table and gateway controls',async()=>{
    await page.evaluate(()=>navigateTo('settings'));
    await page.waitForFunction(()=>document.querySelector('#ops-branch').value==='existing'&&document.querySelector('#ops-tables').textContent.includes('Table 1'));
    assert.equal(await page.locator('#create-branch-form').count(),0);
    assert.equal(await page.locator('#ops-qr-enabled').isChecked(),true);
    assert.equal(await page.locator('#create-table-form button').isEnabled(),true);
    assert.equal(await page.locator('#gateway-branch').inputValue(),'existing');
    assert.equal(await page.locator('#gateway-settings-form button').isEnabled(),true);
    assert.equal(branchPosts,0);
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
    for(const [lang,width,section,name] of [
      ['en',1440,'orders','admin-desktop-orders'],
      ['en',1440,'categories','admin-desktop-categories'],
      ['en',1440,'settings','admin-desktop-settings'],
      ['fa',390,'orders','admin-mobile-orders-fa'],
      ['fa',390,'settings','admin-mobile-settings-fa']
    ]){
      await page.setViewportSize({width,height:900});
      await page.evaluate(({lang,section})=>{window.ROMANO_ADMIN_I18N.setLanguage(lang);navigateTo(section);},{lang,section});
      await page.waitForTimeout(250);
      await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
    }
    assert.deepEqual(errors,[]);
  });
  fs.writeFileSync(path.join(out,'admin-browser-results.json'),JSON.stringify({passed:results.length,cases:results,errors,notes:'Chromium only. Server flows use a mocked HTTP contract; no real PostgreSQL test.'},null,2));
  await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exit(1);});
