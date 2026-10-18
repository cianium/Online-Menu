import assert from "node:assert/strict";
const base = (process.env.ROMANO_ADMIN_TEST_URL || "https://tjrzeourqvahtocwnzwd.supabase.co/functions/v1/romano-admin").replace(/\/$/,"");
async function check(path,expected=200,options={}) {
 const r=await fetch(base+path,{signal:AbortSignal.timeout(15000),headers:{Accept:"application/json",...options.headers},method:options.method||"GET",body:options.body});
 const obj=await r.json();
 assert.equal(r.status,expected,`${path}: unexpected status ${r.status}: ${JSON.stringify(obj)}`);
 assert.ok("data" in obj && "error" in obj,"ROMANO envelope missing");
 return {r,obj};
}
const health=await check("/health");
assert.equal(health.obj.data?.status,"ok");
const anonymous=await check("/auth/me");
assert.equal(anonymous.obj.data,null);
const admin=await check("/admin/data",401);
assert.equal(admin.obj.error?.code,"UNAUTHENTICATED");
const csrf=await check("/auth/csrf");
assert.match(csrf.obj.data?.csrfToken,/^[a-zA-Z0-9_-]{32,64}$/);
assert.match(csrf.r.headers.get("set-cookie")||"",/romano_csrf=/);
const nonCsrf=await check("/auth/login",403,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"invalid@example.invalid",password:"not-the-password"})});
assert.equal(nonCsrf.obj.error?.code,"CSRF_INVALID");
const cookie="romano_csrf="+csrf.obj.data.csrfToken;
const badCredentials=await check("/auth/login",401,{method:"POST",headers:{"Content-Type":"application/json","Origin":"https://food.kiankhayat.me","Cookie":cookie,"X-CSRF-Token":csrf.obj.data.csrfToken},body:JSON.stringify({email:"invalid@example.invalid",password:"not-the-password"})});
assert.equal(badCredentials.obj.error?.code,"INVALID_CREDENTIALS");
const crossOrigin=await check("/auth/logout",403,{method:"POST",headers:{"Origin":"https://attacker.invalid","Cookie":cookie,"X-CSRF-Token":csrf.obj.data.csrfToken}});
assert.equal(crossOrigin.obj.error?.code,"CSRF_INVALID");
const noWrite=await check("/admin/snapshot",403,{method:"PUT",headers:{"Content-Type":"application/json"},body:"{}"});
assert.equal(noWrite.obj.error?.code,"CSRF_INVALID");
console.log("ROMANO Admin auth smoke passed: anonymous denied; cookie, CSRF and credentials enforced.");
