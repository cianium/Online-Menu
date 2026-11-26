# RAMEN / Release communication

## Current documentation baseline

| Field | Value |
| --- | --- |
| Product | RAMEN / Online-Menu |
| Source package | vq.3 / 3.0.0 |
| Documentation change | Flagship presentation and user library |
| Prior showcase evidence | [Run 45645429531](https://github.com/cianium/Online-Menu/actions/runs/45645429531) |
| Deployment | R12 standalone demo published separately on GitHub Pages |

This documentation accompanies the R12 standalone publication; it is not a production-readiness certificate for connected services and does not create a new historical tag.

The R12 standalone demo is published from `pages-demo`, with its exact source recorded in the public `VERSION.json`. `main` remains the canonical source and connected production is not certified. Publishing the standalone sample does not enable real ordering, payment, shared customer data or branch creation.

## Release summary

RAMEN introduces a refined product presentation, four-language user guides, a commercial catalog, brand guidelines and an engineering brief. Explore the independent customer and admin demo, and see the connected architecture for table ordering, kitchen operations and branch payment. Connected services require separate configuration and acceptance testing.

## Release notes structure

For each future release, record version, exact commit/tag, date, compatibility and migration notes, user-facing changes, fixes, security changes, tests actually executed, unresolved issues, deployment state and rollback procedure. Mark proposed, verified and deployed states separately.

## Approval checklist

- [ ] Confirm the intended commit and version; do not alter historical tags.
- [ ] Review translated copy and visual assets.
- [ ] Verify documentation links and current CI.
- [ ] Review current screenshots and revision provenance.
- [ ] Confirm no automatic publishing path will run without approval.
- [ ] Obtain explicit authorization before merge, release or deployment.

For connected releases, add the full [engineering gates](ENGINEERING.md) and [deployment acceptance checklist](../DEPLOY_VQ3_FA.md).

## Historical references

[Original vq.3 release notes](../releases/ONLINE_MENU_VQ3_FA.md) · [Historical releases audit](../RELEASES.md) · [Repository releases](https://github.com/cianium/Online-Menu/releases)

Keep historical release notes intact; a GitHub Release or a passing CI does not by itself verify a live deployment.
