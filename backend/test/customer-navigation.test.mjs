import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");

test("Cart stays accessible from header and mobile nav",()=>{
 const html=read("index.html"),js=read("js/commerce.js");
 assert.match(html,/id="ramen-header-cart"/);
 assert.match(html,/id="ramen-bottom-cart"/);
 assert.match(html,/aria-controls="commerce-drawer"/);
 assert.match(js,/initializeCustomerNavigation\(\)/);
 assert.match(js,/updateCustomerNavigation\(\)/);
 assert.match(js,/document\.getElementById\(id\)\?\.addEventListener\("click",openDrawer\)/);
});
test("Nav links map only to existing content",()=>{
 const html=read("index.html");
 for(const target of ["home","menu","featured","contact"]) {
  assert.match(html,new RegExp('href="#'+target+'"'));
  assert.match(html,new RegExp('id="'+target+'"'));
 }
});
test("Four-language navigation and accessible responsive layout",()=>{
 const js=read("js/commerce.js"),css=read("css/ramen-navigation.css"),sw=read("sw.js");
 for(const locale of ["fa","en","tr","ar"])assert.match(js,new RegExp(locale+':\\{home:'));
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css, /safe-area-inset-bottom/);
 assert.match(css,/:focus-visible/);
 assert.match(sw,/css\/ramen-navigation\.css/);
});

test('Bottom navigation has the requested physical DOM order and contact remains a native dialog',()=>{
 const html=read('index.html'),js=read('js/commerce.js'),css=read('css/interaction-system.css');
 const nav=html.match(/<nav class="ramen-bottom-nav"[\s\S]*?<\/nav>/)[0];
 assert.deepEqual([...nav.matchAll(/data-ramen-label="([^"]+)"/g)].map(m=>m[1]),['cart','menu','home','featured','contact']);
 assert.match(nav,/dir="ltr"/);assert.match(nav,/<a href="#contact"[^>]*data-ramen-nav="contact">/);
 assert.match(js,/trigger\.setAttribute\('role','button'\)/);
 assert.match(js,/trigger\.setAttribute\('aria-controls',dialog\.id\)/);
 assert.match(js,/trigger\.removeAttribute\('aria-controls'\)/);
 assert.match(js,/event\.key===' '/);
 assert.match(js,/document\.createElement\('dialog'\)/);assert.match(js,/dialog\.showModal\(\)/);
 assert.match(js,/mode==='public' \|\| mode==='offline'/);assert.match(js,/if\(demo\)content\.append/);
 assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/--ui-touch:44px/);
});

test('Admin header preserves navigation hooks and moves logout outside the header',()=>{
 const html=read('admin/index.html'),header=html.match(/<header class="admin-header admin-header-compact"[\s\S]*?<\/header>/)[0];
 assert.match(header,/id="mobile-menu-button"/);assert.match(header,/id="current-page-title"/);
 assert.match(header,/data-page-target="settings"/);assert.match(header,/id="admin-language-toggle"/);
 assert.doesNotMatch(header,/admin-add-product-shortcut|admin-logout-button/);
 assert.match(html,/<div class="sidebar-footer">\s*<button class="admin-logout-button"/);
 assert.match(html,/id="add-product-button"/);assert.match(html,/<details class="admin-mode-banner"/);
 assert.match(html,/class="admin-status-chip"/);
 for(const path of ['index.html','admin/index.html','sw.js'])assert.match(read(path),/css\/interaction-system\.css/);
});

test('Catalog disclosures and sticky layout retain accessible controls, horizontal category navigation and cache registration',()=>{
 const js=read('js/menu-experience.js'),css=read('css/catalog-browse.css'),html=read('index.html'),sw=read('sw.js');
 for(const name of ['search','filter']) {
   assert.match(js,new RegExp('id="menu-'+name+'-toggle" aria-expanded="false" aria-controls="menu-'+name+'-panel"'));
   assert.match(js,new RegExp('id="menu-'+name+'-panel" class="browse-panel" hidden'));
 }
 assert.match(js,/new ResizeObserver\(measure\)/);assert.match(js,/setPanel\(null,true\)/);
 assert.match(js,/if \(nextMarkup!==railMarkup\)/);assert.match(js,/rail.scrollLeft=offset/);
 assert.match(css,/position:sticky; inset-block-start:var\(--browse-header-offset\)/);
 assert.match(css,/repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/max-width:359px/);
 assert.match(html,/css\/catalog-browse\.css/);assert.match(sw,/css\/catalog-browse\.css/);
});

test('Category shortcuts reset conflicting filters and featured signature is not duplicated',()=>{
 const app=read('js/app.js'),browser=read('js/menu-experience.js');
 assert.match(app,/selectCategory\(categoryId, true\)/);assert.match(app,/selectCategory\(id, true\)/);
 assert.match(browser,/if\(reset\) \{query='';order='menu';onlyFavorites=false/);
 assert.match(app,/const railProducts = featured.slice\(1\)/);
});

test('Browsing translations preserve literal search input in every supported locale',async()=>{
 const {runInNewContext}=await import('node:vm');
 for(const lang of ['fa','en','tr','ar']) {
  const window={};
  runInNewContext(read('js/i18n.js'),{window,document:{addEventListener(){}},localStorage:{getItem:()=>lang}});
  assert.equal(window.ROMANO_I18N.language,lang);
  for(const key of ['browseFilters','browseFiltersActive'])assert.ok(window.ROMANO_I18N.ui(key).length>0);
  const query='pizza $& <test> $` $\'';
  assert.ok(window.ROMANO_I18N.ui('browseSearchActive',query).includes(query));
 }
});

test('Customer polish consolidates footer and retains contact fragments and safe image navigation',()=>{
 const html=read('index.html'),app=read('js/app.js'),css=read('css/customer-polish.css'),sw=read('sw.js');
 assert.doesNotMatch(html,/class="(?:story-section|contact-section)\b/);
 assert.match(html,/<footer[\s\S]*id="contact"[\s\S]*id="story"/);
 assert.match(html,/data-restaurant-brand/);assert.match(html,/data-restaurant-address/);
 assert.match(app,/escapeAttribute\(getSafeImageSource\(category.image\)\)/);
 for(const panel of ['profile','cart','contact','chat','feedback'])assert.match(html,new RegExp(`data-nav-panel="${panel}"`));
 assert.match(css,/max-height:52dvh/);assert.match(css,/overflow-y:auto/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(html,/css\/customer-polish\.css/);assert.match(sw,/css\/customer-polish\.css/);
});
test('Cart uses a bounded scroll area, accessible controls and restores inert state and focus',()=>{
 const js=read('js/commerce.js'),css=read('css/customer-polish.css');
 assert.match(js,/class="commerce-scroll"/);assert.match(js,/id="commerce-options"/);assert.match(js,/id="commerce-checkout"/);
 assert.match(js,/cartBackground\.forEach\(\(\{node,previous\}\)=>\{node.inert=previous;\}\)/);
 assert.match(js,/previousControl\.id/);assert.match(js,/if \(!tableSession\) \{ showMessage\(t\("scan"\)\); return; \}/);
 assert.match(css,/grid-template-rows:auto minmax\(0,1fr\) auto/);
 assert.match(css,/\.commerce-scroll \{[^}]*overflow-y:auto/);
});
test('Profile, chat and local feedback labels are translated in all four languages; no remote review is submitted',async()=>{
 const {runInNewContext}=await import('node:vm');
 const values=[];
 for(const lang of ['fa','en','tr','ar']) {
  const window={};runInNewContext(read('js/i18n.js'),{window,document:{addEventListener(){}},localStorage:{getItem:()=>lang}});
  const labels=['پروفایل','چت','ثبت امتیاز و رضایت'].map(key=>window.ROMANO_I18N.t(key));
  assert.ok(labels.every(Boolean));values.push(labels.join('|'));
 }
 assert.equal(new Set(values).size,4);
 const js=read('js/commerce.js'),panel=js.slice(js.indexOf('function initializeContactPanel()'),js.indexOf('function buildShell()'));
 assert.match(panel,/if\(demo\) \{/);assert.match(panel,/review\.submit\(localStorage,tenant\(\),selected,comment\.value,id\)/);
 assert.doesNotMatch(panel,/\bfetch\(/);assert.match(panel,/labels\.storageError/);
});


test('Named action collections have group semantics; the Instagram placeholder needs no prohibited label',()=>{
 const html=read('index.html'),admin=read('admin/index.html'),browse=read('js/menu-experience.js');
 assert.match(admin,/<div class="admin-quick-actions" role="group" aria-label=/);
 assert.match(browse,/<div id="rv4-category-rail" class="browse-category-rail" role="group">/);
 const social=html.match(/<a\s+href=""\s+class="social-link"[\s\S]*?<\/a>/)?.[0];
 assert.ok(social);assert.doesNotMatch(social,/aria-label=/);assert.match(social,/Instagram/);
});


test('Telephone numbers are isolated left-to-right in footer and contact dialog',()=>{
 assert.match(read('index.html'),/data-restaurant-phone dir="ltr"/);
 const commerce=read('js/commerce.js');
 assert.match(commerce,/if\(direction\)valueNode.dir=direction/);
 assert.match(commerce,/appendInfo\(words.phone,[^\n]*null,'ltr'\)/);
 assert.match(read('css/interaction-system.css'),/span\[dir="ltr"\] \{ unicode-bidi:isolate/);
});


test('Customer footer has a safe localized creator link and motion preference guard',()=>{
 const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 assert.match(html,/<a class="footer-creator" href="https:\/\/kiankhayat\.me" target="_blank" rel="noopener noreferrer" data-i18n="ساخته‌شده توسط کیان خیاط\."/);
 const i18n=fs.readFileSync(new URL('../../js/i18n.js',import.meta.url),'utf8');
 for(const phrase of ['Made by Kian Khayat.','Kian Khayat tarafından yapıldı.','من تصميم وتطوير كيان خياط.'])assert.ok(i18n.includes(phrase));
});


test('Product modal records explicit opener and restores a refreshed card by product identity',()=>{
 const js=read("js/app.js");assert.match(js,/function openProductModal\(productId, opener = null\)/);assert.match(js,/product\.id,\s*event\.currentTarget/);assert.match(js,/productModalReturnTarget/);assert.match(js,/returnTarget\.id/);assert.match(js,/document\.activeElement === element/);
});
