/* Shared money formatting for catalog prices and canonical order minor units. */
(() => {
  "use strict";

  const locales = Object.freeze({ fa: "fa-IR", en: "en-US", tr: "tr-TR", ar: "ar" });
  const tomanLabels = Object.freeze({ fa: "تومان", en: "Toman", tr: "Tümen", ar: "تومان" });

  function language(value) {
    const code = String(value || "fa").toLowerCase().split("-", 1)[0];
    return Object.hasOwn(locales, code) ? code : "fa";
  }

  function currency(value) {
    const code = String(value || "IRT").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : "IRT";
  }

  function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function number(value, code) {
    return new Intl.NumberFormat(locales[language(code)]).format(finite(value));
  }

  function toman(value, code) {
    const lang = language(code);
    return `${number(value, lang)} ${tomanLabels[lang]}`;
  }

  function iso(value, currencyCode, code) {
    try {
      return new Intl.NumberFormat(locales[language(code)], {
        style: "currency",
        currency: currencyCode,
      }).format(finite(value));
    } catch {
      return `${number(value, code)} ${currencyCode}`;
    }
  }

  // Catalog prices in the current ROMANO schema are authored in Toman even
  // when the branch settles payments in canonical IRR.
  function formatCatalog(value, options = {}) {
    const amount = finite(value);
    if (amount <= 0) return "";
    const code = currency(options.currency);
    if (code === "IRR" || code === "IRT") return toman(amount, options.language);
    return iso(amount, code, options.language);
  }

  // Orders always carry a canonical currency code and exponent. For Iranian
  // UX we convert stored Rial to Toman exactly once at the display boundary.
  function formatMinor(value, options = {}) {
    const minor = finite(value);
    const exponent = Math.min(3, Math.max(0, Number.parseInt(options.exponent, 10) || 0));
    const code = currency(options.currency);
    const major = minor / (10 ** exponent);
    if (code === "IRR") return toman(major / 10, options.language);
    if (code === "IRT") return toman(major, options.language);
    return iso(major, code, options.language);
  }

  window.OnlineMenuMoney = Object.freeze({ formatCatalog, formatMinor });
})();
