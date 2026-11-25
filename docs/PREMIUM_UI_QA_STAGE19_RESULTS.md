# Stage 19 — audit evidence and ARIA follow-up

Audited baseline: `13af63c3ec8bd25ea4e3b0d09a2b32e5de6bd28b`. [Quality run](https://github.com/cianium/Online-Menu/actions/runs/45700403430) completed: 21 scans, zero definite violations, zero serious/critical, both no-script notices passed. Original artifact ID 15063630619 contains 23 screenshots and report.json. All 23 viewport screenshots reviewed in a contact sheet; no obvious blocking visual defect observed in those sampled views. Not full-page, manual screen-reader or native-device certification.

## Manual-review evidence

The downloaded JSON lists 41 repeated rule/scan combinations: 21 color-contrast entries, 16 aria-prohibited-attr entries (eight customer and eight dashboard scans), and 4 mobile customer aria-valid-attr-value entries. 277 unique contrast target selectors, including text over images/gradients or layered backgrounds. They are not 277 confirmed failures. No blanket contrast claim, and no unmeasured recoloring. Full contrast adjudication remains a manual task.

Verified structural issues and repairs:
- Customer category rail and admin quick actions are named generic containers. Give them group semantics without layout changes.
- Social anchor can become a non-link placeholder in demo/invalid mode. Remove redundant aria-label, keep visible Instagram text and existing safe connected link behavior.
- Contact link is progressively enhanced into a dialog button only where supported, retains plain fragment fallback otherwise, supports Space plus Enter, associates the control with the open dialog and clears the association on close. Existing focus restoration remains.

## Controlled lab baseline (not field CWV)
Customer LCP 1620 ms, initial CLS .0221, DCL 2882 ms, load 2906 ms, 478476 encoded bytes. Admin LCP 1516 ms, initial CLS .0019, DCL 3145 ms, load 3151 ms, 497162 encoded bytes. One cold mobile-emulated run per surface; LCP and initial CLS in good ranges; no INP/field p75 or Lighthouse score. No need for unmeasured performance rewrite.

## New evidence
Extended audit to 25 scans, including open contact dialog in all four locales, actual Space/escape/focus restoration checks, and complete axe incomplete-rule evidence with check messages. Existing severity gate retained. New static semantic guards and browser tests. Cache namespace incremented. Verify results at the new head before release. No merge/deploy.