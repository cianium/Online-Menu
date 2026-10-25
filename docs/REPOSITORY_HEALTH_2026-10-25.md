# Online Menu / RAMEN — repository health (2026-10-25)

> Status: substantial application source and release documentation exist. Not a certification of live payment or production operation.

## Observed strengths

- Root README, security policy, changelog, QA resources and deployment guidance.
- Frontend, admin UI, backend and Supabase functions/migrations included.
- Multiple CI and smoke workflows defined.
- `main` CI and a release publishing workflow were reported successful on 2026-10-20.

## Follow-up work

1. Review open PR #16 (cart accessibility) and its failing branch CI; do not treat this failure as proof `main` fails.
2. Review draft branding PR #11 against the approved product identity.
3. Review the open issues and naming inconsistencies among ROMANO (historic API identifiers), RAMEN (current README identity) and Online-Menu (repo).
4. Validate RLS, tenant isolation, server-authoritative prices and order idempotency in a real isolated Supabase staging environment.
5. Run sandbox provider payment request, callback and verification tests including failure/replay/concurrency.
6. Confirm real Vercel deployment, custom domain, mobile UI and the exact commit corresponding to `vq.3`.
7. Publish a signed-off release checklist with screenshots, limitations and rollback procedure.

## Release rule

Do not advertise live payment, real merchant readiness or a guaranteed deployment until independently tested and approved. Do not commit gateway secrets or service-role tokens.
