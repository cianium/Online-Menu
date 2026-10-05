(() => {
  "use strict";
  const enabled = window.location.protocol === "http:" || window.location.protocol === "https:";
  async function load(slug, lang) {
    if (!enabled) return null;
    const response = await fetch(`/api/v1/public/restaurants/${encodeURIComponent(slug)}/menu?lang=${encodeURIComponent(lang)}`, { credentials: "same-origin", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Menu API ${response.status}`);
    const body = await response.json();
    return body?.data || null;
  }
  window.RomanoPublicAPI = Object.freeze({ enabled, load });
})();
