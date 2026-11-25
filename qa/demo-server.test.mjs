import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';

function call(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, ...options }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(3000, () => req.destroy(new Error('Demo request timed out')));
    req.on('error', reject);
    req.end();
  });
}

test('Standalone demo: serves public files and never exposes or proxies backend', { timeout: 15000 }, async t => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('./demo-server.mjs', import.meta.url))], {
    env: { ...process.env, DEMO_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  const exit = once(child, 'exit');
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill(); await exit; });
  const port = await new Promise((resolve, reject) => {
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk;
      const match = stdout.match(/Demo \(local only\): http:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) resolve(Number(match[1]));
    });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`Demo server exited (${code}): ${stderr}`)));
  });
  await t.test('customer, admin, static assets, HEAD and redirect', async () => {
    for (const path of ['/', '/admin/', '/index.html', '/admin/index.html']) {
      const res = await call(port, path);
      assert.equal(res.status, 200, path);
      assert.match(res.headers['content-type'], /^text\/html/);
      assert.match(res.body.toString(), /<html\b/i);
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'DENY');
      assert.equal(res.headers['cross-origin-resource-policy'], 'same-origin');
      assert.equal(res.headers['referrer-policy'], 'no-referrer');
    }
    const js = await call(port, '/js/app.js');
    assert.equal(js.status, 200); assert.match(js.headers['content-type'], /^text\/javascript/);
    assert.equal((await call(port, '/admin')).headers.location, '/admin/');
    const head = await call(port, '/', {method: 'HEAD'});
    assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.ok(Number(head.headers['content-length']) > 0);
  });
  await t.test('API, secrets, metadata, directories and traversal fail closed', async () => {
    for (const path of ['/api/v1/auth/me', '/api/v1/public/restaurants/romano/menu', '/api/v1/orders', '/backend/.env', '/backend/server.mjs', '/supabase/config.toml', '/.git/config', '/package.json', '/assets/', '/admin/%2e%2e/backend/server.mjs', '/admin/../index.html', '/admin/%2e%2e%2fpackage.json', '/admin/.secret.json']) {
      assert.equal((await call(port, path)).status, 404, path);
    }
    for (const path of ['/admin/%00.js', '/admin/%5cfoo.js', '/admin/%zz.js']) assert.equal((await call(port, path)).status, 400, path);
    assert.equal((await call(port, '/api/v1/orders', {method: 'POST'})).status, 405);
    assert.equal((await call(port, '/', {headers: {Host: 'untrusted.example'}})).status, 421);
  });
});
