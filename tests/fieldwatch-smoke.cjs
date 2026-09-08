const { chromium } = require("../../node_modules/playwright");
const path = require("node:path");

const URL = "http://127.0.0.1:4173/";
const PHOTOS = [
  "001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG",
  "002a55fb-7a3d-4a3a-aca8-ce2d5ebc6925___RS_Early.B 8170.JPG",
  "009c8c31-f22d-4ffd-8f16-189c6f06c577___RS_Early.B 7885.JPG",
].map((name) => path.resolve(`.ml-data/plantvillage/raw/color/Potato___Early_blight/${name}`));

async function mockExtremeWeather(context) {
  await context.route("https://geocoding-api.open-meteo.com/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ results: [{ latitude: 25.74, longitude: 89.27 }] }),
  }));
  await context.route("https://api.open-meteo.com/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      current: { temperature_2m: 23, relative_humidity_2m: 88, precipitation: 2, weather_code: 61 },
      daily: {
        time: ["2026-09-01", "2026-09-02", "2026-09-03"],
        temperature_2m_max: [31, 36, 32], temperature_2m_min: [20, 22, 21],
        precipitation_sum: [60, 4, 2], wind_gusts_10m_max: [35, 55, 30], weather_code: [95, 3, 2],
      },
    }),
  }));
}

async function addThreePhotos(page) {
  for (let step = 0; step < 3; step += 1) {
    await page.locator('#scan input[type="file"]').setInputFiles(PHOTOS[step]);
    await page.getByRole("button", { name: /ছবি পরীক্ষা করুন|Check this photo/ }).click();
    if (step < 2) {
      await page.locator(".photo-accepted").waitFor({ timeout: 60_000 });
      await page.getByRole("button", { name: /পরের ছবি তুলুন|Take next photo/ }).click();
    }
  }
  await page.locator(".field-summary").waitFor({ timeout: 60_000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, serviceWorkers: "block" });
    await mockExtremeWeather(context);
    const page = await context.newPage();
    page.on("console", (message) => { if (message.type() === "error") errors.push(`${viewport.name}: ${message.text()}`); });
    page.on("pageerror", (error) => errors.push(`${viewport.name}: ${error.message}`));
    const response = await page.goto(URL, { waitUntil: "networkidle" });
    if (!response || response.status() !== 200) throw new Error(`${viewport.name}: page did not return 200`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.locator(".extreme-weather").waitFor();
    await page.getByRole("button", { name: /৩টি ছবি দিয়ে দেখুন|Use three photos instead/ }).first().click();
    if (await page.locator(".field-path span").count() !== 3) throw new Error(`${viewport.name}: guided scan does not show three steps`);
    await page.screenshot({ path: `test-results/fieldwatch-${viewport.name}.png`, fullPage: true });
    await context.close();
  }

  const onlineContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await mockExtremeWeather(onlineContext);
  const onlinePage = await onlineContext.newPage();
  await onlinePage.goto(URL, { waitUntil: "networkidle" });
  await onlinePage.evaluate(() => localStorage.removeItem("alusathi-field-diary-v1"));
  await addThreePhotos(onlinePage);
  let onlineEntries = await onlinePage.evaluate(() => JSON.parse(localStorage.getItem("alusathi-field-diary-v1") || "[]"));
  if (onlineEntries.length !== 1 || onlineEntries[0].scanCount !== 3) throw new Error("Three-photo result was not saved as one timeline entry");
  if (await onlinePage.locator('#diary, a[href="#diary"]').count()) throw new Error("Guest history should be hidden");
  await onlinePage.screenshot({ path: "test-results/three-photo-result-mobile.png", fullPage: true });
  await onlineContext.close();

  const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(URL, { waitUntil: "networkidle" });
  await offlinePage.evaluate(() => navigator.serviceWorker.ready);
  await offlinePage.reload({ waitUntil: "networkidle" });
  await offlinePage.evaluate(async () => {
    const modelCached = async () => (await Promise.all((await caches.keys()).map(async (name) => (await caches.open(name)).keys()))).flat().some((request) => request.url.includes("potato_mobilenet_v3.onnx"));
    const deadline = Date.now() + 60_000;
    while (!(await modelCached()) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250));
    if (!(await modelCached())) throw new Error("Offline model was not precached");
    localStorage.removeItem("alusathi-field-diary-v1");
  });
  await offlineContext.setOffline(true);
  await offlinePage.reload({ waitUntil: "domcontentloaded" });
  await offlinePage.waitForFunction(() => navigator.onLine === false);
  await addThreePhotos(offlinePage);
  await offlinePage.getByText(/এই ফোনেই AI পরীক্ষা হয়েছে|AI checked this on your phone/).waitFor();
  const offlineEntries = await offlinePage.evaluate(() => JSON.parse(localStorage.getItem("alusathi-field-diary-v1") || "[]"));
  if (offlineEntries.length !== 1 || offlineEntries[0].inferenceMode !== "offline") throw new Error("Offline diagnosis was not recorded correctly");
  await offlinePage.screenshot({ path: "test-results/offline-diagnosis-mobile.png", fullPage: true });
  await offlineContext.close();

  await browser.close();
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("AluSathi desktop, mobile, three-photo, weather and offline checks passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
