# RAMEN — Product and user guide

[All languages](README.md) · [فارسی](fa.md) · [العربية](ar.md) · [Türkçe](tr.md)

## Discover a better dining journey

RAMEN is a mobile-first digital menu and restaurant workspace. Guests explore an image-led catalog; teams maintain products, categories and prices. Persian and Arabic use RTL; English and Turkish use LTR. Connected QR ordering, kitchen operations and branch payments are separate from the standalone demo.

## Start the demo

With Git and Node.js 22+ installed:

```bash
git clone https://github.com/cianium/Online-Menu.git
cd Online-Menu
npm run demo
```

Open [guest menu](http://127.0.0.1:8765/) and [admin workspace](http://127.0.0.1:8765/admin/) in the same browser profile. No database, cloud account or API key is required. Stop the local server with Ctrl+C.

## Guest guide

1. Choose your language and browse categories.
2. Search for a dish, use filters and open its details.
3. Explore favorites and the cart; do not expect a real order or payment in demo mode.
4. In a configured restaurant, use its signed table QR and follow the available order and payment steps. Confirm any payment uncertainty with staff.

## Manager guide

1. Open the admin workspace and check the demo-mode banner.
2. Use Products to add a sample dish: choose a category, enter a name and price, then save.
3. Review categories and restaurant settings. Use sample data only.
4. Return to the guest tab, check the catalog update and reload both tabs.
5. For a clean demonstration, use a dedicated browser profile or clear this origin's site data (which removes local demo edits).

## Connected operations

In a separately configured environment, authorized staff can manage branch/table QR links, the order queue and kitchen display. A valid currency mapping, table setup and branch feature flags are prerequisites; payment also requires a configured merchant and verified sandbox callback. Never interpret a browser response alone as proof of payment.

## Limits and next steps

Demo changes stay in one browser/origin; no real authentication, shared database, live fulfillment or payment is provided there. Google Fonts may be requested, with CSS fallbacks when unavailable. Do not enter credentials or customer information. An explicitly unknown restaurant must not fall back to sample data.

For future private VPS presentation, export with `npm run demo:export`, verify the SHA-256 manifest and configure HTTPS and access control for both interfaces. Follow [local demo](../DEMO_LOCAL.md), [VPS checklist](../VPS_DEMO_FA.md) and [deployment gates](../DEPLOY_VQ3_FA.md). Production service availability is not certified by this guide.

[Product catalog](PRODUCT.md) · [Engineering](ENGINEERING.md)
