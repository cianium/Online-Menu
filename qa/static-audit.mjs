import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const failures = [];
const warnings = [];
const required = [
  "index.html", "js/app.js", "js/i18n.js", "js/data.js",
  "css/style.css", "css/romano.css", "manifest.webmanifest", "sw.js",
  "admin/index.html", "admin/api.js", "admin/admin.js", "admin/admin-i18n.js", "admin/rv4-admin-plus.js",
  "admin/admin.css", "admin/rv4-admin-plus.css"
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
check(read("admin/index.html").includes("admin-language-toggle"), "Admin language toggle is missing.");
check(read("admin/index.html").includes("نسخه 4.6"), "Admin footer version is not 4.6.");
check(!/const Storage\s*=/.test(read("admin/admin.js")), "Admin custom storage object still shadows the browser Storage type.");
check(read("admin/admin.js").includes('const instagram ='), "Admin settings Instagram field is not declared.");
check(!/handleProductSubmit[\s\S]{0,500}const instagram\s*=/.test(read("admin/admin.js")), "Instagram validation leaked into the product-submit handler.");
check(read("js/app.js").includes("getSafeExternalUrl"), "Customer external URL sanitizer is missing.");
check(read("admin/rv4-admin-plus.js").includes('payload.schema !== "romano.menu-backup"'), "Backup restore is not strict-schema validated.");
check(read("manifest.webmanifest").includes('"display": "standalone"'), "PWA manifest is incomplete.");
check(read("sw.js").includes('url.pathname.includes("/admin/")'), "Service worker does not explicitly exclude admin.");

const syntaxTargets = ["js/app.js", "js/i18n.js", "admin/admin.js", "admin/admin-i18n.js", "admin/rv4-admin-plus.js", "sw.js", "qa/static-audit.mjs", "admin/api.js", "js/public-api.js", "backend/server.mjs", "backend/seed.mjs", "backend/migrate.mjs"];
for (const rel of syntaxTargets) {
  const r = spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], { encoding: "utf8" });
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
for (const htmlRel of ["index.html", "admin/index.html"]) {
  const html = read(htmlRel);
  check(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), `${htmlRel}: inline <script> is incompatible with the CSP.`);
  check(!/\son[a-z]+\s*=\s*["']/i.test(html), `${htmlRel}: inline event handlers are incompatible with the CSP.`);
}
// Automatic translation: wired into the server, and the API key can never reach a browser file.
check(/createAutoTranslation/.test(serverSource) && /autoTranslate\.enqueue|jobs\.flush/.test(serverSource), "Automatic translation is not wired into the server routes.");
for (const rel of ["index.html", "admin/index.html", "js/app.js", "js/i18n.js", "js/public-api.js", "admin/admin.js", "admin/api.js", "admin/admin-i18n.js", "admin/rv4-admin-plus.js", "sw.js"]) {
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

console.log("ROMANO static audit");
console.log(`Root: ${ROOT}`);
console.log(`Failures: ${failures.length}`);
for (const item of failures) console.log(`FAIL  ${item}`);
console.log(`Warnings: ${warnings.length}`);
for (const item of warnings) console.log(`WARN  ${item}`);

if (failures.length) process.exit(1);
