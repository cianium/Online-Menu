# RAMEN — Product showcase kit

The cover is editable vector artwork, not a fabricated product screenshot. The capture script records the real standalone application from the checked-out revision in a fresh Chromium context, blocks external traffic, and never connects to payment or production services.

## Generate the kit

Use Node.js 22 from the repository root. Install Playwright and Chromium:

```bash
npm install --no-save --no-package-lock playwright
npx playwright install chromium
npm run demo
```

In another terminal:

```bash
node docs/showcase/capture.cjs
ffmpeg -framerate 1/2 -i dist/showcase/frame-%d.png -vf "scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" -loop 0 dist/showcase/admin-tour.gif
```

The GitHub [Product showcase workflow](https://github.com/cianium/Online-Menu/actions/workflows/product-showcase.yml) also exports a 1280 × 640 PNG cover, four admin views, mobile and desktop customer views, Arabic admin mobile, an animated GIF walkthrough, and revision provenance. Download the `ramen-product-showcase` artifact from a successful run. This does not publish, deploy or commit generated files. Artifacts expire after 30 days.

The screenshots already tracked under `docs/qa/` are prior QA evidence; they are not proof of the current live deployment. Use the freshly generated media after reviewing its provenance and visual quality.

## Repository presentation settings (owner action)

- **Description:** RAMEN — multilingual digital menu and restaurant workspace, with a standalone demo and connected QR ordering.
- **Topics:** digital-menu, restaurant-management, qr-menu, restaurant-tech, multilingual, rtl, vanilla-javascript, fastify, postgresql, supabase, demo.
- **Social preview:** download `social-preview.png` from the successful workflow and upload it under Settings → General → Social preview.
- **Website:** only add a URL after independently verifying the deployment; leave it unset otherwise.

Do not change repository visibility, license, deployments or production configuration as part of this showcase. No claims of real payment success or active restaurants are made.
