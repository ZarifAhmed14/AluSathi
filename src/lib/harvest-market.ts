export type HarvestPlan = { district: string; readyDate: string; quantityKg: number; transportPerKg: number };
export type BuyerDemand = { id: string; buyer: string; district: string; from: string; to: string; minKg: number; maxKg: number; offeredPerKg: number; buyerCollects: boolean; payment: string };

const districts = ["Rangpur", "Bogura", "Dinajpur", "Panchagarh", "Thakurgaon", "Rajshahi", "Munshiganj"];
export const harvestDistricts = districts;
const finite = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;
const validDate = (value: string) => Number.isFinite(Date.parse(`${value}T12:00:00`));

export function validatePlan(plan: HarvestPlan) {
  return districts.includes(plan.district) && validDate(plan.readyDate) && finite(plan.quantityKg, 1, 10_000_000) && finite(plan.transportPerKg, 0, 100_000);
}
export function validateDemand(demand: BuyerDemand) {
  return demand.buyer.trim().length >= 2 && demand.buyer.trim().length <= 100 && districts.includes(demand.district) && validDate(demand.from) && validDate(demand.to) && demand.from <= demand.to && finite(demand.minKg, 1, 10_000_000) && finite(demand.maxKg, demand.minKg, 10_000_000) && finite(demand.offeredPerKg, 0, 100_000) && demand.payment.trim().length <= 100;
}
export function matchDemand(plan: HarvestPlan, demand: BuyerDemand) {
  if (!validatePlan(plan) || !validateDemand(demand)) return null;
  const dateMatch = plan.readyDate >= demand.from && plan.readyDate <= demand.to;
  const quantityMatch = plan.quantityKg >= demand.minKg && plan.quantityKg <= demand.maxKg;
  const districtMatch = plan.district === demand.district;
  const netPerKg = demand.offeredPerKg - (demand.buyerCollects ? 0 : plan.transportPerKg);
  const score = [dateMatch, quantityMatch, districtMatch].filter(Boolean).length;
  return { dateMatch, quantityMatch, districtMatch, score, netPerKg, estimatedNet: netPerKg * plan.quantityKg };
}

export function lotMessage(plan: HarvestPlan) {
  if (!validatePlan(plan)) throw new Error("Invalid harvest plan");
  return `AluSathi harvest-ready lot\nDistrict: ${plan.district}\nReady date: ${plan.readyDate}\nQuantity: ${plan.quantityKg.toLocaleString("en-BD")} kg\nTransport estimate: ৳${plan.transportPerKg.toLocaleString("en-BD")}/kg\nPlease confirm your required quantity, delivery date, offered price, transport responsibility and payment terms.`;
}
