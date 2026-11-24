import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const failures = [];
const warnings = [];
const required = [
  "index.html", "js/app.js", "js/i18n.js", "js/money.js", "js/data.js", "js/commerce.js", "css/commerce.css",
  "css/style.css", "css/romano.css", "manifest.webmanifest", "sw.js",
  "admin/index.html", "admin/api.js", "admin/admin.js", "admin/admin-i18n.js", "admin/rv4-admin-plus.js",
  "admin/admin.css", "admin/admin-polish.css", "admin/rv4-admin-plus.css", "admin/orders.js", "admin/orders.css", "admin/vendor/qrcode.min.js", "admin/vendor/QRCODE_LICENSE.txt"
];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function check(condition, message) { if (!condition) failures.push(message); }

for (const rel of required) check(exists(rel), `Missing required file: ${rel}`);

for (const htmlRel of ["index.html", "admin/index.html"]) {
  if (!exists(htmlRel)) continue;
  const html = read(htmlRel);
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  check(dupes.length === 0, `${htmlRel}: duplicate IDs: ${[...new Set(dupes)].join(", ")}`);

  const baseDir = path.dirname(path.join(ROOT, htmlRel));
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    const ref = match[1].trim();
    if (!ref || /^(?:https?:|data:|mailto:|tel:|#|javascript:)/i.test(ref)) continue;
    const clean = ref.split("#")[0].split("?")[0];
    const target = path.resolve(baseDir, clean);
    if (!target.startsWith(ROOT)) continue;
    check(fs.existsSync(target), `${htmlRel}: missing local reference ${ref}`);
  }
}

const adminI18n = exists("admin/admin-i18n.js") ? read("admin/admin-i18n.js") : "";
check((adminI18n.match(/"بستن منو"\s*:/g) || []).length === 1, "Admin i18n: duplicate Close menu key.");
check((adminI18n.match(/"دسترسی سریع"\s*:/g) || []).length === 1, "Admin i18n: duplicate Quick access key.");
check((adminI18n.match(/"نام \(الفبا\)"\s*:/g) || []).length === 1, "Admin i18n: duplicate Name sort key.");
for (const lang of ["fa", "en", "tr", "ar"]) check(adminI18n.includes(lang), `Admin i18n does not declare ${lang}.`);
check(read("js/i18n.js").includes('const LANGUAGES = ["fa", "en", "tr", "ar"]'), "Customer i18n language set is incomplete.");
check(read("index.html").indexOf('js/money.js') < read("index.html").indexOf('js/app.js'), "Money formatter must load before customer app code.");
check(read("admin/index.html").includes('../js/money.js'), "Admin does not load the shared money formatter.");
check(read("admin/index.html").includes("admin-language-toggle"), "Admin language toggle is missing.");
check(read("admin/index.html").indexOf('href="admin-polish.css"') > read("admin/index.html").indexOf('href="orders.css"'), "Admin visual polish stylesheet must load after the existing admin styles.");
const adminPolish = read("admin/admin-polish.css");
check(adminPolish.includes('html[dir="rtl"] .nav-item.is-active') && adminPolish.includes('html[dir="ltr"] .nav-item:hover'), "Admin visual polish must include explicit RTL and LTR navigation handling.");
check(adminPolish.includes("@media (max-width: 760px)") && adminPolish.includes("@media (max-width: 420px)"), "Admin visual polish is missing mobile breakpoints.");
check(/\.toolbar\s*>\s*:not\(\.sr-only\)/.test(adminPolish) && !/\.toolbar\s*>\s*\*/.test(adminPolish), "Mobile toolbar sizing must not widen visually hidden accessibility labels.");
check(adminPolish.includes("@media (prefers-reduced-motion: reduce)"), "Admin visual polish must respect reduced-motion preferences.");
check(/\.icon-button\s*\{[^}]*min-width:\s*40px;[^}]*min-height:\s*40px;/s.test(adminPolish), "Admin visual polish must preserve the existing 40px icon-action target size.");
check(/\.admin-category-actions \.icon-button\s*\{[^}]*min-width:\s*40px;[^}]*min-height:\s*40px;/s.test(adminPolish), "Admin category actions must preserve 40px touch targets.");

check(!read("admin/index.html").includes("نسخه vq.3") && !read("admin/index.html").includes("ONLINE-MENU vq.3"), "Internal release labels must not be visible in the admin UI.");
check(!read("admin/index.html").includes("Cian Khayat") && !read("index.html").includes("Designed by Cian Khayat"), "Developer credits must not appear in customer-facing interfaces.");
check(!/const Storage\s*=/.test(read("admin/admin.js")), "Admin custom storage object still shadows the browser Storage type.");
check(read("admin/admin.js").includes('const instagram ='), "Admin settings Instagram field is not declared.");
check(!/handleProductSubmit[\s\S]{0,500}const instagram\s*=/.test(read("admin/admin.js")), "Instagram validation leaked into the product-submit handler.");
check(read("js/app.js").includes("getSafeExternalUrl"), "Customer external URL sanitizer is missing.");
check(read("admin/rv4-admin-plus.js").includes('payload.schema !== "romano.menu-backup"'), "Backup restore is not strict-schema validated.");
check(read("manifest.webmanifest").includes('"display": "standalone"'), "PWA manifest is incomplete.");
check(read("manifest.webmanifest").includes('"short_name": "RAMEN"'), "PWA still uses legacy brand.");
check(read("admin/index.html").includes("<title>RAMEN | پنل مدیریت</title>"), "Admin HTML title must use the localized default.");
check(!/>\s*(?:OVERVIEW|RAMEN · CONTROL CENTER|MENU HEALTH|MENU MANAGEMENT|MENU STRUCTURE|RESTAURANT CONFIGURATION|SECURE SERVER AUTHENTICATION|RAMEN DIGITAL MENU|AUTHORIZED USERS ONLY)\s*</.test(read("admin/index.html")), "Admin HTML still contains untranslated English section labels.");
check(!/>\s*(?:Badge|بدون Badge|رستوران CONFIGURATION|Merchant ID)\s*</.test(read("admin/index.html")), "Admin HTML still contains mixed-language field labels.");
check(read("index.html").includes("منوی دیجیتال RAMEN") && read("js/i18n.js").includes('"منوی دیجیتال RAMEN"'), "Customer navigation footer brand is not localized.");
check(!read("js/i18n.js").includes("Designed by Cian Khayat"), "Obsolete developer credit remains in customer localization.");
check(read("js/menu-experience.js").includes('<span class="section-eyebrow">RAMEN</span>'), "Customer menu still shows legacy platform heading.");
check(read("sw.js").includes('url.pathname.includes("/admin/")'), "Service worker does not explicitly exclude admin.");

const syntaxTargets = ["js/app.js", "js/menu-experience.js", "js/commerce.js", "js/i18n.js", "js/money.js", "admin/admin.js", "admin/admin-i18n.js", "admin/rv4-admin-plus.js", "admin/workspace.js", "admin/orders.js", "admin/vendor/qrcode.min.js", "sw.js", "qa/static-audit.mjs", "admin/api.js", "js/public-api.js", "backend/server.mjs", "backend/seed.mjs", "backend/migrate.mjs", "supabase/functions/romano-public/index.ts", "supabase/functions/romano-admin/index.ts", "supabase/functions/romano-order/core.ts", "supabase/functions/romano-order/index.ts", "supabase/functions/romano-payment/index.ts"];
for (const rel of syntaxTargets) {
  const r = spawnSync(process.execPath, rel.endsWith(".ts") ? ["--experimental-strip-types", "--check", path.join(ROOT, rel)] : ["--check", path.join(ROOT, rel)], { encoding: "utf8" });
  if (r.status !== 0) failures.push(`Syntax error in ${rel}: ${r.stderr.trim()}`);
}

const auth = read("admin/admin.js");
check(!auth.includes("YOUR_GOOGLE_CLIENT_ID"), "Admin still contains a placeholder Google client ID.");
check(!auth.includes("ADMIN_ACCESS.storageKey"), "Admin still contains a localStorage authentication gate.");
check(exists("backend/server.mjs") && exists("backend/migrations/001_init.sql"), "Server-side backend or SQL migrations are missing.");

// --- regression guards for issues found in the 4.6.1 review ---
const serverSource = read("backend/server.mjs");
check(!/fastifyStatic,\s*\{\s*root\s*,/.test(serverSource), "Backend must never serve the whole project root as static files.");
check(!/trustProxy:\s*true/.test(serverSource), "trustProxy must be configurable, not hard-coded to true.");
check(!/contentSecurityPolicy:\s*false/.test(serverSource), "Content-Security-Policy must not be disabled.");
const vercel = JSON.parse(read("vercel.json"));
const deployedHeaders = new Map((vercel.headers?.flatMap(rule => rule.headers || []) || []).map(header => [header.key.toLowerCase(), header.value]));
for (const header of ["content-security-policy", "permissions-policy", "referrer-policy", "strict-transport-security", "x-content-type-options", "x-frame-options"]) {
  check(deployedHeaders.has(header), `Vercel security header is missing: ${header}.`);
}
const csp = deployedHeaders.get("content-security-policy") || "";
for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "script-src 'self'"]) {
  check(csp.includes(directive), `Vercel CSP is missing: ${directive}.`);
}
for (const htmlRel of ["index.html", "admin/index.html"]) {
  const html = read(htmlRel);
  check(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), `${htmlRel}: inline <script> is incompatible with the CSP.`);
  check(!/\son[a-z]+\s*=\s*["']/i.test(html), `${htmlRel}: inline event handlers are incompatible with the CSP.`);
}
// Automatic translation: wired into the server, and the API key can never reach a browser file.
check(/createAutoTranslation/.test(serverSource) && /autoTranslate\.enqueue|jobs\.flush/.test(serverSource), "Automatic translation is not wired into the server routes.");
for (const rel of ["index.html", "admin/index.html", "js/app.js", "js/i18n.js", "js/public-api.js", "admin/admin.js", "admin/api.js", "admin/admin-i18n.js", "admin/rv4-admin-plus.js", "admin/workspace.js", "sw.js"]) {
  check(!/ANTHROPIC_API_KEY|sk-ant-|api\.anthropic\.com/i.test(read(rel)), `${rel}: translation credentials/endpoints must stay on the server.`);
}
check(exists("backend/migrations/003_translation_origin.sql") && exists("backend/migrations/004_restaurant_source_hash.sql"), "Translation migrations are missing.");
check(!read("backend/seed.mjs").includes("change-this-password"), "seed.mjs must not ship a default admin password.");
for (const icon of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) check(exists(`assets/icons/${icon}`), `Missing PWA icon: ${icon}`);

// Every seed product/category must be translated into en/tr/ar (the bug class reported in 4.6.1).
{
  const vm = await import("node:vm");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${read("js/data.js")}\nthis.__s={categories,products};`, sandbox);
  const i18n = read("js/i18n.js");
  const grab = name => { const m = new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n    \\});`).exec(i18n); return m ? vm.runInContext(`(${m[1]})`, vm.createContext({})) : null; };
  const productText = grab("products"), categoryText = grab("categoryText"), badgeText = grab("badgeText");
  check(productText && categoryText && badgeText, "Could not parse translation dictionaries in js/i18n.js.");
  for (const lang of ["en", "tr", "ar"]) {
    for (const c of sandbox.__s.categories) check(categoryText?.[c.id]?.[lang], `Category "${c.id}" has no ${lang} translation.`);
    for (const p of sandbox.__s.products) {
      check(productText?.[p.id]?.name?.[lang] && productText?.[p.id]?.description?.[lang], `Product "${p.id}" is missing ${lang} name/description.`);
      if (p.badge) check(productText?.[p.id]?.badge?.[lang] || badgeText?.[p.badge]?.[lang], `Product "${p.id}" badge "${p.badge}" has no ${lang} translation.`);
    }
  }
}
check(read("admin/api.js").includes("HttpOnly") || read("backend/server.mjs").includes("romano_session"), "Production auth adapter is missing session integration.");
check(exists("supabase/functions/romano-public/index.ts"), "The deployed public Supabase function is not versioned.");
check(read("supabase/functions/romano-public/index.ts").includes("@supabase/supabase-js@2.118.0"), "Public Supabase function dependency is not pinned.");
check(read("supabase/functions/romano-admin/index.ts").includes("@supabase/supabase-js@2.118.0"), "Admin Supabase function dependency is not pinned.");
const adminFunction = read("supabase/functions/romano-admin/index.ts");
const logoutRoute = adminFunction.indexOf('if (path === "/auth/logout" && req.method === "POST")');
const sessionResolution = adminFunction.indexOf("const p = await session(req,jar,newCookies);");
check(/auth\.admin\.signOut\(accessToken,"local"\)/.test(adminFunction), "Admin logout must revoke the active JWT with local scope before refreshing.");
check(logoutRoute >= 0 && logoutRoute < sessionResolution, "Admin logout must revoke its own session before ordinary session refresh.");
check(/auth\.setSession\(\{[\s\S]{0,1000}auth\.signOut\(\{scope:\s*"local"\}\)/.test(adminFunction), "Admin logout must revoke the current Supabase refresh session with local scope.");
check(!/auth\.signOut\(\s*\)/.test(adminFunction) && !/auth\.signOut\(\{scope:\s*"global"\}\)/.test(adminFunction), "Admin logout must never revoke all user devices implicitly.");
check(exists("qa/sql/tenant-isolation-smoke.sql") && read("qa/commerce-db.test.sh").includes("/qa/tenant-isolation-smoke.sql"), "Tenant isolation PostgreSQL regression test is not wired into QA.");
check(exists("SECURITY-OPERATIONS.md"), "Security and backup/restore operations runbook is missing.");
check(read("qa/sql/tenant-isolation-smoke.sql").includes("tenant-scoped audit event") && read("qa/sql/tenant-isolation-smoke.sql").includes("missing row-level security"), "Tenant audit and RLS privilege regression checks are missing.");
check(exists("supabase/config.toml") && read("supabase/config.toml").includes("[functions.romano-order]"), "Public order function config is missing.");
check(vercel.rewrites?.some(rule => rule.source === "/api/v1/orders/:path*" && rule.destination.includes("/romano-order/")), "Vercel order API rewrite is missing.");
check(read("supabase/functions/romano-order/index.ts").includes("HttpOnly; Secure; SameSite=Lax"), "Order session cookie is not hardened.");
check(vercel.rewrites?.some(rule => rule.source === "/api/v1/payments/:path*" && rule.destination.includes("/romano-payment/")), "Vercel payment API rewrite is missing.");
check(read("supabase/functions/romano-payment/index.ts").includes("/pg/v4/payment/verify.json"), "ZarinPal server-side verification is missing.");
check(read("admin/index.html").includes('id="page-orders"'), "Operations/KDS page is missing.");
check(read("js/app.js").includes('<span>${escapeHTML(window.ROMANO_I18N?.ui?.("signatureButton")'), "Product cards are missing their visible localized CTA.");


check(adminFunction.includes("romano_is_auth_session_active") && adminFunction.includes("sessionIdFromJwt"), "Admin protected routes must validate JWT session_id against auth.sessions.");
check(adminFunction.includes("if (!data?.active) return null;") && adminFunction.includes("if (!activeMemberships.length) return null;"), "Deactivated users and users without restaurant memberships must be denied.");
check(/if \(!currentPrincipal\) setCookies\.push\(\.\.\.clearAuth\(\)\)/.test(adminFunction), "Inactive admin principals must have stale auth cookies cleared.");
check(read("supabase/migrations/20261124090000_admin_login_rate_limit.sql").includes("romano_is_auth_session_active") && read("qa/sql/admin-login-rate-limit-smoke.sql").includes("deleted/revoked Supabase Auth session"), "Supabase session revocation regression test is missing.");

console.log("RAMEN static audit");
console.log(`Root: ${ROOT}`);
console.log(`Failures: ${failures.length}`);
for (const item of failures) console.log(`FAIL  ${item}`);
console.log(`Warnings: ${warnings.length}`);
for (const item of warnings) console.log(`WARN  ${item}`);

if (failures.length) process.exit(1);
