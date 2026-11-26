# Stage 19 — Premium UI/UX and performance: focused quality pass

Baseline: `1117029c02dc4aa906f4dc4a667be533e982809d` (Stage 17 standalone checks passed). Scope: existing public/customer and local admin demo; no new feature or infrastructure changes.

## Findings and repairs

- Existing customer skip link was created only after boot and its destination lacked an explicit focus target. Admin had no equivalent bypass link. Both now have initial HTML links and programmatically focusable destinations, with a direction-aware admin style and four-language labels. No navigation controls removed.
- The customer splash previously waited for window load (including optional images/fonts) or a 1.5-second timeout. Now dismissal follows menu data/render/handler readiness; the bounded timeout remains, and reduced-motion users do not wait for an unnecessary fade/removal. Lazy customer images also request async decoding. No network dependency was added.
- Missing-restaurant responses could retain demo metadata. Unavailable views now set localized metadata, clear the social site name and request noindex/nofollow, without loosening the private export's robots directive. The OG locale alternatives exclude the active locale; generic OG type is website. This is client-side metadata hygiene, not a guarantee of crawler indexing or social previews; no canonical URL invented.
- Cache namespace incremented so old public shell assets do not survive as the active app cache.

## Verification

Added static/VM tests for keyboard targets and splash readiness, and expanded the existing Chromium/Firefox/WebKit integration suite to assert localized shortcuts, actual focus transfer, consistent metadata across locales and unavailable-mode noindex. Existing full Chromium customer/admin suites and CI remain unchanged. New results must be reviewed at the exact head. No live deployment or main merge.

## Remaining work

Manual accessibility (screen readers, contrast, focus order and native mobile Safari), visual review, actual network/Core Web Vitals, field SEO and connected infrastructure still require verification. No numerical speed improvement or WCAG compliance claim before evidence. Public Pages is a sample-only demo; its deployed tree is not changed by this work.
