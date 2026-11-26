// Live checks must never silently use a retired or unconfigured target.
export function requireLiveUrl(name, { originOnly = false, env = process.env } = {}) {
  const value = env[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be configured for live QA`);
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be an HTTPS URL`); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || (originOnly && url.pathname !== "/")) {
    throw new Error(`${name} must be an HTTPS ${originOnly ? "origin" : "URL"} without credentials, query or fragment`);
  }
  return originOnly ? url.origin : url.href.replace(/\/+$/, "");
}
