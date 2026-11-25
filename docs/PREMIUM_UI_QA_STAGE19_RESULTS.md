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

## Verified first repair and visual follow-up

[Audit rerun](https://github.com/cianium/Online-Menu/actions/runs/45701027719) at `f1b07cce5a55b0b3ae5b8926f74b752eac827be4`: all 25 scans passed with zero definite violations and `ARIA REVIEW []`. Artifact 15063451020 contained 27 screenshots. Remaining incomplete results: 23 color-contrast rule/scan instances, 278 unique selectors (automated background/text determination limitations, including gradients, non-text glyphs and image nodes). Customer LCP 1616 ms / initial CLS .0221; admin LCP 1536 ms / initial CLS .0019. Repeated mobile-emulated measurements remain single-run lab observations, not an improvement claim.

Review of the four new dialog screenshots exposed RTL international telephone group ordering. Apply explicit LTR direction to footer and dialog telephone values, retain RTL alignment for the dialog and preserve the original displayed text and safe tel-link policy. Added computed-style assertions in all four locales and a static guard. No layout or palette rewrite; no claim of full manual contrast compliance. Re-run quality, CI and browser gates at the new head. No merge/deploy.


## Targeted contrast repair

Manual source inspection found the legacy admin footer subtitle used 8px text in #71675b; its nominal contrast against #080706 is about 3.64:1, below 4.5:1 even before accounting for translucent layers. Set the footer to an opaque existing theme surface and its secondary copy to the existing muted-ink token, 12px minimum, with wrap-safe branding. No palette redesign. The quality audit now measures actual computed foreground/background contrast for four footer text elements at every admin scan (requires at least 4.5:1 and 12px). Other automated incomplete contrast selectors remain visible and need case-by-case review, not assumed violations or passes.
