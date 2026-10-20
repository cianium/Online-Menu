/* ROMANO API client for the admin panel. Loaded before admin.js. */
(() => {
  "use strict";
  const API_PREFIX = "/api/v1";
  const isHttp = window.location.protocol === "http:" || window.location.protocol === "https:";
  let backendAvailable = isHttp;
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
    if (!backendAvailable) throw new Error("API is not available in this deployment.");
    const method = String(options.method || "GET").toUpperCase();
    if (method !== "GET" && !csrfToken) await csrf();
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (method !== "GET" && csrfToken) headers.set("X-CSRF-Token", csrfToken);
    let response = await fetch(`${API_PREFIX}${path}`, { ...options, headers, credentials: "include" });
    let body = await response.json().catch(() => null);
    if (response.status === 403 && body?.error?.code === "CSRF_INVALID" && !options.__retried) {
      csrfToken = null;
      return request(path, { ...options, __retried: true });
    }
    if (!response.ok) {
      const error = new Error(body?.error?.message || `Request failed (${response.status}).`);
      error.status = response.status;
      error.code = body?.error?.code || "REQUEST_ERROR";
      throw error;
    }
    return body?.data;
  }

  /**
   * Probe the backend once. Static hosting (GitHub Pages, file://) has no /api,
   * so the admin falls back to its local demo mode instead of breaking.
   * Resolves to { available: boolean, session: object | null }.
   */
  async function detect() {
    if (!isHttp) { backendAvailable = false; return { available: false, session: null }; }
    const response = await fetch(`${API_PREFIX}/auth/me`, { credentials: "include", headers: { Accept: "application/json" } });
    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    if (response.status === 404 && !isJson) { backendAvailable = false; return { available: false, session: null }; }
    if (response.status === 401) return { available: true, session: null };
    if (!response.ok || !isJson) throw new Error("Admin service unavailable");
    const body = await response.json();
    if (!body || !("data" in body)) throw new Error("Invalid session response");
    backendAvailable = true;
    return { available: true, session: body.data || null };
  }

  window.RomanoAPI = Object.freeze({
    get enabled() { return backendAvailable; },
    detect,
    csrf,
    me: () => request("/auth/me"),
    login: async (email, password) => {
      await csrf();
      const data = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      // The server rotates the CSRF token on login; adopt the new one.
      if (data?.csrfToken) csrfToken = data.csrfToken;
      return data;
    },
    logout: async () => { try { return await request("/auth/logout", { method: "POST", body: JSON.stringify({}) }); } finally { csrfToken = null; } },
    uploadImage: dataUrl => request("/admin/media", { method: "POST", body: JSON.stringify({ dataUrl }) }),
    adminData: () => request("/admin/data"),
    saveSnapshot: snapshot => request("/admin/snapshot", { method: "PUT", body: JSON.stringify(snapshot) }),
    orders: () => request("/admin/orders"),
    transitionOrder: (orderId, version, status, reason = null) => request(`/admin/orders/${encodeURIComponent(orderId)}/transition`, {
      method: "POST", body: JSON.stringify({ version, status, reason })
    }),
    branches: () => request("/admin/branches"),
    createBranch: value => request("/admin/branches", { method:"POST", body:JSON.stringify(value) }),
    branchSettings: (branchId, value) => request(`/admin/branches/${encodeURIComponent(branchId)}/settings`, { method:"PUT", body:JSON.stringify(value) }),
    tables: branchId => request(`/admin/branches/${encodeURIComponent(branchId)}/tables`),
    createTable: (branchId, value) => request(`/admin/branches/${encodeURIComponent(branchId)}/tables`, { method:"POST", body:JSON.stringify(value) }),
    tableQr: (branchId, tableId) => request(`/admin/branches/${encodeURIComponent(branchId)}/tables/${encodeURIComponent(tableId)}/qr`),
    setTableActive: (branchId, tableId, active) => request(`/admin/branches/${encodeURIComponent(branchId)}/tables/${encodeURIComponent(tableId)}/status`, {
      method:"PUT", body:JSON.stringify({ active })
    }),
    rotateTableQr: (branchId, tableId) => request(`/admin/branches/${encodeURIComponent(branchId)}/tables/${encodeURIComponent(tableId)}/rotate`, {
      method:"POST", body:JSON.stringify({})
    }),
    saveGateway: (branchId, gateway) => request(`/admin/branches/${encodeURIComponent(branchId)}/gateway`, {
      method: "PUT", body: JSON.stringify(gateway)
    })
  });
})();
