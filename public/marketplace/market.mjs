export const todayPlus = days => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const photo = name => `/marketplace/listing-photos/${name}.webp`;

const sampleLots = [
  {farmerName:"Rahima Begum",farmerNameBn:"রহিমা বেগম",district:"Rangpur",upazila:"Pirganj",variety:"Diamant",purpose:"table",quantityKg:1250,askingPriceKg:22,readyIn:0,packaging:"Loose, sorted",packagingBn:"বাছাই করা, খোলা",notes:"Medium and large, dry potatoes; weigh at pickup.",notesBn:"মাঝারি ও বড় শুকনো আলু; নেওয়ার সময় ওজন মিলিয়ে নিন।",images:["potato-01"]},
  {farmerName:"Abdul Karim",farmerNameBn:"আবদুল করিম",district:"Bogura",upazila:"Shibganj",variety:"Cardinal",purpose:"table",quantityKg:840,askingPriceKg:25,readyIn:1,packaging:"Wooden crates",packagingBn:"কাঠের ঝুড়িতে",notes:"Red-skinned potatoes in crates. Check their size before collecting.",notesBn:"লাল খোসার আলু ঝুড়িতে রাখা; নেওয়ার আগে আকার দেখে নিন।",images:["red-crate"]},
  {farmerName:"Nurul Islam",farmerNameBn:"নুরুল ইসলাম",district:"Dinajpur",upazila:"Birganj",variety:"Granola",purpose:"table",quantityKg:2200,askingPriceKg:20,readyIn:2,packaging:"Loose on burlap",packagingBn:"চটের ওপর খোলা",notes:"Mostly similar-sized potatoes. Sacks are not included in the price.",notesBn:"বেশির ভাগ আলু একই আকারের; বস্তা দরের মধ্যে নেই।",images:["yellow-burlap"]},
  {farmerName:"Selina Akter",farmerNameBn:"সেলিনা আক্তার",district:"Rajshahi",upazila:"Paba",variety:"Asterix",purpose:"processing",quantityKg:1100,askingPriceKg:27,readyIn:3,packaging:"Jute sacks",packagingBn:"চটের বস্তায়",notes:"Long red-skinned potatoes. Check for yourself if they suit processing.",notesBn:"লম্বা লাল খোসার আলু; প্রক্রিয়াজাতের উপযোগিতা নিজে দেখে নিন।",images:["red-sacks"]},
  {farmerName:"Jahangir Alam",farmerNameBn:"জাহাঙ্গীর আলম",district:"Munshiganj",upazila:"Tongibari",variety:"Courage",purpose:"table",quantityKg:3100,askingPriceKg:19,readyIn:5,packaging:"Sorted in bamboo baskets",packagingBn:"বাঁশের ঝুড়িতে বাছাই",notes:"This large lot also has some small potatoes. Check their share when collecting.",notesBn:"বড় লটে কিছু ছোট আলুও আছে; নেওয়ার সময় ভাগ মিলিয়ে নিন।",images:["yellow-sorted"]},
  {farmerName:"Nasima Khatun",farmerNameBn:"নাসিমা খাতুন",district:"Panchagarh",upazila:"Tetulia",variety:"Lady Rosetta",purpose:"table",quantityKg:650,askingPriceKg:29,readyIn:7,packaging:"Trays and baskets",packagingBn:"ট্রে ও ঝুড়িতে",notes:"Small lot of red-skinned potatoes. Check surface marks before buying.",notesBn:"ছোট লাল খোসার লট; কেনার আগে বাইরের দাগ দেখুন।",images:["red-tray","red-market"]},
  {farmerName:"Monir Hossain",farmerNameBn:"মনির হোসেন",district:"Thakurgaon",upazila:"Baliadangi",variety:"Diamant",purpose:"table",quantityKg:470,askingPriceKg:23,readyIn:9,packaging:"Loose on burlap",packagingBn:"চটের ওপর খোলা",notes:"Small mixed-size lot; buyer brings sacks.",notesBn:"ছোট লটে নানা আকারের আলু; বস্তা ক্রেতাকে আনতে হবে।",images:["yellow-small"]},
  {farmerName:"Rupa Begum",farmerNameBn:"রূপা বেগম",district:"Cumilla",upazila:"Chandina",variety:"Granola",purpose:"table",quantityKg:1700,askingPriceKg:22.5,readyIn:10,packaging:"Loose display",packagingBn:"খোলা সাজানো",notes:"Dry potatoes with some natural skin marks. Sort them when collecting.",notesBn:"শুকনো আলুতে স্বাভাবিক খোসার দাগ আছে; নেওয়ার সময় বাছাই করুন।",images:["yellow-display"]},
  {farmerName:"Ashraf Ali",farmerNameBn:"আশরাফ আলী",district:"Naogaon",upazila:"Badalgachhi",variety:"Courage",purpose:"table",quantityKg:2550,askingPriceKg:19.5,readyIn:12,packaging:"Loose on table",packagingBn:"টেবিলে খোলা",notes:"Large lot of mixed sizes. Agree the final weight and deductions first.",notesBn:"বড় লটে মিশ্র আকার; শেষ ওজন ও কাটতি আগে ঠিক করুন।",images:["yellow-table"]},
  {farmerName:"Hasina Begum",farmerNameBn:"হাসিনা বেগম",district:"Jashore",upazila:"Jhikargacha",variety:"Diamant",purpose:"table",quantityKg:920,askingPriceKg:24,readyIn:14,packaging:"Loose on burlap",packagingBn:"চটের ওপর খোলা",notes:"Mostly medium potatoes; available after sorting.",notesBn:"বেশির ভাগ মাঝারি আলু; বাছাইয়ের পরে নেওয়া যাবে।",images:["potato-02"]},
  {farmerName:"Kamal Uddin",farmerNameBn:"কামাল উদ্দিন",district:"Munshiganj",upazila:"Sadar",variety:"Granola",purpose:"table",quantityKg:1380,askingPriceKg:23.5,readyIn:18,packaging:"Plastic crates",packagingBn:"প্লাস্টিকের ঝুড়িতে",notes:"Potatoes are in crates. Ask if the crates are included.",notesBn:"ঝুড়িতে রাখা আলু; ঝুড়ি সঙ্গে যাবে কি না জেনে নিন।",images:["yellow-crates"]},
  {farmerName:"Mofizur Rahman",farmerNameBn:"মফিজুর রহমান",district:"Bogura",upazila:"Shibganj",variety:"Courage",purpose:"table",quantityKg:1875,askingPriceKg:20.5,readyIn:21,packaging:"Bamboo basket",packagingBn:"বাঁশের ঝুড়িতে",notes:"Medium potatoes in a basket. Check the total number of sacks.",notesBn:"ঝুড়িতে মাঝারি আকারের আলু; মোট বস্তার সংখ্যা মিলিয়ে নিন।",images:["yellow-basket"]},
];

export const catalogueListings = () => sampleLots.map((lot, i) => {
  const {images, readyIn, ...details} = lot;
  return {id:`illustrative-lot-${i + 1}`,sample:true,...details,priceKg:details.askingPriceKg,
    readyDate:todayPlus(readyIn),createdAt:new Date().toISOString(),photo:photo(images[0]),photos:images.map(name=>({src:photo(name)}))};
});

export const initialData = () => ({
  listings: catalogueListings(),
  offers: [
    { id: "sample-local", sample: true, lotId: "illustrative-lot-1", buyer: "Rahim Traders", district: "Rangpur", quantityKg: 800, priceKg: 22, acceptedPercent: 100, transport: 0, handling: 0, fee: 0, pickup: "buyer", paymentDays: 0, terms: "Buyer collects; final weight confirmed at pickup.", expires: todayPlus(7), createdAt: new Date().toISOString() },
    { id: "sample-remote", sample: true, lotId: "illustrative-lot-1", buyer: "Karim Potato Store", district: "Bogura", quantityKg: 1000, priceKg: 25, acceptedPercent: 95, transport: 3000, handling: 500, fee: 0, pickup: "farmer", paymentDays: 2, terms: "Estimated 5% grade rejection; confirm before dispatch.", expires: todayPlus(7), createdAt: new Date().toISOString() },
    { id: "sample-partial", sample: true, lotId: "illustrative-lot-1", buyer: "Nahar Store", district: "Dinajpur", quantityKg: 500, priceKg: 24, acceptedPercent: 100, transport: 1200, handling: 200, fee: 0, pickup: "farmer", paymentDays: 1, terms: "Only 500 kg requested; the rest remains available.", expires: todayPlus(7), createdAt: new Date().toISOString() },
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

export function availableKg(listing, deals) {
  if (listing.archivedAt) return 0;
  const committed = deals.filter(deal => deal.lotId === listing.id).reduce((sum, deal) => sum + (deal.status === "collected" || deal.status === "payment_pending" || deal.status === "paid" ? deal.actualAcceptedKg : deal.quantityKg), 0);
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
