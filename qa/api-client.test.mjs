import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the actual browser adapters without requiring a browser, database or live API.
const source = Object.fromEntries(['js/public-api.js', 'admin/api.js'].map(file =>
  [file, readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')]));
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: {'content-type':'application/json'} });
const text = status => new Response('not JSON', {status, headers: {'content-type':'text/plain'}});
function harness(file, responses, {search='', slug='', protocol='http:', standalone=false}={}) {
  const calls=[];
  const location={protocol,search};
  const window={location};
  const fetch=async (url, options={})=>{
    calls.push({url,options});
    assert.ok(responses.length, `Unexpected request: ${url}`);
    const next=responses.shift();
    if(next instanceof Error) throw next;
    return next;
  };
  const document={body:{dataset:{restaurantSlug:slug}},querySelector:()=>standalone?{content:'standalone'}:null};
  runInNewContext(source[file], {window, location, document, fetch, URLSearchParams, AbortController, AbortSignal, Headers, setTimeout, clearTimeout}, {filename:file});
  return {api:window.RomanoPublicAPI ?? window.RomanoAPI,calls};
}
const publicClient = (responses,options)=>harness('js/public-api.js',responses,options);
const adminClient = (responses,options)=>harness('admin/api.js',responses,options);

test('Standalone documents use sample data without contacting same-origin APIs',async()=>{
  const {api,calls}=publicClient([],{standalone:true});
  assert.equal(api.enabled,false);
  assert.equal(await api.load('romano','fa'),null);
  assert.deepEqual(calls,[]);
  const explicit=publicClient([],{standalone:true,search:'?restaurant=other'});
  await assert.rejects(explicit.api.load('other','en'),{status:404});
  assert.deepEqual(explicit.calls,[]);
  const admin=adminClient([],{standalone:true});
  assert.equal((await admin.api.detect()).available,false);
  await assert.rejects(admin.api.login('sample','sample'),/not available/);
  await assert.rejects(admin.api.saveSnapshot({}),/not available/);
  assert.deepEqual(admin.calls,[]);
});

test('Public: static host and undeployed API return bundled-demo signal only on default HTTP route',async()=>{
  for(const response of [text(404),json(404,{error:{}})]) {
    const {api,calls}=publicClient([response]);
    assert.equal(await api.load('romano','fa'),null);
    assert.equal(calls.length,1);
  }
});
test('Public: explicit restaurant query or HTML slug never falls back on HTTP 404',async()=>{
  for(const options of [{search:'?restaurant=missing'},{slug:'missing'},{search:'?restaurant='}]) {
    for(const response of [text(404),json(404,{error:{}})]) {
      const {api}=publicClient([response],options);
      await assert.rejects(api.load('missing','ar'),{status:404});
    }
  }
});
test('Public: 503, network error and malformed success reject rather than signal demo',async()=>{
  for(const response of [json(503,{error:{}}),new Error('offline'),text(200),json(200,{})]) {
    const {api}=publicClient([response]);
    await assert.rejects(api.load('romano','en'));
  }
});
test('Public: empty remote catalog remains empty; request parameters are encoded',async()=>{
  const data={categories:[],products:[]};
  const {api,calls}=publicClient([json(200,{data})]);
  assert.deepEqual(await api.load('a/b?x','tr&bad'),data);
  assert.equal(calls[0].url,'/api/v1/public/restaurants/a%2Fb%3Fx/menu?lang=tr%26bad');
  assert.equal(calls[0].options.credentials,'same-origin');
});
test('Admin: static/404 mode denies remote writes without sending another request',async()=>{
  for(const response of [text(404),json(404,{error:{}})]) {
    const {api,calls}=adminClient([response]);
    const result=await api.detect();
    assert.equal(result.available,false); assert.equal(result.session,null); assert.equal(api.enabled,false);
    await assert.rejects(api.saveSnapshot({}),/not available/);
    assert.equal(calls.length,1);
  }
});
test('Admin: unauthorized session remains remote and requires login',async()=>{
  const {api}=adminClient([json(401,{error:{}})]);
  const result=await api.detect();
  assert.equal(result.available,true);assert.equal(result.session,null);assert.equal(api.enabled,true);
});
test('Admin: 503/network/malformed response rejects rather than enabling local demo',async()=>{
  for(const response of [json(503,{error:{}}),new Error('offline'),text(200),json(200,{})]) {
    const {api}=adminClient([response]);
    await assert.rejects(api.detect());assert.equal(api.enabled,true);
  }
});
test('Admin: login adopts rotated CSRF; authenticated writes include it and use cookies',async()=>{
  const {api,calls}=adminClient([json(200,{data:{csrfToken:'before'}}),json(200,{data:{csrfToken:'after'}}),json(200,{data:{ok:true}})]);
  await api.login('test@example.invalid','not-a-real-password');
  assert.deepEqual(await api.saveSnapshot({products:[]}),{ok:true});
  assert.equal(calls[1].options.headers.get('X-CSRF-Token'),'before');
  assert.equal(calls[2].options.headers.get('X-CSRF-Token'),'after');
  assert.equal(calls[2].options.credentials,'include');
});
test('Admin: CSRF refresh retries exactly once, including a repeated 403',async()=>{
  const invalid=()=>json(403,{error:{code:'CSRF_INVALID'}});
  const {api,calls}=adminClient([json(200,{data:{csrfToken:'first'}}),invalid(),json(200,{data:{csrfToken:'second'}}),invalid()]);
  await assert.rejects(api.saveSnapshot({}),{status:403,code:'CSRF_INVALID'});
  assert.equal(calls.length,4);
  assert.equal(calls[1].options.headers.get('X-CSRF-Token'),'first');
  assert.equal(calls[3].options.headers.get('X-CSRF-Token'),'second');
});
test('Admin: order and branch identifiers are escaped in request paths',async()=>{
  const {api,calls}=adminClient([json(200,{data:{csrfToken:'token'}}),json(200,{data:{}}),json(200,{data:{}})]);
  await api.transitionOrder('a/b?',2,'completed');await api.tables('b/r?');
  assert.equal(calls[1].url,'/api/v1/admin/orders/a%2Fb%3F/transition');
  assert.equal(calls[2].url,'/api/v1/admin/branches/b%2Fr%3F/tables');
});

test('Admin: demo mode refuses explicit login and CSRF requests without fetching',async()=>{
  const {api,calls}=adminClient([text(404)]);
  await api.detect();
  await assert.rejects(api.login('test@example.invalid','test'),/not available/);
  await assert.rejects(api.csrf(),/not available/);
  assert.equal(calls.length,1);
});
test('Admin: detecting a 401 after demo detection re-enables the remote adapter',async()=>{
  const {api}=adminClient([text(404),json(401,{error:{}}),json(200,{data:null})]);
  await api.detect();
  const result=await api.detect();
  assert.equal(result.available,true);
  assert.equal(api.enabled,true);
  assert.equal(await api.me(),null);
});
test('Admin: successful HTTP responses without a valid data envelope reject',async()=>{
  for(const response of [text(200),json(200,{}),json(200,[]),json(200,'unexpected')]) {
    const {api}=adminClient([response]);
    await assert.rejects(api.adminData(),/Invalid API response/);
  }
});
test('Public: explicit restaurant must not fall back to demo on file protocol',async()=>{
  const {api,calls}=publicClient([],{search:'?restaurant=other',protocol:'file:'});
  await assert.rejects(api.load('other','en'),{status:404});
  assert.equal(calls.length,0);
  const demo=publicClient([],{protocol:'file:'});
  assert.equal(await demo.api.load('romano','en'),null);
});

test('Admin: no dashboard branch-creation method; existing restaurant and table operations remain',async()=>{
  const {api,calls}=adminClient([json(200,{data:{branches:[]}}),json(200,{data:{tables:[]}})]);
  assert.equal(typeof api.createBranch,'undefined');
  await api.branches();await api.tables('existing');
  assert.deepEqual(calls.map(x=>[x.url,x.options.method||'GET']),[['/api/v1/admin/branches','GET'],['/api/v1/admin/branches/existing/tables','GET']]);
  assert.equal(typeof api.createTable,'function');
  assert.equal(typeof api.branchSettings,'function');
  assert.equal(typeof api.saveGateway,'function');
});
