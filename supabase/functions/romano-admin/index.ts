import { createClient } from "npm:@supabase/supabase-js@2.118.0";

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
function normalizeSlug(raw: unknown) {
  // Keep legacy backend semantics for stable English slugs.
  return String(raw ?? "").toLowerCase().trim().normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
}
function validateSnapshot(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const source = body as Record<string,unknown>;
  if (!Array.isArray(source.categories) || !Array.isArray(source.products) ||
      source.categories.length>500 || source.products.length>2000 ||
      (source.mode!==undefined && source.mode!=="merge" && source.mode!=="replace")) return null;
  const categories = new Map<string,string>();
  const catItems: Record<string,unknown>[] = [];
  for (const item of source.categories) {
    if (!item || typeof item!=="object" || Array.isArray(item)) return null;
    const x = item as Record<string,unknown>;
    const name = x.name;
    const id = typeof x.id === "string" ? normalizeSlug(x.id) : "";
    if (!id || typeof name!=="string" || !name.trim() || name.length>120 || categories.has(String(x.id))) return null;
    categories.set(String(x.id),id);
    catItems.push({...x,id});
  }
  if (new Set(categories.values()).size !== categories.size) return null;
  const seenProducts = new Set<string>();
  const productItems: Record<string,unknown>[] = [];
  for (const item of source.products) {
    if (!item || typeof item!=="object" || Array.isArray(item)) return null;
    const x = item as Record<string,unknown>;
    const id = typeof x.id === "string" ? normalizeSlug(x.id) : "";
    if (!id || seenProducts.has(id) || !categories.has(String(x.category)) ||
      typeof x.name!=="string" || !x.name.trim() || x.name.length>160 ||
      typeof x.price!=="number" || !Number.isFinite(x.price) || x.price<0 || x.price>100000000000) return null;
    seenProducts.add(id);
    productItems.push({...x,id,category:categories.get(String(x.category))});
  }
  if (source.restaurant!==undefined && (!source.restaurant || typeof source.restaurant!=="object" || Array.isArray(source.restaurant))) return null;
  return {...source,mode:source.mode||"merge",categories:catItems,products:productItems};
}
async function readBody(req: Request, limit: number) {
  if (Number(req.headers.get("content-length")||0)>limit) return null;
  const raw = await req.text();
  if (raw.length>limit) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function decodeImage(input: unknown) {
  if (typeof input!=="string" || input.length>3_000_000) return null;
  const match = input.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return null;
  let raw: string;
  try { raw=atob(match[2]); } catch { return null; }
  if (raw.length===0 || raw.length>2_097_152) return null;
  const bytes = Uint8Array.from(raw, c=>c.charCodeAt(0));
  const ext = match[1]==="jpeg"?"jpg":match[1];
  const jpeg=bytes.length>3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  const png=bytes.length>8 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
  const webp=bytes.length>12 && String.fromCharCode(...bytes.slice(0,4))==="RIFF" &&
        String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  if ((ext==="jpg"&&!jpeg)||(ext==="png"&&!png)||(ext==="webp"&&!webp)) return null;
  return {bytes,ext,mime:"image/"+match[1]};
}
async function saveMedia(body: unknown, member: Member, actor: string) {
  const input = body && typeof body==="object" ? (body as Record<string,unknown>).dataUrl : null;
  const image = decodeImage(input);
  if (!image) return {code:"INVALID_MEDIA",status:422} as const;
  const { count,error: countError }=await service.from("media_assets").select("id",{count:"exact",head:true}).eq("restaurant_id",member.restaurant_id);
  if (countError) throw countError;
  if ((count||0)>=2000) return {code:"MEDIA_QUOTA",status:409} as const;
  const fileName=crypto.randomUUID()+"."+image.ext;
  const storagePath=member.restaurant_id+"/"+fileName;
  const {error:uploadError}=await service.storage.from("romano-media").upload(storagePath,image.bytes,{contentType:image.mime,upsert:false,cacheControl:"3600"});
  if (uploadError) throw uploadError;
  const {error:databaseError}=await service.from("media_assets").insert({
    restaurant_id:member.restaurant_id,uploaded_by:actor,file_name:fileName,mime_type:image.mime,byte_size:image.bytes.length
  });
  if (databaseError) {
    await service.storage.from("romano-media").remove([storagePath]);
    throw databaseError;
  }
  const {data}=service.storage.from("romano-media").getPublicUrl(storagePath);
  // Auditing is best effort, like the legacy service.
  await service.from("audit_logs").insert({
    restaurant_id:member.restaurant_id,actor_user_id:actor,
    action:"media.uploaded",entity_type:"media",metadata:{bytes:image.bytes.length,mime:image.mime}
  }).then(({error})=>{if(error)console.error("media audit failed",error.message)});
  return {url:data.publicUrl,mime:image.mime,bytes:image.bytes.length} as const;
}

async function operationalOrders(member: Member) {
  const rid=member.restaurant_id;
  const {data:orders,error}=await service.from("orders")
    .select("id,branch_id,table_session_id,order_number,status,payment_status,total_minor,currency_code,currency_exponent,notes,version,submitted_at,updated_at")
    .eq("restaurant_id",rid).order("submitted_at",{ascending:false}).limit(100);
  if(error) throw error;
  if(!orders?.length) return {orders:[]};
  const ids=orders.map(o=>o.id);
  const branchIds=[...new Set(orders.map(o=>o.branch_id))];
  const sessionIds=[...new Set(orders.map(o=>o.table_session_id).filter(Boolean))];
  const results=await Promise.all([
    service.from("order_items").select("order_id,product_name,quantity,line_total_minor,notes").eq("restaurant_id",rid).in("order_id",ids).order("created_at"),
    service.from("branches").select("id,name").eq("restaurant_id",rid).in("id",branchIds),
    sessionIds.length?service.from("table_sessions").select("id,table_id").eq("restaurant_id",rid).in("id",sessionIds):Promise.resolve({data:[],error:null})
  ]);
  for(const result of results) if(result.error) throw result.error;
  const sessions=results[2].data||[];
  const tableIds=[...new Set(sessions.map(s=>s.table_id).filter(Boolean))];
  const tableResult=tableIds.length?await service.from("restaurant_tables").select("id,display_name,code").eq("restaurant_id",rid).in("id",tableIds):{data:[],error:null};
  if(tableResult.error) throw tableResult.error;
  const itemMap=new Map<string,Record<string,unknown>[]>();
  for(const item of results[0].data||[]) {
    const list=itemMap.get(item.order_id)||[];
    list.push({name:item.product_name,quantity:item.quantity,lineTotalMinor:item.line_total_minor,notes:item.notes});
    itemMap.set(item.order_id,list);
  }
  const branchMap=new Map((results[1].data||[]).map(b=>[b.id,b.name]));
  const sessionMap=new Map(sessions.map(s=>[s.id,s.table_id]));
  const tableMap=new Map((tableResult.data||[]).map(t=>[t.id,t]));
  return {orders:orders.map(o=>{
    const table=tableMap.get(sessionMap.get(o.table_session_id));
    return {
      id:o.id,branchId:o.branch_id,branchName:branchMap.get(o.branch_id)||"",
      tableName:table?.display_name||table?.code||"",orderNumber:o.order_number,
      status:o.status,paymentStatus:o.payment_status,totalMinor:o.total_minor,
      currencyCode:o.currency_code,currencyExponent:o.currency_exponent,notes:o.notes,version:o.version,
      submittedAt:o.submitted_at,updatedAt:o.updated_at,items:itemMap.get(o.id)||[]
    };
  })};
}

async function branchSettings(member: Member) {
  const rid=member.restaurant_id;
  const [branchResult,gatewayResult]=await Promise.all([
    service.from("branches").select("id,slug,name,active,qr_ordering_enabled,currency_code,currency_exponent,menu_price_to_minor_multiplier").eq("restaurant_id",rid).order("created_at"),
    service.from("branch_payment_gateways").select("branch_id,provider,merchant_id,sandbox,active,updated_at").eq("restaurant_id",rid)
  ]);
  if(branchResult.error) throw branchResult.error;
  if(gatewayResult.error) throw gatewayResult.error;
  const gateways=new Map((gatewayResult.data||[]).map(g=>[g.branch_id,g]));
  return {branches:(branchResult.data||[]).map(branch=>{
    const gateway=gateways.get(branch.id);
    return {...branch,gateway:gateway?{
      provider:gateway.provider,
      merchantMasked:`••••••••-••••-••••-••••-${gateway.merchant_id.slice(-12)}`,
      sandbox:gateway.sandbox,active:gateway.active,updatedAt:gateway.updated_at
    }:null};
  })};
}

async function saveBranchGateway(member: Member, branchId: string, body: unknown) {
  const value=body&&typeof body==="object"&&!Array.isArray(body)?body as Record<string,unknown>:null;
  if(!value || value.provider!=="zarinpal" || typeof value.merchantId!=="string" ||
     !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.merchantId) ||
     typeof value.sandbox!=="boolean" || typeof value.active!=="boolean") return null;
  const {data:branch,error:branchError}=await service.from("branches").select("id,currency_code")
    .eq("restaurant_id",member.restaurant_id).eq("id",branchId).maybeSingle();
  if(branchError) throw branchError;
  if(!branch || (value.active && branch.currency_code!=="IRR")) return null;
  const {error}=await service.from("branch_payment_gateways").upsert({
    restaurant_id:member.restaurant_id,branch_id:branchId,provider:"zarinpal",
    merchant_id:value.merchantId.toLowerCase(),sandbox:value.sandbox,active:value.active
  },{onConflict:"branch_id"});
  if(error) throw error;
  return {saved:true};
}


const branchSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const tableCodePattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(value: unknown): Record<string,unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : null;
}
async function ownedBranch(member: Member, branchId: string) {
  if (!uuidPattern.test(branchId)) return null;
  const {data,error}=await service.from("branches")
    .select("id,restaurant_id,active,qr_ordering_enabled,currency_code,menu_price_to_minor_multiplier")
    .eq("restaurant_id",member.restaurant_id).eq("id",branchId).maybeSingle();
  if(error) throw error;
  return data;
}
async function saveBranch(member: Member, body: unknown) {
  const value=record(body);
  if(!value || typeof value.name !== "string" || value.name.trim().length<1 || value.name.trim().length>120
     || typeof value.slug !== "string" || value.slug.length>80 || !branchSlugPattern.test(value.slug)
     || value.currencyCode !== "IRR" || value.currencyExponent !== 0
     || !Number.isSafeInteger(value.priceMultiplier) || Number(value.priceMultiplier)<1 || Number(value.priceMultiplier)>1000) return null;
  const {data,error}=await service.from("branches").insert({
    restaurant_id:member.restaurant_id, slug:value.slug, name:value.name.trim(),
    currency_code:"IRR", currency_exponent:0, menu_price_to_minor_multiplier:value.priceMultiplier,
    active:true, qr_ordering_enabled:false, auto_accept_qr_orders:false
  }).select("id,slug,name,active,qr_ordering_enabled,currency_code").single();
  if(error) throw error;
  return data;
}
async function createRestaurantTable(member: Member, branchId: string, body: unknown) {
  const branch=await ownedBranch(member,branchId);
  const value=record(body);
  if(!branch || !value || typeof value.code!=="string" || !tableCodePattern.test(value.code) ||
     typeof value.name!=="string" || value.name.trim().length<1 || value.name.trim().length>80) return null;
  const {data,error}=await service.from("restaurant_tables").insert({
    restaurant_id:member.restaurant_id,branch_id:branchId,code:value.code,display_name:value.name.trim(),active:true
  }).select("id,code,display_name,active,qr_version").single();
  if(error) throw error;
  return data;
}
async function signTableQr(branchId:string,tableId:string,qrVersion:number) {
  const configured=Deno.env.get("ROMANO_QR_SIGNING_SECRET");
  let key=configured && configured.length>=32 ? configured : "";
  if (!key) {
    const {data,error}=await service.rpc("romano_qr_signing_material");
    if(error || typeof data!=="string" || data.length<64) throw new Error("QR_SIGNING_NOT_CONFIGURED");
    key=data;
  }
  const message=`v1.${branchId.toLowerCase()}.${tableId.toLowerCase()}.${qrVersion}`;
  const imported=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=new Uint8Array(await crypto.subtle.sign("HMAC",imported,new TextEncoder().encode(message)));
  const base64=btoa(String.fromCharCode(...signature)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const qrToken=`${message}.${base64}`;
  const origin=(Deno.env.get("ROMANO_CUSTOMER_ORIGIN") || "https://food.kiankhayat.me").replace(/\/$/,"");
  const url=new URL(origin+"/");
  url.searchParams.set("qr",qrToken);
  return {qrUrl:url.toString(),qrVersion};
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
    if (path === "/admin/orders" && req.method === "GET") {
      const m=resolveMember(p,undefined,"viewer");
      if(!m) return failure("FORBIDDEN","Restaurant access denied.",id,403,newCookies);
      return reply(await operationalOrders(m),id,200,newCookies);
    }
    const transitionMatch=path.match(/^\/admin\/orders\/([0-9a-f-]{36})\/transition$/i);
    if(transitionMatch && req.method==="POST") {
      const m=resolveMember(p,undefined,"manager");
      if(!m) return failure("FORBIDDEN","Manager access required.",id,403,newCookies);
      const body=await readBody(req,16_384) as Record<string,unknown>|null;
      if(!body || typeof body.version!=="number" || !Number.isSafeInteger(body.version) || typeof body.status!=="string" ||
         !["accepted","preparing","ready","served","delivered","completed","rejected","cancelled"].includes(body.status) ||
         (body.reason!==undefined && body.reason!==null && typeof body.reason!=="string"))
        return failure("VALIDATION_ERROR","Invalid order transition.",id,422,newCookies);
      const {data,error}=await service.rpc("romano_transition_order",{
        p_order:transitionMatch[1],p_expected_version:body.version,p_to_status:body.status,
        p_actor:p.id,p_actor_type:"staff",p_reason:body.reason||null,p_metadata:{source:"admin-kds"}
      });
      if(error) {
        if(error.code==="40001") return failure("VERSION_CONFLICT","Order changed; refresh and try again.",id,409,newCookies);
        if(error.code==="42501") return failure("FORBIDDEN","Transition is not allowed for this user.",id,403,newCookies);
        if(error.code==="22023") return failure("INVALID_TRANSITION","Order transition is not allowed.",id,409,newCookies);
        throw error;
      }
      return reply(data,id,200,newCookies);
    }
    if(path==="/admin/branches" && req.method==="GET") {
      const m=resolveMember(p,undefined,"viewer");
      if(!m) return failure("FORBIDDEN","Restaurant access denied.",id,403,newCookies);
      return reply(await branchSettings(m),id,200,newCookies);
    }
    if(path==="/admin/branches" && req.method==="POST") {
      const m=resolveMember(p,undefined,"manager");
      if(!m) return failure("FORBIDDEN","Manager access required.",id,403,newCookies);
      const created=await saveBranch(m,await readBody(req,16_384));
      if(!created) return failure("VALIDATION_ERROR","Invalid branch input.",id,422,newCookies);
      return reply({branch:created},id,201,newCookies);
    }
    const branchSettingsMatch=path.match(/^\/admin\/branches\/([0-9a-f-]{36})\/settings$/i);
    if(branchSettingsMatch && req.method==="PUT") {
      const m=resolveMember(p,undefined,"manager");
      if(!m) return failure("FORBIDDEN","Manager access required.",id,403,newCookies);
      const branch=await ownedBranch(m,branchSettingsMatch[1]);
      const value=record(await readBody(req,16_384));
      if(!branch) return failure("NOT_FOUND","Branch not found.",id,404,newCookies);
      if(!value || typeof value.qrOrderingEnabled!=="boolean") return failure("VALIDATION_ERROR","Invalid settings.",id,422,newCookies);
      if(value.qrOrderingEnabled) {
        if(!branch.active || !branch.currency_code || !branch.menu_price_to_minor_multiplier)
          return failure("VALIDATION_ERROR","Set branch prices and currency before enabling QR.",id,422,newCookies);
        const {count,error:countError}=await service.from("restaurant_tables").select("id",{head:true,count:"exact"})
          .eq("restaurant_id",m.restaurant_id).eq("branch_id",branch.id).eq("active",true);
        if(countError) throw countError;
        if(!count) return failure("VALIDATION_ERROR","Add an active table before enabling QR.",id,422,newCookies);
      }
      const {error}=await service.from("branches").update({qr_ordering_enabled:value.qrOrderingEnabled})
        .eq("restaurant_id",m.restaurant_id).eq("id",branch.id);
      if(error) throw error;
      return reply({saved:true,enabled:value.qrOrderingEnabled},id,200,newCookies);
    }
    const branchTablesMatch=path.match(/^\/admin\/branches\/([0-9a-f-]{36})\/tables$/i);
    if(branchTablesMatch && (req.method==="GET" || req.method==="POST")) {
      const m=resolveMember(p,undefined,req.method==="GET"?"viewer":"manager");
      if(!m) return failure("FORBIDDEN","Restaurant access denied.",id,403,newCookies);
      const branch=await ownedBranch(m,branchTablesMatch[1]);
      if(!branch) return failure("NOT_FOUND","Branch not found.",id,404,newCookies);
      if(req.method==="POST") {
        const table=await createRestaurantTable(m,branch.id,await readBody(req,16_384));
        if(!table) return failure("VALIDATION_ERROR","Invalid table input.",id,422,newCookies);
        return reply({table},id,201,newCookies);
      }
      const {data,error}=await service.from("restaurant_tables").select("id,code,display_name,active,qr_version")
        .eq("restaurant_id",m.restaurant_id).eq("branch_id",branch.id).order("created_at");
      if(error) throw error;
      return reply({tables:data||[]},id,200,newCookies);
    }
    const tableQrMatch=path.match(/^\/admin\/branches\/([0-9a-f-]{36})\/tables\/([0-9a-f-]{36})\/qr$/i);
    if(tableQrMatch && req.method==="GET") {
      const m=resolveMember(p,undefined,"manager");
      if(!m) return failure("FORBIDDEN","Manager access required.",id,403,newCookies);
      const branch=await ownedBranch(m,tableQrMatch[1]);
      if(!branch) return failure("NOT_FOUND","Branch not found.",id,404,newCookies);
      const {data:table,error}=await service.from("restaurant_tables")
        .select("id,qr_version,active")
        .eq("restaurant_id",m.restaurant_id).eq("branch_id",branch.id)
        .eq("id",tableQrMatch[2]).maybeSingle();
      if(error) throw error;
      if(!table || !table.active) return failure("NOT_FOUND","Table is not active.",id,404,newCookies);
      return reply(await signTableQr(branch.id,table.id,table.qr_version),id,200,newCookies);
    }
    const gatewayMatch=path.match(/^\/admin\/branches\/([0-9a-f-]{36})\/gateway$/i);
    if(gatewayMatch && req.method==="PUT") {
      const m=resolveMember(p,undefined,"manager");
      if(!m) return failure("FORBIDDEN","Manager access required.",id,403,newCookies);
      const saved=await saveBranchGateway(m,gatewayMatch[1],await readBody(req,16_384));
      if(!saved) return failure("VALIDATION_ERROR","Invalid gateway settings or branch currency.",id,422,newCookies);
      await service.from("audit_logs").insert({restaurant_id:m.restaurant_id,actor_user_id:p.id,
        action:"payment.gateway.updated",entity_type:"branch",entity_id:gatewayMatch[1],metadata:{provider:"zarinpal"}});
      return reply(saved,id,200,newCookies);
    }
    const match = path.match(/^\/admin(?:\/restaurants\/([0-9a-f-]{36}))?\/(data|snapshot|media)$/i);
    if (match) {
      const m = resolveMember(p,match[1],match[2]==="data"?"viewer":"editor");
      if (!m) return failure("FORBIDDEN","Restaurant access denied.",id,403,newCookies);
      if (match[2]==="data" && req.method==="GET") return reply(await tenantData(m),id,200,newCookies);
      if (match[2]==="snapshot" && req.method==="PUT") {
        const raw=await readBody(req,1_048_576);
        const payload=validateSnapshot(raw);
        if (!payload) return failure("VALIDATION_ERROR","Invalid menu snapshot.",id,422,newCookies);
        const {error}=await service.rpc("romano_apply_snapshot",{
          p_actor:p.id,p_restaurant:m.restaurant_id,p_payload:payload
        });
        if (error) {
          const denied=error.code==="42501";
          const invalid=error.code==="22023" || error.message?.includes("INVALID_");
          if (denied) return failure("FORBIDDEN","Insufficient permissions.",id,403,newCookies);
          if (invalid) return failure("VALIDATION_ERROR","Invalid menu snapshot.",id,422,newCookies);
          throw error;
        }
        return reply({saved:true,data:await tenantData(m)},id,200,newCookies);
      }
      if (match[2]==="media" && req.method==="POST") {
        const body=await readBody(req,3_100_000);
        const upload=await saveMedia(body,m,p.id);
        if ("code" in upload && typeof upload.code === "string") return failure(upload.code,"Invalid image or media quota exceeded.",id,upload.status ?? 422,newCookies);
        return reply(upload,id,201,newCookies);
      }
      return failure("METHOD_NOT_ALLOWED","Method not allowed.",id,405,newCookies);
    }
    return failure("NOT_FOUND","Route not found.",id,404,newCookies);
  } catch (error) {
    console.error("romano-admin request failed",error);
    return failure("INTERNAL_ERROR","Service temporarily unavailable.",id,503);
  }
});
