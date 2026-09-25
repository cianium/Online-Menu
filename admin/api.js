/* ROMANO production API adapter. Loaded before admin.js. */
(() => {
  "use strict";
  const API_PREFIX = "/api";
  const isHttp = window.location.protocol === "http:" || window.location.protocol === "https:";
  let csrfToken = null;

  async function csrf() {
    if (!isHttp) return null;
    const r = await fetch(`${API_PREFIX}/auth/csrf`, { credentials: "include", headers: { Accept: "application/json" } });
    const body = await r.json();
    if (!r.ok || !body?.data?.csrfToken) throw new Error(body?.error?.message || "Unable to initialize security token.");
    csrfToken = body.data.csrfToken;
    return csrfToken;
  }

  async function request(path, options = {}) {
    if (!isHttp) throw new Error("API is disabled for file:// mode.");
    const method = String(options.method || "GET").toUpperCase();
    if (method !== "GET" && !csrfToken) await csrf();
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (method !== "GET" && csrfToken) headers.set("X-CSRF-Token", csrfToken);
    const response = await fetch(`${API_PREFIX}${path}`, { ...options, headers, credentials: "include" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(body?.error?.message || `Request failed (${response.status}).`);
      error.status = response.status;
      error.code = body?.error?.code || "REQUEST_ERROR";
      throw error;
    }
    return body?.data;
  }

  window.RomanoAPI = Object.freeze({
    enabled: isHttp,
    csrf,
    me: () => request("/auth/me"),
    login: async (email, password) => { await csrf(); return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); },
    logout: () => request("/auth/logout", { method: "POST", body: JSON.stringify({}) }),
    adminData: () => request("/admin/data"),
    saveSnapshot: snapshot => request("/admin/snapshot", { method: "PUT", body: JSON.stringify(snapshot) }),
    publicMenu: (slug, lang) => request(`/public/menu/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`)
  });
})();
