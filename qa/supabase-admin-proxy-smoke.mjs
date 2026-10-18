import assert from "node:assert/strict";

const direct = "https://tjrzeourqvahtocwnzwd.supabase.co/functions/v1/romano-admin";
const production = "https://food.kiankhayat.me/api/v1";
const base = (process.env.ROMANO_ADMIN_TEST_BASE || production).replace(/\/$/, "");
const headers = { Accept: "application/json" };
async function call(path, expected, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(20000),
    redirect: "manual"
  });
  const type = response.headers.get("content-type") || "";
  assert.match(type, /application\/json/i, `${path}: expected JSON but got ${type}`);
  const body = await response.json();
  assert.equal(response.status, expected, `${path}: HTTP ${response.status}; ${JSON.stringify(body)}`);
  assert.ok("data" in body && "error" in body, `${path}: invalid API envelope`);
  return { body, response };
}

if (base === direct) {
  const health = await call("/health", 200);
  assert.equal(health.body.data?.status, "ok");
}
const me = await call("/auth/me", 200);
assert.equal(me.body.data, null, "Anonymous browser received an authenticated session");
const admin = await call("/admin/data", 401);
assert.equal(admin.body.error?.code, "UNAUTHENTICATED");
const csrf = await call("/auth/csrf", 200);
const token = csrf.body.data?.csrfToken;
assert.match(token, /^[a-zA-Z0-9_-]{32,64}$/);
const cookie = csrf.response.headers.get("set-cookie") || "";
assert.match(cookie, /romano_csrf=/);
assert.match(cookie, /Path=\/api\/v1/i);
assert.match(cookie, /Secure/i);
assert.match(cookie, /SameSite=Lax/i);
const browser = {
  Origin: "https://food.kiankhayat.me",
  Cookie: `romano_csrf=${token}`,
  "X-CSRF-Token": token,
  "Content-Type": "application/json"
};
const bad = await call("/auth/login", 401, {
  method: "POST", headers: browser,
  body: JSON.stringify({email:`romano-proxy-invalid-${Date.now()}@example.invalid`,password:"wrong-pass-123"})
});
assert.equal(bad.body.error?.code, "INVALID_CREDENTIALS");
const attack = await call("/auth/logout", 403, {
  method: "POST", headers: {...browser, Origin:"https://foreign.invalid"}, body: "{}"
});
assert.equal(attack.body.error?.code, "CSRF_INVALID");
const unauthorizedSave = await call("/admin/snapshot", 401, {
  method: "PUT", headers: browser,
  body: JSON.stringify({mode:"merge",categories:[],products:[]})
});
assert.equal(unauthorizedSave.body.error?.code, "UNAUTHENTICATED");
console.log(`ROMANO admin proxy smoke PASS: ${base} (anonymous access and CSRF protected)`);
