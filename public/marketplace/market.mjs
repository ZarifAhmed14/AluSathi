export const todayPlus = days => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const initialData = () => ({
  listings: [
    { id: "sample-lot", sample: true, farmerName: "Farzana Begum", district: "Rangpur", upazila: "Pirganj", variety: "Diamant", purpose: "table", quantityKg: 2000, askingPriceMin: 22, askingPriceMax: 25, readyDate: todayPlus(0), harvestDate: todayPlus(-2), sizeDescription: "Medium and large; mostly uniform", conditionDescription: "Firm, dry, with only light surface marks", storageDescription: "Kept in a cool, ventilated store", notes: "Food-grade potatoes, sorted before pickup.", photo: "/marketplace/demo-lots/potato-01.webp", photos: ["/marketplace/demo-lots/potato-01.webp", "/marketplace/demo-lots/potato-gallery-02.webp", "/marketplace/demo-lots/potato-gallery-04.webp"].map(src => ({ src })), createdAt: new Date().toISOString() },
    { id: "sample-lot-cardinal", sample: true, farmerName: "Farzana Begum", district: "Rangpur", upazila: "Pirganj", variety: "Cardinal", purpose: "table", quantityKg: 1450, askingPriceMin: 20, askingPriceMax: 24, readyDate: todayPlus(1), harvestDate: todayPlus(-1), sizeDescription: "Medium, even-size tubers", conditionDescription: "Clean and firm; a few natural skin marks", storageDescription: "Stored under shade with airflow", notes: "Sorted food potatoes; available tomorrow.", photo: "/marketplace/demo-lots/potato-02-v2.png", photos: ["/marketplace/demo-lots/potato-02-v2.png", "/marketplace/demo-lots/potato-gallery-01.webp", "/marketplace/demo-lots/potato-gallery-05.webp"].map(src => ({ src })), createdAt: new Date().toISOString() },
    { id: "sample-lot-granola", sample: true, farmerName: "Farzana Begum", district: "Rangpur", upazila: "Pirganj", variety: "Granola", purpose: "table", quantityKg: 2200, askingPriceMin: 24, askingPriceMax: 28, readyDate: todayPlus(2), harvestDate: todayPlus(-1), sizeDescription: "Large and medium mix", conditionDescription: "Dry, firm and suitable for transport", storageDescription: "Ventilated village store", notes: "Larger tubers sorted into a separate lot.", photo: "/marketplace/demo-lots/potato-03-v2.png", photos: ["/marketplace/demo-lots/potato-03-v2.png", "/marketplace/demo-lots/potato-gallery-02.webp", "/marketplace/demo-lots/potato-gallery-03.webp"].map(src => ({ src })), createdAt: new Date().toISOString() },
    { id: "sample-lot-asterix", sample: true, farmerName: "Farzana Begum", district: "Rangpur", upazila: "Pirganj", variety: "Asterix", purpose: "processing", quantityKg: 1800, askingPriceMin: 23, askingPriceMax: 27, readyDate: todayPlus(3), harvestDate: todayPlus(-2), sizeDescription: "Medium to large", conditionDescription: "Firm; no visible cuts in the batch", storageDescription: "Kept dry and shaded", notes: "Processing potatoes; confirm the grade at pickup.", photo: "/marketplace/demo-lots/potato-04-v2.png", photos: ["/marketplace/demo-lots/potato-04-v2.png", "/marketplace/demo-lots/potato-gallery-01.webp", "/marketplace/demo-lots/potato-gallery-04.webp"].map(src => ({ src })), createdAt: new Date().toISOString() },
    { id: "sample-lot-rosetta", sample: true, farmerName: "Farzana Begum", district: "Rangpur", upazila: "Pirganj", variety: "Lady Rosetta", purpose: "seed", quantityKg: 1250, askingPriceMin: 25, askingPriceMax: 30, readyDate: todayPlus(4), harvestDate: todayPlus(-2), sizeDescription: "Seed-size selection", conditionDescription: "Firm tubers; sorted by size", storageDescription: "Kept cool, dark and ventilated", notes: "Seed potatoes; inspect before purchase.", photo: "/marketplace/demo-lots/potato-05-v2.png", photos: ["/marketplace/demo-lots/potato-05-v2.png", "/marketplace/demo-lots/potato-gallery-03.webp", "/marketplace/demo-lots/potato-gallery-05.webp"].map(src => ({ src })), createdAt: new Date().toISOString() },
  ],
  offers: [
    { id: "sample-local", sample: true, lotId: "sample-lot", buyer: "Local trader", district: "Rangpur", quantityKg: 2000, priceKg: 22, acceptedPercent: 100, transport: 0, handling: 0, fee: 0, pickup: "buyer", paymentDays: 0, terms: "Buyer collects; final weight confirmed at pickup.", expires: todayPlus(7), createdAt: new Date().toISOString() },
    { id: "sample-remote", sample: true, lotId: "sample-lot", buyer: "District wholesaler", district: "Dinajpur", quantityKg: 2000, priceKg: 27, acceptedPercent: 95, transport: 8000, handling: 2000, fee: 0, pickup: "farmer", paymentDays: 2, terms: "Estimated 5% grade rejection; confirm before dispatch.", expires: todayPlus(7), createdAt: new Date().toISOString() },
    { id: "sample-partial", sample: true, lotId: "sample-lot", buyer: "Potato processor", district: "Bogura", quantityKg: 1500, priceKg: 26, acceptedPercent: 100, transport: 2500, handling: 500, fee: 0, pickup: "farmer", paymentDays: 1, terms: "Only 1,500 kg requested; the rest remains unsold.", expires: todayPlus(7), createdAt: new Date().toISOString() },
  ],
  deals: [],
  quotes: [],
});

export function estimateOffer(offer, quantityKg = offer.quantityKg) {
  const offeredKg = Math.max(0, Number(quantityKg) || 0);
  const acceptedPercent = Math.min(100, Math.max(0, Number(offer.acceptedPercent) || 0));
  const acceptedKg = Math.floor(offeredKg * acceptedPercent / 100);
  const gross = acceptedKg * Math.max(0, Number(offer.priceKg) || 0);
  const costs = [offer.transport, offer.handling, offer.fee].reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  return { offeredKg, acceptedKg, rejectedKg: offeredKg - acceptedKg, gross, costs, net: gross - costs };
}

export function purchaseCost({ acceptedKg, priceKg, costs }) {
  const kg = Math.max(0, Number(acceptedKg) || 0);
  const price = Math.max(0, Number(priceKg) || 0);
  const values = Object.values(costs || {});
  const known = values.every(value => value !== null && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0);
  const potatoPayment = Math.round(kg * price * 100) / 100;
  const extras = values.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const total = known ? Math.round((potatoPayment + extras) * 100) / 100 : null;
  return { potatoPayment, total, costPerAcceptedKg: total !== null && kg ? Math.round(total / kg * 100) / 100 : null, known };
}

export function availableKg(listing, deals) {
  if (listing?.sellerId) return Math.max(0, Number(listing.quantityKg) - Number(listing.reservedKg || 0));
  // An agreed lot stays reserved until the farmer explicitly returns it to stock.
  // Rejected or missing weight is not silently relisted.
  const committed = deals
    .filter(deal => deal.lotId === listing.id && deal.status !== "cancelled")
    .reduce((sum, deal) => sum + Number(deal.quantityKg || 0), 0);
  return Math.max(0, listing.quantityKg - committed);
}

export function storageBreakEven({ quantityKg, priceKg, months, feeKgMonth, oneTimeCost, lossPercent }) {
  const kg = Math.max(0, Number(quantityKg) || 0);
  const saleableKg = kg * (1 - Math.min(99, Math.max(0, Number(lossPercent) || 0)) / 100);
  if (!saleableKg) return null;
  const todayValue = kg * Math.max(0, Number(priceKg) || 0);
  const storageCost = kg * Math.max(0, Number(months) || 0) * Math.max(0, Number(feeKgMonth) || 0) + Math.max(0, Number(oneTimeCost) || 0);
  return { todayValue, storageCost, saleableKg, futurePriceKg: (todayValue + storageCost) / saleableKg };
}
