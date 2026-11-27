# R24.3 — Customer Connect preview
- Bottom Contact opens chat directly; hamburger Chat uses the same native dialog and history. Contact and table services remain reachable through the chat toolbar; contact can return to chat. Feedback/profile/waiter routes remain.
- Full viewport on mobile, centered desktop dialog, dark/gold palette, safe-area padding, logical CSS, reduced motion, focus, screen-reader log and four-language selector.
- Demo preview uses R24.2 domain core in page memory. No persistence, remote delivery or staff responses. Clear disclosure in all four languages. Suggested messages fill composer only; they do not execute table requests. Public/offline chat disabled pending real adapter.
- Table context is informational until R24.6; verified table/order IDs are not attached. Reload, reset, membership change, branch change or leaving demo clears state. Close/reopen and language changes preserve current page messages and draft.
- Unit and browser regression tests added/updated; run npm run qa and customer/demo browser suites before release. No merge or deployment authorized.
