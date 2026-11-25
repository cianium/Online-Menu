/* Documentation-only capture of real standalone UI. No external traffic or real data. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = new URL(process.env.SHOWCASE_URL || 'http://127.0.0.1:8765/');
assert.equal(base.origin, 'http://127.0.0.1:8765', 'Only the local demo origin is allowed');
const out = path.resolve(process.argv[2] || 'dist/showcase');
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
    const errors = [];
    context.on('page', page => page.on('pageerror', err => errors.push(String(err))));
    const guest = await context.newPage();
    await guest.goto(base.href);
    await guest.waitForFunction(() => typeof menuDataMode !== 'undefined' && menuDataMode === 'demo');
    await guest.locator('#splash-screen').waitFor({ state: 'detached' });
    await guest.evaluate(() => ROMANO_I18N.setLanguage('en', false));
    const shot = async (page, name) => {
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.screenshot({ path: path.join(out, name + '.png'), animations: 'disabled' });
    };
    await shot(guest, 'customer-desktop-en');
    await guest.setViewportSize({ width: 390, height: 844 });
    await guest.evaluate(() => ROMANO_I18N.setLanguage('fa', false));
    await guest.locator('#menu .product-card').first().scrollIntoViewIfNeeded();
    await shot(guest, 'customer-mobile-fa');
    const admin = await context.newPage();
    await admin.goto(new URL('/admin/', base).href);
    await admin.waitForFunction(() => typeof adminInitialized !== 'undefined' && adminInitialized && !document.querySelector('.admin-app').inert);
    assert.equal(await admin.locator('#admin-mode-banner').isVisible(), true);
    for (const [i, section] of ['dashboard', 'products', 'categories', 'settings'].entries()) {
      await admin.evaluate(section => { ROMANO_ADMIN_I18N.setLanguage('en'); navigateTo(section); }, section);
      await admin.waitForTimeout(350);
      await shot(admin, 'admin-' + section);
      await fs.copyFile(path.join(out, 'admin-' + section + '.png'), path.join(out, 'frame-' + i + '.png'));
    }
    await admin.setViewportSize({ width: 390, height: 844 });
    await admin.evaluate(() => { ROMANO_ADMIN_I18N.setLanguage('ar'); navigateTo('products'); });
    await admin.waitForTimeout(350);
    await shot(admin, 'admin-mobile-ar');
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(out, 'provenance.json'), JSON.stringify({ revision: process.env.GITHUB_SHA || 'local checkout', source: 'standalone demo; external requests blocked; synthetic catalog; Chromium', capturedAt: new Date().toISOString() }, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
