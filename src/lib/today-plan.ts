import type { FieldAction } from "./field-actions";

export type PlanPhoto = { id: string; title: string; body: string; condition: "healthy" | "marks" | "unclear"; modelResult?: "healthy" | "defective"; date?: string; sample?: number; thumbnail?: string };
export type PlanContext = { date: string; district: string; band: string; rain: boolean; humid: boolean; photo: PlanPhoto | null; lastTreatment?: string };
export type PlanTask = { id: string; text: string; why: string; how: string };
export function recentPhoto(actions: FieldAction[], district: string, today: string) {
  const now = Date.parse(today);
  return photoContext(actions.filter(item => {
    const elapsed = now - Date.parse(item.date);
    return item.district === district && elapsed >= 0 && elapsed <= 7 * 86400000;
  }));
}
export function sprayReference(photo: PlanPhoto | null, bn: boolean) {
  if (photo?.sample === 4) return bn ? "ম্যানকোজেব + মেটাল্যাক্সিল" : "Mancozeb + metalaxyl";
  if (photo?.sample === 5) return bn ? "ম্যানকোজেব" : "Mancozeb";
  return null;
}
export function photoContext(actions: FieldAction[]): PlanPhoto | null {
  const item = actions.find(action => action.category === "photo" && action.kind === "observation");
  if (!item) return null;
  const thumbnail = typeof item.image === "string" && item.image.length <= 60000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.image) ? item.image : undefined;
  return { id: item.id, title: typeof item.title === "string" ? item.title.slice(0,200) : "", body: typeof item.body === "string" ? item.body.slice(0,600) : "", condition: item.advice === "healthy" ? "healthy" : item.advice ? "marks" : "unclear", date: item.date, sample: Number(/^demo-sample-([1-5])-/.exec(item.id)?.[1]) || undefined, thumbnail, modelResult: item.tuberModelResult === "healthy" || item.tuberModelResult === "defective" ? item.tuberModelResult : undefined };
}
export function readTodayPlan(fallback: PlanContext): PlanContext {
  try {
    const saved = JSON.parse(localStorage.getItem("alusathi-today-plan-v1") || "null");
    if (saved?.date === fallback.date && saved.district === fallback.district && ["", "lt30","30to60","60to90","gt90"].includes(saved.band) && typeof saved.rain === "boolean" && typeof saved.humid === "boolean" && (!saved.lastTreatment || typeof saved.lastTreatment === "string") && (saved.photo === null || (typeof saved.photo?.id === "string" && typeof saved.photo.title === "string" && typeof saved.photo.body === "string" && ["healthy","marks","unclear"].includes(saved.photo.condition)))) return saved;
  } catch { /* Invalid saved plans never replace current field context. */ }
  return fallback;
}
export function buildTodayTasks(context: PlanContext, bn: boolean): PlanTask[] {
  const t = (b:string,e:string) => bn ? b : e;
  const tasks: PlanTask[] = [];
  const add = (id:string,text:string,why:string) => tasks.push({id,text,why,how: t("জমিতে গিয়ে দেখে নিন এবং কাজ হলে টিক দিন।", "Check your field and tick this when done.")});
  if (context.photo?.condition === "healthy") add("photo-healthy",t("আলুটি ঘুরিয়ে নরম বা ভেজা অংশ আছে কি না দেখুন।","Turn the potato and check for soft or wet areas."),t("ছবিতে বড় দাগ না থাকলেও সব দিক ছবিতে দেখা যায় না। অকারণে স্প্রে নয়।","A photo does not show every surface. A normal-looking photo is not a reason to spray."));
  if (context.photo?.condition === "marks") {
    const labels: Record<number, [string,string]> = { 2:["হালকা দাগের চারপাশ আলাদা করে দেখুন।","Inspect around the light marks."], 3:["ছড়িয়ে থাকা দাগ নরম বা ভেজা কি না দেখুন।","Check whether the spread-out marks are soft or wet."], 4:["ক্ষতিগ্রস্ত আলুটি আলাদা রেখে ভেজা অংশ দেখুন।","Set the damaged potato apart and check for wet areas."], 5:["গভীর ক্ষতির আলুটি আলাদা পাত্রে রাখুন।","Keep the deeply damaged potato in a separate container."] };
    const label = labels[context.photo.sample || 0];
    add("photo-separate", label ? t(...label) : context.photo.modelResult ? t("আলুটি আলাদা করে দাগ আছে কি না দেখুন।","Set the potato aside and check for marks.") : t("দাগযুক্ত আলুটি আলাদা করে ক্ষতির জায়গা দেখুন।","Keep the marked potato separate and check the damaged area."),t("ছবির দাগের কারণ নিশ্চিত নয়। তোলা আলু দেখে মাঠের ওষুধ নির্ধারণ করা যায় না।","The cause of the marks is not clear. A harvested potato cannot tell you which field treatment to use."));
  }
  if (context.photo?.condition === "unclear") add("photo-retake",t("দিনের আলোয় একই আলুর অন্য দিকের ছবি দিন।","Take a photo of another side of the same potato in daylight."),t("অস্পষ্ট ফল দিয়ে রোগ বা ওষুধ বাছা ঠিক নয়।","Do not use an unclear result to choose a disease or treatment."));
  if (context.lastTreatment) add("treatment-review",t("আর কিছু দেওয়ার আগে আগের প্রয়োগের রেকর্ড মিলিয়ে নিন।","Check previous fertiliser or spray records before adding anything else."),t("আগের প্রয়োগ রাখা আছে। নতুন ছবি মানেই আবার সার বা স্প্রে দেওয়ার নির্দেশ নয়।","Previous fertiliser or spray use is recorded. A new photo does not mean you should add more."));
  if (context.band === "lt30") add("early-growth",t("অঙ্কুর ও ছোট গাছের বৃদ্ধি দেখুন।","Check sprouts and young plant growth."),t("আপনার দেওয়া চাষের সময় এক মাসের কম।","Your recorded crop age is under one month."));
  else if (context.band === "30to60") add("growing-leaves",t("গাছের নিচের পাতায় নতুন দাগ আছে কি না দেখুন।","Look for new marks on lower leaves."),t("গাছের বৃদ্ধির এই পর্যায়ে নতুন পরিবর্তন লিখে রাখুন।","Record new changes during this growth stage."));
  else if (context.band === "60to90") add("soil-check",t("মাটির আর্দ্রতা ও গাছের অবস্থা দেখুন।","Check soil moisture and plant condition."),t("শুধু বয়স ধরে সেচ বা তোলার দিন ঠিক করবেন না।","Do not choose watering or harvest dates using crop age alone."));
  else if (context.band === "gt90") add("harvest-check",t("পাতা শুকাচ্ছে কি না দেখে তোলার প্রস্তুতি যাচাই করুন।","Check if leaves are drying when planning the harvest."),t("জাত ও জমির অবস্থা না দেখে বয়স থেকেই তোলার সিদ্ধান্ত নয়।","Do not choose harvest timing using age alone. Check the variety and field condition."));
  if (context.rain) add("drainage",t("জমিতে পানি জমেছে কি না দেখুন।","Check whether water is standing in the field."),t("সংরক্ষিত আবহাওয়ার তথ্যে বৃষ্টি আছে।","The saved weather information includes rain."));
  else if (context.humid) add("humidity-check",t("কয়েকটি গাছের পাতার দুই পাশ দেখুন।","Inspect both sides of leaves on several plants."),t("আর্দ্রতা পর্যবেক্ষণের কারণ, রোগ নিশ্চিত হওয়ার প্রমাণ নয়।","Humid weather is a reason to look at plants. It does not confirm disease."));
  add("general-check",t("জমির কয়েকটি গাছ দেখে রাখুন।","Check several plants in the field."),t("নতুন পরিবর্তন আগে থেকে খেয়াল করা যায়।","Checking regularly helps you notice changes."));
  add("soil-observe",t("মাটি ভেজা না শুকনো দেখুন।","Check whether the soil is wet or dry."),t("সেচের সিদ্ধান্তের আগে মাটির অবস্থা জানা দরকার।","Check the soil before deciding whether to water."));
  add("field-record",t("জমিতে নতুন কিছু দেখলে খাতায় লিখুন।","Record any new field changes in Khata."),t("পরে আগের অবস্থার সঙ্গে মিলিয়ে দেখতে পারবেন।","Your notes help you compare changes later."));
  const how: Record<string, [string,string]> = {
    "photo-healthy": ["আলুটি ঘুরিয়ে প্রতিটি দিক হাতে ও চোখে দেখুন।", "Turn the potato and check each side by hand and eye."],
    "photo-separate": ["আলুটি আলাদা রেখে নরম বা ভেজা অংশ আছে কি না দেখুন।", "Set it aside and check for soft or wet areas."],
    "photo-retake": ["দিনের আলোয় কাছে থেকে আরেকটি পরিষ্কার ছবি তুলুন।", "Take a clear close-up in daylight."],
    "early-growth": ["জমির কয়েক জায়গায় ছোট গাছগুলো দেখুন।", "Check young plants in several areas."],
    "growing-leaves": ["কয়েকটি গাছের নিচের পাতা উল্টে দেখুন।", "Turn over lower leaves on several plants."],
    "soil-check": ["মাটি হাতে নিয়ে ভেজা না শুকনো দেখুন; গাছও দেখুন।", "Feel whether the soil is wet or dry. Check the plants too."],
    "harvest-check": ["কয়েকটি গাছের পাতার অবস্থা মিলিয়ে দেখুন।", "Compare the leaves on several plants."],
    "drainage": ["জমির নিচু জায়গাগুলো দেখুন।", "Check low-lying areas of the field."],
    "humidity-check": ["বিভিন্ন জায়গার কয়েকটি পাতার দুই পাশ দেখুন।", "Inspect both sides of leaves in different areas."],
    "treatment-review": ["খাতায় আগের সারের বা স্প্রের তথ্য দেখুন।", "Check previous fertiliser or spray entries in Khata."],
    "general-check": ["জমির বিভিন্ন জায়গার গাছগুলো দেখুন।", "Inspect plants in several parts of the field."],
    "soil-observe": ["কয়েক জায়গার মাটি হাতে নিয়ে দেখুন।", "Feel the soil in several places."],
    "field-record": ["খাতায় গিয়ে যা দেখেছেন তা লিখে সেভ করুন।", "Open Khata and save what you observed."],
  };
  return tasks.slice(0, 3).map(task => ({ ...task, how: t(...how[task.id]) }));
}
