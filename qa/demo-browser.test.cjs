const {loginDemoAdmin}=require('./demo-admin-login.cjs');
/* Standalone demo integration: no remote API or third-party network is allowed. */
const assert = require('node:assert/strict');
const playwright = require('playwright');
const engine = process.env.DEMO_BROWSER_ENGINE || 'chromium';
assert.ok(['chromium', 'firefox', 'webkit'].includes(engine), `Unsupported demo QA browser: ${engine}`);
const browserType = playwright[engine];
const base = new URL((process.env.ADMIN_TEST_URL || 'http://127.0.0.1:8765').replace(/\/$/, '') + '/');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname) && base.protocol === 'http:', 'Demo QA requires loopback HTTP');
const readyCustomer = async page => {
  await page.waitForFunction(() => typeof menuDataMode !== 'undefined' && menuDataMode !== 'loading');
  await page.locator('#splash-screen').waitFor({state:'detached'});
};
(async () => {
  const options = { headless: true };
  if (engine === 'chromium' && process.env.CHROMIUM_EXECUTABLE_PATH) options.executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  console.log(`DEMO QA browser: ${engine}`);
  const browser = await browserType.launch(options);
  try {
    const context = await browser.newContext({viewport:{width:1440,height:900}, serviceWorkers:'block', reducedMotion:'reduce'});
    const errors = [];
    const apiRequests = [];
    const externalRequests = [];
    context.on('page', page => page.on('pageerror', error => errors.push(String(error))));
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin!==base.origin) {externalRequests.push(url.origin);return route.abort('blockedbyclient');}
      if (url.pathname.startsWith('/api/')) apiRequests.push(url.pathname);
      return route.continue();
    });
    const customer = await context.newPage();
    const admin = await context.newPage();
    await customer.goto(new URL('./',base).href); await readyCustomer(customer);
    assert.equal(await customer.evaluate(() => menuDataMode), 'demo');
    const cards = customer.locator('#menu .product-card');
    assert.equal(await cards.count(), 21);
    await admin.goto(new URL('admin/',base).href);
    await loginDemoAdmin(admin);
    assert.equal(await admin.locator('#admin-mode-banner').isVisible(), true);
    assert.equal(await admin.evaluate(() => state.products.length), 21);
    const standalone = await customer.evaluate(() => RomanoPublicAPI.standalone);
    if (standalone) {
      await customer.goto(new URL('./?qr=unused-table-marker',base).href);
      await readyCustomer(customer);
      assert.equal(await customer.evaluate(() => menuDataMode),'demo');
      assert.equal(await customer.locator('#commerce-session').isVisible(),false);
    }
    console.log('PASS: both applications start with no external network');
    // Controlled lab observations only (loopback, external resources blocked).
    for (const [label,page] of [['customer',customer],['admin',admin]]) {
      const observation = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource').filter(r=>new URL(r.name).origin===location.origin);
        const round = n=>Math.round(n);
        return {domContentLoadedMs:round(nav.domContentLoadedEventEnd),loadMs:round(nav.loadEventEnd),localResourceCount:resources.length,encodedBodyBytes:resources.reduce((n,r)=>n+r.encodedBodySize,0),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,referrerPolicy:document.querySelector('meta[name="referrer"]')?.content};
      });
      assert.equal(observation.reducedMotion,true);
      assert.equal(observation.referrerPolicy,'no-referrer');
      console.log('LAB '+label+' '+JSON.stringify(observation));
    }
    console.log('PASS: static referrer protection and reduced-motion preference');
    const originalRobots = await customer.locator('meta[name="robots"]').getAttribute('content');
    for (const lang of ['fa','ar','en','tr']) {
      await customer.evaluate(l => ROMANO_I18N.setLanguage(l,false),lang);
      await admin.evaluate(l => ROMANO_ADMIN_I18N.setLanguage(l),lang);
      const dir = ['fa','ar'].includes(lang) ? 'rtl' : 'ltr';
      const expected = {fa:['رفتن به منو','رفتن به محتوای اصلی','fa_IR'],ar:['الانتقال إلى القائمة','الانتقال إلى المحتوى الرئيسي','ar_AR'],en:['Skip to menu','Skip to main content','en_US'],tr:['Menüye geç','Ana içeriğe geç','tr_TR']}[lang];
      assert.equal((await customer.locator('.rv4-skip-link').textContent()).trim(),expected[0]);
      assert.equal((await admin.locator('.admin-skip-link').textContent()).trim(),expected[1]);
      assert.equal(await customer.locator('meta[property="og:locale"]').getAttribute('content'),expected[2]);
      assert.equal(await customer.locator('meta[property="og:title"]').getAttribute('content'),await customer.title());
      assert.equal(await customer.locator('meta[property="og:description"]').getAttribute('content'),await customer.locator('meta[name="description"]').getAttribute('content'));
      const alternate = await customer.locator('meta[property="og:locale:alternate"]').evaluateAll(nodes=>nodes.map(n=>n.content));
      assert.equal(new Set(alternate).size,3);
      assert.ok(!alternate.includes(expected[2]));
      assert.equal(await customer.locator('meta[name="robots"]').getAttribute('content'),originalRobots);
      assert.equal(await admin.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
      const creator=customer.locator('.footer-creator');
      assert.equal(await creator.innerText(),{fa:'ساخته‌شده توسط کیان خیاط.',en:'Made by Kian Khayat.',tr:'Kian Khayat tarafından yapıldı.',ar:'من تصميم وتطوير كيان خياط.'}[lang]);
      assert.equal(await creator.getAttribute('href'),'https://kiankhayat.me');
      assert.equal(await creator.getAttribute('rel'),'noopener noreferrer');
      for (const page of [customer,admin]) {
        assert.equal(await page.locator('html').getAttribute('dir'),dir);
        for (const width of [320,768,1440]) {
          await page.setViewportSize({width,height:900});
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${lang}/${width}/${page.url()}`);
        }
      }
      await customer.setViewportSize({width:320,height:900});
      await creator.scrollIntoViewIfNeeded();
      const rect=await creator.boundingBox();
      assert.ok(rect && rect.height>=44 && rect.x>=-1 && rect.x+rect.width<=321,lang+' footer reflow/touch target');
    }
    await customer.setViewportSize({width:1440,height:900});
    const image=customer.locator('#menu .product-card .product-image-wrapper img').first();
    const duration=()=>image.evaluate(el=>getComputedStyle(el).transitionDuration);
    assert.equal(await duration(),'0s');
    await customer.emulateMedia({reducedMotion:'no-preference'});
    assert.ok((await duration()).split(',').some(v=>parseFloat(v)>0),'normal motion enabled');
    await customer.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await duration(),'0s');
    console.log('PASS: localized creator attribution, responsive footer and reduced motion');
    console.log('PASS: four locales and three widths without external fonts');
    for (const [page,link,target] of [[customer,'.rv4-skip-link','#menu'],[admin,'.admin-skip-link','#admin-content']]) {
      const shortcut = page.locator(link);
      await shortcut.focus();
      await page.waitForFunction(s=>document.activeElement===document.querySelector(s),link);
      await shortcut.press('Enter');
      await page.waitForFunction(s=>document.activeElement===document.querySelector(s),target);
      assert.equal(await page.locator(target).getAttribute('tabindex'),'-1');
    }
    console.log('PASS: localized keyboard skip links move focus into content and metadata is consistent');
    await admin.evaluate(() => { ROMANO_ADMIN_I18N.setLanguage('en'); navigateTo('products'); });
    await admin.locator('#add-product-button').click();
    await admin.locator('#product-form [name=name]').fill('Standalone QA Dish');
    await admin.locator('#product-form-category').selectOption(await admin.evaluate(() => state.categories[0].id));
    await admin.locator('#product-form [name=price]').fill('12.34');
    await admin.locator('#product-form button[type=submit]').click();
    await admin.waitForFunction(() => state.products.some(p => p.name === 'Standalone QA Dish' && Number(p.price) === 12.34));
    await customer.waitForFunction(() => menuProducts.some(p => p.name === 'Standalone QA Dish'));
    await admin.reload();
    await admin.waitForFunction(() => adminInitialized && !document.querySelector('.admin-app').inert);
    assert.ok(await admin.evaluate(() => state.products.some(p => p.name === 'Standalone QA Dish')));
    await customer.reload(); await readyCustomer(customer);
    assert.ok(await customer.evaluate(() => menuProducts.some(p => p.name === 'Standalone QA Dish')));
    console.log('PASS: local product creation syncs across tabs and persists after reload');
    const stale = await context.newPage();
    await stale.goto(new URL('admin/',base).href);
    await loginDemoAdmin(stale);
    const productId = await admin.evaluate(() => state.products.find(p => p.name === 'Standalone QA Dish').id);
    await customer.evaluate(id=>RomanoCommerce.add(id),productId);
    assert.equal(await customer.locator('.commerce-cart-count').textContent(),'1');
    await admin.evaluate(id=>toggleProduct(id),productId);
    await customer.waitForFunction(id=>!getProductById(id)&&document.querySelector('.commerce-cart-count').textContent==='0',productId);
    assert.equal(await customer.evaluate(id=>Object.hasOwn(JSON.parse(localStorage.getItem('online_menu_cart_vq3:romano')),id),productId),false);
    assert.equal(await stale.evaluate(()=>saveStateBundle()),false,'stale admin must not overwrite a newer catalog');
    assert.equal(await admin.evaluate(id=>JSON.parse(localStorage.getItem('romano_products')).find(p=>p.id===id).active,productId),false);
    await stale.close();
    console.log('PASS: deactivated product leaves cart; stale admin save is rejected');

    await admin.evaluate(()=>{ROMANO_ADMIN_I18N.setLanguage('en');navigateTo('dashboard');});
    await customer.evaluate(()=>ROMANO_I18N.setLanguage('en',false));
    await customer.locator('#menu-toggle').click();
    await customer.locator('#main-navigation [data-nav-panel="feedback"]').click();
    const reviewDialog=customer.locator('#ramen-contact-dialog');
    await reviewDialog.locator('input[name="demo-rating"][value="4"]').check();
    await reviewDialog.locator('.feedback-comment textarea').fill('Standalone feedback');
    await reviewDialog.locator('.feedback-save').click();
    await admin.waitForFunction(()=>document.querySelector('#overview-rating-comment').textContent==='Standalone feedback');
    await admin.locator('[data-rating-action=approve]').click();
    await admin.waitForFunction(()=>document.querySelector('#overview-rating-value').textContent==='4 / 5');
    await reviewDialog.locator('.feedback-comment textarea').fill('Same rating, new submission');
    await reviewDialog.locator('.feedback-save').click();
    await admin.waitForFunction(()=>document.querySelector('#overview-rating-comment').textContent==='Same rating, new submission'&&document.querySelector('#overview-rating-value').textContent==='—');
    await admin.locator('[data-rating-action=reject]').click();
    assert.equal(await admin.evaluate(()=>RomanoDemoReview.read(localStorage,'romano').status),'rejected');
    await customer.keyboard.press('Escape');
    console.log('PASS: local feedback moderation resets for a new submission of the same rating');
    // Use an explicit synthetic QR marker, not a live table token.
    await customer.goto(new URL('./?qr=demo',base).href);await readyCustomer(customer);
    const entry=customer.locator('#customer-entry');
    await entry.waitFor({state:'visible'});
    assert.equal(await entry.locator('input').count(),2);
    assert.equal(await entry.locator('input[type=password]').count(),0);
    await customer.keyboard.press('Escape');assert.equal(await entry.isVisible(),true);
    for(const lang of ['fa','ar','tr','en']){
      await entry.locator('select').selectOption(lang);
      assert.equal(await customer.locator('html').getAttribute('dir'),['fa','ar'].includes(lang)?'rtl':'ltr');
      await customer.setViewportSize({width:320,height:844});
      assert.ok(await entry.evaluate(d=>d.scrollWidth<=d.clientWidth+1));
    }
    await entry.locator('input[name=name]').fill('Sample Customer');
    await entry.locator('input[name=phone]').fill('abc');
    await entry.locator('button[type=submit]').click();
    await entry.locator('[role=alert]').waitFor({state:'visible'});
    await entry.locator('input[name=phone]').fill('+12025550101');
    await entry.locator('button[type=submit]').click();
    await entry.waitFor({state:'hidden'});
    assert.equal(await customer.evaluate(()=>RomanoCustomerEntry.current().name),'Sample Customer');
    assert.equal(await customer.evaluate(()=>new URL(location.href).searchParams.has('qr')),false);
    await admin.evaluate(()=>{ROMANO_ADMIN_I18N.setLanguage('en');navigateTo('loyalty');});
    await admin.waitForFunction(()=>document.querySelector('#demo-members-list').textContent.includes('Sample Customer'));
    await customer.evaluate(()=>RomanoCommerce.add(menuProducts.find(p=>p.active!==false&&p.price>0).id));
    await customer.evaluate(()=>RomanoCommerce.open());
    assert.equal(await customer.locator('.commerce-pay-method').isVisible(),false);
    await customer.locator('#commerce-submit').click();
    await customer.waitForFunction(()=>RomanoCustomerEntry.current()?.orders.length===1);
    assert.ok((await customer.locator('#commerce-demo-status').innerText()).includes('nothing was sent to the restaurant'));
    assert.equal(await customer.locator('#commerce-demo-status').isVisible(),true);
    await admin.waitForFunction(()=>document.querySelector('#demo-members-list').textContent.includes('Sample order count: 1'));
    await admin.evaluate(()=>navigateTo('orders'));
    assert.equal(await admin.locator('.sample-order-ticket').count(),1);
    assert.equal(await admin.locator('.order-next').count(),0);
    assert.equal(await admin.locator('.orders-filters').isVisible(),false);
    assert.doesNotMatch(await admin.locator('#orders-board').innerText(),/Sample Customer|12025550101/);
    await admin.evaluate(()=>navigateTo('settings'));
    await admin.locator('#sample-qr-preview').waitFor({state:'visible'});
    assert.ok(await admin.locator('#sample-qr-preview canvas, #sample-qr-preview img').count());
    assert.equal(await admin.locator('#sample-qr-preview a').evaluate(a=>a.href),new URL('./?qr=demo',base).href);
    console.log('PASS: sample order cards without customer identifiers and local sample QR preview');
    await admin.evaluate(()=>navigateTo('dashboard'));
    await admin.locator('#revenue-period').selectOption('7');
    const expectedRevenue=await customer.evaluate(()=>RomanoCustomerEntry.current().orders[0].total);
    await admin.waitForFunction(v=>document.querySelector('#revenue-total').textContent===OnlineMenuMoney.formatMinor(v,{currency:'IRT',exponent:0,language:'en'}),expectedRevenue);
    assert.equal(await admin.locator('#revenue-count').textContent(),'1');
    assert.equal(await admin.locator('#revenue-bars span').count(),7);
    await admin.locator('#revenue-period').selectOption('1');
    assert.equal(await admin.locator('#revenue-bars span').count(),24);
    await admin.locator('#revenue-period').selectOption('365');
    assert.ok(await admin.locator('#revenue-bars span').count()>=12);
    await admin.locator('#revenue-period').selectOption('30');
    console.log('PASS: sample revenue aggregates saved order and filters without fabricated income');
    await customer.reload();await readyCustomer(customer);
    assert.equal(await customer.evaluate(()=>RomanoCustomerEntry.current().orders.length),1);
    await customer.locator('#menu-toggle').click();
    await customer.locator('[data-nav-panel=profile]').click();
    await customer.locator('#ramen-contact-dialog').waitFor({state:'visible'});
    assert.ok((await customer.locator('#ramen-contact-dialog').innerText()).includes('Sample order history'));
    await customer.locator('#ramen-contact-dialog').getByRole('button',{name:'Sign out of sample profile'}).click();
    assert.equal(await customer.evaluate(()=>RomanoCustomerEntry.current()),null);
    await customer.locator('#menu-toggle').click();
    await customer.locator('[data-nav-panel=profile]').click();
    await customer.locator('#ramen-contact-dialog').getByRole('button',{name:'Join the demo club'}).click();
    await entry.waitFor({state:'visible'});
    await entry.locator('input[name=name]').fill('Sample Customer');
    await entry.locator('input[name=phone]').fill('+12025550101');
    await entry.locator('button[type=submit]').click();
    await entry.waitFor({state:'hidden'});
    assert.equal(await customer.evaluate(()=>RomanoCustomerEntry.current().orders.length),1);
    assert.equal(await customer.evaluate(()=>RomanoCustomerEntry.open()),true);
    await entry.locator('input[name=name]').fill('Different sample name');
    await entry.locator('input[name=phone]').fill('+12025550101');
    await entry.locator('button[type=submit]').click();
    await entry.locator('[role=alert][data-member-text=existing]').waitFor({state:'visible'});
    assert.equal(await customer.evaluate(()=>RomanoCustomerEntry.current()?.orders.length),1);
    await entry.locator('input[name=name]').fill('Sample Customer');
    await entry.locator('button[type=submit]').click();
    await entry.waitFor({state:'hidden'});
    const other=await context.newPage();
    await other.goto(new URL('./?qr=demo',base).href);await readyCustomer(other);
    const otherEntry=other.locator('#customer-entry');
    await otherEntry.locator('input[name=name]').fill('Sample Customer');
    await otherEntry.locator('input[name=phone]').fill('+12025550101');
    await otherEntry.locator('button[type=submit]').click();
    await otherEntry.waitFor({state:'hidden'});
    assert.equal(await other.evaluate(()=>RomanoCustomerEntry.current()?.name),'Sample Customer');
    assert.equal(await other.evaluate(()=>RomanoCustomerEntry.current()?.orders.length),1);
    assert.equal(
      await other.evaluate(()=>sessionStorage.getItem(RomanoDemoMembers.activeKey)),
      await customer.evaluate(()=>sessionStorage.getItem(RomanoDemoMembers.activeKey))
    );
    await other.close();
    console.log('PASS: QR demo entry, four locales, local membership/order history, returning-member re-entry and admin club sync');
    const registrants=await Promise.all([context.newPage(),context.newPage()]);
    try {
      await Promise.all(registrants.map(page=>page.goto(new URL('./?qr=demo',base).href)));
      await Promise.all(registrants.map(async(page,index)=>{
        const form=page.locator('#customer-entry form');
        await form.locator('[name="name"]').fill('Synthetic profile '+index);
        await form.locator('[name="phone"]').fill('+1202555011'+index);
      }));
      await Promise.all(registrants.map(page=>page.locator('#customer-entry button[type=submit]').click()));
      await Promise.all(registrants.map(page=>page.locator('#customer-entry').waitFor({state:'hidden'})));
      assert.equal(await admin.evaluate(()=>RomanoDemoMembers.read(localStorage).length),3);
    } finally {await Promise.all(registrants.map(page=>page.close()));}
    console.log('PASS: concurrent sample registration retains both profiles');
    if (standalone) {
      await admin.evaluate(()=>navigateTo('settings'));
      const branches = admin.locator('#demo-branches');
      await branches.locator('[name=sampleName]').fill('Sample North');
      await branches.locator('[data-action=create] button').click();
      await admin.waitForURL(url=>url.searchParams.has('demoBranch'));
      await branches.waitFor({state:'visible'});
      assert.equal(await admin.evaluate(()=>RomanoDemoMembers.read(localStorage).length),0);
      assert.equal(await admin.evaluate(()=>state.products.length),21);
      await branches.locator('[name=sampleRename]').fill('Sample Harbour');
      await branches.locator('[data-action=rename] button').click();
      await admin.waitForFunction(()=>document.querySelector('#sample-branch-select').selectedOptions[0]?.text==='Sample Harbour');
      await branches.locator('[name=sampleTableCode]').fill('T1');
      await branches.locator('[name=sampleTableName]').fill('Window table');
      await branches.locator('#sample-table-form button').click();
      const qr=branches.locator('#sample-table-qr');
      await qr.waitFor({state:'visible'});
      assert.ok(await qr.locator('canvas,img').count());
      const link=await qr.locator('a').getAttribute('href');
      await customer.goto(link);await readyCustomer(customer);
      const entry=customer.locator('#customer-entry');
      assert.match(await entry.innerText(),/Sample Harbour · Window table/);
      await entry.locator('[name=name]').fill('Branch Member');
      await entry.locator('[name=phone]').fill('+12025550101');
      await entry.locator('button[type=submit]').click();
      await entry.waitFor({state:'hidden'});
      await customer.evaluate(()=>{RomanoCommerce.add(menuProducts.find(p=>p.active!==false&&p.price>0).id);RomanoCommerce.open();});
      await customer.locator('#commerce-submit').click();
      await customer.waitForFunction(()=>RomanoCustomerEntry.current()?.orders[0]?.tableName==='Window table');
      await admin.evaluate(()=>navigateTo('orders'));
      await admin.locator('.sample-order-ticket').filter({hasText:'Window table'}).waitFor();
      await admin.evaluate(()=>navigateTo('dashboard'));
      assert.equal(await admin.locator('#revenue-customers').innerText(),'1');
      assert.equal(await admin.locator('#revenue-top-items li').count(),1);
      const invalid=new URL(link);invalid.searchParams.set('demoTable','no-such-table');
      await customer.goto(invalid.href);await readyCustomer(customer);
      assert.equal(await customer.evaluate(()=>menuDataMode),'unavailable');
      await admin.evaluate(()=>navigateTo('settings'));
      await branches.locator('#sample-branch-select').selectOption('');
      await admin.waitForURL(url=>!url.searchParams.has('demoBranch'));
      await branches.waitFor({state:'visible'});
      assert.equal(await admin.evaluate(()=>RomanoDemoMembers.read(localStorage).length),3);
      assert.equal(await admin.evaluate(()=>RomanoDemoMembers.read(localStorage).some(member=>member.name==='Branch Member')),false);
      const branchId=new URL(link).searchParams.get('demoBranch');
      const target=branches.locator('#sample-branch-target');
      const toggle=branches.locator('#sample-branch-active-toggle');
      await target.selectOption(branchId);
      await customer.goto(link);await readyCustomer(customer);
      assert.equal(await customer.evaluate(()=>menuDataMode),'demo');
      admin.once('dialog',dialog=>dialog.accept());
      await toggle.click();
      await admin.waitForFunction(id=>RomanoDemoBranches.read().find(row=>row.id===id)?.active===false,branchId);
      await customer.waitForFunction(()=>typeof menuDataMode!=='undefined'&&menuDataMode==='unavailable');
      assert.equal(await branches.locator('#sample-branch-select option').count(),1);
      await customer.goto(link);await readyCustomer(customer);
      assert.equal(await customer.evaluate(()=>menuDataMode),'unavailable');
      // Exercise the actual download and import controls in an independent browser profile.
      const downloadPromise=admin.waitForEvent('download');
      await admin.locator('[data-sample-export]').click();
      const download=await downloadPromise;
      const bytes=await require('node:fs/promises').readFile(await download.path());
      const payload=JSON.parse(bytes.toString('utf8'));
      assert.equal(payload.directory.find(row=>row.id===branchId)?.active,false);
      assert.equal(JSON.parse(payload.records.find(row=>row.id===branchId).data.members)[0].orders.length,1);
      const isolated=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
      try {
        isolated.on('page',page=>page.on('pageerror',error=>errors.push(String(error))));
        await isolated.route('**/*',route=>{
          const url=new URL(route.request().url());
          if(url.origin!==base.origin){externalRequests.push(url.origin);return route.abort('blockedbyclient');}
          if(url.pathname.startsWith('/api/'))apiRequests.push(url.pathname);
          return route.continue();
        });
        const restored=await isolated.newPage();
        await restored.goto(new URL('admin/',base).href);await loginDemoAdmin(restored);
        await restored.evaluate(()=>navigateTo('settings'));
        assert.equal(await restored.evaluate(()=>RomanoDemoBackup.occupied(localStorage)),false);
        await restored.locator('[data-sample-import]').setInputFiles({name:'branches.json',mimeType:'application/json',buffer:bytes});
        await restored.locator('.rv4-confirm-dialog[open] [value=confirm]').click();
        await restored.waitForFunction(id=>window.RomanoDemoBranches?.read().some(row=>row.id===id&&row.active===false),branchId);
        await loginDemoAdmin(restored);
        assert.equal(await restored.evaluate(id=>JSON.parse(localStorage.getItem('online_menu_demo_members_v1:romano:branch:'+id))[0].orders.length,branchId),1);
        assert.equal(await restored.evaluate(()=>RomanoDemoMembers.read(localStorage).length),3);
      } finally {await isolated.close();}
      console.log('PASS: private all-branch backup downloads and restores archived order history in a fresh profile');
      await toggle.click();
      await admin.waitForFunction(id=>RomanoDemoBranches.read().find(row=>row.id===id)?.active===true,branchId);
      await branches.locator('#sample-branch-select').selectOption(branchId);
      await admin.waitForURL(url=>url.searchParams.get('demoBranch')===branchId);
      await branches.waitFor({state:'visible'});
      assert.equal(await admin.evaluate(()=>RomanoDemoMembers.read(localStorage).find(member=>member.name==='Branch Member')?.orders.length),1);
      await customer.goto(link);await readyCustomer(customer);
      assert.equal(await customer.evaluate(()=>menuDataMode),'demo');
      console.log('PASS: branch archive blocks open and new QR sessions; reactivation preserves order history');
      console.log('PASS: local branch creation, rename, isolated catalog and memberships, table QR, invalid entry, order and return to primary');
    }
    await customer.goto(new URL('./?restaurant=standalone-qa-missing',base).href); await readyCustomer(customer);
    assert.equal(await customer.evaluate(() => menuDataMode), 'unavailable');
    assert.equal(await cards.count(),0);
    assert.equal(await customer.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
    assert.equal(await customer.locator('meta[property="og:site_name"]').getAttribute('content'),'');
    assert.equal(await customer.locator('meta[name="description"]').getAttribute('content'),await customer.evaluate(()=>ROMANO_I18N.ui('menuUnavailable')));
    assert.deepEqual(errors,[]);
    assert.deepEqual(externalRequests,[]);
    if (standalone) assert.deepEqual(apiRequests,[]);
    console.log('PASS: unknown restaurant fails closed; no uncaught JavaScript errors');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
