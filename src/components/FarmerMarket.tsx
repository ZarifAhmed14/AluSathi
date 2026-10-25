import { useRef, useState } from "react";
import { Camera, CheckCircle2, Upload } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { localToday } from "@/lib/local-date";
import { FarmerLot, saveFarmerLot } from "@/lib/farmer-market";

const photoSets = [
  ["potato-01.webp", "potato-gallery-02.webp", "potato-gallery-04.webp"],
  ["potato-02.webp", "potato-gallery-01.webp", "potato-gallery-05.webp"],
  ["potato-03.webp", "potato-gallery-03.webp", "potato-05.webp"],
].map(set => set.map(name => `/marketplace/demo-lots/${name}`));

async function preparePhoto(file: File): Promise<string> {
  if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 2_000_000 || file.size === 0) throw new Error("Choose a JPEG, PNG or WebP image under 2 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!((file.type === "image/jpeg" && jpeg) || (file.type === "image/png" && png) || (file.type === "image/webp" && webp))) throw new Error("The selected file is not a valid image.");
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 32_000_000) throw new Error("The image dimensions are not supported.");
    const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", 0.68);
    if (result.length > 800_000) throw new Error("Please choose a smaller image.");
    return result;
  } finally { bitmap.close(); }
}

export default function FarmerMarket({ district }: { district: string }) {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [photoChoice, setPhotoChoice] = useState<number | null>(0);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const savedAt = useRef(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<FarmerLot | null>(null);
  const preview = (lot: FarmerLot) => `/marketplace/buyer.html?lot=${encodeURIComponent(lot.id)}&preview=1#buyer-detail`;

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const kg = Number(quantity);
    const rate = Number(price);
    if (!Number.isFinite(kg) || kg <= 0 || kg > 100_000 || !Number.isFinite(rate) || rate <= 0 || rate > 100_000) {
      setError(bn ? "সঠিক কেজি ও প্রতি কেজির দাম লিখুন।" : "Enter valid kilograms and price per kg."); return;
    }
    if (photoChoice === null && files.length !== 3) { setError(bn ? "ঠিক তিনটি ছবি দিন।" : "Add exactly three photos."); return; }
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const images = photoChoice === null ? await Promise.all(files.map(preparePhoto)) : photoSets[photoChoice];
      const now = new Date().toISOString();
      const lot: FarmerLot = {
        id: crypto.randomUUID(), demoPublished: true, published: true, farmerName: "Farzana Begum",
        district, upazila: district === "Rangpur" ? "Pirganj" : "", variety: "Potatoes", purpose: "unknown",
        quantityKg: kg, readyDate: localToday(), askingPriceMin: rate, askingPriceMax: rate,
        photo: images[0], photos: images.map(src => ({ src, addedAt: now })), createdAt: now,
      };
      saveFarmerLot(lot);
      savedAt.current = Date.now();
      setSaved(lot);
    } catch (cause) { setError(cause instanceof Error ? cause.message : (bn ? "লট রাখা যায়নি।" : "Could not save the lot.")); }
    finally { pending.current = false; setSaving(false); }
  }

  return <main className="farmer-market app-shell">
    <div className="farmer-market-heading"><p className="section-kicker">{bn ? "কৃষকের বাজার" : "FARMER MARKET"}</p><h1>{bn ? "বাজারে দিন" : "List your potatoes"}</h1><p>{bn ? "তিনটি তথ্য দিলেই আপনার আলু ক্রেতার তালিকায় দেখা যাবে।" : "Three details, then your potatoes appear in the buyer catalogue."}</p></div>
    {saved ? <section className="farmer-market-success" role="status"><CheckCircle2 size={38} /><h2>{bn ? "সফলভাবে বাজারে দেওয়া হয়েছে" : "Successfully listed"}</h2><p>{saved.quantityKg.toLocaleString(bn ? "bn-BD" : "en-BD")} {bn ? "কেজি" : "kg"} · ৳{saved.askingPriceMin.toLocaleString(bn ? "bn-BD" : "en-BD")}/{bn ? "কেজি" : "kg"}</p><div className="farmer-market-actions"><a className="secondary-main" href={preview(saved)}>{bn ? "ব্যবসায়ীর পাতায় দেখুন" : "View on business page"}</a><button type="button" className="text-button" onClick={() => { if (Date.now() - savedAt.current < 650) return; setSaved(null); setQuantity(""); setPrice(""); setFiles([]); setPhotoChoice(0); }}>{bn ? "আরেকটি লট দিন" : "Add another lot"}</button></div></section> :
      <form className="farmer-market-form" onSubmit={publish}>
        <div className="farmer-market-fields"><label><span>01 · {bn ? "কত কেজি?" : "How many kg?"}</span><input required type="number" min="0.001" max="100000" step="0.001" inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} placeholder={bn ? "যেমন ২০০" : "e.g. 200"} /></label><label><span>02 · {bn ? "প্রতি কেজির দাম কত?" : "Asking price per kg?"}</span><div className="farmer-market-price"><strong>৳</strong><input required type="number" min="0.01" max="100000" step="0.01" inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} placeholder={bn ? "যেমন ২২" : "e.g. 22"} /></div></label></div>
        <fieldset className="farmer-market-photos"><legend>03 · {bn ? "ছবি যোগ করুন" : "Add photos"}</legend><p>{bn ? "নিচের তিনটি ছবি বাছুন, অথবা নিজের ঠিক তিনটি ছবি দিন।" : "Choose one ready photo set below, or upload exactly three of your own."}</p><div className="farmer-market-photo-grid">{photoSets.map((set, index) => <button key={index} type="button" className={photoChoice === index ? "selected" : ""} aria-pressed={photoChoice === index} onClick={() => { setPhotoChoice(index); setFiles([]); }}><img src={set[0]} alt="" /><span>{bn ? `ছবি ${index + 1}` : `Photo set ${index + 1}`} · 3</span></button>)}</div><label className="farmer-market-upload"><Upload size={18} />{bn ? "নিজের তিনটি ছবি দিন" : "Upload your three photos"}<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { setFiles(Array.from(event.target.files || [])); setPhotoChoice(null); }} /></label>{photoChoice === null && <small>{files.length} / 3 {bn ? "ছবি বেছে নেওয়া হয়েছে" : "photos selected"}</small>}</fieldset>
        <p className="farmer-market-auto">{bn ? "স্থান" : "Location"}: {district === "Rangpur" ? (bn ? "পীরগঞ্জ, রংপুর" : "Pirganj, Rangpur") : district} · {bn ? "আজই প্রস্তুত" : "Ready today"}</p>
        {error && <p className="farmer-market-error" role="alert">{error}</p>}
        <button className="secondary-main" type="submit" disabled={saving}>{saving ? (bn ? "রাখা হচ্ছে…" : "Saving…") : (bn ? "বাজারে ছাড়ুন" : "List potatoes")}</button>
      </form>}
  </main>;
}
