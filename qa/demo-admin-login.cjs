const assert=require('node:assert/strict');
async function loginDemoAdmin(page){
 await page.waitForFunction(()=>document.querySelector('#admin-gate').classList.contains('is-open') || (typeof adminInitialized!=='undefined'&&adminInitialized&&!document.querySelector('.admin-app').inert));
 if(await page.locator('#admin-gate').isVisible()){
   await page.locator('#admin-gate-email').fill('demo-admin');
   await page.locator('#admin-gate-password').fill('Demo-Only-2026');
   await page.locator('#admin-gate-submit').click();
 }
 await page.waitForFunction(()=>typeof adminInitialized!=='undefined'&&adminInitialized&&!document.querySelector('.admin-app').inert);
 assert.equal(await page.locator('#admin-gate').isVisible(),false);
}
module.exports={loginDemoAdmin};