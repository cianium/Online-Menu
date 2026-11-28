const assert=require('node:assert/strict');
async function loginDemoAdmin(page){
 await page.waitForFunction(()=>document.querySelector('#admin-gate')?.classList.contains('is-open') || document.querySelector('#phone-auth-entry')?.open || (typeof adminInitialized!=='undefined'&&adminInitialized&&!document.querySelector('.admin-app').inert));
 const shared=page.locator('#phone-auth-entry');
 if(await shared.isVisible()){
   await shared.locator('input[name=phone]').fill('+12025550199');
   await shared.locator('button[type=submit]').click();
   await shared.locator('input[name=name],input[name=code]').waitFor({state:'visible'});
   if(await shared.locator('input[name=name]').isVisible()){
     await shared.locator('[data-phone-auth-text=admin]').click();
     await shared.locator('input[name=name]').fill('Synthetic QA manager');
     await shared.locator('input[name=accessKey]').fill('RAMEN-DEMO-ACCESS');
     await shared.locator('button[type=submit]').click();
   }
   await shared.locator('input[name=code]').fill('123456');
   await shared.locator('button[type=submit]').click();
   await page.waitForURL(url=>url.pathname.endsWith('/admin/'));
 }
 if(await page.locator('#admin-gate').isVisible()){
   await page.locator('#admin-gate-email').fill('demo-admin');
   await page.locator('#admin-gate-password').fill('Demo-Only-2026');
   await page.locator('#admin-gate-submit').click();
 }
 await page.waitForFunction(()=>typeof adminInitialized!=='undefined'&&adminInitialized&&!document.querySelector('.admin-app').inert);
 assert.equal(await page.locator('#admin-gate').isVisible(),false);
}
module.exports={loginDemoAdmin};