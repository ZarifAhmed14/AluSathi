import assert from "node:assert/strict";
import { purchaseCost } from "../public/marketplace/market.mjs";

const result = purchaseCost({ acceptedKg: 950, priceKg: 25, costs: { transport: 1000, loadingSacks: 0, taxes: 0, marketFees: 0, other: 0 } });
assert.equal(result.potatoPayment, 23750);
assert.equal(result.total, 24750);
assert.equal(result.costPerAcceptedKg, 26.05);
assert.equal(purchaseCost({ acceptedKg: 950, priceKg: 25, costs: { transport: null, loadingSacks: 0, taxes: 0, marketFees: 0, other: 0 } }).total, null);
console.log("marketplace money rules passed");
