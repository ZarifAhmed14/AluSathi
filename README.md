# AluSathi — আলুসাথী

**From planting seed potatoes to finding buyers for the harvest.**

AluSathi is a Bangla-first platform supporting potato farmers in Bangladesh throughout their 90-day growing journey. It brings crop photo checks, daily tasks, seasonal planning, farm records, and buyer connections into one place, with Bangla and English interfaces.

After months of hard work, a farmer should not have to watch their harvest sell for a loss. AluSathi’s mission is to help them reach buyers beyond their own district, giving them more choices when it is time to sell.

[Visit AluSathi](https://alusathi-fieldwatch.vercel.app/) · [Buyer marketplace](https://alusathi-fieldwatch.vercel.app/marketplace/buyer.html)

## For farmers

- **ছবি — Photos:** Upload crop photos, review visible-condition screening results, and keep observations together.
- **আজকের কাজ — Today’s Tasks:** Follow daily activities, photo-related next steps, and fertilizer and spray reference sections.
- **মৌসুমের অগ্রগতি — Seasonal Progress:** Explore the 90-day calendar, growing stages, weather context, planting guidance, and completed activities.
- **খাতা — Farm Records:** Record expenses, fertilizer and spray activity, and notes throughout the season.
- **বিক্রির আগে — Before Selling:** Prepare crop information and work through a checklist before listing the harvest.
- **বাজারে দিন — List Potatoes:** Add a variety, quantity, asking price, collection date, and photos for buyers to review.

## For buyers

- **আলু খুঁজুন — Find Potatoes:** Filter available lots by district, variety, quantity, and price; compare lots and contact farmers.
- **বাজারের খবর — Market Insights:** Compare retailer prices and explore historical wholesale-price and production charts.
- **Cost and profit calculator:** Combine purchase, transport, labour, loading, tolls, and other costs. Enter an expected resale price to calculate potential profit or loss.
- **খাতা — Buyer Records:** Keep purchase-related notes and expenses together.
- **Transport contacts:** Find links to transport providers when planning collection.

AluSathi connects farmers and buyers. They agree directly on price, payment, transport, and collection; the platform does not process payments or complete transactions on their behalf.

## Technology

| Layer | Tools |
| --- | --- |
| Interface | React, TypeScript, Vite, Tailwind CSS, Radix UI |
| Browser image inference | ONNX Runtime Web |
| Model training and image processing | PyTorch, Torchvision, Pillow |
| Python API | FastAPI, Uvicorn |
| Account-linked records | Supabase PostgreSQL and authentication |
| Browser storage | localStorage and IndexedDB |
| Charts | Custom SVG charts |
| Installation and caching | Vite PWA plugin and service worker |
| Hosting | Vercel |

The browser photo pipeline includes potato-presence screening, visible-defect screening, and a limited Diamant/Asterix variety comparison. Image screening is advisory: a photo result does not establish a confirmed disease diagnosis or a safe chemical dose. Model training and evaluation details are in [ml/README.md](ml/README.md) and [PHASE1_EVALUATION.md](PHASE1_EVALUATION.md).

## Run locally

Use Node.js 22.12 or newer and npm. Python 3.11 is needed only for the Python API and model tooling.

```powershell
git clone https://github.com/ZarifAhmed14/AluSathi.git
cd AluSathi
npm ci
Copy-Item .env.example .env.local
npm run dev -- --host 127.0.0.1 --port 4176 --strictPort
```

Open **http://127.0.0.1:4176/**. Farmer pages are at `/farmer`; the buyer marketplace is at `/marketplace/buyer.html`.

Use your own Supabase project’s public configuration in `.env.local` when configuring account features. Never put database passwords, service-role keys, or other server secrets in `VITE_` variables or commit them to Git.

### Optional Python API

In a separate PowerShell terminal:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
npm run api
```

The API listens on `http://127.0.0.1:8765`; Vite proxies `/api` requests to it. Account features require the appropriate Supabase server configuration. Deploying the frontend alone does not deploy the Python API. Database setup files are under [supabase/](supabase/).

### Build and check

```powershell
npm run check
npm run preview -- --host 127.0.0.1 --port 4175
```

`npm run check` runs TypeScript checks, ESLint, and the production build. Browser checks live in [tests/](tests/), with the CI sequence in [.github/workflows/check.yml](.github/workflows/check.yml).

## Data and offline use

Browser-stored records remain in that browser unless explicitly synced through an account-backed feature. Clearing browser storage removes local records. Retail prices depend on source availability; profit calculations depend on the entered costs and resale price.

The installable app caches its shell and selected resources. Image models download separately and must be cached before offline scanning. Network-dependent features still require connectivity. Farmer photos must not be reused for training without consent.

## Challenge area

**AgriSphere AI → FarmMarket:** fair-price market access and demand matching, supported by pricing information, lot comparisons, and direct farmer–buyer connections.
