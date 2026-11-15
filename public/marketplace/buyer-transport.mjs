import { districtPlaces } from "./districts.mjs";

const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function mountBuyerTransport(root, { language, lot, quantityKg }) {
  const t = (bn, en) => language === "bn" ? bn : en;
  const format = new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD");
  const placeName = key => language === "bn" ? districtPlaces[key]?.bn || "" : key || "";
  const query = new URL(location.href).searchParams;
  const linkedLot = query.get("transportLot") ? lot : null;
  const pickup = linkedLot && districtPlaces[linkedLot.district] ? linkedLot.district : "";
  const amount = linkedLot && Number(quantityKg) > 0 ? `${format.format(quantityKg)} ${t("কেজি", "kg")}` : "";
  const choices = selected => `<option value="">${t("জেলা বাছুন", "Choose a district")}</option>${Object.keys(districtPlaces).map(key => `<option value="${key}" ${selected === key ? "selected" : ""}>${esc(placeName(key))}</option>`).join("")}`;

  root.innerHTML = `<section class="section page-shell buyer-transport-page">
    <section class="panel buyer-transport-provider"><div><span class="section-kicker">${t("গাড়ি খুঁজুন", "Find a truck")}</span><h1>Truck Lagbe</h1><p>${t("আপনার যাত্রার তথ্য নিয়ে সরাসরি সেবাদাতার সঙ্গে কথা বলুন। আলুসাথী গাড়ি বুক করে না।", "Discuss your trip details directly with the provider. AluSathi does not book trucks.")}</p><strong>Booking is completed outside AluSathi.</strong></div><div class="buyer-transport-trip"><label for="buyer-trip-text">${t("পাঠানোর তথ্য", "Trip details")}</label><textarea id="buyer-trip-text" rows="5" readonly></textarea><div class="buyer-transport-actions"><button type="button" class="button button-outline" id="buyer-copy-trip">${t("তথ্য কপি করুন", "Copy trip details")}</button><a class="button button-green" href="https://trucklagbe.com/" target="_blank" rel="noopener noreferrer">${t("Truck Lagbe খুলুন ↗", "Open Truck Lagbe ↗")}</a></div><p id="buyer-copy-status" role="status"></p></div></section>
    <header class="buyer-transport-heading"><span class="section-kicker">${t("আলুর পথ", "Potato transport")}</span><h2>${t("পরিবহন দেখে নিন", "Explore transport")}</h2><p>${t("কোনো তথ্য না লিখেও দেখতে পারেন। বুকিংয়ের জন্য সেবাদাতার সঙ্গে যোগাযোগ করুন।", "You can look without entering details. Contact the provider to book a truck.")}</p></header>
    <form id="buyer-transport-form" class="panel buyer-transport-fields"><label>${t("কোথা থেকে তুলবেন", "Pickup district")}<select name="from">${choices(pickup)}</select></label><label>${t("কোথায় নামাবেন", "Destination district")}<select name="to">${choices("")}</select></label><label>${t("সংগ্রহের তারিখ", "Collection date")}<input name="date" type="date" /></label><label>${t("পরিমাণ", "Quantity")}<input name="quantity" value="${amount}" readonly /></label></form>
    <p class="buyer-transport-note">${t("পথের তথ্য শুধু আপনার জন্য। এখানে গাড়ি বুক বা লেনদেন করা হয় না।", "Trip details are for your use. No booking or transaction happens here.")}</p>
  </section>`;

  const form = root.querySelector("#buyer-transport-form");
  const textarea = root.querySelector("#buyer-trip-text");
  const update = () => {
    const from = form.elements.from.value;
    const to = form.elements.to.value;
    const date = form.elements.date.value;
    textarea.value = [
      `${t("পণ্য", "Product")}: ${t("আলু", "Potatoes")}`,
      `${t("কোথা থেকে", "Pickup")}: ${placeName(from)}`,
      `${t("কোথায়", "Destination")}: ${placeName(to)}`,
      `${t("পরিমাণ", "Quantity")}: ${form.elements.quantity.value}`,
      `${t("সংগ্রহের তারিখ", "Collection date")}: ${date}`,
    ].join("\n");
  };
  form.addEventListener("change", update);
  update();
  root.querySelector("#buyer-copy-trip").addEventListener("click", async () => {
    const status = root.querySelector("#buyer-copy-status");
    try { await navigator.clipboard.writeText(textarea.value); status.textContent = t("তথ্য কপি হয়েছে।", "Trip details copied."); }
    catch { textarea.focus(); textarea.select(); status.textContent = t("লেখা বেছে দেওয়া হয়েছে—নিজে কপি করুন।", "Text selected; copy it manually."); }
  });
}
