# AluSathi transport integrations: Truck Lagbe and Truck Chai

Accessed: 2026-10-05. Scope: public, read-only research. No contact, sign-in, booking, or app changes. Research methods informed by the Agency Agents Product Trend Researcher guide: validate identity, follow claims to primary sources, separate evidence from inference. The research skill requires source-backed findings in one Markdown file.

## Decision

Truck Lagbe is a credible **assisted business-booking / external handoff candidate now**. Its official business page advertises enterprise access, but that does not establish an API integration right. A fully embedded AluSathi booking flow needs commercial and technical confirmation first. Truck Chai is **not integration-ready on the evidence found**: a Bangladeshi startup named TRUCKCHAI is documented, but its current official booking service/domain and partnership channel remain unresolved. [Truck Lagbe business](https://trucklagbe.com/en/business-en/), [iDEA portfolio](https://idea.gov.bd/publications/202409111405iDEA_Portfolio_List.pdf).

## Truck Lagbe: confirmed options and limits

| Option | Public evidence | What AluSathi can responsibly claim |
| --- | --- | --- |
| Business relationship | Official page advertises enterprise and SME logistics, bulk shipments, a dedicated key account manager, enterprise web portal for trip requests/monitoring, fixed or spot pricing, and monthly/project hiring. It includes a business inquiry form. | A business-account/assisted-booking route exists to discuss. Access, eligibility, costs, and AluSathi acting on farmers' behalf are not confirmed. [Business page](https://trucklagbe.com/en/business-en/) |
| External web booking | The official homepage's booking-section link resolves to `https://trucklagbe.com/web/trip-create`, labeled Shipper Web when opened. Retrieval yielded an application shell, not the booking workflow. | Verified link destination only. Do not claim completed booking, field-prefill, guest access, embedded booking, or status callbacks. [Homepage](https://trucklagbe.com/), [Shipper Web](https://trucklagbe.com/web/trip-create) |
| Android handoff | Google Play lists **Truck Lagbe: Truck Hiring App**, package `tg.truckuser`, by Truck Lagbe, Inc.; listing links back to `trucklagbe.com` and advertises nationwide truck hiring. The official download page distinguishes shipper and owner apps. | Link to the shipper listing, not the owner app. A store link is not a documented deep link that preloads a booking. [Shipper app](https://play.google.com/store/apps/details?id=tg.truckuser), [Official app page](https://trucklagbe.com/en/app-download-en/) |
| TL TMS | Official page advertises vendor management, trip creation, marketplace access, tracking/live trip sharing, and a demo-request form. | Discuss enterprise workflow support; do not infer an embeddable SDK/API or external webhook from TMS features. [TL TMS](https://trucklagbe.com/en/tl-tms-en/) |
| Contact | Official contact page lists `customercare@trucklagbe.com`, **+880 9638 000 245**, and an inquiry form. | Verified general contact, suitable for requesting the business/partnership team. No dedicated integration-sales email was verified. [Contact](https://trucklagbe.com/en/contact-us-en/) |

### API/deep-link status

No public developer portal, OpenAPI/Swagger documentation, partner API onboarding, authentication specification, booking SDK, webhook specification, or booking-prefill deep-link documentation was found in the official pages and targeted searches checked. **Not found / unavailable publicly is not the same as nonexistent**. Private partner interfaces may exist; their availability and permission to use them are unverified. Checked primary pages: [business](https://trucklagbe.com/en/business-en/), [TL TMS](https://trucklagbe.com/en/tl-tms-en/), [FAQ](https://trucklagbe.com/en/frequently-asked-question-en/), [app download](https://trucklagbe.com/en/app-download-en/), [contact](https://trucklagbe.com/en/contact-us-en/).

The FAQ's early desktop/laptop answer says Android-only and future web/iOS plans, while the current homepage exposes a Shipper Web booking link and the business page describes an enterprise portal. Therefore, treat that FAQ answer as internally inconsistent with other current first-party content, not definitive evidence that web booking is impossible. Likewise, labor-support marketing is not proof that loading/unloading labor is included in every fare. Confirm both with the provider. [FAQ](https://trucklagbe.com/en/frequently-asked-question-en/), [homepage](https://trucklagbe.com/), [business](https://trucklagbe.com/en/business-en/).

The homepage hero/login link resolves to `/site/login`, whose fetched title concerns truck buying/selling; use the explicitly observed `/web/trip-create` destination for a booking handoff, subject to live pre-launch validation. No link was tested through sign-in. [Homepage](https://trucklagbe.com/), [login destination](https://trucklagbe.com/site/login).

## Truck Chai / TruckChai: identity unresolved

- Bangladesh's official iDEA portfolio lists **TRUCKCHAI**, SCM-2. This establishes a startup name in that portfolio; it does not verify current operations, booking access, API availability, or a current domain. [iDEA portfolio, page 1](https://idea.gov.bd/publications/202409111405iDEA_Portfolio_List.pdf).
- IIBA Bangladesh's own officer biography identifies **K. M. Refaul Ehsan** as a TruckChai cofounder. His public LinkedIn search result lists `truckchai.com` as a startup website; direct LinkedIn retrieval was blocked. That makes the domain an identity lead, not a verified active service. [IIBA biography](https://bangladesh.iiba.org/page/chapter-officers), [cofounder profile](https://bd.linkedin.com/in/refaul-ehsan).
- `https://truckchai.com/` was inaccessible through the web-reading tool. A separate read-only HTTP request returned status 200 with title **truckchai.com - truckchai Resources and Information.** and redirect/search-page JavaScript. This looks like a parked/search landing page, not verified booking software. It is an observed response, not proof that the company closed or that a different official domain does not exist. Do not send farmer information there. [Observed domain](https://truckchai.com/).
- A Thai merchant storefront also uses `truckchai`, lists a Thai address and local phone numbers, and advertises moving/transport work. Do **not** treat its `truckchai@gmail.com` as the Bangladeshi startup's partnership contact. No organizational connection was established. [Merchant's own storefront](https://www.pantipmarket.com/mall/truckchai/).
- SobKisuLagbe has a Bangladesh service page headed “Truck Chai?” with call/WhatsApp booking. It identifies itself as SobKisuLagbe and uses “Truck Chai” among search keywords. No first-party evidence connecting it to the iDEA-listed TRUCKCHAI startup was found. It is not interchangeable with that startup. [SobKisuLagbe service page](https://sobkisulagbe.com/truck-chai/).

No current official TruckChai booking URL, app-store listing, developer docs, B2B integration offer, deep-link spec, or partnership contact was verified. Ask the user for the intended service's official website or app-store URL before building a Truck Chai integration. Do not conclude that a private API does not exist.

## Recommended partnership questions

1. May AluSathi book on behalf of farmers/buyers? Which party is the contracting shipper, pays, accepts bids, and handles disputes? Is a marketplace partner account available?
2. Is there an approved API, SDK, booking widget, referral link, or prefilled deep-link flow? Request documentation, sandbox access, authentication, commercial permission, rate limits, versioning, and support terms.
3. Which operations are supported: quote/bid list, acceptance, trip creation, edit/cancel, tracking, proof of delivery, refunds, and signed status webhooks? How are duplicate bookings prevented?
4. Can small potato loads be consolidated/shared? Which rural pickup points, harvest seasons, vehicle capacities, covered/ventilated options, cold-storage routes, and perishables handling are supported?
5. Does the quote include loading/unloading labor, waiting, tolls, VAT, unloading delays, return trips, and damage/loss coverage? What are the cancellation and claims rules?
6. What can AluSathi display/cache: fares, branding, driver contacts, vehicle details, tracking, and delivery evidence? What farmer consent, retention, data-sharing, and access controls are required?
7. What minimum volume, deposits/credit terms, fees/commission, service-level commitments, escalation contacts, and pilot limits apply?

These questions are AluSathi requirements, not claims about provider capabilities.

## Smallest safe next step

Recommend a provider-confirmed assisted B2B pilot with Truck Lagbe, or a clearly labeled external booking/app handoff. Keep transport status **requested/unconfirmed** until a provider confirmation is actually received. Do not advertise instant quotes, live tracking, automatic booking, or a TruckChai partnership on current evidence.

If an API is later approved: keep credentials server-side; obtain consent before sharing phone/exact pickup location; verify signed callbacks where supported; map provider-confirmed states; use provider-approved idempotency/reconciliation to prevent duplicate booking retries. These are security/design recommendations, not verified existing Truck Lagbe features.

## Search boundary and remaining uncertainty

Read official Truck Lagbe homepage, business, contact, TL TMS, app download, FAQ, and shipper Play listing. Followed homepage booking links without signing in. Checked targeted official-domain searches for API/developer/Swagger/OpenAPI/webhook/deep-link/partner documentation; no public result was found. Checked the iDEA portfolio and identity leads for TruckChai, including direct domain response and confusing same-name service pages. Search was deliberately bounded; private sales materials, contracted integrations, non-indexed docs, and alternate TruckChai domains remain unverified.
