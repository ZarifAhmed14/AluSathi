import { useRef, useState } from "react";
import type { CareArea } from "@/lib/care-area";
import { PROFILE_CHANGED } from "@/lib/farmer-profile";

const numeric = (value: string) => Number(value.replace(/[০-৯]/g, digit => String("০১২৩৪৫৬৭৮৯".indexOf(digit))));
export default function CareLandEditor({ bn, area }: { bn: boolean; area: CareArea }) {
  const t = (b: string, e: string) => bn ? b : e;
  const [message, setMessage] = useState("");
  const [editingLand, setEditingLand] = useState(false);
  const [landValue, setLandValue] = useState(area.value);
  const [landUnit, setLandUnit] = useState(area.unit);
  const [landError, setLandError] = useState("");
  const editButton = useRef<HTMLButtonElement>(null);
  function closeLand() { setEditingLand(false); requestAnimationFrame(() => editButton.current?.focus()); }
  function saveLand(event: React.FormEvent) {
    event.preventDefault();
    const value = numeric(landValue.trim());
    if (!Number.isFinite(value) || value <= 0 || value > 100000) { setLandError(t("শূন্যের বেশি সঠিক জমির মাপ দিন।", "Enter a land size above zero.")); return; }
    try {
      const profile = JSON.parse(localStorage.getItem("alusathi-farmer-profile-v1") || "{}");
      localStorage.setItem("alusathi-farmer-profile-v1", JSON.stringify({...profile, land:String(value), landUnit}));
      window.dispatchEvent(new Event(PROFILE_CHANGED));
      setMessage(t("জমির মাপ রাখা হয়েছে। হিসাব বদলে গেছে।", "Land size saved. The amounts have been updated."));
      closeLand();
    } catch { setLandError(t("মাপ রাখা যায়নি। আবার চেষ্টা করুন।", "Could not save. Please try again.")); }
  }
  const format = (value: number) => value.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 });
  return <>
    <div className="care-land-summary"><strong>{t("জমি:", "Field:")} {format(numeric(area.value))} {({decimal:t("শতক","shatak"),acre:t("একর","acres"),hectare:t("হেক্টর","hectares"),bigha:t("বিঘা","bigha")})[area.unit]}</strong><button ref={editButton} type="button" aria-expanded={editingLand} aria-controls="care-land-editor" onClick={() => { setLandValue(area.value); setLandUnit(area.unit); setLandError(""); setEditingLand(true); }}>{t("এডিট করুন", "Edit")}</button></div>
    {editingLand && <form id="care-land-editor" className="care-land-editor" onSubmit={saveLand} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeLand(); } }}>
      <label>{t("জমির পরিমাণ", "Land size")}<input autoFocus inputMode="decimal" maxLength={12} value={landValue} onChange={event => setLandValue(event.target.value)} /></label>
      <label>{t("একক", "Unit")}<select value={landUnit} onChange={event => setLandUnit(event.target.value as CareArea["unit"])}><option value="decimal">{t("শতক", "shatak (1/100 acre)")}</option><option value="acre">{t("একর", "acre")}</option><option value="hectare">{t("হেক্টর", "hectare")}</option><option value="bigha">{t("বিঘা", "bigha")}</option></select></label>
      {landUnit === "bigha" && <small>{t("এই হিসাবে ১ বিঘা =", "This calculation uses 1 bigha =")} {format(numeric(area.bigha))} {t("শতক", "shatak")}</small>}
      <div><button type="submit">{t("সেভ করুন", "Save")}</button><button type="button" onClick={closeLand}>{t("বাতিল", "Cancel")}</button></div>{landError && <p role="alert">{landError}</p>}
    </form>}
    {message && <p role="status" className="care-message">{message}</p>}
  </>;
}
