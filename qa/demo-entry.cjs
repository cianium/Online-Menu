const assert=require('node:assert/strict');
async function completeDemoEntry(entry,phone,name,{expectName=true}={}){
 const submit=entry.locator('button[type=submit]');
 await entry.locator('input[name=phone]').fill(phone);await submit.click();
 if(expectName){await entry.locator('input[name=name]').fill(name);await submit.click();}
 const code=entry.locator('input[name=code]');await code.waitFor({state:'visible'});
 assert.equal(await entry.locator('input[name=name]').count(),0);
 await code.fill('123456');await submit.click();await entry.waitFor({state:'hidden'});
}
module.exports={completeDemoEntry};
