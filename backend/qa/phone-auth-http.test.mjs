// Runs only in disposable PostgreSQL CI. The SMS adapter is mocked in-process.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomToken,sha256} from '../lib/security.mjs';
assert.equal(process.env.PHONE_AUTH_TEST_DATABASE,'isolated-ci');
assert.equal(new URL(process.env.DATABASE_URL).pathname,'/phone_auth_qa');
process.env.VERCEL='1';
process.env.NODE_ENV='test';
process.env.AUTO_TRANSLATE='false';
process.env.PHONE_AUTH_ENABLED='true';
process.env.PHONE_AUTH_SECRET=randomToken(32);
process.env.PHONE_AUTH_SMS_TOKEN=randomToken(32);
process.env.PHONE_AUTH_SMS_URL='https://sms-adapter.example.test/send';
process.env.PHONE_AUTH_LEGACY_PASSWORD='false';
const messages=[];
let rejectDelivery=false;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 assert.equal(url,process.env.PHONE_AUTH_SMS_URL);
 const body=JSON.parse(options.body);
 assert.match(body.code,/^\d{6}$/);
 if(rejectDelivery)return {ok:false};
 messages.push(body);
 return {ok:true};
};
const {default:app}=await import('../server.mjs');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const restaurant=(await pool.query("insert into restaurants(slug,name) values('phone-auth-qa','QA Restaurant') returning id")).rows[0].id;
function browser(){
 const jar=new Map();let csrf;
 async function call(method,path,body,withCsrf=true){
  const headers={cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')};
  if(withCsrf&&csrf)headers['x-csrf-token']=csrf;
  const r=await app.inject({method,url:'/api/v1'+path,headers,...(body===undefined?{}:{payload:body})});
  for(const value of [].concat(r.headers['set-cookie']||[])){const [pair]=value.split(';');const i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
  const payload=r.json();if(payload.data?.csrfToken)csrf=payload.data.csrfToken;
  return {status:r.statusCode,data:payload.data,error:payload.error,headers:r.headers};
 }
 return {call,get:path=>call('GET',path),post:(path,body)=>call('POST',path,body),async init(){await call('GET','/auth/csrf');}};
}
const route=(name)=>'/auth/phone/'+name;
const codeFor=phone=>messages.findLast(m=>m.phone===phone)?.code;
const invite=async phone=>{const key=randomToken(32);await pool.query("insert into phone_auth_invites(digest,phone,restaurant_id,expires_at) values($1,$2,$3,now()+interval '1 day')",[sha256(key),phone,restaurant]);return key;};
const account=async phone=>(await pool.query('select id,display_name from users where phone=$1',[phone])).rows[0];
test('Connected phone entry: OTP, invite and authorization boundaries',async()=>{
 try{
  const customer=browser(),phone='+989123450001';
  assert.equal((await customer.get(route('status'))).data.enabled,true);
  assert.equal((await customer.post(route('lookup'),{phone})).status,403);
  await customer.init();
  assert.deepEqual((await customer.post(route('lookup'),{phone})).data,{needsName:true});
  assert.equal((await customer.post(route('start'),{phone})).status,409);
  const start=await customer.post(route('start'),{phone,name:'Sample Customer'});assert.equal(start.status,200);
  assert.equal(Object.hasOwn(start.data,'code'),false);assert.equal(await account(phone),undefined);
  assert.equal((await customer.post(route('start'),{phone,name:'Sample Customer'})).status,429);
  const wrong=codeFor(phone)==='000000'?'000001':'000000';
  assert.equal((await customer.post(route('verify'),{challenge:start.data.challenge,code:wrong})).status,401);
  const verified=await customer.post(route('verify'),{challenge:start.data.challenge,code:codeFor(phone)});
  assert.equal(verified.status,200);assert.equal(verified.data.role,'customer');
  assert.ok([].concat(verified.headers['set-cookie']).some(v=>v.startsWith('romano_session=')&&/HttpOnly/i.test(v)));
  assert.equal((await customer.get('/auth/me')).data.membership,null);
  assert.equal((await customer.get('/admin/data')).status,403);
  assert.equal((await customer.post(route('verify'),{challenge:start.data.challenge,code:codeFor(phone)})).status,401);
  assert.equal((await customer.post('/auth/logout',{})).status,200);
  assert.equal((await customer.get('/auth/me')).data,null);
  // New browser, same verified number: no name and no new account.
  const returning=browser();await returning.init();
  assert.deepEqual((await returning.post(route('lookup'),{phone})).data,{needsName:false});
  await pool.query("update phone_auth_challenges set created_at=now()-interval '61 seconds' where phone=$1",[phone]);
  const login=await returning.post(route('start'),{phone});
  assert.equal(login.status,200);
  assert.equal((await returning.post(route('verify'),{challenge:login.data.challenge,code:codeFor(phone)})).data.user.id,verified.data.user.id);
  // Invitation is bound to the intended phone, consumed only after OTP.
  const admin=browser(),staffPhone='+989123450002',key=await invite(staffPhone);await admin.init();
  assert.equal((await admin.post(route('enroll-admin'),{phone:staffPhone,name:'No key'})).status,400);
  assert.equal((await admin.post(route('start'),{phone:staffPhone,name:'Wrong route',accessKey:key})).status,400);
  assert.equal((await admin.post(route('enroll-admin'),{phone:'+989123450003',name:'Wrong target',accessKey:key})).status,400);
  assert.equal((await admin.post(route('enroll-admin'),{phone,name:'Existing customer',accessKey:key})).status,400);
  const staff=await admin.post(route('enroll-admin'),{phone:staffPhone,name:'Sample Staff',accessKey:key});assert.equal(staff.status,200);
  assert.equal(await account(staffPhone),undefined);
  assert.equal((await pool.query('select consumed_at from phone_auth_invites where digest=$1',[sha256(key)])).rows[0].consumed_at,null);
  const authenticated=await admin.post(route('verify'),{challenge:staff.data.challenge,code:codeFor(staffPhone)});
  assert.equal(authenticated.status,200);assert.equal(authenticated.data.role,'admin');
  assert.equal((await admin.get('/auth/me')).data.membership.role,'manager');
  assert.equal((await admin.get('/admin/data')).status,200);
  assert.ok((await pool.query('select consumed_at from phone_auth_invites where digest=$1',[sha256(key)])).rows[0].consumed_at);
  assert.equal((await admin.post(route('verify'),{challenge:staff.data.challenge,code:codeFor(staffPhone)})).status,401);
  // Returning staff uses exactly the same login route as a customer, without a key.
  await pool.query("update phone_auth_challenges set created_at=now()-interval '61 seconds' where phone=$1",[staffPhone]);
  const staffLogin=browser();await staffLogin.init();
  assert.deepEqual((await staffLogin.post(route('lookup'),{phone:staffPhone})).data,{needsName:false});
  const staffAgain=await staffLogin.post(route('start'),{phone:staffPhone});assert.equal(staffAgain.status,200);
  const staffVerified=await staffLogin.post(route('verify'),{challenge:staffAgain.data.challenge,code:codeFor(staffPhone)});
  assert.equal(staffVerified.data.role,'admin');assert.equal(staffVerified.data.user.id,authenticated.data.user.id);
  // Failed delivery cannot create a user or return a challenge.
  const failed=browser();await failed.init();rejectDelivery=true;
  const failedPhone='+989123450004';
  assert.equal((await failed.post(route('start'),{phone:failedPhone,name:'Failed Delivery'})).status,503);
  assert.equal(await account(failedPhone),undefined);
  rejectDelivery=false;
  // Five incorrect guesses exhaust the challenge even with the right code afterward.
  const exhausted=browser();await exhausted.init();const exhaustedPhone='+989123450005';
  const attempt=await exhausted.post(route('start'),{phone:exhaustedPhone,name:'QA Attempts'});
  const otp=codeFor(exhaustedPhone),bad=otp==='111111'?'222222':'111111';
  for(let i=0;i<5;i++)assert.equal((await exhausted.post(route('verify'),{challenge:attempt.data.challenge,code:bad})).status,401);
  assert.equal((await exhausted.post(route('verify'),{challenge:attempt.data.challenge,code:otp})).status,401);
  assert.equal(await account(exhaustedPhone),undefined);
 }finally{globalThis.fetch=originalFetch;await app.close();await pool.end();}
});
