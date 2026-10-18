import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * ROMANO Admin — Supabase Auth broker and tenant-scoped read service.
 * Every sensitive table is accessed only from this server-side function.
 * No service-role credential, access token, or refresh token is sent to JS.
 *
 * This deliberately DOES NOT implement snapshot writes or media uploads yet.
 * Keep production /api/v1/admin routing unchanged until those paths are ready.
 */
const url = Deno.env.get("SUPABASE_URL");
const anon = Deno.env.get("SUPABASE_ANON_KEY");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !anon || !serviceKey) throw new Error("Supabase runtime secrets are not configured");
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const allowedOrigins = new Set((Deno.env.get("ROMANO_ADMIN_ALLOWED_ORIGINS") || "https://food.kiankhayat.me").split(",").map(v => v.trim()).filter(Boolean));
const langs = ["fa", "en", "tr", "ar"];
const roleRanks: Record<string, number> = { owner: 4, manager: 3, editor: 2, viewer: 1 };
const cookiePath = "/api/v1";
type Member = { restaurant_id: string; role: string; slug: string; name: string };
type Principal = { id: string; email: string; display_name: string | null; memberships: Member[] };

function cookies(req: Request) {
  return Object.fromEntries((req.headers.get("cookie") || "").split(";").map(kv => {
    const i = kv.indexOf("=");
    return i < 0 ? ["", ""] : [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
  }).filter(([key]) => key));
}
function cookie(name: string, value: string, httpOnly = true, age?: number) {
  const opts = [name + "=" + encodeURIComponent(value), "Path=" + cookiePath, "Secure", "SameSite=Lax"];
  if (httpOnly) opts.push("HttpOnly");
  if (age !== undefined) opts.push("Max-Age=" + age);
  return opts.join("; ");
}
function randomToken(bytes = 24) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function reply(data: unknown, id: string, status = 200, setCookies: string[] = []) {
  const h = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  for (const value of setCookies) h.append("set-cookie", value);
  return new Response(JSON.stringify({ data, error: null, requestId: id }), { status, headers: h });
}
function failure(code: string, message: string, id: string, status = 400, setCookies: string[] = []) {
  const h = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  for (const value of setCookies) h.append("set-cookie", value);
  return new Response(JSON.stringify({ data: null, error: { code, message }, requestId: id }), { status, headers: h });
}
function clearAuth() {
  return [cookie("romano_access", "", true, 0), cookie("romano_refresh", "", true, 0)];
}
function csrfGuard(req: Request, jar: Record<string, string>) {
  const origin = req.headers.get("origin");
  // Refuse requests with no browser-origin signal. The API is deliberately browser-only.
  if (!origin || !allowedOrigins.has(origin)) return false;
  const header = req.headers.get("x-csrf-token") || "";
  return header.length >= 24 && jar.romano_csrf === header;
}
async function memberships(userId: string): Promise<Member[]> {
  const { data: memberships, error } = await service.from("restaurant_memberships").select("restaurant_id,role").eq("user_id", userId);
  if (error) throw error;
  if (!memberships?.length) return [];
  const ids = memberships.map(m => m.restaurant_id);
  const { data: restaurants, error: rError } = await service.from("restaurants").select("id,slug,name").in("id", ids);
  if (rError) throw rError;
  const map = new Map((restaurants || []).map(r => [r.id, r]));
  return memberships.filter(m => map.has(m.restaurant_id)).map(m => ({
    ...m, slug: map.get(m.restaurant_id)!.slug, name: map.get(m.restaurant_id)!.name
  })).sort((a,b) => (roleRanks[b.role] || 0) - (roleRanks[a.role] || 0) || a.name.localeCompare(b.name));
}
async function principal(userId: string): Promise<Principal | null> {
  const { data, error } = await service.from("users").select("id,email,display_name,active").eq("id",userId).maybeSingle();
  if (error) throw error;
  if (!data?.active) return null;
  return { id: data.id, email: data.email, display_name: data.display_name, memberships: await memberships(data.id) };
}
async function session(req: Request, jar: Record<string, string>, setCookies: string[]) {
  let token = jar.romano_access;
  if (token) {
    const { data, error } = await service.auth.getUser(token);
    if (!error && data.user) return principal(data.user.id);
  }
  if (!jar.romano_refresh) return null;
  const anonClient = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anonClient.auth.refreshSession({ refresh_token: jar.romano_refresh });
  if (error || !data.session || !data.user) {
    setCookies.push(...clearAuth());
    return null;
  }
  token = data.session.access_token;
  setCookies.push(cookie("romano_access", token, true, data.session.expires_in || 3600));
  setCookies.push(cookie("romano_refresh", data.session.refresh_token, true, 60 * 60 * 24 * 30));
  return principal(data.user.id);
}
function resolveMember(p: Principal, explicit?: string, minRole = "viewer") {
  const m = explicit ? p.memberships.find(m => m.restaurant_id === explicit) : p.memberships[0];
  if (!m || (roleRanks[m.role] || 0) < roleRanks[minRole]) return null;
  return m;
}
function pick(rows: Record<string, unknown>[], lang = "fa") {
  const out: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const language = String(r.language_code);
    if (!langs.includes(language)) continue;
    const values: Record<string, unknown> = {};
    for (const [key,value] of Object.entries(r)) {
      if (["language_code","restaurant_id","category_id","product_id","origin"].includes(key)) continue;
      const mapped = key === "badge_label" ? "badge" : key;
      if (typeof value === "string" && value) values[mapped] = value;
    }
    if (Object.keys(values).length) out[language] = values;
  }
  const read = (key: string) => String(out[lang]?.[key] || out.fa?.[key] || "");
  return { out, read };
}
async function tenantData(member: Member) {
  const rid = member.restaurant_id;
  const requests = await Promise.all([
    service.from("restaurants").select("*").eq("id",rid).single(),
    service.from("restaurant_translations").select("language_code,name,tagline,description,address").eq("restaurant_id",rid),
    service.from("categories").select("id,slug,image_url,sort_order,active,created_at").eq("restaurant_id",rid).order("sort_order").order("created_at"),
    service.from("products").select("id,slug,category_id,price,image_url,rating,featured,active,sort_order,created_at").eq("restaurant_id",rid).order("sort_order").order("created_at")
  ]);
  for (const result of requests) if (result.error) throw result.error;
  const r = requests[0].data!;
  const cats = requests[2].data || [];
  const prods = requests[3].data || [];
  const extra = await Promise.all([
    cats.length ? service.from("category_translations").select("category_id,language_code,name").in("category_id", cats.map(c=>c.id)) : Promise.resolve({data:[],error:null}),
    prods.length ? service.from("product_translations").select("product_id,language_code,name,description,badge_label").in("product_id", prods.map(p=>p.id)) : Promise.resolve({data:[],error:null})
  ]);
  for (const result of extra) if (result.error) throw result.error;
  const ct = extra[0].data || [];
  const pt = extra[1].data || [];
  const cm = new Map(cats.map(c => [c.id,c]));
  const ctMap = new Map(cats.map(c => [c.id, pick(ct.filter(t => t.category_id === c.id))]));
  const restaurantTranslations = pick(requests[1].data || []);
  const categories = cats.map(c => ({
    uuid:c.id,id:c.slug,name:ctMap.get(c.id)!.read("name") || c.slug,
    image:c.image_url||"",active:c.active,sortOrder:c.sort_order,translations:ctMap.get(c.id)!.out
  }));
  const products = prods.filter(p => cm.has(p.category_id)).map(p => {
    const t = pick(pt.filter(x => x.product_id === p.id));
    return {
      uuid:p.id,id:p.slug,name:t.read("name")||p.slug,description:t.read("description"),badge:t.read("badge"),
      category:cm.get(p.category_id)!.slug,categoryName:ctMap.get(p.category_id)!.read("name"),
      image:p.image_url||"",price:Number(p.price),rating:Number(p.rating||0),
      featured:p.featured,active:p.active,sortOrder:p.sort_order,translations:t.out
    };
  });
  return {
    restaurant: {
      id:r.id,slug:r.slug,name:r.name,tagline:r.tagline||"",description:r.description||"",
      logo_url:r.logo_url||"",instagram:r.instagram_url||"",phone:r.phone||"",
      address:r.address||"",timezone:r.timezone,currency:r.currency,
      defaultLanguage:r.default_language||"fa",translations:restaurantTranslations.out
    }, categories, products
  };
}
Deno.serve(async req => {
  const id = crypto.randomUUID();
  const jar = cookies(req);
  const newCookies: string[] = [];
  const path = new URL(req.url).pathname.replace(/^\/romano-admin(?=\/|$)/,"").replace(/^\/api\/v1(?=\/|$)/,"");
  try {
    if (path === "/health" && req.method === "GET") return reply({ status: "ok", service: "romano-admin", phase: "auth-read" }, id);
    if (path === "/auth/csrf" && req.method === "GET") {
      let token = jar.romano_csrf;
      if (!token || !/^[a-zA-Z0-9_-]{32,64}$/.test(token)) {
        token = randomToken();
        newCookies.push(cookie("romano_csrf",token,false,60*60*24));
      }
      return reply({ csrfToken: token }, id, 200, newCookies);
    }
    if (req.method !== "GET" && !csrfGuard(req,jar)) return failure("CSRF_INVALID","CSRF token missing or invalid.",id,403);
    if (path === "/auth/login" && req.method === "POST") {
      if (Number(req.headers.get("content-length")||0)>16384) return failure("VALIDATION_ERROR","Invalid login request.",id,400);
      const body = await req.json().catch(() => null);
      if (!body || typeof body.email !== "string" || typeof body.password !== "string" ||
        body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
        body.password.length < 8 || body.password.length > 128) return failure("VALIDATION_ERROR","Invalid credentials.",id,400);
      const anonClient = createClient(url!,anon!,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data,error} = await anonClient.auth.signInWithPassword({email:body.email,password:body.password});
      if (error || !data.user || !data.session) return failure("INVALID_CREDENTIALS","Email or password is incorrect.",id,401);
      const p = await principal(data.user.id);
      if (!p || !p.memberships.length) return failure("FORBIDDEN","No restaurant access.",id,403);
      const nextCsrf = randomToken();
      newCookies.push(
        cookie("romano_access",data.session.access_token,true,data.session.expires_in||3600),
        cookie("romano_refresh",data.session.refresh_token,true,60*60*24*30),
        cookie("romano_csrf",nextCsrf,false,60*60*24)
      );
      return reply({ user: { id:p.id,email:p.email,displayName:p.display_name },csrfToken:nextCsrf },id,200,newCookies);
    }
    const p = await session(req,jar,newCookies);
    if (path === "/auth/me" && req.method === "GET") {
      return reply(p ? {
        user:{id:p.id,email:p.email,displayName:p.display_name},
        memberships:p.memberships.map(m=>({restaurantId:m.restaurant_id,role:m.role,slug:m.slug,name:m.name})),
        membership:p.memberships[0]||null
      } : null,id,200,newCookies);
    }
    if (path === "/auth/logout" && req.method === "POST") {
      return reply({loggedOut:true},id,200,[...newCookies,...clearAuth(),cookie("romano_csrf","",false,0)]);
    }
    if (!p) return failure("UNAUTHENTICATED","Authentication required.",id,401,newCookies);
    if (path === "/admin/me" && req.method === "GET") {
      return reply({user:{id:p.id,email:p.email,displayName:p.display_name},
        memberships:p.memberships.map(m=>({restaurantId:m.restaurant_id,role:m.role,slug:m.slug,name:m.name}))},id,200,newCookies);
    }
    const match = path.match(/^\/admin(?:\/restaurants\/([0-9a-f-]{36}))?\/(data|snapshot|media)$/i);
    if (match) {
      const m = resolveMember(p,match[1],match[2]==="data"?"viewer":"editor");
      if (!m) return failure("FORBIDDEN","Restaurant access denied.",id,403,newCookies);
      if (match[2]==="data" && req.method==="GET") return reply(await tenantData(m),id,200,newCookies);
      return failure("NOT_IMPLEMENTED","Admin write operations are not enabled in this deployment.",id,501,newCookies);
    }
    return failure("NOT_FOUND","Route not found.",id,404,newCookies);
  } catch (error) {
    console.error("romano-admin request failed",error);
    return failure("INTERNAL_ERROR","Service temporarily unavailable.",id,503);
  }
});
