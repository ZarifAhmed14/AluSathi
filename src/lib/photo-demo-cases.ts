export const PHOTO_DEMO_CASES = [
  {
    id: "sample-1",
    image: "/demo-potatoes/sample-1.webp",
    bn: { variety: "ডায়মন্ড", age: "প্রায় ৭৫ দিন", health: "সুস্থ", title: "ছবিতে বড় দাগ দেখা যায়নি", body: "এখানে আলুর এক পাশ দেখা যাচ্ছে।", action: "আলোতে আলুটি ঘুরিয়ে অন্য পাশও দেখুন।" },
    en: { variety: "Diamant", age: "About 75 days", health: "Healthy", title: "No major marks are visible in this photo", body: "This photo shows one side of the potato.", action: "Turn the potato in good light and check the other side too." },
  },
  {
    id: "sample-2",
    image: "/demo-potatoes/sample-2.webp",
    bn: { variety: "অ্যাস্টেরিক্স", age: "প্রায় ৮২ দিন", health: "মাঝারি", title: "কিছু দৃশ্যমান দাগ আছে", body: "এই ছবিতে কয়েকটি হালকা বাইরের দাগ দেখা যাচ্ছে।", action: "আলুটি আলাদা করে হাতে ঘুরিয়ে দাগের চারপাশ দেখুন। অংশটি নরম বা ভেজা হলে অন্য আলুর সঙ্গে মেশাবেন না; শুকনো ও শক্ত হলে বাছাইয়ের সময় আলাদা রাখুন।" },
    en: { variety: "Asterix", age: "About 82 days", health: "Fair", title: "Some marks are visible", body: "A few light surface marks are visible in this photo.", action: "Keep it separate and turn it by hand to check around the mark. If soft or wet, do not mix it with other potatoes. If dry and firm, keep it separate while sorting." },
  },
  {
    id: "sample-3",
    image: "/demo-potatoes/sample-3.webp",
    bn: { variety: "কার্ডিনাল", age: "প্রায় ৯০ দিন", health: "অসুস্থ", title: "দাগগুলো আরও স্পষ্ট", body: "এই ছবিতে ছড়িয়ে থাকা স্পষ্ট বাইরের দাগ দেখা যাচ্ছে।", action: "আলুটি আলাদা রাখুন। আলোতে ঘুরিয়ে দাগের অংশ নরম, ভেজা বা গভীর কি না দেখুন; এমন হলে বস্তায় মেশাবেন না এবং বাছাইয়ের আগে স্থানীয় কৃষি পরামর্শ নিন।" },
    en: { variety: "Cardinal", age: "About 90 days", health: "Unhealthy", title: "The marks are more visible", body: "Clear, spread-out surface marks are visible in this photo.", action: "Keep it separate. Turn it in the light and check the marked area. If soft, wet or deep, do not mix it into a sack. Ask a local agriculture adviser before sorting." },
  },
  {
    id: "sample-4",
    image: "/demo-potatoes/sample-4.webp",
    bn: { variety: "গ্রানোলা", age: "প্রায় ৯৫ দিন", health: "অসুস্থ", title: "ক্ষতির চিহ্ন আছে", body: "এই ছবিতে বাইরের অংশে ক্ষতির চিহ্ন দেখা যাচ্ছে।", action: "আলাদা রাখুন। হাতে আলতো করে দেখে নরম বা ভেজা অংশ পেলে ওই আলু বস্তায় দেবেন না; কাটাছেঁড়া বা পচন থাকলে স্থানীয় কৃষি পরামর্শ নিন।" },
    en: { variety: "Granola", age: "About 95 days", health: "Unhealthy", title: "Damage is visible", body: "Surface damage is visible in this photo.", action: "Keep it separate. Gently check by hand for soft or wet areas. If you find any, do not put it in the sack. Ask a local adviser if there are cuts or rot." },
  },
  {
    id: "sample-5",
    image: "/demo-potatoes/sample-5.webp",
    bn: { variety: "লেডি রোসেটা", age: "প্রায় ১০০ দিন", health: "অসুস্থ", title: "গভীর ক্ষতির চিহ্ন দেখা যাচ্ছে", body: "এই ছবিতে আলুর গায়ে গভীর ক্ষতি দেখা যাচ্ছে।", action: "আলুটি আলাদা পাত্রে রাখুন, বস্তায় বা ভালো আলুর সঙ্গে মেশাবেন না। ক্ষতি নরম, ভেজা বা পচা মনে হলে খাওয়া বা বিক্রির সিদ্ধান্তের আগে স্থানীয় কৃষি কর্মকর্তাকে দেখান।" },
    en: { variety: "Lady Rosetta", age: "About 100 days", health: "Unhealthy", title: "Deep damage is visible", body: "Deep surface damage is visible in this photo.", action: "Keep it in a separate container. Do not mix it into a sack or with good potatoes. If the damage seems soft, wet or rotten, ask a local agriculture officer. Do this before deciding whether to eat or sell it." },
  },
] as const;

export const PHOTO_DEMO_ADVICE = {
  "sample-1": "healthy",
  "sample-2": "observe",
  "sample-3": "late-blight",
  "sample-4": "fusarium-wilt",
  "sample-5": "leaf-roll-vector",
} as const;

export const PHOTO_DEMO_CREDIT = {
  title: "Multi-view RGB image dataset of four potato varieties with visually assessed scab and dry-rot severity",
  authors: "Samiul Islam Saif, Mst. Fahmida Tasnim Saba, and M Shamim Kaiser",
  url: "https://data.mendeley.com/datasets/rgn2d2jb7f/1",
  license: "https://creativecommons.org/licenses/by/4.0/",
} as const;
