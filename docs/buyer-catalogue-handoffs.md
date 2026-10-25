# Buyer catalogue handoffs

All records live in `alusathi-marketplace-pilot-v1`. Catalogue-only preferences live in `alusathi-buyer-catalogue-v1`; an unfinished offer lives in `alusathi-buyer-offer-draft-v1`.

| Destination | Shared reference | Current handoff |
| --- | --- | --- |
| My offers | `offerId`, `lotId` | Submitting the existing offer form saves one offer record and opens My offers with the new record highlighted. |
| Purchases | `deal.id`, `lotId`, `deal.offer.id` | A farmer-approved offer creates the existing deal record; the catalogue never creates a deal itself. |
| Transport | `deal.id` or `offerId`, `lotId` | Existing transport tools receive the selected lot and offer context. |
| Notebook | `deal.id` | Only agreed purchases and their financial events appear; views, saves, and contact actions never become expenses. |
| Farmer demand feed | `buyingRequestId` | Open buying requests are already stored with region, variety, quantity, price, needed date, destination, and collection terms. The later farmer feed should read these records and write proposals that reference the same ID. |

## Buying request proposal contract

A later farmer proposal should contain `buyingRequestId`, `farmerId` or `listingId`, `quantityKg`, `priceKg`, `availabilityDate`, and `collectionTerms`. Agreement should create the same deal shape used by lot offers so Purchases, Transport, and Notebook remain one journey.
