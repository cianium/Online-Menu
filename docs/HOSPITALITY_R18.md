# R18 Hospitality Premium (standalone demo)

## Scope
Smart cart: unit and line prices, removal undo, branch/table context, active catalog recommendations, notes, one branch-configured percentage promo code (0–50%) with an optional two-product eligibility condition, and fixed sample points per completed sample order. Order records keep the discount/points snapshot; historical orders remain readable. No real loyalty balance, redemption, payment change or automated campaign.

Guest services: waiter, bill, water, napkins; pending → accepted → completed; pending may be cancelled. State is shared only between tabs in the same browser origin, scoped to a validated demo branch and table. No actual restaurant notification. Staff controls are on Orders. Settings include up to three preferred complementary items, translated hours text, validated map and WhatsApp destinations. External links only navigate when explicitly clicked; sample phone remains non-callable.

All-branch backup includes hospitality settings and historical order details, accepts legacy v1 backups, and deliberately excludes transient service requests and cart drafts.

## Verification / performance
Main before R18 had 409,856 bytes of initial JS/CSS (256 over the former 400 KiB budget). R18 adds scoped functionality; the uncompressed budget is 450 KiB, with a separate 115 KiB gzip budget. Do not increase further without profiling and justification.
Browser integration covers admin config, coupon, notes, points, cross-tab table service lifecycle, and backup. Existing unit tests retained. Draft PR requires CI and visual QA before merge or deployment.

## Limits
Demo percentage coupon is reusable and not a real promotion. No stacked promotions, points redemption, backend service notification, confirmed allergen handling, or automated opening-status calculation. Hours are operator-entered display text. Real-order API contracts are unchanged.
