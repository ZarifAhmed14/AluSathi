# AluSathi English copy: Phase 2 verification

Implemented locally after the user's approval on 15 November 2026. Base commit: e7ab25ef8e9525c772d8c1435c68dbcea54b62bc, branch codex/farmer-buyer-profiles. Checkout: C:/Users/Mysha/AppData/Local/Temp/AluSathi-audit-20261110.

Publication was subsequently authorised on a separate branch, `codex/english-copy-localization`, with a pull request into `ZarifAhmed14/AluSathi:main`. This copy update builds on the profiles/calendar changes in PR #3. The archived Phase 1 statements below describe the earlier audit-only stage, not the approved implementation or publication.

## Implementation result

| Check | Result |
|---|---|
| Approved English replacements | **784 / 784 applied**, across **60 application source files** |
| Uncertain occurrences | **40 / 40 unchanged**, including all 33 previously flagged potential risks |
| Test-only changes | **16 English display expectations in 9 existing test files**; no assertion, selector structure, condition, timeout or test was removed or weakened |
| Bangla preservation | Unchanged in all 198 inspected source files; 60 changed files compared against their pre-edit Bangla sequences, 138 other files retain their original SHA-256 |
| Approved-range verification | Each changed source file equals its original content plus only its approved CSV ranges |
| Dynamic content | 1,560 unaffected template expressions checked; existing expressions, numeric/date formatting, plural branches, interpolation order and units retained |
| Meaning mismatches | 19 of the 26 Phase 1 cases addressed by approved copy; 7 remain held. The original evidence table below is retained for traceability |
| CSV | Exact approved 8-column, 784-row matrix retained, including original source lines and stable IDs; no status column added |
| Source diff | No CSS, dependencies, keys, routes, identifiers, API codes, agricultural calculations, models, prompts, crop schedules or data schemas changed |
| GitHub | Verification was completed locally before publication. A separate-branch push and pull request are now authorised; no merge is part of this task |

The original English fallback in disease-api.ts:39 is user-visible error text, and app.js:218 is the print iframe's accessible title. These two automatically flagged assignment/fallback contexts were manually checked; neither is a changed comparison or machine key. The stored unit value mon in tests/marketplace-trust-review.cjs is deliberately unchanged; the display glossary must not rewrite it.

## Executed checks

| Command / coverage | Result |
|---|---|
| npx tsc -p tsconfig.app.json --noEmit | PASS |
| npx eslint . | PASS, 0 errors and the same 10 react-refresh warnings observed before editing |
| npm run build | PASS; Vite native-loader/config and large-chunk warnings remain. No config or bundling change made to silence them |
| git diff --check | PASS; Git also prints its existing LF-to-CRLF normalisation notice for season-tips.ts |
| node tests/farmer-profile.cjs | PASS at 1440px and 390px, including Bangla/English, save/cancel, legacy records, photo handling, safe rendering and keyboard focus |
| node tests/buyer-profile.cjs | PASS at desktop Bangla, mobile Bangla and mobile English, including optional fields, contact data, photo compression, safe rendering and storage failure |
| node tests/demo-vibrancy.cjs | PASS: sample data invariants, catalogue photos, details, enquiries, filters, old records and mobile/desktop |
| node tests/potato-life-cycle.cjs | PASS at 390 × 844 and 1440 × 900, including keyboard/playback and language switch |
| Bundled Python: -m unittest tests.test_inference_policy | PASS, 3 tests. System Python initially lacked Pillow; the existing bundled Python includes it. Nothing installed |
| Read-only approved-range / CSV / Bangla / held-string / test-diff validation | PASS |

Existing Playwright commands used BASE_URL=http://127.0.0.1:8080, except potato-life-cycle.cjs, whose BASE_URL is the full http://127.0.0.1:8080/life-cycle route. Farmer/Buyer profile commands used PLAYWRIGHT_CHANNEL=msedge. Tests that assume bundled Chromium used a temporary launcher preload selecting installed Microsoft Edge; app source and test assertions were not changed for that environment adaptation. No dependency was installed. The initially failing Packaging and photo-error text assertions were updated to their approved English, then their full suites passed. Life-cycle heading and slider-name expectations were updated to their approved English as well.

## Browser and language results

- **112 route/view observations**, using desktop **1440 × 900** and mobile **390 × 844**, across both languages. Uncaught page errors: **0**. Rendered undefined/NaN/null, raw interpolation and broken-entity matches: **0**.
- **22 actual English → Bangla → English switch checks passed**. The Farmer preview has no switch at either size; both saved-language variants were loaded separately. No missing language feature was added.
- Prepared-photo result, empty calculator dialog and Buyer lot details opened successfully. Existing warnings and sample status remain visible.
- **2 additional complete English workflow runs** at the required widths passed: Farmer work/expense save, reload persistence, profit calculation (50 kg × ৳20 − ৳100 = ৳900), saving to Khata, and Buyer expense save/delete/undo. Hostile text stayed text; no injected image rendered.
- Fresh screenshots were visually inspected for English mobile Khata, desktop season and mobile Buyer catalogue. Existing profile and life-cycle tests also captured their required layouts. Shared proper names, user data, the Bangla brand wordmark and the opposite-language switch label remain permitted exceptions.
- Existing English Khata overflow is **390px viewport / 391px content**, reduced from 409px before editing. This is the only whole-page overflow observation. CSS was deliberately left unchanged. The existing Bangla-only 404 and missing/shared language fallbacks remain documented below.
- Mobile navigation labels wrap within their available space. No new horizontal overflow was found on other observed routes. These checks cover observed states, not every possible saved record, OS prompt or network error.

## Existing test / environment problems, reported separately

| Attempted test | Result and reason |
|---|---|
| tests/marketplace-money.mjs | FAIL before test execution: purchaseCost is not exported by market.mjs. The original HEAD version also has no such export |
| tests/marketplace-buyer-procurement.cjs | FAIL: expects removed #buyer-brief-form readyDate controls. Current catalogue uses #buyer-catalogue-filters. Offer/deal actions are disabled by the existing SALES_FEATURE_ENABLED=false |
| tests/farmer-today-tasks.cjs | FAIL waiting for the legacy .field-risk-banner fixture. No class name, rule, fixture, crop condition or task-selection logic was changed |
| tests/login-roles.cjs and tests/cold-storage.cjs | FAIL waiting for an exact /farmer URL; existing role entry navigates to /farmer#photos. No route assertion or app route was changed to force a pass |
| tests.test_auth_safety and tests.test_marketplace_safety | BLOCKED: installed system Python lacks FastAPI. Bundled Python also lacks FastAPI. No dependencies installed |

These are not presented as passing tests. The older audit scripts field-tools-audit.cjs, october-audit.cjs and review-regressions.cjs assume old hardcoded ports/screens; they were not rerun. push-browser.cjs requires authenticated fixtures and live push infrastructure and was not run. Their existing English-only locator expectations were updated where they exactly matched approved copy, without changing their behaviour. Other unexecuted legacy suites are not claimed as covered. Live model inference, live APIs, authenticated flows and actual push delivery were not tested or altered.

## Remaining review items and preview

All 40 uncertain strings below still use their original wording. Their tentative suggestions are not applied. The source-only language gaps and the hardcoded day-8 calendar claim remain outside this approved copy list. Some retained copy may still use older terms, for example “Convert kg, maunds and bags”; it has no approved CSV replacement and was not silently expanded into this change.

Preview server: **http://127.0.0.1:8080/**. Farmer: /farmer#photos. Buyer: /marketplace/buyer.html. The English homepage was opened and verified in the in-app browser. The local server remains on the requested port. Publication uses the separate branch named above.

---

# Archived Phase 1 audit

## Status and snapshot

**Historical Phase 1 snapshot, before the approved implementation above. At that point, application source and tests were untouched.** The three review files are proposals, not an implemented rewrite. Phase 2 requires the user's explicit approval.

- Checkout: `C:/Users/Mysha/AppData/Local/Temp/AluSathi-audit-20261110`.
- Branch: `codex/farmer-buyer-profiles`.
- Commit: `e7ab25ef8e9525c772d8c1435c68dbcea54b62bc`.
- Local preview: `http://127.0.0.1:8080`.
- Review date: 15 November 2026. This audits this local snapshot, not an unverified newer GitHub deployment.

## Counted results

| Measure | Count | Definition |
|---|---:|---|
| Application/data/style/SQL files examined | 198 | Full-file read and structural/content scan; coverage appendix below. Package/test configuration was also read for workflow context. |
| Files containing inventoried display copy | 75 | Includes active, dormant, metadata, accessibility, backend-response and exported text. |
| Candidate English occurrences | 3493 | Script extraction before visibility and identifier exclusions. |
| Display-copy occurrences found | 3428 | 3493 candidates minus 65 excluded implementation/internal occurrences. Repeated source locations count separately. |
| Distinct English values | 2866 | Deduplicated display values; not a replacement for occurrence counts. |
| Proposed rewrites | 784 | CSV rows; all remain unapplied. |
| Uncertain occurrences held | 40 | Listed below, including repeated occurrences; none is silently applied. |
| Retained occurrences | 2604 | Clear existing copy, shared units, proper nouns, citations and unchanged dynamic builders. |
| Bangla–English meaning mismatches | 26 | Distinct cases in the evidence table; repeated identical locations are grouped as explained. |
| Potentially unsafe automatic changes held | 33 | Safety, stored status/terms, protocol or dynamic-contract risks among the held occurrences. Not changes that were made. |
| Application source files changed | 0 | Only the three requested audit deliverables are created. |

Counts come from temporary analysis JSON, not visual estimates. Unchanged occurrences retain their previous IDs by path, exact English, paired Bangla and occurrence order. Newly discovered occurrences use a path/offset/text hash. This keeps IDs stable when source lines move. CSV line numbers refer to the snapshot above. Verify path + old string + surrounding expression before a later edit; do not apply by line number alone.

## What the application actually does

- Farmer entry uses `DemoContext`; dashboard views are selected by hash. Today tasks use `today-plan.ts` rules, crop age, observations and weather. They are not automatically AI predictions.
- `PHOTO_DEMO_CASES` are prepared photo examples. `TuberScan` also has real on-device presence, variety and condition-model paths. Leaf questions and reports are separate from a confirmed diagnosis. Existing uncertainty and spray limitations must remain.
- The 90-day calendar is approximate. Bigha conversion is user/local dependent. Fertiliser rates, chemical names, doses, intervals and all formulas remain unchanged.
- Current Farmer listing flow saves details and publishes a local listing. Before selling prepares details and packing checks, and shows cold-store contacts. Listing a potato lot is not selling it.
- Buyer flow supports catalogue search, details, saved comparison, enquiry preparation, costs/profit, requests, transport contacts, Khata and profile. These are browser-local records; payment and sale take place outside AluSathi.
- `public/marketplace/app.js:14` sets `SALES_FEATURE_ENABLED = false`. Offers, review, deals and payment-record screens remain dormant at this snapshot. The router guards them at lines 242, 253 and 872. Their shipped copy is audited but must not be described as a currently active capability.
- `FarmerHisab`, `HarvestMarket`, `TodayAiDemo`, `SellingEstimate`, `Footer` and `LanguageModal` have no active import/caller found in the current route tree. Their strings remain in scope as dormant source. Shared LanguageContext keys also include legacy multi-crop advice not used by current screens.

## Ten least certain strings

These are review questions, not approved replacements. Safety takes priority over a literal translation when Bangla itself needs review.

### 1. AluSathiDashboard.tsx:147

- Evidence: `src/components/AluSathiDashboard.tsx:147` (EN-34b8431bd7).
- Exact Bangla: আজ আর কিছু করতে হবে না। একই জায়গা মনে রাখুন।
- Existing English: No urgent action is needed. Remember this place.
- Proposed wording: “No more work is needed today. Remember this place.” is literal Bangla, but hold it: it may overstate safety.
- Why uncertain: Safety conflict: Bangla says no more work today; English only says no urgent action. Decide the intended advice before translating.

### 2. TuberScan.tsx:179

- Evidence: `src/components/TuberScan.tsx:179` (EN-cc3820a94f).
- Exact Bangla: আলুর গায়ে বড় দৃশ্যমান দাগ, নরম বা ভেজা অংশ ধরা পড়েনি।
- Existing English: No major visible mark, soft area or wet area was detected.
- Proposed wording: “No major visible marks were found in this photo.” requires approval to remove the unsupported firmness/wetness claim in both languages.
- Why uncertain: A surface classifier cannot check firmness. Both languages overstate what a photo can establish.

### 3. LanguageContext.tsx:19

- Evidence: `src/contexts/LanguageContext.tsx:19` (EN-ab18132c47).
- Exact Bangla: মেশিন লার্নিং দ্বারা সঠিক সার ও সেচের পরামর্শ পান। মাটির স্বাস্থ্য রক্ষা করে ফসলের ফলন বাড়ান।
- Existing English: Get precise fertilizer and irrigation recommendations powered by machine learning. Optimize your crop yield while protecting soil health.
- Proposed wording: “Get fertiliser and watering advice.” is a possible scope description only after the precise-ML and yield promises are resolved. No replacement approved.
- Why uncertain: Legacy translation promises precise ML advice. No active caller of this key found. Do not endorse or silently remove the agricultural claim.

### 4. LanguageContext.tsx:93

- Evidence: `src/contexts/LanguageContext.tsx:93` (EN-71d0c53fc6).
- Exact Bangla: সেচ দিন!
- Existing English: WATER NEEDED
- Proposed wording: “Water your crop.” follows Bangla but must not be applied before agricultural review.
- Why uncertain: Imperative Bangla and descriptive English differ. This dormant advice key requires agricultural review before altering force.

### 5. market.mjs:35

- Evidence: `public/marketplace/market.mjs:35` (EN-fadd7894f9).
- Exact Bangla: ক্রেতা শুধু ১,৫০০ কেজি চান। বাকি আলুর জন্য অন্য ক্রেতা লাগবে।
- Existing English: Only 500 kg requested; the rest remains available.
- Proposed wording: Keep the existing 500 kg English pending the sample-data/Bangla correction. No English-only replacement can reconcile 500 and 1,500.
- Why uncertain: Dormant English sample says 500 kg; its Bangla sample term says 1,500 kg, while the record quantity is 500 kg. This needs a data/source decision.

### 6. marketplace.py:69

- Evidence: `ml/marketplace.py:69` (EN-4908b2b983).
- Exact Bangla: No paired Bangla
- Existing English: Invalid {field}
- Proposed wording: “Please check {field}.” is only a tentative pattern. The field name needs a display-label mapping outside this copy task.
- Why uncertain: The placeholder can expose internal field names. Copy alone cannot give a safe user-facing label without mapping logic.

### 7. farmer-tools.ts:41

- Evidence: `src/lib/farmer-tools.ts:41` (EN-453fb9cfc4).
- Exact Bangla: No paired Bangla
- Existing English: DESCRIPTION:Follow the treatment plan confirmed by your agricultural adviser.
- Proposed wording: “DESCRIPTION:Follow the treatment plan confirmed by your agriculture adviser.” Only the display sentence could change; retain the protocol prefix and escaping.
- Why uncertain: Calendar protocol plus user text in one string. Keep DESCRIPTION: and escaping intact; confirm terminology and Bangla fallback separately.

### 8. PotatoLifeCycle.tsx:20

- Evidence: `src/pages/PotatoLifeCycle.tsx:20` (EN-d8001cf23a).
- Exact Bangla: আলু বড় হয়
- Existing English: Maturity
- Proposed wording: “Potato growth” if the stage owner confirms this is growth rather than maturity.
- Why uncertain: Bangla says potatoes grow; English says maturity. Review the growth-stage label with its matching description before changing.

### 9. AluSathiDashboard.tsx:141

- Evidence: `src/components/AluSathiDashboard.tsx:141` (EN-5e2cc67e9b).
- Exact Bangla: পাতায় ধসা রোগের লক্ষণ পাওয়া যায়নি
- Existing English: No supported blight pattern was found
- Proposed wording: “No matching blight signs were found in this photo.” is a possible display label only after model scope and uncertainty are confirmed. Keep the current label until review.
- Why uncertain: The supported-model qualifier is unclear. A plain negative result must not imply the leaf is disease-free; confirm how the English preserves model scope before changing it.

### 10. app.js:1419

- Evidence: `public/marketplace/app.js:1419` (EN-461f51e9cf).
- Exact Bangla: তারিখ ঠিক করে দিন। ভবিষ্যতের তোলার তারিখ নয়।
- Existing English: Check the dates. Harvest and photo dates cannot be in the future.
- Proposed wording: “Check the dates. Harvest and photo dates must not be in the future.” preserves the English warning. Hold until the photo-date validation and Bangla mismatch are resolved.
- Why uncertain: Bangla mentions the harvest date only, but English also warns about photo dates. Retain this distinct warning until the validation behaviour and intended source are confirmed; do not drop it as copy cleanup.

## Other held occurrences

All remaining uncertain occurrences are listed here. “Hold” means keep unchanged until the exact issue is resolved. The opposite-language toggle is intentional, not a defect.

### EN-048a2051f3

- Evidence: `src/components/Footer.tsx:14` (EN-048a2051f3).
- Exact Bangla: No paired Bangla
- Existing English: KrishiMitra
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Stale brand in a dormant component. No paired Bangla proves a new brand label here. Do not rename a proper noun automatically.

### EN-e088bb3e35

- Evidence: `src/components/LanguageModal.tsx:19` (EN-e088bb3e35).
- Exact Bangla: No paired Bangla
- Existing English: 🌾 KrishiMitra
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Stale brand in a dormant language modal. Resolve brand ownership/reachability before replacing.

### EN-733c21438e

- Evidence: `src/components/PublicLanding.tsx:114` (EN-733c21438e).
- Exact Bangla: ইংরেজি ভাষা দেখুন
- Existing English: Show Bangla
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: The Bangla counterpart says show English. This is intentional toggle direction, not a mistranslation. Do not make both sides say the same action.

### EN-325e89ace0

- Evidence: `src/components/SeasonProgress.tsx:133` (EN-325e89ace0).
- Exact Bangla: আজ আপনার আলু চাষের ${fmt(actual)}ম দিন
- Existing English: Today is day ${fmt(actual)} of your growing season
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: This shared English/Bangla heading describes the farmer's actual crop age, but SeasonProgress currently sets actual = 8 rather than reading planting age. Relabelling only English cannot resolve the product/source meaning; report as a logic/localization issue and hold the wording.

### EN-c6b95218d4

- Evidence: `src/components/TuberScan.tsx:175` (EN-c6b95218d4).
- Exact Bangla: সুস্থ
- Existing English: Healthy
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: This may be a model-status value or a prepared-example label. Replacing it with a diagnosis or a certainty score would be unsafe. Keep scope and stored meaning.

### EN-ccdb06333c

- Evidence: `src/contexts/LanguageContext.tsx:16` (EN-ccdb06333c).
- Exact Bangla: AI চালিত কৃষি বুদ্ধিমত্তা
- Existing English: AI-Powered Agricultural Intelligence
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Legacy AI claim. Confirm which feature this describes before simplifying it.

### EN-b7c38cd4e5

- Evidence: `src/contexts/LanguageContext.tsx:17` (EN-b7c38cd4e5).
- Exact Bangla: স্মার্ট কৃষি
- Existing English: Smart Farming for
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: English is a heading fragment, while Bangla is a standalone heading. Review the unused heading group together.

### EN-381f1d1fdf

- Evidence: `src/contexts/LanguageContext.tsx:98` (EN-381f1d1fdf).
- Exact Bangla: সামান্য সার লাগবে - মাটি স্বাস্থ্যকর!
- Existing English: Minimal fertilizer needed - soil is healthy!
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Both languages claim soil health. Copy alone cannot establish that the system measured soil health.

### EN-8d65be31d9

- Evidence: `src/contexts/LanguageContext.tsx:100` (EN-8d65be31d9).
- Exact Bangla: বেশি সার দরকার - মাটিতে পুষ্টি কম
- Existing English: High fertilizer needed - soil nutrients are low
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Both languages claim a nutrient finding. Copy alone cannot establish what was measured.

### EN-d11c4cd270

- Evidence: `src/lib/notebook.ts:47` (EN-d11c4cd270).
- Exact Bangla: মাঝারি হিসাব
- Existing English: Estimated yield
- Proposed wording: “Medium yield estimate” if this remains the middle of the three existing estimates.
- Why uncertain: Bangla means a middle estimate. Current calculations also use estimated yield generically elsewhere; check this specific saved-report mapping.

### EN-b555ecec9f

- Evidence: `src/lib/photo-demo-cases.ts:6` (EN-b555ecec9f).
- Exact Bangla: সুস্থ
- Existing English: Healthy
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: This may be a model-status value or a prepared-example label. Replacing it with a diagnosis or a certainty score would be unsafe. Keep scope and stored meaning.

### EN-574d48af9a

- Evidence: `ml/server.py:35` (EN-574d48af9a).
- Exact Bangla: সমর্থিত ধসার লক্ষণ পাওয়া যায়নি
- Existing English: No supported blight pattern
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: The qualifier supported has no clear farmer-facing meaning. Confirm what model scope must be conveyed before changing it.

### EN-cf1cb9a657

- Evidence: `ml/auth.py:88` (EN-cf1cb9a657).
- Exact Bangla: No paired Bangla
- Existing English: Invalid password length
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Sign-in and sign-up have different minimum lengths. One static replacement must not invent a shared limit.

### EN-24bcfe92fc

- Evidence: `ml/marketplace.py:72` (EN-24bcfe92fc).
- Exact Bangla: No paired Bangla
- Existing English: Invalid {field}
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: The placeholder can expose internal field names. Copy alone cannot give a safe user-facing label without mapping logic.

### EN-67c2ab47c4

- Evidence: `ml/marketplace.py:78` (EN-67c2ab47c4).
- Exact Bangla: No paired Bangla
- Existing English: Invalid {field}
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: The placeholder can expose internal field names. Copy alone cannot give a safe user-facing label without mapping logic.

### EN-f10cd063ac

- Evidence: `ml/marketplace.py:84` (EN-f10cd063ac).
- Exact Bangla: No paired Bangla
- Existing English: Invalid {field}
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: The placeholder can expose internal field names. Copy alone cannot give a safe user-facing label without mapping logic.

### EN-49f42bc1f6

- Evidence: `ml/marketplace.py:132` (EN-49f42bc1f6).
- Exact Bangla: No paired Bangla
- Existing English: Invalid published status
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Internal validation message includes a status concept. Do not rename the status or its values.

### EN-6907e5c59c

- Evidence: `ml/marketplace.py:171` (EN-6907e5c59c).
- Exact Bangla: No paired Bangla
- Existing English: Invalid response
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Internal response validation. Exact invalid field/action cannot be identified from this string alone.

### EN-92f6c7c32f

- Evidence: `ml/marketplace.py:174` (EN-92f6c7c32f).
- Exact Bangla: No paired Bangla
- Existing English: Invalid revision
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Revision is an internal concurrency value. Do not substitute a business meaning.

### EN-fd5eab1316

- Evidence: `ml/marketplace.py:184` (EN-fd5eab1316).
- Exact Bangla: No paired Bangla
- Existing English: Invalid version
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Version is an internal concurrency value. Do not substitute a business meaning.

### EN-913ee2552b

- Evidence: `ml/marketplace.py:82` (EN-913ee2552b).
- Exact Bangla: No paired Bangla
- Existing English: Invalid {field}
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: The placeholder can expose internal field names. Copy alone cannot give a safe user-facing label without mapping logic.

### EN-98c5c440bd

- Evidence: `public/marketplace/lot-tools.mjs:21` (EN-98c5c440bd).
- Exact Bangla: ${offer.sample ? 'ক্রেতার পরিচয় যাচাই হয়নি।' : 'এই দর যাচাই হয়নি।'} ক্রেতার দর কেজিতে ${n(offer.priceKg)} টাকা। আপনি ${n(result.offeredKg)} কেজি দিলে প্রায় ${n(result.acceptedKg)} কেজি নেওয়ার হিসাব হয়েছে। প্রায় ${n(result.rejectedKg)} কেজি বাদ যেতে পারে। মোট বিক্রির হিসাব ${n(result.gross)} টাকা। গাড়িভাড়া ${n(offer.transport)} টাকা, বস্তা ও ওঠানো-নামানো ${n(offer.handling)} টাকা, অন্য ফি ${n(offer.fee)} টাকা। এই খরচ বাদে হাতে আসতে পারে ${n(result.net)} টাকা। ${offer.pickup === 'buyer' ? 'ক্রেতা আলু নিয়ে যাবেন।' : 'আপনাকে আলু পাঠাতে হবে।'} ${Number(offer.paymentDays) === 0 ? 'আলু তোলার দিন টাকা দেওয়ার কথা।' : `আলু তোলার পরে ${n(offer.paymentDays)} দিনের মধ্যে টাকা দেওয়ার কথা।`} শর্ত: ${terms} খরচগুলো পুরো ট্রিপের দেওয়া হিসাব; পরিমাণ বদলালে আবার ভাড়া নিশ্চিত করুন। এটি অনুমান, টাকা পাওয়ার নিশ্চয়তা নয়।
- Existing English: ${offer.sample ? 'Buyer identity has not been verified.' : 'This offer has not been verified.'} The price is ${n(offer.priceKg)} taka per kg. From ${n(result.offeredKg)} kg, the buyer is estimated to accept ${n(result.acceptedKg)} kg and reject ${n(result.rejectedKg)} kg. The estimated sale value is ${n(result.gross)} taka. Transport costs ${n(offer.transport)} taka, sacks and handling ${n(offer.handling)} taka, and other fees ${n(offer.fee)} taka. After these costs, you may receive ${n(result.net)} taka. ${offer.pickup === 'buyer' ? 'The buyer collects the potatoes.' : 'You must deliver the potatoes.'} ${Number(offer.paymentDays) === 0 ? 'Payment is promised on pickup day.' : `Payment is promised within ${n(offer.paymentDays)} days after pickup.`} Terms: ${terms} Costs are the quoted totals for the trip; confirm them again if the quantity changes. This is an estimate, not a payment guarantee.
- Proposed wording: No replacement proposed. Review the entire narration against its Bangla return value; keep every embedded condition, expression and payment qualifier.
- Why uncertain: Dormant composed offer narration: preserve all nested conditions and interpolation order; review as a whole with the Bangla narration.

### EN-4091c3ada9

- Evidence: `public/marketplace/lot-tools.mjs:21` (EN-4091c3ada9).
- Exact Bangla: ক্রেতার পরিচয় যাচাই হয়নি।
- Existing English: Buyer identity has not been verified.
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Dormant composed offer narration: preserve all nested conditions and interpolation order; review as a whole with the Bangla narration.

### EN-9694821f21

- Evidence: `public/marketplace/lot-tools.mjs:21` (EN-9694821f21).
- Exact Bangla: এই দর যাচাই হয়নি।
- Existing English: This offer has not been verified.
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Dormant composed offer narration: preserve all nested conditions and interpolation order; review as a whole with the Bangla narration.

### EN-14a800cf3a

- Evidence: `public/marketplace/lot-tools.mjs:21` (EN-14a800cf3a).
- Exact Bangla: ক্রেতা আলু নিয়ে যাবেন।
- Existing English: The buyer collects the potatoes.
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Dormant composed offer narration: preserve all nested conditions and interpolation order; review as a whole with the Bangla narration.

### EN-d221c4a55c

- Evidence: `public/marketplace/lot-tools.mjs:21` (EN-d221c4a55c).
- Exact Bangla: আপনাকে আলু পাঠাতে হবে।
- Existing English: You must deliver the potatoes.
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Dormant composed offer narration: preserve all nested conditions and interpolation order; review as a whole with the Bangla narration.

### EN-f3cb5812eb

- Evidence: `public/marketplace/lot-tools.mjs:21` (EN-f3cb5812eb).
- Exact Bangla: আলু তোলার দিন টাকা দেওয়ার কথা।
- Existing English: Payment is promised on pickup day.
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Dormant composed offer narration: preserve all nested conditions and interpolation order; review as a whole with the Bangla narration.

### EN-2726904c3d

- Evidence: `public/marketplace/lot-tools.mjs:21` (EN-2726904c3d).
- Exact Bangla: আলু তোলার পরে ${n(offer.paymentDays)} দিনের মধ্যে টাকা দেওয়ার কথা।
- Existing English: Payment is promised within ${n(offer.paymentDays)} days after pickup.
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Dormant composed offer narration: preserve all nested conditions and interpolation order; review as a whole with the Bangla narration.

### EN-be77885268

- Evidence: `public/marketplace/market.mjs:33` (EN-be77885268).
- Exact Bangla: ক্রেতা আলু নিয়ে যাবেন। তোলার সময় শেষ ওজন ঠিক হবে।
- Existing English: Buyer collects; final weight confirmed at pickup.
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Stored sample terms are also returned directly. Verify all consumers before changing persisted/example terms.

### EN-38a1419417

- Evidence: `public/marketplace/market.mjs:34` (EN-38a1419417).
- Exact Bangla: প্রায় ৫% আলু বাদ যেতে পারে। পাঠানোর আগে শর্ত নিশ্চিত করুন।
- Existing English: Estimated 5% grade rejection; confirm before dispatch.
- Proposed wording: Hold the current string. No safe automatic replacement is proposed until the issue below is resolved.
- Why uncertain: Paired Bangla sample says about 5% may be rejected without naming grade. Keep quantity and uncertainty; verify before rewriting stored sample terms.

## Bangla–English meaning mismatches

These are semantic differences, not every glossary or style preference. Each case includes exact source strings. A held case must not be applied from this table.

| Case / source | Exact Bangla | Existing English | Difference / disposition |
|---|---|---|---|
| M-01 · `public/marketplace/app.js:328` · EN-b1a5f1804e | কত আলু বিক্রি করবেন? | What do you have to sell? | Bangla asks how much will be sold; English asks what is available. CSV proposal: How many potatoes will you sell? |
| M-02 · `public/marketplace/app.js:328` · EN-53077eaab5 | যা জানেন তাই লিখুন। ওজন নিশ্চিত হলে পরে নতুন তালিকা দিতে পারবেন। | Enter what you know. This pilot keeps the record on this device only. | Bangla explains adding a new listing once the weight is known; English substitutes a storage notice. CSV proposal: Enter what you know. You can add a new listing once you know the weight. |
| M-03 · `src/components/AluSathiDashboard.tsx:147` · EN-34b8431bd7 | আজ আর কিছু করতে হবে না। একই জায়গা মনে রাখুন। | No urgent action is needed. Remember this place. | Bangla says no more work today; English only rules out urgent action. Held for safety review. Held for review. |
| M-04 · `src/components/AluSathiDashboard.tsx:150` · EN-88079e1a75 | কাল সকালে কাছের গাছগুলোও দেখুন এবং নতুন ছবি তুলুন। | Check nearby plants tomorrow morning. Take new photos if needed. | Bangla asks for new photos; English makes that conditional. CSV proposal: Check nearby plants tomorrow morning and take new photos. |
| M-05 · `src/components/AluSathiDashboard.tsx:160` · EN-04d58cf927 | এখনও কোনো ছবি রাখা হয়নি | No checks saved yet | Bangla says no photos are saved; English refers to checks. CSV proposal: No photos saved yet |
| M-06 · `src/components/AluSathiDashboard.tsx:160` · EN-8a78e5d275 | প্রথম ছবি ও লক্ষণ লিখে রাখলে এখানে দেখাবে। | Your first completed check will appear here. | Bangla says the first saved photo and symptoms appear here, not a completed model check. CSV proposal: Your first saved photo and symptom notes will appear here. |
| M-07 · `src/components/AluSathiDashboard.tsx:281` · EN-70e4711392 | ভোরে গাছ দেখুন এবং সেচ দেওয়ার আগে বিশেষজ্ঞের পরামর্শ নিন। | Inspect plants early and ask an expert before changing irrigation. | Bangla asks for expert advice before watering, not only before changing watering. CSV proposal: Check plants at dawn. Ask an expert before watering. |
| M-08 · `src/components/AluSathiDashboard.tsx:349` · EN-dcc60bdd73 | অনলাইনের খাতা পাওয়া যায়নি। এই ফোনের ফল দেখানো হচ্ছে। | Cloud history unavailable. Showing this phone's records; unsynced results retry when online. | The retry promise is not in this Bangla source. Do not change the actual sync behaviour. CSV proposal: Online Khata is not available. Showing this phone's records. |
| M-09 · `public/marketplace/market.mjs:12` · EN-26289ae18b | বেশির ভাগ আলু একই আকারের; বস্তা দরের মধ্যে নেই। | Mostly even-sized yellow potatoes; sacks are not included. | Bangla does not state yellow colour. CSV proposal: Mostly similar-sized potatoes. Sacks are not included in the price. |
| M-10 · `src/components/PublicLanding.tsx:75` · EN-5710cabd41 | অগ্রগতি খাতায় রাখুন | Record your progress | Bangla specifies keeping progress in Khata. CSV proposal: Keep your progress in Khata |
| M-11 · `src/components/PublicLanding.tsx:183` · EN-a4912b70e0 | জমির বয়স অনুযায়ী দরকারি কাজ মনে রাখুন। | Keep track of useful work for your field. | Bangla specifies tasks based on crop age; English omits this. CSV proposal: Remember useful tasks based on your field's age. |
| M-12 · `src/pages/PotatoLifeCycle.tsx:20` · EN-d8001cf23a | আলু বড় হয় | Maturity | Bangla says potatoes grow; English labels the stage maturity. Held for stage review. Held for review. |
| M-13 · `src/pages/PotatoLifeCycle.tsx:21` · EN-c1880f2647 | পাতা শুকোতে শুরু করলে আলু পরিপক্ব হয়। মাটি শুকনো থাকলে তুলুন। | As foliage starts to dry, mature potatoes are ready to be lifted. | Bangla also says to harvest when the soil is dry; English omits that condition. CSV proposal: Potatoes mature as the leaves start to dry. Harvest when the soil is dry. |
| M-14 · `src/pages/PotatoLifeCycle.tsx:18` · EN-ecac63ab1d | সবুজ গাছ আলো থেকে খাবার বানায়। শিকড় পানি ও খাবার নেয়। | Green leaves make food from sunlight while roots take in water. | Bangla says roots take in water and nutrients; English omits nutrients. CSV proposal: Green plants make food from light. Roots take in water and nutrients. |
| M-15 · `public/marketplace/app.js:1419` · EN-461f51e9cf | তারিখ ঠিক করে দিন। ভবিষ্যতের তোলার তারিখ নয়। | Check the dates. Harvest and photo dates cannot be in the future. | Bangla mentions a future harvest date only; English adds photo dates. Held for review. |
| M-16 · `public/marketplace/market.mjs:35` · EN-fadd7894f9 | ক্রেতা শুধু ১,৫০০ কেজি চান। বাকি আলুর জন্য অন্য ক্রেতা লাগবে। | Only 500 kg requested; the rest remains available. | English and the stored quantity say 500 kg; sampleTerms says 1,500 kg. Held. Held for review. |
| M-17 · `public/marketplace/market.mjs:34` · EN-38a1419417 | প্রায় ৫% আলু বাদ যেতে পারে। পাঠানোর আগে শর্ত নিশ্চিত করুন। | Estimated 5% grade rejection; confirm before dispatch. | Bangla says about 5% may be rejected, without saying grade. Held because it is stored sample terms. Held for review. |
| M-18 · `src/lib/notebook.ts:47` · EN-8dcc86a095 | পচা গোবর | Manure | Bangla specifically says rotted cow dung; English is broader. Both source occurrences are covered in the CSV. CSV proposal: Rotted cow dung |
| M-19 · `src/lib/notebook.ts:47` · EN-d11c4cd270 | মাঝারি হিসাব | Estimated yield | Bangla means the middle estimate; English sounds like the only/general estimate. Held. Held for review. |
| M-20 · `src/lib/crop-advice.ts:48` · EN-5793d5996f | আর্দ্র আবহাওয়া। পাতায় দাগ আছে কি না দেখুন, বিশেষ করে নিচের পাতায়। | Humid conditions: check lower leaves for blight-like spots. | Bangla says marks, not specifically blight-like marks. CSV proposal: The weather is humid. Check leaves for marks, especially lower leaves. |
| M-21 · `src/lib/crop-advice.ts:50` · EN-4008a8ea4f | গরম পড়ছে। মাটি শুকালে সেচের প্রয়োজন আছে কি না দেখুন। | Warm weather: check soil moisture before irrigation. | Bangla includes checking whether watering is needed if soil is dry. CSV proposal: The weather is warm. If the soil is dry, check if watering is needed. |
| M-22 · `src/components/TodayCare.tsx:26` · EN-aca2b714b6 | শুধু প্রয়োগের দিন রাখা হয়েছে; সারের ধরন ও পরিমাণ নিশ্চিত করা হয়নি। | Application date only; products and amounts were not confirmed. | Bangla specifies fertiliser type and amount; English says products. CSV proposal: Only the date was saved. Fertiliser type and amount were not confirmed. |
| M-23 · `src/components/SellingEstimate.tsx:31` · EN-6545706f73 | না লাগলে ০ লিখুন। না জানলে হিসাব অপেক্ষা করবে। | Enter 0 if you pay none. Unknown costs stay blank. | Bangla says the calculation waits if a cost is unknown; English only says blanks remain blank. CSV proposal: Enter 0 if there is no charge. If costs are unknown, the calculation will wait. |
| M-24 · `src/contexts/LanguageContext.tsx:93` · EN-71d0c53fc6 | সেচ দিন! | WATER NEEDED | Bangla is an instruction to water; English describes a need. Held; do not increase agricultural certainty automatically. Held for review. |
| M-25 · `src/components/HarvestMarket.tsx:59` · EN-f282c0e208 | আলুসাথী তাদের দরের তথ্য পায় না। লিংকে গিয়ে নিজের আলুর তথ্য দিন বা প্রকল্পের পাইলট পার্টনার হন। | AluSathi does not receive their pricing. Use these channels to submit your lot, or make them pilot partners. | Bangla invites the user to become a pilot partner; English asks them to make the companies partners. CSV proposal: AluSathi does not receive their prices. Use these links to share your potato details. You can also join their pilot projects. |
| M-26 · `public/marketplace/app.js:628` · EN-66010ac6a4 | বস্তা ও বাছাই (৳) | Packaging and sorting (৳) | Bangla specifies sacks and sorting; English uses the broader packaging term. CSV proposal: Sacks and sorting (৳) |

## Localization and logic issues: report only

| Evidence | Exact text / behaviour | Finding |
|---|---|---|
| `src/pages/NotFound.tsx:2`; English `/not-a-page` | “পাতাটি পাওয়া যায়নি”; “AluSathi-তে ফিরুন” | No English branch. Observed in both viewport sizes. Copy replacement alone would edit Bangla, so leave source unchanged. |
| `src/components/ui/dialog.tsx:52`; `sheet.tsx:62` | “Close” | Shared screen-reader text is hardcoded English even in Bangla mode. Report missing Bangla; do not add translations in this phase. |
| `src/components/ui/pagination.tsx:10,50,58,68`; `breadcrumb.tsx:12,77`; `carousel.tsx:189,217`; `sidebar.tsx:237,252,255` | “pagination”, “Go to previous page”, “Go to next page”, “More pages”, “breadcrumb”, “More”, “Previous slide”, “Next slide”, “Toggle Sidebar” | Reusable accessibility defaults have no local language selection. Wording proposals do not solve Bangla localization. Some primitives have no active caller. |
| `public/marketplace/app.js:295,297,299,769` | “AluSathi marketplace home”, “Change language”, “Dismiss”, “Bangladesh mobile number” | Static accessibility/placeholder English inside HTML templates. English can be simplified, but missing Bangla needs a separately authorised localization change. |
| `src/components/AluSathiDashboard.tsx:543,546,621,637` | “Primary navigation”, “Mobile navigation”, “Offline AI” | English-only fallback/accessible text exists in shared or dormant branches. No Bangla source should be invented here. |
| `public/marketplace/buyer-transport.mjs:16` | “Booking is completed outside AluSathi.” | Hardcoded English helper text in a provider card. Its missing Bangla is a localization gap; booking still happens outside the app. |
| `public/push-events.js:5`; `src/lib/farmer-tools.ts:41` | “Open your field notebook.”; “DESCRIPTION:Follow the treatment plan confirmed by your agricultural adviser.” | Push fallback and calendar export do not select Bangla. Preserve protocol and the adviser warning. Actual push delivery was not exercised. |
| `src/components/FarmerNavigation.tsx:69–72` | More menu has Profile, account/login and home/sign-out actions; no language switch | Rendered English/Bangla can be inspected via saved language, but switching on this screen itself is not available. Do not re-add a removed feature as copy work. |
| `src/contexts/LanguageContext.tsx:313`; `src/lib/notebook.ts:53` | `translations[language][key] || key`; `label ? label[bn?0:1] : key` | An unknown key can become visible. No raw key observed in the navigation checks. This is a logic/fallback issue, not a proposed identifier rewrite. |
| `src/lib/notebook.ts:52`; saved tasks and photo observations | Saved title/details strings are rendered as stored | Switching language does not translate older stored records. User-entered information must remain untouched. Translating app-generated saved records needs a data/logic strategy outside this copy task. |
| `ml/auth.py:38`; `src/contexts/AuthContext.tsx:50` | `auth_failed` and allowed auth codes | Machine values, not copy. Keep them unchanged. Current Auth screen maps failures to generic bilingual messages. |
| `ml/marketplace.py:45`; `src/components/FarmerMarketPages.tsx:64` | “stale offer”, “lot unavailable”; “harvest”, “invalid” | Compared strings control error paths. Never rewrite them even though the words look user-facing. |
| `ml/server.py:34–38,178–194`; `src/lib/tuber-offline-model.ts:12`; `src/lib/today-plan.ts` | `early_blight`, `late_blight`, `unknown`, `healthy`, `defective`, `uncertain` | Model/status values and conditions are protected. Only separate display labels are reviewable. Do not call AI match a verified confidence score. |
| `src/lib/farmer-tools.ts:3–7`; profile/unit controls | `decimal`, `acre`, `hectare`, `bigha` | Unit values and conversion logic are protected. Only option labels change to the glossary. |
| `public/marketplace/app.js:14,242,872`; `market.mjs:33–35` | Sales disabled; saved sample offers still exist | Do not describe saving an enquiry/listing as a sale or payment. Stored offer terms need whole-record review before any future reactivation. |
| `src/components/Footer.tsx:23` | “Hackathon 2024 Project” | Dormant factual label has no paired Bangla. Current date alone does not prove the intended project year is wrong. Retain pending owner confirmation; do not invent a year. |

Brand words, company names, district/upazila names, variety names, scientific citation titles, units and user-entered text are allowed language exceptions. The Bangla AluSathi wordmark is not treated as an English translation failure.

## Browser checks and layout

Playwright used installed Microsoft Edge, desktop **1440 × 900** and mobile **390 × 844**, with separate browser contexts and fresh local storage. Both languages were loaded for each of 28 route/view URLs: **112 navigation observations**. This tests existing copy, not the unapplied replacements. Source/proposed-copy reading and browser navigation are different coverage measures.

- Uncaught page errors: 0 across those observations. This does not establish backend, model or network correctness.
- Rendered undefined/NaN/null/raw-template/entity matches: 0 route observations. No claim is made about untested states.
- Whole-page overflow: 1 observation. `/farmer#diary`, en, 390px viewport / 409px content.
- The English Khata action row is too wide: Calculate profit / Record work / Record expense. Evidence: `src/components/FarmerNotebook.tsx:81`, `src/components/NotebookCalculator.tsx:32` and mobile screenshot. Add work / Add expense are shorter proposals. Layout repair is outside scope if copy alone does not resolve it.
- Farmer navigation already wraps Season progress and Before selling on mobile. Today's tasks and shatak (1/100 acre) need a fresh Phase 2 visual check at the required sizes. No claim of post-rewrite fit is possible yet.
- Profile and listing labels were viewed in desktop/mobile screenshots. Full-page screenshots include fixed navigation captured at the viewport boundary; that alone is not evidence of a permanently hidden form field.
- Direct Farmer language switching is unavailable in its current menu. Both languages were inspected by setting the existing language preference in isolated contexts. Home/Buyer toggle clicks are checked separately when recorded below.

### Route observations

| URL path / hash | English desktop | English mobile | Bangla desktop | Bangla mobile |
|---|---|---|---|---|
| `/` | Loaded | Loaded | Loaded | Loaded |
| `/auth` | Loaded | Loaded | Loaded | Loaded |
| `/account` | Loaded | Loaded | Loaded | Loaded |
| `/farmer#photos` | Loaded | Loaded | Loaded | Loaded |
| `/farmer#today` | Loaded | Loaded | Loaded | Loaded |
| `/farmer#season` | Loaded | Loaded | Loaded | Loaded |
| `/farmer#diary` | Loaded | Overflow 409px | Loaded | Loaded |
| `/farmer#profile` | Loaded | Loaded | Loaded | Loaded |
| `/farmer#market` | Loaded | Loaded | Loaded | Loaded |
| `/farmer#my-listings` | Loaded | Loaded | Loaded | Loaded |
| `/farmer#interest` | Loaded | Loaded | Loaded | Loaded |
| `/farmer#tools` | Loaded | Loaded | Loaded | Loaded |
| `/farmer#help` | Loaded | Loaded | Loaded | Loaded |
| `/selling-preparation` | Loaded | Loaded | Loaded | Loaded |
| `/selling-preparation/details` | Loaded | Loaded | Loaded | Loaded |
| `/life-cycle` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/buyer.html` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/buyer.html#needs` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/buyer.html#saved` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/buyer.html#buyer-plan` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/buyer.html#transport` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/buyer.html#notebook` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/buyer.html#profile` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/farmer.html` | Loaded | Loaded | Loaded | Loaded |
| `/not-a-page` | Loaded | Loaded | Loaded | Loaded |
| `/cold-storage` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/buyer.html?preview=public` | Loaded | Loaded | Loaded | Loaded |
| `/marketplace/buyer.html?preview=farmer` | Loaded | Loaded | Loaded | Loaded |

### Additional interaction checks

- Homepage language button: en -> bn -> en passed.
- Prepared photo result: PHOTO RESULT<br><br>No major marks are visible in this photo<br><br>This photo shows one side of the potato.<br><br>Next step<br><br>Turn the potato in good light and check the other side too.
- Khata calculator empty dialog: What would be left after selling?<br><br>Enter kg and price. See the result after recorded expenses.<br><br>How many kg?<br>Price per kg (৳)<br><br>Recorded expenses: ৳0<br><br>All recorded costs will be charged to these potatoes. More expenses will reduce profit.<br><br>Record growing expenses in Khata first.<br><br>Calculate<br>Close
- Buyer lot dialog: ×<br><br>ILLUSTRATIVE LOT · NOT VERIFIED<br><br>Diamant<br><br>Rahima Begum · Pirganj, Rangpur<br><br>৳22 / kg<br>Whole lot: ৳27,500<br>Available<br>1,250 kg<br>Ready date<br>Nov 15, 2026<br>Condition<br>Medium and large, dry potatoes; weigh at pickup.<br>Packing<br>Loose, sorted<br>Intended use<br>Food potatoes<br>Prepare example enquiry
- Buyer language button: en -> bn -> en passed.

## Limits and uninspected runtime states

No requested application source path was inaccessible. `src/assets` does not exist in this checkout; images are served from public. Source coverage does not mean every possible runtime state was exercised.

Not exercised: live model inference on new uploads; online leaf-model API; authenticated account/confirmation/recovery flows; real server error responses; background push delivery; every native browser validation message; every calendar/share/print destination; all photo, weather and network-failure branches. Their visible messages were reviewed in source where present. No new agricultural advice, accuracy validation or real marketplace data verification was performed.

External browser/OS/provider wording, dependency-generated calendar/date-picker messages, remote API/Supabase error text, existing user data, generated dist/node_modules and text baked into images are not an editable source-copy inventory. Binary model weights, images, fonts, documentation/competition material and training logs are not application English-copy sources. Scientific citation and company names were preserved. No dependency internals or external services were rewritten.

## Verification and Phase 2 boundary

- CSV uses exactly the requested 8 columns; proper comma/quote/newline escaping and original line references. Rows are authored through the bundled Artifact workbook API and serialised from its verified text values.
- Each proposed old value is checked against the original source occurrence. Dynamic template expressions are compared as TypeScript expressions in source order before inclusion. No blank replacements are used.
- Application snapshot hashes and Git diff confirm source preservation. CSV formula-start checks and escaping checks are the applicable artifact safety checks; this is not a security audit of the application.
- TypeScript, ESLint, production build and existing integration/unit suites: **not rerun for this Phase 1 refresh**. Earlier calendar implementation checks are historical results and are not presented as fresh copy-rewrite passes. No source has changed, and the brief assigns these checks after approved edits. No test assertion was updated.
- Phase 2 should use the existing commands: `npx tsc -p tsconfig.app.json --noEmit`, `npx eslint .`, `npm run build`, plus relevant scripts under tests. Some historical Playwright scripts use obsolete ports/selectors or default Chromium; do not silently weaken them. `tests/farmer-profile.cjs` supports `PLAYWRIGHT_CHANNEL=msedge`; others must be run with their existing documented setup.
- No commits, pushes, pull requests or dependency changes are part of this audit. **Stop here and wait for explicit approval.**

## Full source coverage

Files below were read by the analysis scripts. Counts include English source occurrences before exclusions, with prose/context review focused on user-facing content and behaviour. A zero means no candidate display English was extracted, not that the file was skipped. The SHA-256 prefix records the inspected content; Phase 2 must recheck changed files. SQL files were scanned for notification and error text; their exception values are machine contracts and remain excluded from display-copy rewrites.

| File | Candidates | CSV proposals | Held | SHA-256 prefix |
|---|---:|---:|---:|---|
| `index.html` | 3 | 3 | 0 | `a17e05e2575f9fa5` |
| `ml/artifacts/potato_mobilenet_v3.metrics.json` | 0 | 0 | 0 | `23e33ef9f494ed69` |
| `ml/artifacts/regional_evaluation.json` | 0 | 0 | 0 | `e1e46ec91dcf25e3` |
| `ml/artifacts/tuber_model_metadata.json` | 0 | 0 | 0 | `c9f182ab06524bf5` |
| `ml/artifacts/tuber_test_metrics.json` | 0 | 0 | 0 | `70ecfc17a0b8e847` |
| `ml/auth.py` | 13 | 4 | 1 | `933ff8377c81f5df` |
| `ml/check_potato_presence.py` | 0 | 0 | 0 | `21c50d99782e1324` |
| `ml/curate_tubers.py` | 0 | 0 | 0 | `c41402a0cd285164` |
| `ml/download_bogura.py` | 0 | 0 | 0 | `a0feb46b4c038f9c` |
| `ml/download_potato_gate_negatives.py` | 0 | 0 | 0 | `a2a2b94b663f0928` |
| `ml/evaluate.py` | 0 | 0 | 0 | `9181083803e2ead1` |
| `ml/export_onnx.py` | 0 | 0 | 0 | `51d403357d21eb5d` |
| `ml/inference_policy.py` | 0 | 0 | 0 | `f2bdda5b27c5169e` |
| `ml/marketplace.py` | 21 | 9 | 9 | `2d6ea6042e32abe1` |
| `ml/server.py` | 31 | 22 | 1 | `e248ecf948c0cb1e` |
| `ml/train_potato_presence.py` | 0 | 0 | 0 | `9a8c7a66b2e75710` |
| `ml/train_variety_pair.py` | 0 | 0 | 0 | `f02d1e16536db2a6` |
| `ml/train_variety.py` | 0 | 0 | 0 | `5d24909d64d8ddfb` |
| `ml/train.py` | 0 | 0 | 0 | `cc313cd67a6b4867` |
| `ml/tuber.py` | 0 | 0 | 0 | `55dd6114aa0edb7f` |
| `ml/variety_data.py` | 0 | 0 | 0 | `f7b15567577c2d6d` |
| `ml/verify_tuber_package.py` | 0 | 0 | 0 | `00f69374ce3ec68f` |
| `public/marketplace/app.js` | 635 | 155 | 1 | `655842a9e8bf78c4` |
| `public/marketplace/banners/buyer-market-living-v1/banner.html` | 2 | 1 | 0 | `af346b16bc830b45` |
| `public/marketplace/banners/buyer-market-living-v1/motion.js` | 4 | 0 | 0 | `22fdf5d8ba9d4b2c` |
| `public/marketplace/banners/buyer-offers-calculating-v1/banner.html` | 2 | 1 | 0 | `34456a4edc72a40b` |
| `public/marketplace/banners/buyer-offers-calculating-v1/motion.css` | 0 | 0 | 0 | `ef8d817a69831b82` |
| `public/marketplace/buyer-examples.mjs` | 1 | 0 | 0 | `e04f6a79585f2be7` |
| `public/marketplace/buyer-personal.css` | 0 | 0 | 0 | `00eee31ba73ed539` |
| `public/marketplace/buyer-personal.mjs` | 32 | 7 | 0 | `e1a55a0dad7ccccb` |
| `public/marketplace/buyer-plan.css` | 0 | 0 | 0 | `2faf1aa22e4606e3` |
| `public/marketplace/buyer-profile.css` | 0 | 0 | 0 | `410dc689d6e6378f` |
| `public/marketplace/buyer-profile.mjs` | 33 | 13 | 0 | `5e2192ef66ef9627` |
| `public/marketplace/buyer-transport.mjs` | 27 | 5 | 0 | `070d8d05a23a36f0` |
| `public/marketplace/buyer-workspace.css` | 0 | 0 | 0 | `a5cdc24edddc49d4` |
| `public/marketplace/buyer-workspace.mjs` | 83 | 21 | 0 | `5e81fd3ebfafc521` |
| `public/marketplace/buyer.html` | 1 | 0 | 0 | `0fa4e20ebca37aa8` |
| `public/marketplace/catalogue.css` | 0 | 0 | 0 | `6c385baf00585420` |
| `public/marketplace/clarity.css` | 0 | 0 | 0 | `0a3c973343831f0a` |
| `public/marketplace/demo-forms.mjs` | 0 | 0 | 0 | `a7dc017a1023d48a` |
| `public/marketplace/districts.mjs` | 0 | 0 | 0 | `418346f245174594` |
| `public/marketplace/farmer.html` | 1 | 0 | 0 | `8323a3fee49a0df5` |
| `public/marketplace/index.html` | 2 | 2 | 0 | `00741cbb299b0035` |
| `public/marketplace/lot-tools.mjs` | 56 | 15 | 7 | `b5c94a4bb54872b0` |
| `public/marketplace/market.mjs` | 81 | 9 | 3 | `20537b1a9c2a3de0` |
| `public/marketplace/potato-details.mjs` | 35 | 7 | 0 | `4a52c178501d221c` |
| `public/marketplace/providers.json` | 12 | 8 | 0 | `2bdd9e68c5a81519` |
| `public/marketplace/site-theme.css` | 0 | 0 | 0 | `d7349875474926eb` |
| `public/marketplace/styles.css` | 0 | 0 | 0 | `5dc3cf89acb256aa` |
| `public/marketplace/transport.mjs` | 153 | 48 | 0 | `f9fe14ac7b3f8ad0` |
| `public/models/potato_variety_pair.json` | 0 | 0 | 0 | `91ea06ec8f872de0` |
| `public/push-events.js` | 1 | 1 | 0 | `a54895bc6adf36f4` |
| `public/site-palette.css` | 0 | 0 | 0 | `c53689409c001fc0` |
| `public/site-theme.js` | 0 | 0 | 0 | `baba25d341b6d5e2` |
| `src/App.css` | 0 | 0 | 0 | `1b75716b5511ad17` |
| `src/App.tsx` | 7 | 1 | 0 | `5c140b97d2f36c89` |
| `src/components/AluSathiDashboard.tsx` | 210 | 51 | 2 | `85c58626a1d50a73` |
| `src/components/CareLandEditor.tsx` | 19 | 11 | 0 | `34f0736d4fa2b82e` |
| `src/components/ColdStorage.tsx` | 30 | 8 | 0 | `c6c1260a64e9c84a` |
| `src/components/DistrictSelect.tsx` | 0 | 0 | 0 | `2659e8a57797f2ed` |
| `src/components/FarmerHisab.tsx` | 73 | 21 | 0 | `ec90bf13f27367e5` |
| `src/components/FarmerMarketPages.tsx` | 91 | 20 | 0 | `889fecfcbf0dda17` |
| `src/components/FarmerNavigation.tsx` | 27 | 12 | 0 | `118e420b09f9eb25` |
| `src/components/FarmerNotebook.tsx` | 91 | 19 | 0 | `855d5cca734064f7` |
| `src/components/FarmerProfile.tsx` | 61 | 18 | 0 | `adcf3504f72150de` |
| `src/components/FarmerToday.tsx` | 49 | 9 | 0 | `34cab85130ec2ab0` |
| `src/components/FarmerTools.tsx` | 34 | 17 | 0 | `f8c0892ce4e0e33a` |
| `src/components/Footer.tsx` | 2 | 0 | 1 | `d5e2d4d8d422fb24` |
| `src/components/HarvestMarket.tsx` | 65 | 10 | 0 | `1c4ac91c45a4d549` |
| `src/components/LanguageModal.tsx` | 2 | 0 | 1 | `0823595c9a13d837` |
| `src/components/LoadingSkeleton.tsx` | 0 | 0 | 0 | `7ce59dbfebe36cd1` |
| `src/components/LocalBuyerRequests.tsx` | 8 | 0 | 0 | `a6d615affbc06884` |
| `src/components/NavLink.tsx` | 0 | 0 | 0 | `ae74980e699af0c3` |
| `src/components/NotebookCalculator.tsx` | 24 | 5 | 0 | `d976aca053dddd3f` |
| `src/components/PotatoDetailsDialog.tsx` | 26 | 8 | 0 | `a2a33f1c7e9661a3` |
| `src/components/PublicLanding.tsx` | 74 | 20 | 1 | `d66c2a2294adee0a` |
| `src/components/ScanInsights.tsx` | 64 | 13 | 0 | `3322c8a4e32a6d78` |
| `src/components/SeasonProgress.tsx` | 74 | 16 | 1 | `e942d97b0975f1cb` |
| `src/components/SellingEstimate.tsx` | 21 | 4 | 0 | `f74d09a72f6335d1` |
| `src/components/SellingPreparationTools.tsx` | 13 | 4 | 0 | `93ae4fd7d08daa3e` |
| `src/components/TodayAiDemo.tsx` | 21 | 7 | 0 | `91eb8a81f12f6bc1` |
| `src/components/TodayCare.tsx` | 27 | 9 | 0 | `58ac09fea77a059a` |
| `src/components/TodayWeather.tsx` | 21 | 3 | 0 | `d489868e0541129a` |
| `src/components/TreatmentReminders.tsx` | 28 | 8 | 0 | `a840f85eb2b4083c` |
| `src/components/TuberScan.tsx` | 59 | 17 | 2 | `efafe82a58d14e80` |
| `src/components/ui/accordion.tsx` | 0 | 0 | 0 | `dedb1e79e973f5be` |
| `src/components/ui/alert-dialog.tsx` | 0 | 0 | 0 | `26892ecf3644081f` |
| `src/components/ui/alert.tsx` | 0 | 0 | 0 | `f6e25204c7dbe2d5` |
| `src/components/ui/aspect-ratio.tsx` | 0 | 0 | 0 | `67c60b91df6dc9fc` |
| `src/components/ui/avatar.tsx` | 0 | 0 | 0 | `fb40d976244fd105` |
| `src/components/ui/badge.tsx` | 0 | 0 | 0 | `b82f8dfedd3c17c9` |
| `src/components/ui/breadcrumb.tsx` | 2 | 1 | 0 | `cdb4909b5375a2b2` |
| `src/components/ui/button.tsx` | 0 | 0 | 0 | `b228ed1f3d52b8e6` |
| `src/components/ui/calendar.tsx` | 0 | 0 | 0 | `a52d8aeed9df4b5e` |
| `src/components/ui/card.tsx` | 0 | 0 | 0 | `9d4ec5158cd103c0` |
| `src/components/ui/carousel.tsx` | 3 | 0 | 0 | `b6cc2145ceae0ad8` |
| `src/components/ui/checkbox.tsx` | 0 | 0 | 0 | `dbe4c3e16b760cca` |
| `src/components/ui/collapsible.tsx` | 0 | 0 | 0 | `f375e9bb05688220` |
| `src/components/ui/command.tsx` | 0 | 0 | 0 | `d1bf7cd448120d19` |
| `src/components/ui/context-menu.tsx` | 0 | 0 | 0 | `44641f2907e8b225` |
| `src/components/ui/dialog.tsx` | 1 | 0 | 0 | `31bb25ae0a959316` |
| `src/components/ui/drawer.tsx` | 0 | 0 | 0 | `173e0d771230a244` |
| `src/components/ui/dropdown-menu.tsx` | 0 | 0 | 0 | `3c031a123dbb144a` |
| `src/components/ui/form.tsx` | 1 | 0 | 0 | `109f343145aad667` |
| `src/components/ui/hover-card.tsx` | 0 | 0 | 0 | `643dc4bb95e37a4c` |
| `src/components/ui/input-otp.tsx` | 0 | 0 | 0 | `832723e92321ae39` |
| `src/components/ui/input.tsx` | 0 | 0 | 0 | `3b09ee25c1c65e88` |
| `src/components/ui/label.tsx` | 0 | 0 | 0 | `9365711e408fc8ad` |
| `src/components/ui/menubar.tsx` | 0 | 0 | 0 | `1e9b2239e995d7a1` |
| `src/components/ui/navigation-menu.tsx` | 0 | 0 | 0 | `4e3cb2bf59e67f93` |
| `src/components/ui/pagination.tsx` | 6 | 1 | 0 | `8fa329509f89ebfc` |
| `src/components/ui/popover.tsx` | 0 | 0 | 0 | `3c3c138c4ca584e2` |
| `src/components/ui/progress.tsx` | 0 | 0 | 0 | `aa219168fea49b76` |
| `src/components/ui/radio-group.tsx` | 0 | 0 | 0 | `e7bcb8238a536581` |
| `src/components/ui/resizable.tsx` | 0 | 0 | 0 | `649c0537bd8f0784` |
| `src/components/ui/scroll-area.tsx` | 0 | 0 | 0 | `3d5021162483838d` |
| `src/components/ui/select.tsx` | 0 | 0 | 0 | `e95ab41cb809ca50` |
| `src/components/ui/separator.tsx` | 0 | 0 | 0 | `8ec59e1c43ca286a` |
| `src/components/ui/sheet.tsx` | 1 | 0 | 0 | `3ce2628215cc3742` |
| `src/components/ui/sidebar.tsx` | 4 | 3 | 0 | `4d898b00c646352c` |
| `src/components/ui/skeleton.tsx` | 0 | 0 | 0 | `1911c26c08ed186e` |
| `src/components/ui/slider.tsx` | 0 | 0 | 0 | `527bb9cfea006f3b` |
| `src/components/ui/sonner.tsx` | 1 | 0 | 0 | `b945ad2be234fb29` |
| `src/components/ui/switch.tsx` | 0 | 0 | 0 | `82d20b0bbe0880e6` |
| `src/components/ui/table.tsx` | 0 | 0 | 0 | `5cee937c372bce9a` |
| `src/components/ui/tabs.tsx` | 0 | 0 | 0 | `ea49795ab5cc253c` |
| `src/components/ui/textarea.tsx` | 0 | 0 | 0 | `c798930ad1ad118c` |
| `src/components/ui/toast.tsx` | 0 | 0 | 0 | `87ab93db171be019` |
| `src/components/ui/toaster.tsx` | 0 | 0 | 0 | `6cce09ccc4cecbd8` |
| `src/components/ui/toggle-group.tsx` | 0 | 0 | 0 | `80ca2245a6104b97` |
| `src/components/ui/toggle.tsx` | 0 | 0 | 0 | `834fecdf28eccf12` |
| `src/components/ui/tooltip.tsx` | 0 | 0 | 0 | `0d43ec6da30ba92a` |
| `src/components/ui/use-toast.ts` | 0 | 0 | 0 | `3fbe3b856affdf39` |
| `src/contexts/AuthContext.tsx` | 1 | 0 | 0 | `50aad68b2abbb4d2` |
| `src/contexts/DemoContext.tsx` | 6 | 0 | 0 | `c5682aa8ec6a5671` |
| `src/contexts/LanguageContext.tsx` | 106 | 41 | 6 | `2a2ef7a64e8f0c93` |
| `src/data/districts.ts` | 65 | 0 | 0 | `0e4794b1838381b3` |
| `src/data/farmer-locations.ts` | 495 | 0 | 0 | `bc770f69ea6b6265` |
| `src/data/season-tips.ts` | 91 | 14 | 0 | `2ef1e5e54facc6ef` |
| `src/farmer-hisab.css` | 0 | 0 | 0 | `b69519827b138314` |
| `src/farmer-market.css` | 0 | 0 | 0 | `50fcea2f50fcd329` |
| `src/farmer-notebook.css` | 0 | 0 | 0 | `23fd7002a85b0346` |
| `src/farmer-photo.css` | 0 | 0 | 0 | `393555c1012b5f39` |
| `src/farmer-profile.css` | 0 | 0 | 0 | `bdb98ae70e5ffe20` |
| `src/farmer-selling.css` | 0 | 0 | 0 | `612423ea37e0fa98` |
| `src/farmer-today.css` | 0 | 0 | 0 | `8c7a1b768940c80b` |
| `src/hooks/use-mobile.tsx` | 0 | 0 | 0 | `f6f7a7643d460772` |
| `src/hooks/use-toast.ts` | 0 | 0 | 0 | `6bf9e146f489a0c6` |
| `src/hooks/useSiteTheme.ts` | 0 | 0 | 0 | `d61592f734ab483b` |
| `src/index.css` | 0 | 0 | 0 | `4d877cdcc3269f78` |
| `src/integrations/supabase/client.ts` | 0 | 0 | 0 | `d10288a5fdfa4904` |
| `src/integrations/supabase/types.ts` | 0 | 0 | 0 | `4b3358ed19297bf4` |
| `src/lib/api.ts` | 3 | 0 | 0 | `ef7061f991b80c29` |
| `src/lib/care-area.ts` | 1 | 0 | 0 | `9dfb8c982bdfefcc` |
| `src/lib/crop-advice.ts` | 24 | 21 | 0 | `962e1bcecd765816` |
| `src/lib/demo-buyer-interests.ts` | 6 | 2 | 0 | `cf839fcfc2c0f191` |
| `src/lib/disease-api.ts` | 1 | 1 | 0 | `4f506076ed388fd9` |
| `src/lib/district-names.ts` | 0 | 0 | 0 | `1a4a4503e3f6410a` |
| `src/lib/farmer-market.ts` | 0 | 0 | 0 | `fac6d0362f591d7f` |
| `src/lib/farmer-profile.ts` | 0 | 0 | 0 | `b4cd4a22f79b9249` |
| `src/lib/farmer-records.ts` | 0 | 0 | 0 | `6ae792cfa2f5dac5` |
| `src/lib/farmer-tools.ts` | 7 | 0 | 1 | `d3651b620c8905b9` |
| `src/lib/field-actions.ts` | 0 | 0 | 0 | `4c8cdda14bd332b9` |
| `src/lib/harvest-market.ts` | 4 | 0 | 0 | `c213d90583514962` |
| `src/lib/local-date.ts` | 0 | 0 | 0 | `f4bc978f3355fd2e` |
| `src/lib/notebook.ts` | 33 | 9 | 1 | `7a9d964aa1548928` |
| `src/lib/pending-scans.ts` | 2 | 0 | 0 | `94a491e914231935` |
| `src/lib/photo-demo-cases.ts` | 32 | 7 | 1 | `14916a2ea8c9a358` |
| `src/lib/photo-thumbnail.ts` | 0 | 0 | 0 | `6e28e43adca8e7ce` |
| `src/lib/potato-image.ts` | 2 | 0 | 0 | `79c8093a0690ef07` |
| `src/lib/potato-nutrients.ts` | 8 | 0 | 0 | `f6a88803afe407ce` |
| `src/lib/potato-presence-model.ts` | 1 | 0 | 0 | `6b1067ed9a3d7413` |
| `src/lib/push.ts` | 0 | 0 | 0 | `672824b33bb6c71a` |
| `src/lib/today-plan.ts` | 47 | 16 | 0 | `b433e4479a9e5083` |
| `src/lib/tuber-offline-model.ts` | 3 | 0 | 0 | `fc4cc81ad213993f` |
| `src/lib/utils.ts` | 0 | 0 | 0 | `c0adf27efbfa148d` |
| `src/lib/variety-offline-model.ts` | 2 | 0 | 0 | `2acfaf811a6a860f` |
| `src/main.tsx` | 0 | 0 | 0 | `91d4c719a17ee02c` |
| `src/pages/Auth.tsx` | 22 | 5 | 0 | `b6704b0453984877` |
| `src/pages/ColdStoragePage.tsx` | 4 | 2 | 0 | `76b3bc91302d4e80` |
| `src/pages/History.tsx` | 0 | 0 | 0 | `bad3e041d6bf70fa` |
| `src/pages/Index.tsx` | 1 | 1 | 0 | `c4e2d1d331c8b378` |
| `src/pages/NotFound.tsx` | 0 | 0 | 0 | `68de8c160f94f212` |
| `src/pages/PotatoLifeCycle.tsx` | 41 | 13 | 1 | `19e4c748d633002a` |
| `src/pages/SellingPreparationDetails.tsx` | 10 | 3 | 0 | `7ac74871afe09e5e` |
| `src/public-landing.css` | 0 | 0 | 0 | `095807b83cd9f609` |
| `src/site-theme.css` | 0 | 0 | 0 | `e476c1d91b09f2f8` |
| `src/vite-env.d.ts` | 0 | 0 | 0 | `424faf9241dd699d` |
| `supabase/farmer_records.sql` | 0 | 0 | 0 | `174da1cec49f0b6a` |
| `supabase/functions/send-reminders/index.ts` | 1 | 1 | 0 | `57bdbde6b8478b89` |
| `supabase/migrations/20251226214836_b3b3fba7-58fa-4db0-9c61-d1572e3edb80.sql` | 0 | 0 | 0 | `42f83617d6603e68` |
| `supabase/migrations/20260623201818_7f55ec35-799c-45f8-9820-c02e070ff80d.sql` | 0 | 0 | 0 | `ca544fd77ae44bd2` |
| `supabase/migrations/20261019000000_farmer_ledger_records.sql` | 0 | 0 | 0 | `ee770140038c8ade` |
| `supabase/migrations/20261021000000_marketplace.sql` | 0 | 0 | 0 | `2cc8207c5a86f688` |
| `supabase/migrations/20261110000000_marketplace_security.sql` | 0 | 0 | 0 | `7db10b8b115a6c78` |
| `supabase/push_reminders.sql` | 0 | 0 | 0 | `a01a736191adab77` |
| `supabase/reminder_schedule.sql` | 0 | 0 | 0 | `a438cf5d8362265a` |
| `vite.config.ts` | 5 | 1 | 0 | `d62451c16e6838b9` |

## Excluded candidate occurrences

This keeps the candidate count auditable and avoids treating implementation strings as English copy. Protected machine comparisons noted above are never proposed for rewriting.

| Source | Exact candidate | Reason |
|---|---|---|
| `public/marketplace/banners/buyer-market-living-v1/motion.js:8` | sample | Implementation string, not display copy |
| `public/marketplace/banners/buyer-market-living-v1/motion.js:9` | phone | Implementation string, not display copy |
| `public/marketplace/banners/buyer-market-living-v1/motion.js:10` | worker-left | Implementation string, not display copy |
| `public/marketplace/banners/buyer-market-living-v1/motion.js:11` | worker-right | Implementation string, not display copy |
| `public/marketplace/buyer-profile.mjs:14` | maxlength="100" autocomplete="organization" | Adjacent dynamic tuple values falsely paired by structural extraction; review nested display literals instead |
| `public/marketplace/buyer-transport.mjs:30` | ${t("কোথা থেকে", "Pickup")}: ${placeName(from)} | Adjacent dynamic tuple values falsely paired by structural extraction; review nested display literals instead |
| `public/marketplace/buyer-transport.mjs:31` | ${t("কোথায়", "Destination")}: ${placeName(to)} | Adjacent dynamic tuple values falsely paired by structural extraction; review nested display literals instead |
| `public/marketplace/transport.mjs:104` | ${t("কোথায়", "To")}: ${placeName(draft.to)}${draft.toPoint ? t(" (আলাদা জায়গা বেছে নেওয়া)", " (custom drop-off point)") : t(" জেলা শহর", " district town")} | Adjacent dynamic tuple values falsely paired by structural extraction; review nested display literals instead |
| `public/marketplace/transport.mjs:104` | ${t("ওঠানো / বস্তা", "Handling / sacks")}: ${money(result.handling)} · ${t("অন্য খরচ", "Other costs")}: ${money(result.other)} | Adjacent dynamic tuple values falsely paired by structural extraction; review nested display literals instead |
| `src/components/AluSathiDashboard.tsx:230` | unknown | Internal model/status value |
| `src/components/ui/sonner.tsx:17` | group-[.toast]:text-muted-foreground | Implementation string, not display copy |
| `src/lib/care-area.ts:14` | acre | Persisted unit value, not the displayed label |
| `vite.config.ts:34` | marketplace-directory-index | Implementation string, not display copy |
| `vite.config.ts:46` | clear-preview-worker-in-dev | Implementation string, not display copy |
| `vite.config.ts:65` | serve-onnx-runtime-in-dev | Implementation string, not display copy |
| `ml/auth.py:105` | Unknown action | Protocol/auth validation message mapped to generic UI copy; preserve API contract |
| `ml/auth.py:42` | Request not allowed | Protocol/auth validation message mapped to generic UI copy; preserve API contract |
| `ml/auth.py:43` | JSON required | Protocol/auth validation message mapped to generic UI copy; preserve API contract |
| `ml/auth.py:51` | Try again shortly | Protocol/auth validation message mapped to generic UI copy; preserve API contract |
| `ml/auth.py:47` | Request too large | Protocol/auth validation message mapped to generic UI copy; preserve API contract |
| `ml/auth.py:60` | Invalid request | Protocol/auth validation message mapped to generic UI copy; preserve API contract |
| `ml/auth.py:99` | Invalid session | Protocol/auth validation message mapped to generic UI copy; preserve API contract |
| `ml/auth.py:103` | Sign in first | Protocol/auth validation message mapped to generic UI copy; preserve API contract |
| `ml/marketplace.py:55` | Sign in to continue | Backend validation/action message; no active direct UI path |
| `ml/marketplace.py:59` | Sign in to continue | Backend validation/action message; no active direct UI path |
| `ml/marketplace.py:154` | Invalid lot | Backend validation/action message; no active direct UI path |
| `src/components/AluSathiDashboard.tsx:599` | Photo deletion failed | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/components/ColdStorage.tsx:29` | Invalid contacts | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/components/PotatoDetailsDialog.tsx:27` | Unreadable saved details | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/components/SellingPreparationTools.tsx:30` | Unreadable saved checks | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/components/ui/carousel.tsx:35` | useCarousel must be used within a <Carousel /> | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/components/ui/form.tsx:41` | useFormField should be used within <FormField> | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/components/ui/sidebar.tsx:37` | useSidebar must be used within a SidebarProvider. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/contexts/AuthContext.tsx:65` | AuthProvider missing | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/contexts/LanguageContext.tsx:326` | useLanguage must be used within a LanguageProvider | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/api.ts:55` | Location not found | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/api.ts:60` | Weather API Error: ${response.status} | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/api.ts:64` | Weather data is incomplete | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/farmer-tools.ts:5` | Enter a positive area. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/farmer-tools.ts:11` | Check the label rate and quantity. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/farmer-tools.ts:12` | Enter water volume. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/farmer-tools.ts:17` | Measure at least three equal sample plots. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/farmer-tools.ts:38` | Choose a future time. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/harvest-market.ts:26` | Invalid harvest plan | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/harvest-market.ts:27` | en-BD | Locale identifier inside a dynamic expression; preserve date/number formatting |
| `src/lib/harvest-market.ts:27` | en-BD | Locale identifier inside a dynamic expression; preserve date/number formatting |
| `src/lib/notebook.ts:18` | Unreadable notebook | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/notebook.ts:31` | Invalid expense | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/notebook.ts:40` | Invalid calculation | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/pending-scans.ts:36` | Save aborted | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/pending-scans.ts:57` | Delete aborted | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/potato-image.ts:7` | Image dimensions are out of range | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/potato-image.ts:12` | Image processing is unavailable | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/potato-nutrients.ts:14` | Enter a valid field area. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/potato-nutrients.ts:20` | Enter a valid field area. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/potato-presence-model.ts:23` | Invalid potato presence model output | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/tuber-offline-model.ts:29` | Use an image between 128 and 8,000 pixels. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/tuber-offline-model.ts:37` | Image processing is unavailable. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/tuber-offline-model.ts:58` | The model returned an invalid score. | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/variety-offline-model.ts:17` | Invalid variety model manifest | Internal exception translated or swallowed by the UI; no direct display path found |
| `src/lib/variety-offline-model.ts:37` | Invalid variety model output | Internal exception translated or swallowed by the UI; no direct display path found |
| `public/marketplace/app.js:764` | Unreadable interest history | Internal exception translated or swallowed by the UI; no direct display path found |
| `public/marketplace/app.js:1001` | contacts unavailable | Internal exception translated or swallowed by the UI; no direct display path found |
| `public/marketplace/buyer-personal.mjs:6` | invalid notebook | Internal exception translated or swallowed by the UI; no direct display path found |
| `public/marketplace/buyer-workspace.mjs:5` | Record limit reached | Internal exception translated or swallowed by the UI; no direct display path found |

## Changes since the previous audit

This refresh uses commit e7ab25e, including the new 90-day calendar. The previous audit covered commit 457974d. Existing application code has not been rewritten as part of this refresh.

- Reviewed all 90 daily tips and their source note in src/data/season-tips.ts. Fourteen English occurrences have proposed wording improvements; the other 77 remain as written. The Bangla tips, day numbers, spacing figures, fertiliser/spray cautions and schedule are unchanged.
- Added overlooked labels passed through Buyer cost-field helpers, map labels, a dynamic numeric-error message, export text and citation/product names. Extra SQL scanning covers protected upstream error messages, not changes to schemas or policies.
- Rechecked moved line references and retained stable IDs for unchanged source occurrences. Retained existing numeric plural branches instead of normalising acres/hectares to singular in body text.
- Moved two earlier proposals to the held list: the negative blight label and the extra photo-date warning. Approval of the CSV must not authorise those held strings.
- Held the calendar's “Today is day ${fmt(actual)} of your growing season” statement: src/components/SeasonProgress.tsx:46 sets actual to 8. Both languages describe this fixed demo day as the user's crop age. Changing the English alone cannot establish a real planting date or fix that behaviour.
- Previous proposal count: 772; current proposal count: 784. These are proposal revisions, not applied application changes.

## Refresh language-switch checks

Native language switches were clicked on each available Home, life-cycle, Buyer and static marketplace view at both required widths. Farmer routes with no language control were inspected separately in each saved language; no missing control was added.

| Route | Size | Result |
|---|---|---|
| / | desktop | en → bn → en passed |
| /life-cycle | desktop | en → bn → en passed |
| /marketplace/buyer.html | desktop | en → bn → en passed |
| /marketplace/buyer.html#needs | desktop | en → bn → en passed |
| /marketplace/buyer.html#saved | desktop | en → bn → en passed |
| /marketplace/buyer.html#buyer-plan | desktop | en → bn → en passed |
| /marketplace/buyer.html#transport | desktop | en → bn → en passed |
| /marketplace/buyer.html#notebook | desktop | en → bn → en passed |
| /marketplace/buyer.html#profile | desktop | en → bn → en passed |
| /marketplace/buyer.html?preview=public | desktop | en → bn → en passed |
| /marketplace/buyer.html?preview=farmer | desktop | No language control on this view; both saved-language variants inspected separately |
| /marketplace/farmer.html | desktop | en → bn → en passed |
| / | mobile | en → bn → en passed |
| /life-cycle | mobile | en → bn → en passed |
| /marketplace/buyer.html | mobile | en → bn → en passed |
| /marketplace/buyer.html#needs | mobile | en → bn → en passed |
| /marketplace/buyer.html#saved | mobile | en → bn → en passed |
| /marketplace/buyer.html#buyer-plan | mobile | en → bn → en passed |
| /marketplace/buyer.html#transport | mobile | en → bn → en passed |
| /marketplace/buyer.html#notebook | mobile | en → bn → en passed |
| /marketplace/buyer.html#profile | mobile | en → bn → en passed |
| /marketplace/buyer.html?preview=public | mobile | en → bn → en passed |
| /marketplace/buyer.html?preview=farmer | mobile | No language control on this view; both saved-language variants inspected separately |
| /marketplace/farmer.html | mobile | en → bn → en passed |

The 90 daily-tip English/Bangla fields were reviewed in source. Navigation and screenshot checks cover the current season view; not every calendar day was clicked again in this audit. The previous calendar implementation's all-90-day tests are not counted as new audit tests.

## Audit reproduction and boundaries

Read-only analysis helpers are kept outside the application checkout at C:/Users/Mysha/AppData/Local/Temp/alusathi-copy-audit. The extraction uses TypeScript AST traversal plus Python AST/HTML/JSON supplements. Counts are occurrence-based; a composed template and its separately authored nested literal are separate source occurrences, not a count of on-screen phrases. Proper names and shared units are counted when displayed and retained unchanged.

Analysis sequence: extract.cjs → supplement.py → refresh_baseline.cjs → refresh-extra-coverage.cjs → prepare.cjs. Browser observations come from browser.cjs, interactions.cjs and refresh-browser.cjs. CSV serialization uses the bundled Artifact workbook API; validate.py checks exact headers, row round trips, unique IDs, source lines, unchanged source hashes and formula-like cells. No dependency was installed.

Only the three requested audit files are rewritten. No source/test file, generated marketplace record, translation key, local storage value, URL, model, calculation or database contract is changed. No commit, push or PR update is authorised by or performed for this audit.
