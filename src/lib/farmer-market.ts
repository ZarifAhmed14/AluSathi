import { amountFromText, notebookToday, validDay } from "./notebook";
import { DISTRICT_NAMES } from "./district-names";

export const marketKey = "alusathi-marketplace-pilot-v1";
export const marketEvent = "alusathi-marketplace-updated";
export const draftKey = "alusathi-potato-sale-details-v1";
export const formDraftKey = "alusathi-sale-form-v1";
export const providedPhotos = [1,2,3].map(i => ({src:`/marketplace/listing-photos/potato-0${i}.webp`}));
type RecordData = Record<string, unknown>;
export type SaleLot = RecordData & { id: string; quantityKg: number; askingPriceKg: number; district: string; upazila: string; variety: string; createdAt: string; photos: { src: string }[] };
export type ListingDetails = { variety: string; notes: string; harvestDate: string; storageDescription: string; country?: string; purpose?: string; batchCode?: string; packedMonth?: string };
export function record(value: unknown): RecordData { return value && typeof value === "object" && !Array.isArray(value) ? value as RecordData : {}; }
export function text(value: unknown, limit = 200) { return typeof value === "string" ? value.slice(0, limit) : ""; }
export function readObject(key: string) { try { return record(JSON.parse(localStorage.getItem(key) || "{}")); } catch { return {}; } }
export function photoSource(value: unknown) { return typeof value === "string" && value.length < 1_400_000 && (/^data:image\/jpeg;base64,[\w+/=]+$/.test(value) || value === "/marketplace/potato-harvest.png" || /^\/marketplace\/listing-photos\/potato-0[123]\.webp$/.test(value)) ? value : ""; }
export function savedPhotos(value: unknown) { return Array.isArray(value) ? value.map(p => ({ src: photoSource(record(p).src) })).filter(p => p.src).slice(0, 3) : []; }
export function ownLots(): SaleLot[] {
  const value = readObject(marketKey).listings;
  return Array.isArray(value) ? value.flatMap(raw => {
    const lot = record(raw);
    if (typeof lot.id !== "string" || lot.sample || lot.archivedAt || typeof lot.quantityKg !== "number" || !Number.isFinite(lot.quantityKg) || lot.quantityKg <= 0) return [];
    return [{...lot, id:lot.id, quantityKg:lot.quantityKg, askingPriceKg:Number(lot.askingPriceKg ?? lot.priceKg), district:text(lot.district,60), upazila:text(lot.upazila,60), variety:text(lot.variety,60), createdAt:text(lot.createdAt,30), photos:savedPhotos(lot.photos)}];
  }) : [];
}
export function phoneLink(value: unknown) { const clean = text(value, 30).replace(/[\s()-]/g, ""); return /^\+?[0-9]{8,15}$/.test(clean) ? clean : ""; }
function writableMarket() {
  const raw = localStorage.getItem(marketKey);
  const data = raw ? record(JSON.parse(raw)) : {listings: [], offers: [], deals: [], quotes: []};
  if (!["listings", "offers", "deals", "quotes"].every(key => Array.isArray(data[key]))) throw new Error("storage");
  return data;
}
export function archiveLot(id: string) {
  const data=writableMarket();
  const lots=data.listings as RecordData[];
  if (!lots.some(l=>l.id===id && !l.sample && !l.archivedAt)) throw new Error("missing");
  localStorage.setItem(marketKey,JSON.stringify({...data,listings:lots.map(l=>l.id===id ? {...l,archivedAt:new Date().toISOString()} : l)}));
  window.dispatchEvent(new Event(marketEvent));
}
export function setLotHidden(id: string, hidden: boolean) {
  const data=writableMarket(), lots=data.listings as RecordData[];
  if (!lots.some(l=>l.id===id && !l.sample && !l.archivedAt)) throw new Error("missing");
  localStorage.setItem(marketKey,JSON.stringify({...data,listings:lots.map(l=>l.id===id ? {...l,hiddenAt:hidden ? new Date().toISOString() : null} : l)}));
  window.dispatchEvent(new Event(marketEvent));
}
export function publishLot(quantity: string, price: string, photos: {src: string}[], district: string, editingId?: string, details?: ListingDetails, pickupDays = 0, upazila?: string, pickupChanged = true) {
  const kg = amountFromText(quantity), rate = amountFromText(price);
  if (!kg || kg > 100000 || !rate || rate > 10000 || !DISTRICT_NAMES[district] || !photos.length || photos.length > 3 || photos.some(p => !photoSource(p.src))) throw new Error("invalid");
  if (details?.harvestDate && (!validDay(details.harvestDate) || details.harvestDate > notebookToday())) throw new Error("harvest");
  if (![0, 14, 30].includes(pickupDays)) throw new Error("invalid");
  const ready = new Date(`${notebookToday()}T00:00:00Z`);
  if (pickupDays === 30) {
    const day = ready.getUTCDate();
    ready.setUTCDate(1);
    ready.setUTCMonth(ready.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(ready.getUTCFullYear(), ready.getUTCMonth() + 1, 0)).getUTCDate();
    ready.setUTCDate(Math.min(day, lastDay));
  } else ready.setUTCDate(ready.getUTCDate() + pickupDays);
  const data = writableMarket();
  const previous = editingId ? (data.listings as RecordData[]).find(l=>l.id===editingId && !l.sample && !l.archivedAt) : undefined;
  if (editingId && !previous) throw new Error("missing");
  const profile = readObject("alusathi-farmer-profile-v1"), draft = readObject(draftKey);
  const prep = record(readObject("alusathi-selling-prep-v1").draft);
  const lot: SaleLot = {
    ...draft, ...previous, id: editingId || crypto.randomUUID(), sample: false, quantityKg: kg, askingPriceKg: rate, priceKg: rate,
    district, upazila: text(upazila ?? previous?.upazila ?? profile.upazila ?? draft.upazila, 60), variety: text(previous?.variety ?? draft.variety, 60) || "Potatoes",
    farmerName: text(previous?.farmerName ?? profile.name, 100), readyDate: (!pickupChanged && text(previous?.readyDate,10)) || ready.toISOString().slice(0,10), createdAt: text(previous?.createdAt,30) || new Date().toISOString(), updatedAt:new Date().toISOString(),
    notes: text(previous?.notes ?? draft.notes, 300), storageDescription: text(previous?.storageDescription ?? draft.storageDescription), photos, photo: photos[0].src,
    preparation: previous?.preparation ?? { checks: Array.isArray(prep.checks) ? prep.checks.filter(c => ["sort","bag","weight","label","photos","example","scales","terms"].includes(String(c))) : [], checkedOn: text(prep.checkedOn, 10) },
    ...(details ? {variety:text(details.variety.trim(),60) || "Potatoes",notes:text(details.notes.trim(),300),harvestDate:text(details.harvestDate,10),storageDescription:text(details.storageDescription.trim(),200)} : {}),
    ...(details ? {country:text(details.country,60), purpose:["table","seed","processing"].includes(details.purpose || "") ? details.purpose : "unknown", batchCode:text(details.batchCode,40), packedMonth:/^\d{4}-(0[1-9]|1[0-2])$/.test(details.packedMonth || "") ? details.packedMonth : ""} : {}),
  };
  localStorage.setItem(marketKey, JSON.stringify({...data, listings: editingId ? (data.listings as RecordData[]).map(l=>l.id===editingId ? lot : l) : [lot, ...(data.listings as unknown[])]}));
  window.dispatchEvent(new Event(marketEvent));
  return lot;
}

export type BuyerInterest = { id: string; buyer: string; district: string; quantity: number; price?: number; lot: string; phone: string; whatsapp: string; notes: string; expires: string; contactOnly?: boolean };
export function buyerInterests(): BuyerInterest[] {
  const data = readObject(marketKey), lots = ownLots();
  const offers = Array.isArray(data.offers) ? data.offers : [];
  const legacy = offers.flatMap((value): BuyerInterest[] => {
    const offer = record(value), lot = lots.find(l => l.id === offer.lotId);
    if (!lot || offer.sample || ["withdrawn","cancelled","declined","expired"].includes(String(offer.status))) return [];
    const quantity = Number(offer.quantityKg), price = Number(offer.priceKg);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || typeof offer.id !== "string") return [];
    return [{id: offer.id, buyer: text(offer.buyer || offer.contactPerson, 100), district: text(offer.district, 60), quantity,
      price: Number.isFinite(price) && price > 0 ? price : undefined, lot: text(lot.variety, 60),
      phone: phoneLink(offer.contactPhone || offer.phone), whatsapp: phoneLink(offer.whatsapp), notes: text(offer.terms || offer.notes, 300), expires: text(offer.expires, 10)}];
  });
  let enquiries: unknown = []; try { enquiries=JSON.parse(localStorage.getItem("alusathi-buyer-interest-v1") || "[]"); } catch { /* Unreadable enquiries do not replace older records. */ }
  return [...(Array.isArray(enquiries) ? enquiries.flatMap((value):BuyerInterest[]=>{
    const item=record(value),lot=lots.find(l=>l.id===item.lotId);
    if (!lot || item.status!=="active" || typeof item.id!=="string" || typeof item.quantityKg!=="number" || !Number.isFinite(item.quantityKg) || item.quantityKg<=0 || item.quantityKg>100000) return [];
    const buyer=record(item.buyer);
    return [{id:item.id,buyer:text(buyer.businessName || buyer.contactPerson,100),district:text(lot.district,60),quantity:item.quantityKg,price:typeof item.askingPriceKg === "number" && Number.isFinite(item.askingPriceKg) && item.askingPriceKg>0 ? item.askingPriceKg : undefined,lot:text(lot.variety,60),phone:phoneLink(buyer.phone),whatsapp:phoneLink(buyer.whatsapp),notes:text(item.note,300),expires:"",contactOnly:true}];
  }) : []), ...legacy];
}

export function salePhoto(file: File) { return preparePhoto(file, 1000); }
export function profilePhoto(file: File) { return preparePhoto(file, 512, 50 * 1024 * 1024); }
export async function preparePhoto(file: File, maxSide: number, maxInputBytes = 2 * 1024 * 1024): Promise<{src: string}> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !file.size || file.size > maxInputBytes) throw new Error("photo");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : file.type === "image/png" ? [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v) : String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  if (!valid) throw new Error("photo");
  const image = await createImageBitmap(file);
  try {
    if (image.width < 40 || image.height < 40 || image.width * image.height > 40_000_000) throw new Error("photo");
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d"); if (!context) throw new Error("photo");
    context.fillStyle = "white"; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
    const src = canvas.toDataURL("image/jpeg", .8); if (!photoSource(src)) throw new Error("photo");
    return {src};
  } finally { image.close(); }
}
