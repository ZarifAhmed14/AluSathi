# Bangladesh public transport APIs for AluSathi

Checked: 2026-10-05 (Asia/Dhaka). Scope: publicly documented, legitimate developer access; no signup, login, booking, or private partnership outreach performed. Guidance: Agency Agents Product Trend Researcher, with primary-source validation and explicit uncertainty.

## Result

**Barikoi is the strongest verified Bangladesh-based self-service API candidate, but it provides maps/routing, not vehicle rental or truck booking.** A freely accessible, self-service Bangladesh rental-car or bulk-freight booking API was **not verified** in this bounded search. This is not a claim that none exists.

For bulk potato loads, distinguish route planning from actual freight procurement. Passenger rentals and parcel-order APIs do not establish support for multi-tonne produce loads.

## Barikoi: usable route-planning foundation

- Access: register at the [developer dashboard](https://developer.barikoi.com/), verify a phone number, obtain an API key. Official [setup guide](https://docs.barikoi.com/go-sdk/go) states that usage beyond free limits requires a paid plan. No negotiated partnership is described.
- Pricing: [pricing page](https://barikoi.com/pricing) responded HTTP 200, but readable quota and price information was unavailable in this check. Numeric free credits, current paid prices, endpoint-specific free entitlement, and rate limits remain unverified. A free account is not evidence of unlimited free API calls.
- [Official V2 API reference](https://docs.barikoi.com/api): `GET /v2/api/route/{longitude,latitude;longitude,latitude}` returns route geometry, distance, duration, and waypoints; car/foot profiles. `POST /v2/api/routing` supplies detailed directions. Optimization supports up to 50 waypoints; location services cover autocomplete/reverse geocoding. Reference documents API-key authentication, payment and quota errors. V1 is marked deprecated after 2025-12-31.
- Live check: a single unauthenticated GET to the documented route endpoint returned HTTP 400, `API key is required`. This establishes endpoint reachability, **not** a successful authenticated route or functioning account entitlement.
- AluSathi fit (inference): addresses, estimated road distance, and route displays. No verified booking, freight quotation, available trucks, payload capacity, or truck-height/weight-restricted routing. Do not present car-route duration as a guaranteed loaded-truck ETA.
- API key handling: official [setup guide](https://docs.barikoi.com/go-sdk/go) cautions against committing keys. For future implementation, use server-side requests or supported domain restrictions and redact query keys from logs. No implementation performed here.

## Passenger/rental operators

| Operator | Verified public evidence | Access limitation | Bulk potato suitability |
| --- | --- | --- | --- |
| Jatri | [Public API docs](https://jatri-services-ltd.github.io/core-intercity-3rdparty-api-doc/) describe passenger bus city/trip search, seat plans, ticket reservation/purchase/status. Login requires secret username/password; token lasts 24 hours. [Rental terms](https://www.jatri.co/terms-and-conditions) describe app/website car bookings and bidding. | Public docs do not verify self-service credentials, a usable public base URL, sandbox, pricing, or rental API. Passenger-ticket docs must not be labeled rental/truck API. | Passenger seats/cars are not evidence of bulk freight support. |
| Shuttle | [Official site](https://www.shuttlebd.com/) describes passenger commuting, corporate transport, and rental services. | No official self-service developer docs, sandbox, or rental API credentials verified. A booking app/site is not a public integration contract. | Not verified for bulk freight. |
| Shohoz | [Official site](https://www.shohoz.com/) offers passenger ticket booking. | No public, self-service developer booking API verified. Unofficial scripts using private ticketing endpoints were excluded. | Not verified for bulk freight. |

No inference that APIs are nonexistent: only that public developer access was not verified in the sources checked.

## Parcel courier APIs: conditional, not bulk freight

| Provider | Official evidence | What remains unverified |
| --- | --- | --- |
| Pathao Courier | [Official help](https://help.pathao.com/integrate-pathao-panel-with-website/) (updated 2024-11-18) confirms website integration through **Developer API in its merchant panel**. An [engineering-owned WooCommerce plugin](https://github.com/pathao-eng/courier-woocommerce-plugin) provides first-party integration evidence. | Business-account eligibility, account approval, exact API auth/endpoints, public sandbox entitlement, API fees and rate limits were not confirmed from unrestricted official documentation. Third-party reposted credentials were not used. |
| Steadfast | [Official homepage](https://steadfast.com.bd/) explicitly advertises API/plugins to push orders and read status; its service framing is parcel delivery. | Unrestricted official endpoint docs, credential issuance conditions, sandbox, API pricing, rate limits, and produce acceptance were not verified. Third-party endpoint lists excluded as proof. |
| REDX | [Official developer page](https://redx.com.bd/developer-api/) responded HTTP 200 but was client-rendered; official homepage was also insufficient for unrestricted documentation extraction. | Public credential issuance, exact endpoints, sandbox, pricing, rate limits, and bulk-freight support not verified. Namesake real-estate/email REDX sites excluded. |

“Bulk create orders” in a courier API normally means several parcel consignments; it does not prove a whole-truck or multi-tonne shipment service. Confirm permitted commodities, weight/dimension limits, delivery regions, and merchant terms before considering even small potato parcel fulfillment.

## Bangladesh transport datasets

### LGED public road inventory: Bangladesh government source

- The [LGED public GIS portal](https://gis.lged.gov.bd/Map/Public/published-map) is publicly readable and offers district/upazila road reports and an Export Road Inventory Report interface. Its displayed attribute schema includes road ID/name, district/upazila, road type, paved/unpaved length, construction/maintenance years, AADT and IRI.
- Useful application (inference): rural pickup-road context and surfacing the need to confirm access with a driver. These fields do not establish current truck passability, closures, load limits, or guaranteed road condition.
- Verification limit: page/interface inspected; populated exports and a stable bulk-data API were not tested. Public visibility does not establish redistribution permission. Confirm source terms before importing data into a commercial product.

### OpenStreetMap Bangladesh extract: downloadable Bangladesh coverage, foreign host

- [Geofabrik Bangladesh downloads](https://download.geofabrik.de/asia/bangladesh.html) offer current PBF, shapefile ZIP and GeoPackage ZIP extracts, with updates and an explicit ODbL 1.0 license link. The page identifies OpenStreetMap contributors as the data creators and Geofabrik as the processor.
- This is data covering Bangladesh, **not a Bangladesh-based rental provider**: Geofabrik is based in Germany. Exclude it if the user requires the publisher itself to be Bangladeshi.
- Useful application (inference): own route-planning backend or offline road-map prototype. A routing engine and hosting are additional work; the download is not itself a booking or hosted routing API.
- No vehicle availability, current fares, driver contacts or guaranteed truck restrictions. Validate local coverage and observe ODbL attribution and applicable share-alike obligations. Download listings inspected, but no large files downloaded or routing accuracy tested.

### Independent Bangladesh location registry: address support, not a freight feed

- [Repository README](https://github.com/montasim/bangladesh-location-registry/blob/main/README.md) describes government-derived geography/address data and LGED road summaries distributed in JSON/JSONL/SQLite releases. The project explicitly disclaims official government endorsement and warns of coverage gaps.
- It says nationwide coordinates/boundaries are not included. It could support address selectors, but is not a routable road network, fleet directory or freight-price dataset.
- MIT applies to scripts/original documentation only; source data retains its original terms. README checked; release binaries and claimed record counts were not independently audited. Not recommended as the transport foundation.

## Decision for AluSathi

1. Consider Barikoi V2 for Bangladesh location and route-distance features after the user obtains a key and confirms current plan limits.
2. Keep freight booking/price separate until legitimate developer access and bulk-produce capacity are confirmed.
3. Do not fabricate live freight rates from route distance. A labeled estimate needs explicit tariff assumptions or verified freight data.
4. No app code, accounts, live consignments, or bookings changed in this research.
