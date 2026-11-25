import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requireLiveUrl } from '../../qa/live-targets.mjs';
const read = path => readFileSync(new URL('../../'+path,import.meta.url),'utf8');

test('Live QA requires explicit HTTPS configuration and never falls back to retired targets',()=>{
  const url = (value,originOnly=false)=>requireLiveUrl('TARGET',{env:{TARGET:value},originOnly});
  for(const value of [undefined,'',' ','http://example.test','https://user:pass@example.test','https://example.test/?token=x','https://example.test/#secret','not a URL']) assert.throws(()=>url(value),/TARGET must be/);
  assert.equal(url('https://example.test/functions/v1/'),'https://example.test/functions/v1');
  assert.equal(url('https://example.test/',true),'https://example.test');
  assert.throws(()=>url('https://example.test/path',true),/origin/);
});

test('Connected smoke workflows are opt-in while explicit dispatch remains strict',()=>{
  for(const name of ['supabase-smoke','vercel-proxy-smoke','romano-admin-proxy','supabase-admin','commerce-live']) {
    const workflow=read('.github/workflows/'+name+'.yml');
    assert.ok(workflow.includes("if: github.event_name == 'workflow_dispatch' || vars.ROMANO_LIVE_QA == 'true'"),name);
    assert.match(workflow,/workflow_dispatch:/);
    assert.doesNotMatch(workflow,/continue-on-error|tjrzeourqvahtocwnzwd|food\.kiankhayat\.me/);
  }
  for(const name of ['supabase-smoke','vercel-proxy-smoke','supabase-admin-proxy-smoke','supabase-admin-smoke','commerce-live-smoke']) {
    const script=read('qa/'+name+'.mjs');
    assert.match(script,/requireLiveUrl/);
    assert.doesNotMatch(script,/tjrzeourqvahtocwnzwd|food\.kiankhayat\.me/);
  }
  assert.match(read('.github/workflows/supabase-admin.yml'),/Type-check admin Edge Function/);
});
