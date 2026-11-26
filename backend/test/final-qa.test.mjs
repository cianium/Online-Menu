import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');

test('Payment redirects allow only existing HTTPS gateway origins and exact StartPay paths',()=>{
 const s=read('js/commerce.js');const ctx=vm.createContext({URL});
 vm.runInContext(s.slice(s.indexOf('  function paymentRedirect('),s.indexOf('  async function startPayment(')),ctx);
 for(const host of ['payment.zarinpal.com','sandbox.zarinpal.com']){
  const url=`https://${host}/pg/StartPay/A000123`;assert.equal(vm.runInContext(`paymentRedirect(${JSON.stringify(url)})`,ctx),url);
 }
 for(const url of ['javascript:alert(1)','http://payment.zarinpal.com/pg/StartPay/A','https://payment.zarinpal.com.evil.test/pg/StartPay/A','https://evil.test/pg/StartPay/A','https://user@payment.zarinpal.com/pg/StartPay/A','https://payment.zarinpal.com:8443/pg/StartPay/A','https://payment.zarinpal.com/pg/StartPay/','https://payment.zarinpal.com/pg/StartPay/A?redirect=evil','https://payment.zarinpal.com/pg/StartPay/A#evil','/pg/StartPay/A','https://payment.zarinpal.com/other',null,{}]){
  assert.equal(vm.runInContext(`paymentRedirect(${JSON.stringify(url)})`,ctx),null,JSON.stringify(url));
 }
 assert.match(s,/const redirect = paymentRedirect\(body.data.redirectUrl\);[\s\S]*?location.assign\(redirect\)/);
});

test('Service worker does not intercept table tokens or payment callback URLs',()=>{
 const listeners={};const ctx=vm.createContext({URL,self:{registration:{scope:'https://example.test/Online-Menu/'},location:{origin:'https://example.test'},addEventListener:(type,fn)=>listeners[type]=fn}});
 ctx.importScripts=()=>vm.runInContext(read('js/sw-cache.js'),ctx);
 vm.runInContext(read('sw.js'),ctx);
 for(const key of ['qr','payment','order','ref'])listeners.fetch({request:{method:'GET',url:`https://example.test/Online-Menu/?${key}=test`,destination:'document'},respondWith:()=>assert.fail('Sensitive navigation intercepted')});
});

test('Product modal focus occurs after background inert sync; reopening does not retain queued restoration',()=>{
 const s=read('js/app.js'),open=s.slice(s.indexOf('function openProductModal('),s.indexOf('function closeProductModal(')),close=s.slice(s.indexOf('function closeProductModal('),s.indexOf('14. CATEGORY NAVIGATION'));
 assert.ok(open.indexOf('syncBodyScrollLock();')<open.indexOf('DOM.modalClose?.focus({preventScroll:true})'));
 assert.match(open,/opening \|\| !DOM.productModal.contains\(document.activeElement\)/);
 assert.match(close,/!element\.isConnected \|\| element\.closest\("\[inert\]"\)/);
 assert.match(close,/element\.focus\(\{preventScroll:true\}\)/);
 assert.match(close,/return document\.activeElement === element/);
 assert.ok(close.indexOf('syncBodyScrollLock();')<close.indexOf('if (focus(target)) return;'));
 assert.match(close,/if \(focus\(surface\?\.querySelector\(selector\)\)\) return;/);
 assert.doesNotMatch(close,/requestAnimationFrame/);
 assert.match(read('css/style.css'),/\.product-modal\.is-open\s*\{[\s\S]*?transition: opacity var\(--transition\), visibility 0s;/);
});


test('Static HTML protects URL referrers and preserves indexing policy',()=>{
 for(const name of ['index.html','admin/index.html']){
  const html=read(name);
  assert.match(html,/<meta name="referrer" content="no-referrer">/);
  assert.match(html,/<html lang="fa" dir="rtl">/);
  assert.match(html,/<title>[^<]+<\/title>/);
  assert.match(html,/name="description"\s+content="[^"]+"/);
  assert.match(html,/name="viewport"\s+content="[^"]*width=device-width/);
 }
 assert.match(read('admin/index.html'),/name="robots" content="noindex, nofollow"/);
 assert.match(read('index.html'),/name="robots" content="index, follow"/);
 assert.match(read('index.html'),/rel="preload" as="image" href="assets\/images\/hero\/hero.jpg" fetchpriority="high"/);
});

test('Public asset budgets prevent major regressions in the initial UI',()=>{
 const size=p=>fs.statSync(new URL('../../'+p,import.meta.url)).size;
 for(const [name,limit] of [['assets/images/hero/hero.jpg',80*1024],['assets/images/logo/logo.png',128*1024]]) assert.ok(size(name)<=limit,name);
 const html=read('index.html');
 const resources=[...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+\.(?:js|css))"/g)].map(m=>m[1]);
 assert.ok(resources.length>10);
 assert.ok([...new Set(resources)].reduce((sum,p)=>sum+size(p),0)<=400*1024,'Uncompressed customer JS/CSS budget');
 assert.match(read('js/app.js'),/loading="lazy"/);
});


test('Hero and footer share the restaurant tagline rendering path',()=>{
 const app=read('js/app.js');
 assert.match(app,/brandTagline:\s*document\.querySelectorAll\("\.brand-tagline, \[data-restaurant-tagline\], \.hero-eyebrow"\)/);
 assert.match(app,/DOM\.brandTagline\.forEach\([\s\S]*?localizedRestaurant\.tagline/);
});


test('Initial keyboard shortcuts have focusable destinations and private indexing remains intact',()=>{
 const customer=read('index.html'),admin=read('admin/index.html');
 assert.match(customer,/<a class="rv4-skip-link" href="#menu">/);
 assert.match(customer,/id="menu"\s+tabindex="-1"/);
 assert.match(admin,/<a class="admin-skip-link" href="#admin-content">/);
 assert.match(admin,/id="admin-content" tabindex="-1"/);
 assert.match(admin,/name="robots" content="noindex, nofollow"/);
 assert.match(customer,/property="og:type" content="website"/);
});

test('Splash readiness does not depend on the window load event',()=>{
 const app=read('js/app.js'),start=app.indexOf('function initializeSplashScreen()'),end=app.indexOf('\n}',start)+2;
 assert.ok(start>=0&&end>start);
 const pending=new Map(),calls=[];let next=0;
 const splash={classList:{add:v=>calls.push(v)},setAttribute:(k,v)=>calls.push([k,v]),remove:()=>calls.push('removed')};
 const ctx=vm.createContext({document:{querySelector:()=>splash},window:{setTimeout:(fn,ms)=>{const id=++next;pending.set(id,{fn,ms});return id;},clearTimeout:id=>pending.delete(id),matchMedia:()=>({matches:true})}});
 vm.runInContext(app.slice(start,end),ctx);
 const dismiss=vm.runInContext('initializeSplashScreen()',ctx);
 assert.equal([...pending.values()][0].ms,1500);
 dismiss();dismiss();
 assert.deepEqual(calls,['is-hidden',['aria-hidden','true'],'removed']);
 assert.equal(pending.size,0);
 assert.match(app,/const dismissSplash = initializeSplashScreen\(\);/);
 assert.match(app,/dismissSplash\(\);/);
});


test('Both applications provide a localized no-script notice without inline style or script',()=>{
 for(const name of ['index.html','admin/index.html']){
  const html=read(name);
  assert.match(html,/<noscript><link rel="stylesheet" href="(?:\.\.\/)?css\/no-script\.css"><\/noscript>/);
  const notice=html.match(/<noscript>\s*<section class="no-script-notice"[\s\S]*?<\/noscript>/)?.[0];
  assert.ok(notice,name);
  for(const [lang,dir] of [['fa','rtl'],['ar','rtl'],['en','ltr'],['tr','ltr']]) assert.ok(notice.includes(`lang="${lang}" dir="${dir}"`),name+' '+lang);
 }
 assert.match(read('css/no-script.css'),/body > :not\(noscript\) \{ display:none !important; \}/);
});


test('Admin footer has a solid surface and readable secondary text',()=>{
 const css=read('admin/admin-polish.css');
 assert.match(css,/\.admin-footer\s*\{ background:var\(--admin-surface\); color:var\(--admin-ink-muted\); font-size:12px;/);
 assert.match(css,/\.admin-footer-brand span\s*\{ color:var\(--admin-ink-muted\); font-size:12px;/);
});


test('Backup restore is a native keyboard button and all new labels are translatable',()=>{
 const js=read('admin/rv4-admin-plus.js'),panel=js.slice(js.indexOf('function initBackupTools()'),js.indexOf('function initModalFocusHandling()'));
 assert.match(panel,/<button class="secondary-button" type="button" data-rv4-restore>/);
 assert.match(panel,/restoreButton.addEventListener\("click", \(\) => backupInput.click\(\)\)/);
 assert.match(panel,/restoreButton.isConnected && !restoreButton.disabled\) restoreButton.focus\(\)/);
 for(const label of ['داده‌های منو','خروجی JSON','بازیابی JSON'])assert.ok(read('admin/admin-i18n.js').includes(JSON.stringify(label)+': ['),label);
});
