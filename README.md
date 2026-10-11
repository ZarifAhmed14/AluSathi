# AluSathi

Bangla-first potato field tools for Bangladesh farmers: leaf-photo symptom notes and expert handoff, weather context, an experimental tuber photo check, crop records and a local marketplace preview.

Competition evidence, demo instructions and honest completion status are indexed in [`competition/README.md`](competition/README.md).

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm run api
```

In a second terminal:

```powershell
npm run dev
```

Open `http://127.0.0.1:8080`.

## Screening model

The checked-in model artifact uses MobileNetV3-Small transfer learning on the public PlantVillage potato classes: healthy, early blight and late blight. See `ml/README.md` for reproducible data preparation and training commands.

```powershell
npm run ml:train
```

This is an online-image screening model, not a field-validated diagnostic system. Predictions show uncertainty, and chemical decisions require confirmation from an agricultural expert. Farmer photos must not be reused for training without consent.

The current checkpoint is connected but intentionally locked to uncertain results: external evaluation on 13,800 regional images reached only 51.19% accuracy. See [PHASE1_EVALUATION.md](PHASE1_EVALUATION.md) for the go/no-go decision, confusion-matrix summary and reproduction command.

The API reports the exact loaded artifact and version at `GET /health`. Override the checked-in artifact with `ALUSATHI_MODEL`, `ALUSATHI_MODEL_METADATA` and `ALUSATHI_MODEL_VERSION` when a replacement PyTorch checkpoint is available.

The locked leaf checkpoint remains available for research, but the farmer leaf flow does not run it or claim a disease diagnosis. It records one photo, four observed symptoms, weather context and a report to share with an expert. A BARI/DAE pathologist has not reviewed the symptom questions yet. Regenerate the research ONNX file after replacing the PyTorch model:

```powershell
.venv\Scripts\python.exe ml\export_onnx.py
npm run build
```

The PWA precaches only the small app shell and data. Potato-scanner models download on first use, or via the optional ~35 MB offline pack; the scanner is unavailable offline on a fresh install until those files are cached. Serve `dist` with `npm run preview` to verify installation and offline mode; service workers are disabled during normal Vite development.

## Login and notifications

The public `/auth` page remains a farmer/businessman role picker, not authentication. It stores the choice in this browser's session. Optional real login is at `/account` and requires `VITE_ENABLE_ACCOUNTS=true` plus the separate Python API. The API uses HttpOnly, SameSite=Strict refresh cookies (Secure on HTTPS); short-lived access tokens stay in memory. Guest leaf notes do not require an account. Route `/api` to the Python API in production, set `ALUSATHI_ORIGINS` to the exact HTTPS website origin, and supply `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` through the server environment. Never supply a database password or service-role key to the browser.

Supabase project: `wztcmrrraglfzuszxgtf`. Before public signup, configure custom SMTP and allow your website's `/account` URL in Authentication > URL Configuration. Local redirects include `http://127.0.0.1:4173/account` and `http://127.0.0.1:8080/account`. Keep email verification enabled. Enable leaked-password protection if your Supabase plan supports it.

Background push uses `push_subscriptions`, `treatment_reminders`, the `send-reminders` Edge Function, and a one-minute database Cron job. Worker secrets are in Supabase Vault, not Git. RLS limits records to their owner; clients cannot change delivery status. The worker restricts outbound push hosts and disables redirects. It retries unsuccessful delivery at five-minute intervals, up to twelve attempts; jobs older than 24 hours are not pushed. Delivery is best-effort, not an alarm guarantee. Only a generic notification appears on the lock screen. Important tasks can also be exported to the phone calendar.

Enable notifications in the app on each device. On iPhone/iPad, install the PWA to the Home Screen first. HTTPS (or localhost), browser permission, a running service worker, and internet connectivity are required. Automated Chromium cannot register with its push service in this environment; a real-phone delivery check remains required. Live account, RLS, reminder CRUD, calendar-export and scheduler tests are covered separately.

Deployment schema is in `supabase/farmer_records.sql` and `supabase/push_reminders.sql`; schedule in `supabase/reminder_schedule.sql`. Do not rotate VAPID keys without resubscribing devices.

## Tuber dataset

[Drive collection](https://drive.google.com/drive/folders/1pIdjXxZFCizntza6GSHbC4ozGY_4YUFE): 12,007 curated images in nine labelled folders, packaged as class ZIPs. Target was 13,800; the clean collection is 1,793 short. No padding was added. The folder includes source attribution, per-image manifest, package checksums, counts and a preview sheet. Photos are separate from the leaf model; no tuber model was trained or substituted by this update.

Counts: healthy 4,872; defective-unspecified 6,552; dry rot 222; blackspot bruising 109; soft rot 78; brown rot 14; pink rot 55; black scurf 49; common scab 56. Rare classes are not sufficient for dependable disease-specific training. Labels come from publishers, not an independent pathology review. Sources mix Bangladesh material with other regions, and some source augmentations may be unmarked. Keep new local farm/tuber photos as an independent test set.

Reproduction tools: `ml/download_bd_tubers.ps1`, `ml/curate_tubers.py` and `ml/verify_tuber_package.py`. See the Drive dataset card for the four source URLs and licensing.

## Checks

```powershell
npm run check
# With npm run preview running on port 4175:
node tests/leaf-triage.cjs
node tests/offline-pack.cjs
node tests/potato-preprocess.cjs  # requires Python and Pillow
```

The same build and browser checks run in `.github/workflows/check.yml`. The potato variety panel exposes model scope and validation status; it does not report an accuracy figure without an independently verified test set.
