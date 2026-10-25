const endpoint = "/api/marketplace";

export async function marketplaceRequest(path, options = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    credentials: "same-origin",
    ...options,
    headers: { "X-AluSathi-Request": "1", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.detail || "Marketplace request failed"), { status: response.status });
  return body;
}

export const toMarketplaceLot = lot => ({
  id: lot.id, sample: false, sellerId: lot.seller_id, variety: lot.variety,
  quantityKg: Number(lot.quantity_kg) || 0, reservedKg: Number(lot.reserved_kg) || 0,
  district: lot.district, upazila: lot.upazila || "", readyDate: lot.ready_date,
  purpose: lot.purpose || "unknown", notes: lot.notes || "", photos: lot.photos || [],
  sizeDescription: lot.size_description || "", conditionDescription: lot.condition_description || "", storageDescription: lot.storage_description || "", harvestDate: lot.harvest_date || "",
  farmerName: lot.farmer_name || "", farmerBusinessName: lot.farmer_business_name || "", contactPhone: lot.contact_phone || "",
  photo: lot.photos?.[0]?.src || "", askingPrice: lot.asking_price == null ? null : Number(lot.asking_price),
  askingPriceMin: lot.asking_price_min == null ? null : Number(lot.asking_price_min), askingPriceMax: lot.asking_price_max == null ? null : Number(lot.asking_price_max),
  createdAt: lot.created_at, updatedAt: lot.updated_at,
});

export const toMarketplaceOffer = offer => ({
  ...offer, sample: false, lotId: offer.lot_id, buyer: "", quantityKg: Number(offer.quantity_kg),
  quotedTotal: offer.quoted_total == null ? null : Number(offer.quoted_total), totalMode: offer.terms?.mode === "catalogue_total",
  priceKg: Number(offer.price_kg) / (Number(offer.price_unit_kg) || 1), quotedPrice: Number(offer.price_kg), priceUnit: offer.price_unit || "kg", priceUnitKg: Number(offer.price_unit_kg) || 1,
  pickupDate: offer.pickup_date, pickup: offer.pickup_responsibility || "buyer", paymentMethod: offer.payment_method || "cash",
  paymentTiming: offer.payment_timing, expires: offer.expires_at, destination: offer.destination || "", terms: offer.terms?.notes || offer.notes || "",
  revision: Number(offer.version) || 1, awaitingUserId: offer.awaiting_user_id, latestProposer: offer.latest_proposer,
  buyingRequestId: offer.buying_request_id, buyerCosts: offer.buyer_costs || {},
});

export const toMarketplaceRequest = request => ({
  ...request, sample: false, quantityKg: Number(request.quantity_kg), remainingKg: Math.max(0, Number(request.quantity_kg) - Number(request.reserved_kg) - Number(request.fulfilled_kg)),
  targetPrice: Number(request.target_price), priceUnit: request.price_unit, district: request.district,
  destination: request.destination, neededBy: request.needed_date, createdAt: request.created_at,
});
