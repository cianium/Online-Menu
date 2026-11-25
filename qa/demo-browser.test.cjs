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
    context.on('page', page => page.on('pageerror', error => errors.push(String(error))));
    await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort('blockedbyclient'));
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
    assert.equal(await entry.locator('[role=alert]').isVisible(),true);
    await entry.locator('input[name=phone]').fill('+12025550101');
    await entry.locator('button[type=submit]').click();
    await entry.waitFor({state:'hidden'});
    assert.equal(await customer.evaluate(()=>RomanoCustomerEntry.current().name),'Sample Customer');
    assert.equal(await customer.evaluate(()=>new URL(location.href).searchParams.has('qr')),false);
    await admin.evaluate(()=>{ROMANO_ADMIN_I18N.setLanguage('en');navigateTo('loyalty');});
    await admin.waitForFunction(()=>document.querySelector('#demo-members-list').textContent.includes('Sample Customer'));
    await customer.evaluate(()=>RomanoCommerce.add(menuProducts.find(p=>p.active!==false&&p.price>0).id));
    await customer.evaluate(()=>RomanoCommerce.open());
    await customer.locator('#commerce-submit').click();
    await customer.waitForFunction(()=>RomanoCustomerEntry.current()?.orders.length===1);
    await admin.waitForFunction(()=>document.querySelector('#demo-members-list').textContent.includes('Sample order count: 1'));
    await customer.reload();await readyCustomer(customer);
    assert.equal(await customer.evaluate(()=>RomanoCustomerEntry.current().orders.length),1);
    await customer.locator('#menu-toggle').click();
    await customer.locator('[data-nav-panel=profile]').click();
    await customer.locator('#ramen-contact-dialog').waitFor({state:'visible'});
    assert.ok((await customer.locator('#ramen-contact-dialog').innerText()).includes('Sample order history'));
    await customer.keyboard.press('Escape');
    const other=await context.newPage();
    await other.goto(new URL('./?qr=demo',base).href);await readyCustomer(other);
    const otherEntry=other.locator('#customer-entry');
    await otherEntry.locator('input[name=name]').fill('Other sample');
    await otherEntry.locator('input[name=phone]').fill('+12025550101');
    await otherEntry.locator('button[type=submit]').click();
    assert.equal(await otherEntry.isVisible(),true);
    assert.equal(await other.evaluate(()=>RomanoCustomerEntry.current()),null);
    await other.close();
    console.log('PASS: QR demo entry, four locales, local membership/order history, isolated phone lookup and admin club sync');
    await customer.goto(new URL('./?restaurant=standalone-qa-missing',base).href); await readyCustomer(customer);
    assert.equal(await customer.evaluate(() => menuDataMode), 'unavailable');
    assert.equal(await cards.count(),0);
    assert.equal(await customer.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
    assert.equal(await customer.locator('meta[property="og:site_name"]').getAttribute('content'),'');
    assert.equal(await customer.locator('meta[name="description"]').getAttribute('content'),await customer.evaluate(()=>ROMANO_I18N.ui('menuUnavailable')));
    assert.deepEqual(errors,[]);
    console.log('PASS: unknown restaurant fails closed; no uncaught JavaScript errors');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
