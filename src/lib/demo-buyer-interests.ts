export const demoBuyerInterests = [
  { id: "sample-local", name: "Rahim Traders", nameBn: "রহিম ট্রেডার্স", district: "Rangpur", quantity: 800, price: 22, variety: "Diamant", neededInDays: 2, note: "Collects from the farm. Checks the weight when collecting.", noteBn: "খামার থেকে নেবেন; নেওয়ার সময় ওজন মিলিয়ে নেবেন।" },
  { id: "sample-remote", name: "Karim Potato Store", nameBn: "করিম আলু ভান্ডার", district: "Bogura", quantity: 1000, price: 25, variety: "Diamant", neededInDays: 5, note: "Asks for size photos before arranging transport.", noteBn: "গাড়ি ঠিক করার আগে আকারের ছবি দেখতে চান।" },
  { id: "sample-partial", name: "Nahar Store", nameBn: "নাহার স্টোর", district: "Dinajpur", quantity: 500, price: 24, variety: "Diamant", neededInDays: 9, note: "Needs a smaller lot. Will agree on sacks and collection time first.", noteBn: "ছোট লট দরকার; বস্তা ও নেওয়ার সময় আগে ঠিক করবেন।" },
] as const;

export function demoNeededDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
