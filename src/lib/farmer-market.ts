export const farmerLotsKey = "alusathi-farmer-demo-lots-v1";
const marketplaceKey = "alusathi-marketplace-pilot-v1";

export type FarmerLot = {
  id: string;
  demoPublished: true;
  published: true;
  farmerName: string;
  district: string;
  upazila: string;
  variety: string;
  purpose: string;
  quantityKg: number;
  readyDate: string;
  askingPriceMin: number;
  askingPriceMax: number;
  photo: string;
  photos: { src: string; addedAt: string }[];
  createdAt: string;
};

export function readFarmerLots(): FarmerLot[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(farmerLotsKey) || "[]");
    return Array.isArray(value) ? value.filter((lot): lot is FarmerLot =>
      Boolean(lot && typeof lot.id === "string" && lot.demoPublished && typeof lot.photo === "string" &&
        (/^\/marketplace\/demo-lots\/[a-z0-9-]+\.webp$/.test(lot.photo) || /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(lot.photo)))) : [];
  } catch { return []; }
}

export function saveFarmerLot(lot: FarmerLot) {
  localStorage.setItem(farmerLotsKey, JSON.stringify([...readFarmerLots(), lot]));
  window.dispatchEvent(new Event("alusathi-farmer-lots-updated"));
}

export function readCompletedSales(lotIds: Set<string>) {
  try {
    const value = JSON.parse(localStorage.getItem(marketplaceKey) || "{}");
    return (Array.isArray(value.deals) ? value.deals : []).filter((deal: { lotId?: string; status?: string; stage?: string }) =>
      lotIds.has(deal.lotId || "") && (deal.status === "paid" || deal.stage === "settled"));
  } catch { return []; }
}
