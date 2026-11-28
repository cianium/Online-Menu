/* Browser UI contract only; real SQL/auth is covered by phone-auth-http.test.mjs. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=new URL(process.env.ADMIN_TEST_URL||'http://127.0.0.1:8765');
assert.ok(['127.0.0.1','localhost'].includes(base.hostname)&&base.protocol==='http:');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const catalog={restaurant:{name:'QA Restaurant',currency:'TRY'},categories:[],products:[]};
  for(const scenario of ['new-customer','returning-customer','new-admin','returning-admin']){
   const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   try{
    const registered=scenario.startsWith('returning'),admin=scenario.endsWith('admin');
    const calls=[],errors=[];
    let session=null;
    await ctx.route('**/*',async route=>{
     const url=new URL(route.request().url());
     if(url.origin!==base.origin)return route.abort();
     if(!url.pathname.startsWith('/api/v1/'))return route.continue();
     const p=url.pathname.slice('/api/v1'.length),method=route.request().method(),body=method==='POST'?route.request().postDataJSON():null;
     calls.push({p,method,body});
     let data=null,status=200,error=null;
     if(p.startsWith('/public/restaurants/'))data=catalog;
     else if(p==='/auth/phone/status')data={enabled:true};
     else if(p==='/auth/me')data=session;
     else if(p==='/auth/csrf')data={csrfToken:'qa-csrf'};
     else if(p==='/auth/phone/lookup')data={needsName:!registered};
     else if(p==='/auth/phone/start'||p==='/auth/phone/enroll-admin'){
      assert.equal(p,admin&&!registered?'/auth/phone/enroll-admin':'/auth/phone/start');
      assert.ok(body.phone);
      assert.equal(Boolean(body.name),!registered);
      assert.equal(Boolean(body.accessKey),admin&&!registered);
      assert.equal(Object.hasOwn(body,'role'),false);
      data={challenge:'qa-challenge',resendAfter:60,expiresIn:300};
     }else if(p==='/auth/phone/verify'){
      assert.deepEqual(body,{challenge:'qa-challenge',code:'123456'});
      session={user:{id:'qa-user',displayName:'Sample account'},membership:admin?{restaurant_id:'qa-restaurant',role:'manager'}:null};
      data={user:session.user,role:admin?'admin':'customer',csrfToken:'qa-csrf-next'};
     }else if(p==='/admin/data')data=catalog;
     else if(p==='/auth/logout'){session=null;data={loggedOut:true};}
     else {status=404;error={code:'NOT_FOUND',message:'Mock route absent'};}
     return route.fulfill({status,contentType:'application/json',body:JSON.stringify({data,error})});
    });
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(new URL(admin?'admin/':'?login=1',base).href);
    const form=page.locator('#phone-auth-entry');
    await form.waitFor({state:'visible'});
    assert.equal(new URL(page.url()).pathname,'/');
    const phone=form.locator('input[name=phone]');
    assert.equal(await phone.count(),1);
    assert.equal(await form.locator('input[name=name],input[name=code]').count(),0);
    await phone.fill('۰۹۱۲۳۴۵۶۷۸۹');
    for(const lang of ['fa','ar','tr','en']){
     await form.locator('select').selectOption(lang);
     assert.equal(await page.locator('html').getAttribute('lang'),lang);
     assert.equal(await page.locator('html').getAttribute('dir'),['fa','ar'].includes(lang)?'rtl':'ltr');
     assert.equal(await phone.inputValue(),'۰۹۱۲۳۴۵۶۷۸۹');
    }
    await form.locator('button[type=submit]').click();
    if(!registered){
     const name=form.locator('input[name=name]');await name.waitFor({state:'visible'});await name.fill('Sample Name');
     if(admin){
      assert.equal(await form.locator('input[name=accessKey]').count(),0);
      await form.getByRole('button',{name:'Admin registration',exact:true}).click();
      assert.equal(await form.locator('h1').innerText(),'Admin registration');
      assert.equal(await phone.inputValue(),'09123456789');
      await name.fill('Sample Name');
      const key=form.locator('input[name=accessKey]');assert.equal(await key.getAttribute('required'),'');await key.fill('x'.repeat(43));
     }else assert.equal(await form.locator('input[name=accessKey]').count(),0);
     await form.locator('button[type=submit]').click();
    }
    const otp=form.locator('input[name=code]');await otp.waitFor({state:'visible'});await otp.fill('۱۲۳۴۵۶');
    assert.equal(await form.locator('input[name=name],input[name=accessKey]').count(),0);
    await form.locator('button[type=submit]').click();
    if(admin)await page.waitForURL(url=>url.pathname==='/admin/');
    else{await form.waitFor({state:'detached'});assert.equal(new URL(page.url()).pathname,'/');assert.equal(new URL(page.url()).searchParams.has('login'),false);}
    const lookup=calls.find(c=>c.p==='/auth/phone/lookup');assert.equal(lookup.body.phone,'09123456789');
    assert.equal(calls.filter(c=>c.p==='/auth/phone/verify').length,1);
    assert.deepEqual(errors,[]);
    console.log('PASS shared phone entry '+scenario+' in all four locales (mocked API)');
   }finally{await ctx.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
