/* Standalone demo integration: no remote API or third-party network is allowed. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = new URL(process.env.ADMIN_TEST_URL || 'http://127.0.0.1:8765');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname) && base.protocol === 'http:', 'Demo QA requires loopback HTTP');
const readyCustomer = async page => {
  await page.waitForFunction(() => typeof menuDataMode !== 'undefined' && menuDataMode !== 'loading');
  await page.locator('#splash-screen').waitFor({state:'detached'});
};
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:900}, serviceWorkers:'block', reducedMotion:'reduce'});
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(String(error))));
    await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort('blockedbyclient'));
    const customer = await context.newPage();
    const admin = await context.newPage();
    await customer.goto(new URL('/',base).href); await readyCustomer(customer);
    assert.equal(await customer.evaluate(() => menuDataMode), 'demo');
    const cards = customer.locator('#menu .product-card');
    assert.equal(await cards.count(), 21);
    await admin.goto(new URL('/admin/',base).href);
    await admin.waitForFunction(() => typeof adminInitialized !== 'undefined' && adminInitialized && !document.querySelector('.admin-app').inert);
    assert.equal(await admin.locator('#admin-mode-banner').isVisible(), true);
    assert.equal(await admin.evaluate(() => state.products.length), 21);
    console.log('PASS: both applications start with no external network');
    for (const lang of ['fa','ar','en','tr']) {
      await customer.evaluate(l => ROMANO_I18N.setLanguage(l,false),lang);
      await admin.evaluate(l => ROMANO_ADMIN_I18N.setLanguage(l),lang);
      const dir = ['fa','ar'].includes(lang) ? 'rtl' : 'ltr';
      for (const page of [customer,admin]) {
        assert.equal(await page.locator('html').getAttribute('dir'),dir);
        for (const width of [320,768,1440]) {
          await page.setViewportSize({width,height:900});
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${lang}/${width}/${page.url()}`);
        }
      }
    }
    console.log('PASS: four locales and three widths without external fonts');
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
    await customer.goto(new URL('/?restaurant=standalone-qa-missing',base).href); await readyCustomer(customer);
    assert.equal(await customer.evaluate(() => menuDataMode), 'unavailable');
    assert.equal(await cards.count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: unknown restaurant fails closed; no uncaught JavaScript errors');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
