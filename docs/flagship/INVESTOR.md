# RAMEN / Investor and partner briefing

**Discussion document · vq.3 source · No financial or traction claims**

## Investment thesis

Independent hospitality operators need a menu experience that guests can use on mobile and a management workflow that fits day-to-day operations. RAMEN aims to bridge those needs with multilingual discovery, catalog management and configurable QR table commerce. The standalone demo reduces the infrastructure needed to evaluate the product.

## Problem hypotheses

- Static PDF menus can be inconvenient to browse or update.
- Language and reading-direction differences can make guest discovery harder.
- Separate menu, ordering and kitchen workflows can introduce operational friction.

Validate these hypotheses with restaurant interviews; they are not measured market findings.

## Product evidence

| Evidence | Interpretation |
| --- | --- |
| Customer and admin standalone application | Demonstrable sample catalog and browser-local editing |
| Four locales | Localization coverage in the source and browser test scenarios |
| Connected order/payment source | Technical foundation; requires staging and operational acceptance |
| CI and showcase run | [Successful prior run](https://github.com/cianium/Online-Menu/actions/runs/45645429531), not proof of paying customers or live payments |

## Business model hypothesis

Subscription per restaurant or branch, optional setup and premium integrations. The intended payment architecture directs guest funds through the branch merchant rather than holding funds on the platform. The historical [product strategy](../ONLINE_MENU_VQ3_FA.md) contains proposed pricing; no price is approved or represented as actual revenue.

## Go-to-market experiment

Start with a small set of independent restaurants and cafés where an owner can approve a private demo. Interview staff, demonstrate catalog edits and multilingual navigation, agree on pilot success criteria, and only enable connected ordering after the engineering gates pass. Test willingness to pay and support requirements before scaling.

## Proposed metrics

| Metric | Definition |
| --- | --- |
| Activation | Pilots completing first approved menu / onboarded pilots |
| Time to value | Time from catalog intake to first approved menu |
| Engagement | Weekly active restaurant workspaces |
| Paid conversion | Paying accounts / completed eligible pilots |
| MRR | Recurring subscription revenue, excluding one-time fees and merchant funds |
| Gross margin | Subscription revenue less directly attributable service costs, divided by revenue |
| Retention | Paying accounts retained over a defined cohort period |

No measurements, customer counts, TAM, revenue, valuations or fundraising targets have been supplied. Do not fill gaps with invented numbers.

## Milestones and risks

1. Review the standalone demo and complete a protected showcase.
2. Obtain pilot feedback, validate language quality and catalog onboarding.
3. Demonstrate connected ordering and tenant isolation in staging; test PSP sandbox.
4. Validate support cost, willingness to pay and retention before expansion.

Key risks: reliability of payment and infrastructure, merchant onboarding, translation quality, operational support burden and the absence of an approved commercial license/terms. POS, loyalty and delivery integrations remain roadmap options.

## Partnership discussion

Proposed next step: a scoped demonstration and pilot design review with the maintainer, [@cianium](https://github.com/cianium). Funding amount, terms, customer commitments and launch date are not specified.

[Product catalog](PRODUCT.md) · [Engineering gates](ENGINEERING.md)
