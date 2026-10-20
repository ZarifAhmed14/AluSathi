export const PHOTO_DEMO_CASES = [
  {
    id: "sample-1",
    image: "/demo-potatoes/sample-1.webp",
    bn: { title: "বড় দৃশ্যমান দাগ চোখে পড়েনি", body: "শুধু ছবি দেখে আলুর ভেতরের অবস্থা, খাবারের নিরাপত্তা বা বাজারের মান নিশ্চিত করা যায় না।", action: "আলোতে আলুটি ঘুরিয়ে সব দিক দেখুন। নরম, ভেজা বা কাটা অংশ পেলে আলাদা রাখুন; না পেলে স্বাভাবিক বাছাইয়ের সঙ্গে রাখুন।" },
    en: { title: "No major visible mark stands out", body: "A photo cannot confirm the potato's inside, food safety, or market quality.", action: "Turn it in good light and inspect every side. Set it aside if you find a soft, wet or cut area; otherwise keep it with the usual sorting." },
  },
  {
    id: "sample-2",
    image: "/demo-potatoes/sample-2.webp",
    bn: { title: "কিছু দৃশ্যমান দাগ আছে", body: "এটি একটি উদাহরণ ছবি; দাগের কারণ শুধু ছবি দেখে নিশ্চিত করা যায় না।", action: "আলুটি আলাদা করে হাতে ঘুরিয়ে দাগের চারপাশ দেখুন। অংশটি নরম বা ভেজা হলে অন্য আলুর সঙ্গে মেশাবেন না; শুকনো ও শক্ত হলে বাছাইয়ের সময় আলাদা করে রাখুন।" },
    en: { title: "Some visible marks are present", body: "This is an example photo; a photo alone cannot confirm what caused the marks.", action: "Keep it separate and turn it by hand to inspect around the mark. If the area is soft or wet, do not mix it with other potatoes; if it is dry and firm, keep it apart during sorting." },
  },
  {
    id: "sample-3",
    image: "/demo-potatoes/sample-3.webp",
    bn: { title: "দাগগুলো আরও স্পষ্ট", body: "এটি ছবি-ভিত্তিক উদাহরণ, রোগ নির্ণয় বা বাজারের গ্রেড নয়।", action: "আলুটি আলাদা রাখুন। আলোতে ঘুরিয়ে দাগের অংশ নরম, ভেজা বা গভীর কি না দেখুন; এমন হলে বস্তায় মেশাবেন না এবং বাছাইয়ের আগে স্থানীয় কৃষি পরামর্শ নিন।" },
    en: { title: "The marks are more visible", body: "This is a photo example, not a disease diagnosis or market grade.", action: "Keep it apart. Turn it in good light and check whether the marked area is soft, wet or deep; if so, do not mix it into a sack and ask a local agricultural adviser before sorting." },
  },
  {
    id: "sample-4",
    image: "/demo-potatoes/sample-4.webp",
    bn: { title: "ক্ষতির চিহ্ন আছে", body: "ছবিতে দেখা দাগের কারণ বা আলুর ভেতরের অবস্থা নিশ্চিত নয়।", action: "আলাদা রাখুন। হাতে আলতো করে দেখে নরম বা ভেজা অংশ পেলে ওই আলু বস্তায় দেবেন না; কাটাছেঁড়া বা পচন থাকলে স্থানীয় কৃষি পরামর্শ নিন।" },
    en: { title: "Visible damage is present", body: "The photo cannot confirm the cause of the marks or the potato's inside.", action: "Keep it apart. Gently check for soft or wet areas and do not put it in the sack if you find them; ask a local adviser if there is a cut or rot." },
  },
  {
    id: "sample-5",
    image: "/demo-potatoes/sample-5.webp",
    bn: { title: "গভীর ক্ষতির চিহ্ন দেখা যাচ্ছে", body: "এই উদাহরণে আলুর গায়ে স্পষ্ট ক্ষতি দেখা যায়; ছবি দিয়ে খাবারের নিরাপত্তা নিশ্চিত করা যায় না।", action: "আলুটি আলাদা পাত্রে রাখুন, বস্তায় বা ভালো আলুর সঙ্গে মেশাবেন না। ক্ষতি নরম, ভেজা বা পচা মনে হলে খাওয়া বা বিক্রির সিদ্ধান্তের আগে স্থানীয় কৃষি কর্মকর্তাকে দেখান।" },
    en: { title: "Deep visible damage stands out", body: "This example shows clear surface damage; a photo cannot establish food safety.", action: "Keep it in a separate container; do not mix it into the sack or with sound potatoes. If the damage seems soft, wet or rotten, show it to a local agricultural officer before deciding whether to eat or sell it." },
  },
] as const;

export const PHOTO_DEMO_CREDIT = {
  title: "Multi-view RGB image dataset of four potato varieties with visually assessed scab and dry-rot severity",
  authors: "Samiul Islam Saif, Mst. Fahmida Tasnim Saba, and M Shamim Kaiser",
  url: "https://data.mendeley.com/datasets/rgn2d2jb7f/1",
  license: "https://creativecommons.org/licenses/by/4.0/",
} as const;
