const {loginDemoAdmin}=require('./demo-admin-login.cjs');
/* Release acceptance on the exact extracted delivery, no external requests or real data. */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const base=new URL(process.env.QUALITY_BASE_URL||'http://127.0.0.1:8765/');
assert.equal(base.hostname,'127.0.0.1');
const out=path.resolve('quality-report');
const report={checks:[],errors:[]};
const words={fa:['خروجی JSON','بازیابی JSON','داده‌های منو'],ar:['تصدير JSON','استعادة JSON','بيانات القائمة'],en:['Export JSON','Restore JSON','Menu data'],tr:['JSON dışa aktar','JSON geri yükle','Menü verileri']};
async function context(browser,options={}){
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:true,...options});
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort('blockedbyclient'));
 ctx.on('page',p=>p.on('pageerror',e=>report.errors.push(String(e))));
 return ctx;
}
async function boot(ctx){
 const admin=await ctx.newPage(),customer=await ctx.newPage();
 await admin.goto(new URL('admin/',base).href);
 await loginDemoAdmin(admin);
 await customer.goto(base.href);
 await customer.waitForFunction(()=>typeof menuDataMode!=='undefined'&&menuDataMode==='demo');
 await customer.locator('#splash-screen').waitFor({state:'detached'});
 return {admin,customer};
}
function pass(name){report.checks.push(name);console.log('ACCEPTANCE PASS: '+name);}
function jsonFile(data){return {name:'sample-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))};}
async function waitImport(page){await page.waitForFunction(()=>!saveInProgress&&!document.querySelector('.rv4-confirm-dialog').open&&document.querySelector('[data-rv4-import]').value==='');}
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  const ctx=await context(browser);
  try{
   const {admin,customer}=await boot(ctx);
   const exportBtn=admin.locator('[data-rv4-export]'),restore=admin.locator('[data-rv4-restore]'),input=admin.locator('[data-rv4-import]');
   await admin.evaluate(()=>navigateTo('settings'));
   for(const lang of Object.keys(words)){
    await admin.evaluate(l=>ROMANO_ADMIN_I18N.setLanguage(l),lang);
    assert.equal((await exportBtn.innerText()).trim(),words[lang][0]);
    assert.equal((await restore.innerText()).trim(),words[lang][1]);
    assert.equal((await admin.locator('#rv4-backup-tools .panel-eyebrow').innerText()).trim(),words[lang][2]);
    await exportBtn.focus();await admin.keyboard.press('Tab');
    assert.equal(await restore.evaluate(el=>el===document.activeElement),true,lang);
    await restore.scrollIntoViewIfNeeded();
    await admin.screenshot({path:path.join(out,'acceptance-backup-'+lang+'.png'),animations:'disabled'});
    pass('Localized backup controls and keyboard focus: '+lang);
   }
   await admin.evaluate(()=>ROMANO_ADMIN_I18N.setLanguage('en'));
   const [download]=await Promise.all([admin.waitForEvent('download'),exportBtn.click()]);
   const original=JSON.parse(await fs.readFile(await download.path(),'utf8'));
   assert.equal(original.schema,'romano.menu-backup');assert.equal(original.products.length,21);
   const first=original.products[0],id=first.id,name=first.name;
   const changed=structuredClone(original);changed.products[0].name='Acceptance sample';changed.products[0].translations={};
   // Exercise native chooser from keyboard; no interception of application code.
   await restore.focus();
   const [chooser]=await Promise.all([admin.waitForEvent('filechooser'),restore.press('Enter')]);
   await chooser.setFiles(jsonFile(changed));
   const modal=admin.locator('.rv4-confirm-dialog');
   await modal.waitFor({state:'visible'});
   await modal.locator('button[value="cancel"]').click();
   await waitImport(admin);
   assert.equal(await admin.evaluate(id=>state.products.find(p=>p.id===id).name,id),name);
   assert.equal(await restore.evaluate(el=>el===document.activeElement),true);
   pass('Keyboard opens native file chooser; cancelled restore leaves original intact');
   async function restorePayload(data){
    await restore.focus();await input.setInputFiles(jsonFile(data));
    await modal.waitFor({state:'visible'});
    await modal.locator('button[value="confirm"]').click();
    await waitImport(admin);
    assert.equal(await restore.evaluate(el=>el===document.activeElement),true);
   }
   await restorePayload(changed);
   assert.equal(await admin.evaluate(id=>state.products.find(p=>p.id===id).name,id),'Acceptance sample');
   await customer.reload();
   await customer.waitForFunction(id=>typeof menuDataMode!=='undefined'&&menuDataMode==='demo'&&menuProducts.some(p=>p.id===id&&p.name==='Acceptance sample'),id);
   pass('JSON export/import updates sample catalog in both surfaces');
   for(const invalid of [(()=>{const v=structuredClone(original);v.products.push(v.products[0]);return v;})(),(()=>{const v=structuredClone(original);v.products[0].image='javascript:alert(1)';return v;})()]){
    await restore.focus();await input.setInputFiles(jsonFile(invalid));await waitImport(admin);
    assert.equal(await admin.evaluate(id=>state.products.find(p=>p.id===id).name,id),'Acceptance sample');
    assert.equal(await admin.evaluate(()=>state.products.length),21);
    assert.equal(await restore.evaluate(el=>el===document.activeElement),true);
   }
   pass('Invalid duplicate and unsafe image backups rejected without mutation');
   await restorePayload(original);
   await admin.reload();await admin.waitForFunction(()=>typeof adminInitialized!=='undefined'&&adminInitialized);
   assert.equal(await admin.evaluate(id=>state.products.find(p=>p.id===id).name,id),name);
   await customer.reload();await customer.waitForFunction(({id,name})=>typeof menuDataMode!=='undefined'&&menuDataMode==='demo'&&menuProducts.some(p=>p.id===id&&p.name===name),{id,name});
   pass('Original sample backup restored and persisted across reloads');
  }finally{await ctx.close();}
  const forced=await context(browser,{viewport:{width:320,height:900},forcedColors:'active'});
  try{
   const {admin,customer}=await boot(forced);
   for(const lang of Object.keys(words)){
    await customer.evaluate(l=>{ROMANO_I18N.setLanguage(l,false);window.scrollTo(0,0);},lang);
    await admin.evaluate(l=>{ROMANO_ADMIN_I18N.setLanguage(l);navigateTo('dashboard');},lang);
    for(const [surface,page,link,target] of [['customer',customer,'.rv4-skip-link','#menu'],['admin',admin,'.admin-skip-link','#admin-content']]){
     assert.equal(await page.evaluate(()=>matchMedia('(forced-colors: active)').matches),true);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,surface+' '+lang);
     await page.locator(link).focus();await page.locator(link).press('Enter');
     await page.waitForFunction(s=>document.activeElement===document.querySelector(s),target);
     await page.screenshot({path:path.join(out,'acceptance-forced-'+surface+'-'+lang+'.png'),animations:'disabled'});
     pass('Forced colors, 320px reflow and keyboard skip: '+surface+' '+lang);
    }
   }
  }finally{await forced.close();}
  assert.deepEqual(report.errors,[]);
  console.log('ACCEPTANCE SUMMARY '+JSON.stringify({checks:report.checks.length,errors:report.errors.length}));
 }finally{await fs.writeFile(path.join(out,'release-acceptance.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
