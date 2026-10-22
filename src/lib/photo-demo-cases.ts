export const PHOTO_DEMO_CASES = [
  {
    id: "sample-1",
    image: "/demo-potatoes/sample-1.webp",
    bn: { variety: "ডায়মন্ড", age: "প্রায় ৭৫ দিন", health: "সুস্থ", title: "বড় দৃশ্যমান দাগ চোখে পড়েনি", body: "এই স্থির ডেমো নমুনায় আলুর বাইরের অংশ স্বাভাবিক দেখাচ্ছে।", action: "আজ কোনো চিকিৎসা দরকার নেই। আলোতে আলুটি ঘুরিয়ে দেখুন; নরম, ভেজা বা কাটা অংশ না থাকলে স্বাভাবিক বাছাইয়ের সঙ্গে রাখুন।" },
    en: { variety: "Diamant", age: "About 75 days", health: "Healthy", title: "No major visible mark stands out", body: "The outside looks normal in this fixed demo sample.", action: "No treatment is needed today. Turn it in good light; if there is no soft, wet or cut area, keep it with the usual sorting." },
  },
  {
    id: "sample-2",
    image: "/demo-potatoes/sample-2.webp",
    bn: { variety: "অ্যাস্টেরিক্স", age: "প্রায় ৮২ দিন", health: "মাঝারি", title: "কিছু দৃশ্যমান দাগ আছে", body: "এই স্থির ডেমো নমুনায় কয়েকটি হালকা বাইরের দাগ দেখা যাচ্ছে।", action: "আলুটি আলাদা করে হাতে ঘুরিয়ে দাগের চারপাশ দেখুন। অংশটি নরম বা ভেজা হলে অন্য আলুর সঙ্গে মেশাবেন না; শুকনো ও শক্ত হলে বাছাইয়ের সময় আলাদা রাখুন।" },
    en: { variety: "Asterix", age: "About 82 days", health: "Fair", title: "Some visible marks are present", body: "A few light surface marks are visible in this fixed demo sample.", action: "Keep it separate and inspect around the mark by hand. If it is soft or wet, do not mix it with other potatoes; if dry and firm, keep it apart during sorting." },
  },
  {
    id: "sample-3",
    image: "/demo-potatoes/sample-3.webp",
    bn: { variety: "কার্ডিনাল", age: "প্রায় ৯০ দিন", health: "অসুস্থ", title: "দাগগুলো আরও স্পষ্ট", body: "এই স্থির ডেমো নমুনায় ছড়িয়ে থাকা স্পষ্ট বাইরের দাগ দেখা যাচ্ছে।", action: "আলুটি আলাদা রাখুন। আলোতে ঘুরিয়ে দাগের অংশ নরম, ভেজা বা গভীর কি না দেখুন; এমন হলে বস্তায় মেশাবেন না এবং বাছাইয়ের আগে স্থানীয় কৃষি পরামর্শ নিন।" },
    en: { variety: "Cardinal", age: "About 90 days", health: "Unhealthy", title: "The marks are more visible", body: "Clear, spread-out surface marks are visible in this fixed demo sample.", action: "Keep it apart. Check whether the marked area is soft, wet or deep; if so, do not mix it into a sack and ask a local agricultural adviser before sorting." },
  },
  {
    id: "sample-4",
    image: "/demo-potatoes/sample-4.webp",
    bn: { variety: "গ্রানোলা", age: "প্রায় ৯৫ দিন", health: "অসুস্থ", title: "ক্ষতির চিহ্ন আছে", body: "এই স্থির ডেমো নমুনায় বাইরের অংশে ক্ষতির চিহ্ন দেখা যাচ্ছে।", action: "আলাদা রাখুন। হাতে আলতো করে দেখে নরম বা ভেজা অংশ পেলে ওই আলু বস্তায় দেবেন না; কাটাছেঁড়া বা পচন থাকলে স্থানীয় কৃষি পরামর্শ নিন।" },
    en: { variety: "Granola", age: "About 95 days", health: "Unhealthy", title: "Visible damage is present", body: "Surface damage is visible in this fixed demo sample.", action: "Keep it apart. Gently check for soft or wet areas and do not put it in the sack if found; ask a local adviser if there is a cut or rot." },
  },
  {
    id: "sample-5",
    image: "/demo-potatoes/sample-5.webp",
    bn: { variety: "লেডি রোসেটা", age: "প্রায় ১০০ দিন", health: "অসুস্থ", title: "গভীর ক্ষতির চিহ্ন দেখা যাচ্ছে", body: "এই স্থির ডেমো নমুনায় আলুর গায়ে গভীর ক্ষতি দেখা যাচ্ছে।", action: "আলুটি আলাদা পাত্রে রাখুন, বস্তায় বা ভালো আলুর সঙ্গে মেশাবেন না। ক্ষতি নরম, ভেজা বা পচা মনে হলে খাওয়া বা বিক্রির সিদ্ধান্তের আগে স্থানীয় কৃষি কর্মকর্তাকে দেখান।" },
    en: { variety: "Lady Rosetta", age: "About 100 days", health: "Unhealthy", title: "Deep visible damage stands out", body: "Deep surface damage is visible in this fixed demo sample.", action: "Keep it in a separate container; do not mix it into the sack or with sound potatoes. If it seems soft, wet or rotten, show it to a local agricultural officer before deciding whether to eat or sell it." },
  },
] as const;

export const PHOTO_DEMO_CREDIT = {
  title: "Multi-view RGB image dataset of four potato varieties with visually assessed scab and dry-rot severity",
  authors: "Samiul Islam Saif, Mst. Fahmida Tasnim Saba, and M Shamim Kaiser",
  url: "https://data.mendeley.com/datasets/rgn2d2jb7f/1",
  license: "https://creativecommons.org/licenses/by/4.0/",
} as const;
