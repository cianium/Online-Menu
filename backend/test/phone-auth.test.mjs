import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone,normalizeName,otpDigest,phoneAuthConfig,sendPhoneOtp,registerPhoneAuth} from '../lib/phone-auth.mjs';
test('Phone identity canonicalizes Persian, Arabic and international digits',()=>{
 assert.equal(normalizePhone('۰۹۱۲۳۴۵۶۷۸۹'),'+989123456789');
 assert.equal(normalizePhone('٠٠٩٨٩١٢٣٤٥٦٧٨٩'),'+989123456789');
 assert.equal(normalizePhone('+90 (555) 123-4567'),'+905551234567');
 for(const value of ['123','+012345678','+98abc','+989123456789#','',null])assert.equal(normalizePhone(value),null);
 assert.equal(normalizeName('  علی رضایی  '),'علی رضایی');assert.equal(normalizeName('a\u0000b'),null);
});
test('OTP hash binds code, phone and unique challenge and requires server secret',()=>{
 const hash=otpDigest('sample-test-secret','a','+989123456789','000001');
 assert.equal(hash.length,64);
 for(const args of [['sample-test-secret','b','+989123456789','000001'],['sample-test-secret','a','+989123456780','000001'],['sample-test-secret','a','+989123456789','000002'],['another-test-secret','a','+989123456789','000001']])assert.notEqual(hash,otpDigest(...args));
});
test('Phone auth disabled by default; incomplete or insecure provider config fails closed',()=>{
 assert.deepEqual(phoneAuthConfig({}),{enabled:false});assert.throws(()=>phoneAuthConfig({PHONE_AUTH_ENABLED:'true'}));
 const env={PHONE_AUTH_ENABLED:'true',PHONE_AUTH_SECRET:'x'.repeat(32),PHONE_AUTH_SMS_TOKEN:'x'.repeat(16),PHONE_AUTH_SMS_URL:'https://example.test/sms'};
 assert.equal(phoneAuthConfig(env).enabled,true);assert.equal(phoneAuthConfig(env).allowLegacyPassword,false);
 for(const url of ['http://example.test','https://user:pass@example.test','https://example.test/?token=x'])assert.throws(()=>phoneAuthConfig({...env,PHONE_AUTH_SMS_URL:url}));
});
test('SMS delivery uses explicit HTTPS adapter and fails on rejection',async()=>{
 let sent;const cfg={url:'https://example.test/sms',token:'test-only'};
 await sendPhoneOtp(cfg,'+989123456789','123456',async(url,options)=>{sent={url,options};return {ok:true};});
 assert.equal(sent.url,cfg.url);assert.equal(sent.options.redirect,'error');assert.equal(sent.options.headers.Authorization,'Bearer test-only');assert.deepEqual(JSON.parse(sent.options.body),{phone:'+989123456789',code:'123456',purpose:'login',expiresIn:300});
 await assert.rejects(sendPhoneOtp(cfg,'+989123456789','123456',async()=>({ok:false})));
});
test('Disabled phone routes do not call database, provider or issue a session',async()=>{
 const routes=new Map(),api={get:(path,handler)=>routes.set(path,handler),post:(path,opts,handler)=>routes.set(path,handler)};
 const forbidden=()=>{throw Error('unexpected external action');};
 registerPhoneAuth(api,{config:{enabled:false},db:forbidden,transaction:forbidden,issueSession:forbidden,deliver:forbidden});
 assert.deepEqual(await routes.get('/auth/phone/status')(),{data:{enabled:false},error:null});
 for(const path of ['lookup','start','verify'])await assert.rejects(routes.get('/auth/phone/'+path)({}),e=>e.apiCode==='PHONE_AUTH_UNAVAILABLE');
});
