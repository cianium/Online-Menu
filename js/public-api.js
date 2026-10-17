(() => {
  "use strict";
  const enabled = ["http:", "https:"].includes(location.protocol);
  async function load(slug, lang) {
    if (!enabled) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`/api/v1/public/restaurants/${encodeURIComponent(slug)}/menu?lang=${encodeURIComponent(lang)}`, { signal: controller.signal, credentials: "same-origin", headers: { Accept: "application/json" } });
      const json = (response.headers.get("content-type") || "").includes("application/json");
      if (response.status === 404 && !json) return null;
      if (!response.ok || !json) { const error = new Error(`Menu API ${response.status}`); error.status = response.status; throw error; }
      const body = await response.json();
      if (!body?.data) throw new Error("Invalid menu response");
      return body.data;
    } finally { clearTimeout(timer); }
  }
  window.RomanoPublicAPI = Object.freeze({ enabled, load });
})();
