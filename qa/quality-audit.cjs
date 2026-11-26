const {loginDemoAdmin}=require('./demo-admin-login.cjs');
/* Repeatable offline-safe quality audit. Chromium lab only, not field CWV or WCAG certification. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');
const base = new URL(process.env.QUALITY_BASE_URL || 'http://127.0.0.1:8767/Online-Menu/');
assert.ok(base.protocol === 'http:' && ['localhost','127.0.0.1'].includes(base.hostname));
assert.ok(base.pathname.endsWith('/'), 'base must end in a slash');
const out = path.resolve('quality-report');
const report = { schema:1, axeVersion:require('axe-core/package.json').version, mode:'private standalone export; external requests blocked', findings:[], lab:[], noScript:[], errors:[] };
const locales = ['fa','ar','en','tr'];
const tags = ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'];
async function setup(browser, options={}) {
  const context = await browser.newContext({serviceWorkers:'block', reducedMotion:'reduce', viewport:{width:390,height:844}, ...options});
  await context.route('**/*', r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort('blockedbyclient'));
  context.on('page', p=>p.on('pageerror', e=>report.errors.push(String(e))));
  return context;
}
async function open(page, surface) {
  await page.goto(new URL(surface==='customer'?'./':'admin/',base).href,{waitUntil:'load'});
  if (surface==='customer') {
    await page.waitForFunction(()=>typeof menuDataMode!=='undefined'&&menuDataMode==='demo');
    await page.locator('#splash-screen').waitFor({state:'detached'});
  } else {
    await loginDemoAdmin(page);
  }
}
async function scan(page, name, lang, width, height) {
  await page.setViewportSize({width,height});
  if(name==='admin-entry'||name==='customer-entry')await page.locator(name==='admin-entry'?'#admin-gate':'#customer-entry').evaluate(el=>{el.scrollTop=0;el.scrollLeft=0;});
  await page.evaluate(async()=>{await document.fonts.ready;});
  if (!await page.evaluate(()=>Boolean(window.axe))) await page.addScriptTag({path:axePath});
  if (name.startsWith('admin-') && name!=='admin-entry') {
    const footer=await page.evaluate(()=>{
      const panel=document.querySelector('.admin-footer');
      const rgb=s=>{const m=s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);if(!m)throw Error('Expected opaque RGB: '+s);return m.slice(1).map(Number);};
      const luminance=s=>rgb(s).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
      const bg=luminance(getComputedStyle(panel).backgroundColor);
      return [...panel.querySelectorAll('.admin-footer-brand span, .admin-footer-brand strong, p, #admin-storage-mode')].map(el=>{
        const style=getComputedStyle(el),fg=luminance(style.color);
        return {text:el.textContent.trim(),fontPx:parseFloat(style.fontSize),ratio:(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)};
      });
    });
    assert.equal(footer.length,4);
    for(const entry of footer){assert.ok(entry.fontPx>=12,JSON.stringify(entry));assert.ok(entry.ratio>=4.5,JSON.stringify(entry));}
    console.log('FOOTER CONTRAST '+JSON.stringify({name,lang,width,values:footer}));
  }
  const result = await page.evaluate(async tags=>window.axe.run(document,{runOnly:{type:'tag',values:tags}}),tags);
  const item={name,lang,width,height,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>({id:v.id,impact:v.impact,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,checks:[...n.any,...n.all,...n.none].map(c=>({id:c.id,message:c.message,data:c.data}))}))})),passRules:result.passes.length};
  report.findings.push(item);
  await page.screenshot({path:path.join(out,[name,lang,width].join('-')+'.png'),animations:'disabled'});
  console.log('AXE '+JSON.stringify({name,lang,width,rules:item.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length})),incomplete:item.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))}));
}
// Decode only the visible product photographs before recording visual evidence.
async function settleCatalog(page) {
  return page.locator('#menu .menu-category-products').first().evaluate(async rail=>{
    const bounds=rail.getBoundingClientRect();
    const images=[...rail.querySelectorAll('.product-image-wrapper img')].filter(img=>{
      const r=img.getBoundingClientRect();
      return r.width>0&&r.height>0&&r.right>Math.max(0,bounds.left)&&r.left<Math.min(innerWidth,bounds.right);
    });
    for(const img of images)img.loading='eager';
    await Promise.all(images.map(img=>img.decode()));
    return {visible:images.length,decoded:images.filter(img=>img.complete&&img.naturalWidth>0).length,
      flow:getComputedStyle(rail).gridAutoFlow,scrollWidth:rail.scrollWidth,clientWidth:rail.clientWidth};
  });
}
async function entryGeometry(page,selector,submit,lang,surface){
  for(const [width,height] of [[320,568],[844,390]]){
    await page.setViewportSize({width,height});
    const box=page.locator(selector);
    await box.evaluate(el=>{el.scrollTop=0;el.scrollLeft=0;});
    const panel=box.locator(surface==='admin-entry'?'.admin-gate-panel':'.customer-entry-panel');
    const panelRect=await panel.boundingBox();
    assert.ok(panelRect&&panelRect.x>=-1&&panelRect.x+panelRect.width<=width+1,JSON.stringify({surface,lang,width,panelRect}));
    assert.ok(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1),surface+' '+lang+' panel horizontal overflow');
    const button=page.locator(submit);
    await button.scrollIntoViewIfNeeded();
    const rect=await button.boundingBox();
    assert.ok(rect&&rect.y>=-1&&rect.y+rect.height<=height+1&&rect.height>=44,JSON.stringify({surface,lang,width,height,rect}));
    if(['en','fa'].includes(lang)) await page.screenshot({path:path.join(out,[surface,'compact',lang,width].join('-')+'.png'),animations:'disabled'});
  }
}
async function measure(browser,surface) {
  const context=await setup(browser,{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  try {
    await context.addInitScript(()=>{
      const values={lcp:null,shifts:[]};window.__qualityLab=values;
      for(const type of ['largest-contentful-paint','layout-shift']) {
        if(!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
        new PerformanceObserver(list=>{
          for(const e of list.getEntries()) {
            if(type==='largest-contentful-paint') values.lcp=e.startTime;
            else if(!e.hadRecentInput) values.shifts.push({time:e.startTime,value:e.value});
          }
        }).observe({type,buffered:true});
      }
    });
    const page=await context.newPage();
    const cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular3g'});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await open(page,surface);
    // Allow initial layout and paint observers to deliver entries; not a full-session CLS measure.
    await page.waitForTimeout(1500);
    const result=await page.evaluate(()=>{
      const nav=performance.getEntriesByType('navigation')[0], lab=window.__qualityLab;
      let max=0,start=0,last=0,sum=0;
      for(const e of lab.shifts) {
        if(!sum || e.time-last>1000 || e.time-start>5000){start=e.time;sum=0;}
        sum+=e.value;last=e.time;max=Math.max(max,sum);
      }
      const resources=performance.getEntriesByType('resource').filter(r=>new URL(r.name).origin===location.origin);
      return {lcpMs:lab.lcp===null?null:Math.round(lab.lcp),initialCls:Number(max.toFixed(4)),domContentLoadedMs:Math.round(nav.domContentLoadedEventEnd),loadMs:Math.round(nav.loadEventEnd),encodedBytes:resources.reduce((n,r)=>n+r.encodedBodySize,0)};
    });
    report.lab.push({surface,...result});
    console.log('QUALITY LAB '+JSON.stringify({surface,...result}));
  } finally {await context.close();}
}
(async()=>{
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({headless:true});
  try {
    const noScript=await setup(browser,{javaScriptEnabled:false});
    try {
      for(const surface of ['customer','admin']){
        const page=await noScript.newPage();
        await page.goto(new URL(surface==='customer'?'./':'admin/',base).href);
        assert.equal(await page.locator('.no-script-notice').isVisible(),true,surface);
        assert.equal(await page.locator('.no-script-notice p').count(),4);
        assert.equal(await page.locator(surface==='customer'?'#splash-screen':'.admin-app').isVisible(),false);
        report.noScript.push(surface);
        await page.screenshot({path:path.join(out,surface+'-no-script.png')});
        await page.close();
      }
      console.log('PASS: no-script fallback for both surfaces');
    } finally {await noScript.close();}
    const context=await setup(browser);
    try {
      const customer=await context.newPage(),admin=await context.newPage();
      await open(customer,'customer');
      await admin.goto(new URL('admin/',base).href);
      await admin.locator('#admin-gate').waitFor({state:'visible'});
      for(const lang of locales){
        await admin.locator('#admin-gate-language').selectOption(lang);
        await scan(admin,'admin-entry',lang,390,844);
        await entryGeometry(admin,'#admin-gate','#admin-gate-submit',lang,'admin-entry');
      }
      await admin.setViewportSize({width:390,height:844});
      await loginDemoAdmin(admin);
      const entry=await context.newPage();
      await entry.goto(new URL('./?qr=demo',base).href);
      await entry.locator('#customer-entry').waitFor({state:'visible'});
      for(const lang of locales){
        await entry.locator('#customer-entry select').selectOption(lang);
        await scan(entry,'customer-entry',lang,390,844);
        await entryGeometry(entry,'#customer-entry','#customer-entry button[type=submit]',lang,'customer-entry');
      }
      await entry.close();
      for(const lang of locales){
        await customer.evaluate(l=>ROMANO_I18N.setLanguage(l,false),lang);
        await admin.evaluate(l=>{ROMANO_ADMIN_I18N.setLanguage(l);navigateTo('dashboard');},lang);
        for(const [width,height] of [[390,844],[1440,900]]){
          await scan(customer,'customer',lang,width,height);
          await scan(admin,'admin-dashboard',lang,width,height);
        }
        await customer.setViewportSize({width:390,height:844});
        const contact=customer.locator('[data-ramen-nav="contact"]');
        assert.equal(await contact.getAttribute('role'),'button');
        assert.equal(await contact.getAttribute('aria-controls'),null);
        await contact.focus();
        await contact.press('Space');
        await customer.locator('#ramen-contact-dialog').waitFor({state:'visible'});
        assert.equal(await contact.getAttribute('aria-expanded'),'true');
        assert.equal(await contact.getAttribute('aria-controls'),'ramen-contact-dialog');
        const footerPhone=customer.locator('[data-restaurant-phone]');
        const phone=customer.locator('#ramen-contact-dialog .ramen-contact-item > span[dir="ltr"]');
        assert.equal(await phone.count(),1);
        assert.equal(await phone.textContent(),(await footerPhone.textContent()).trim());
        for(const node of [phone,footerPhone]) assert.equal(await node.evaluate(el=>getComputedStyle(el).direction),'ltr');
        await scan(customer,'customer-contact',lang,390,844);
        await customer.keyboard.press('Escape');
        await customer.waitForFunction(()=>!document.querySelector('#ramen-contact-dialog').open && document.querySelector('[data-ramen-nav="contact"]').getAttribute('aria-expanded')==='false');
        assert.equal(await contact.getAttribute('aria-controls'),null);
        assert.equal(await contact.evaluate(el=>el===document.activeElement),true);
      }
      await customer.evaluate(()=>ROMANO_I18N.setLanguage('en',false));
      for(const width of [390,1440]){
        await customer.setViewportSize({width,height:844});
        await customer.locator('#menu .menu-category-products').first().scrollIntoViewIfNeeded();
        const catalog=await settleCatalog(customer);
        assert.ok(catalog.visible>0&&catalog.decoded===catalog.visible&&catalog.flow==='column',JSON.stringify(catalog));
        if(width===390)assert.ok(catalog.scrollWidth>catalog.clientWidth,JSON.stringify(catalog));
        console.log('CATALOG IMAGE EVIDENCE '+JSON.stringify({width,...catalog}));
        await customer.screenshot({path:path.join(out,'customer-horizontal-catalog-en-'+width+'.png'),animations:'disabled'});
        await customer.evaluate(()=>window.scrollTo(0,0));
        await customer.locator('#menu-toggle').click();
        const rect=await customer.locator('.navigation-inner').boundingBox(),overlay=await customer.locator('.main-navigation').boundingBox();
        assert.ok(rect&&overlay&&Math.abs(rect.height-overlay.height)<=2&&Math.abs(rect.width-(width===390?overlay.width:680))<=2,JSON.stringify({rect,overlay}));
        await customer.screenshot({path:path.join(out,'customer-navigation-en-'+width+'.png'),animations:'disabled'});
        await customer.locator('#navigation-close').click();
      }
      await admin.evaluate(()=>ROMANO_ADMIN_I18N.setLanguage('en'));
      for(const view of ['orders','products','categories','settings','loyalty']){
        await admin.evaluate(v=>navigateTo(v),view);
        await scan(admin,'admin-'+view,'en',390,844);
      }
    } finally {await context.close();}
    for(const surface of ['customer','admin']) await measure(browser,surface);
    assert.deepEqual(report.errors,[],'Unexpected JavaScript errors during audit');
    assert.equal(report.findings.length,33);
    assert.equal(report.lab.length,2);
    const severe=report.findings.flatMap(s=>s.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({surface:s.name,lang:s.lang,width:s.width,id:v.id})));
    console.log('QUALITY SUMMARY '+JSON.stringify({scans:report.findings.length,severe:severe.length,violations:report.findings.reduce((n,s)=>n+s.violations.length,0)}));
    const structural = report.findings.flatMap(s=>s.incomplete.filter(v=>['aria-prohibited-attr','aria-valid-attr-value'].includes(v.id)).map(v=>({surface:s.name,lang:s.lang,width:s.width,id:v.id,nodes:v.nodes.map(n=>n.target)})));
    console.log('ARIA REVIEW '+JSON.stringify(structural));
    // A finding is not suppressed or treated as a successful accessibility gate.
    assert.equal(severe.length,0,'Serious/critical accessibility findings: '+JSON.stringify(severe));
  } finally {
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
