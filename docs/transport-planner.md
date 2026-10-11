# Farmer transport planner — local pilot

Available at `/marketplace/farmer.html#transport`. Local project only; the deployed site is unchanged.

## Farmer flow

1. Select a crop lot or start from a buyer offer. Set pickup and destination. Ten district-town presets are approximate starting points, not farm addresses. Use map pins or optional device location for actual places.
2. Enter a real operator quote, sale price, handling and other costs. Shared-load and rejection assumptions remain available in expandable sections.
3. Save and compare quotes, call the operator, or share a transport request through the phone's native sharing feature. Sharing works before a fare is known.

Both Bangla and English are supported. Existing marketplace features remain available.

### No-typing demo walkthrough

Marketplace pages are explicitly marked `data-demo="true"`. Login and form buttons fill empty supported fields with sample values, retaining every editable field. A visible note explains the substitutions. Invalid typed values and overloaded vehicles remain blocked. Transport quotes that used automatic values are labelled demo examples, not verified quotes. This does not bypass real authentication or create real bookings, payments or shared records. Check with `node tests/marketplace-demo-forms.cjs`.

## Calculations

- Farmer freight = whole-trip quote × farmer kg / combined kg; zero if buyer pays.
- Sale value = floor(shipped kg × accepted percentage / 100) × sale price.
- Money after costs = sale value − farmer freight − handling − other costs.
- Growing costs are excluded: this is **not profit**.
- Driver-stated capacity blocks oversized loads, including requests with an unknown fare.
- Quote cards show freight payer, other farmers' load and acceptance assumptions. Comparison requires the same lot, quantity and exact route endpoints.

Shared transport is a calculation, not automatic matching. Quotes are farmer-entered, not verified prices. Changing the plan does not change the buyer's offer or deal.

## Maps and service boundaries

- Leaflet 1.9.4 loads on demand with subresource integrity. OpenStreetMap tiles show required attribution; no tile prefetch or offline scraping.
- Route distance uses the OSRM public demo only on localhost, with explicit user action, request throttling, timeout and cache. It is not enabled for deployed hosts.
- This is a driving route, **not truck clearance, guaranteed access, travel time or availability**. No fare is generated from distance.
- Routing failure does not disable cost tools; no distance or fare is fabricated.
- Production requires a self-hosted or contracted routing service (or a properly licensed Barikoi integration). Live fleet search, operator onboarding, booking, payments and delivery tracking are not included.

Policies: [OSRM demo](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server), [OSRM API](https://project-osrm.org/docs/v5.24.0/api/), [OSM tiles](https://operations.osmfoundation.org/policies/tiles/), [Leaflet CDN](https://leafletjs.com/download.html).

## Privacy and security

Quotes and optional operator phone numbers stay in this browser's local storage; they are not private account records or synced across phones. Clear app/browser data to remove them. Shared-device users should avoid storing sensitive details. Native sharing includes route, operator name, date and notes, but not the phone number by default.

GPS requires an explicit click and browser permission. Opening a map sends tile requests; checking a route sends numeric endpoints to OSRM. No API secrets or service-role keys are used. User text is escaped; phone links and numeric inputs are validated. Demo marketplace login remains demo login, not secure authentication.

## Checks

```powershell
npm run build
npm run lint
node tests/marketplace-transport.cjs
node tests/marketplace-local.cjs
node tests/marketplace-lot-tools.cjs
```

Optional one-time live map/route check:

```powershell
$env:LIVE_ROUTE='1'; node tests/marketplace-transport.cjs
```

Transport tests cover calculations, capacity, quote create/load/remove/sorting/persistence, Bangla/English, sharing, XSS, route caching/invalidation/network failure, and 320/390/1440px layouts. A live Bangladesh route, Leaflet overlay, attribution and pickup-pin change were also verified. Native share sheets, actual phone calls and GPS permission behaviour still require physical-device testing.
