# AluSathi: qualification-readiness review

Review date: 5 October 2026. Scope: current local build at http://127.0.0.1:4175/, including /marketplace/ and /life-cycle. This is not a review of the deployed site's current code. No application fixes, deployment, push, retraining, or real transactions were performed.

## Executive Summary

AluSathi is a credible, good-looking prototype, but a borderline qualifier rather than a confident one today. Its clearest strengths are Bangla-first mobile design, genuinely running offline vision models, careful uncertainty handling, and net-income offer comparison. Its largest weaknesses are field-model generalization, incomplete account/cloud journeys, a marketplace that only simulates trade in one browser, money/quantity bugs, and no demonstrated farmer outcomes.

I would not present it as a field-ready diagnosis product or a working live marketplace. A prototype-stage round could reward the architecture and problem fit; a round expecting validated AI and commercial traction would expose substantial gaps. No defensible probability can be calculated without the actual round, cutoff and competing submissions.

Rubric assumption: the original AI Builders Congress guide, with five equally weighted criteria. The criteria were recovered from the previously retrieved guide; a current full export was blocked this turn, so their current applicability needs reconfirmation. If this is the government showcase instead, the scorecard needs reweighting.

## What was verified

- Playwright journeys at 320, 390, 768 and 1440 px across the app and marketplace; Bangla/English switching; no horizontal overflow or page-level JavaScript errors in the exercised journeys.
- Farmer/buyer role entry, listing creation, offer creation/comparison, partial agreement, pickup submission/approval, payment claim/confirmation, storage break-even calculation, quote storage, after-harvest tips, logout, and output escaping for hostile names.
- Main-app demo entry, guest-history hiding, real packaged ONNX leaf/tuber inference, warm-cache fully offline leaf inference, report download/print visibility, manual severity marking/reset, conditional weather outlook, area/dosage/yield arithmetic and calendar export.
- Life-cycle play/pause/scrub and language switching.
- Production build and application TypeScript check passed. Lint had zero errors and ten existing Fast Refresh warnings. Thirteen Python tests passed. Git whitespace check passed.
- BAMIS, BARI and AIS information links returned HTTP 200 in Chromium. Telephone launching cannot be verified in headless Chromium.
- Existing regression tests using mocked predictions validate state transitions, not disease accuracy. Real-model smoke checks are also not a new field benchmark.

Not verified: actual farmer usability, low-end Android performance, iOS/Safari and real camera permissions, audible Bangla voice availability, live private-account/cloud flows, notification delivery to physical devices, cross-device trades, independent field accuracy, or income/loss improvements. Review coverage is substantial, not every possible input/state/device combination.

## Model evidence and its limits

Saved leaf-model evaluation: controlled PlantVillage test accuracy 95.98% on 323 photos; external regional collection accuracy 51.19% on 13,800 photos; West Bengal subset accuracy 36.33% on 2,929 photos. West Bengal is part of the regional collection, not an independent third experiment. These are previously saved evaluations, inspected now, not rerun in this review. Different source composition and un-audited field labels limit interpretation; the small Bangladesh-only subset is inadequate for a national accuracy claim.

The regional confidence policy accepts 67% of photos, but those accepted predictions are only 55.59% correct. Confidence is not a reliable substitute for validation here.

The app appropriately blocks unvalidated leaf diagnoses. Offline code returns an uncertain label with field_validation_pending for every image. That prevents unsafe certainty, but makes the promise of resolving unclear results with more photos misleading: the lock remains after three clear photos. The actual packaged-model journey ended with three uncertain results and expert escalation.

The saved tuber result is 99.22% on a 1,802-image internal healthy/defective holdout. It does not demonstrate Bangladesh performance, disease-subtype recognition, counting, grading, food safety, or unsupported-image rejection. A real upload of the app's leaf icon produced a visible-defect warning. That is evidence of an input-domain guard missing, not proof that all potato predictions are wrong.

## Reproduced bugs

1. **Partial-sale preview uses the wrong quantity.** The local sample offer is 2,000 kg at ৳22/kg. Change the agreement to 500 kg: the dialog still displays ৳44,000 rather than ৳11,000. The stored deal uses the lower amount. The farmer sees the wrong estimate at the commitment moment.
2. **One buyer offer can be over-accepted.** A 1,500 kg processor offer accepted twice for 1,000 kg creates 2,000 kg of agreements. Lot availability is checked, but remaining demand for that specific offer is not.
3. **Underpayment can close as Paid.** A 500 kg / ৳11,000 deal allowed a ৳0 payment claim, then farmer confirmation changed it to Paid. Confirmation is explicit and warned, but no outstanding balance or partial-payment state exists. This is not payment verification.
4. **Demo login does not unlock all apparently logged-in features.** Header changes to Logout and member sections appear, while reminders and yield-record saving continue to ask for login. Their /auth link returns to the same demo. Real cloud identity and demo identity are inconsistent.
5. **Unrelated images receive tuber-defect advice.** The icon test must be rejected as unsupported rather than interpreted as a potato.
6. **More photos cannot resolve a field-validation lock.** The user is asked to retake rather than told clearly that this model is not approved for field diagnosis. Safety policy should stay; explanations should match the cause.
7. **Language switch loses unsaved marketplace form fields.** Typed upazila text disappeared after switching language. Storage calculation inputs are preserved, but other forms are not.
8. **Agreement dialog lacks keyboard containment.** Escape does not dismiss it and Tab reaches background controls.
9. **Bangla example terms remain English.** The sample's crucial weighing/deduction sentence is English on the Bangla offer page. Real user-written terms need separate handling, but supplied examples should be understandable.

Evidence: tests/october-audit.cjs, tests/marketplace-edge-audit.cjs, tests/field-tools-audit.cjs and test-results/october-audit/*.json. These tests used isolated synthetic browser storage, not real accounts.

## Feature claims: demonstrated versus not demonstrated

- **Leaf AI:** real trained inference and safeguards; not validated field diagnosis.
- **Tuber AI:** binary visual-defect screening; not counting, grade, named disease or safe-to-eat detection.
- **Disease severity:** finger-traced image-area measurement. A half-area trace returned 50% and reset correctly. Not automated AI severity.
- **Disease-spread forecast:** conditional Hutton weather-rule outlook; not a learned local outbreak probability or spatial spread model. Disclosure is present.
- **Yield forecast:** extrapolation from three harvested sample plots; not predictive ML across seasons. Disclosure is present.
- **Harvest/buyer matching:** manual buyer requests and deterministic matching; not an independently maintained live demand feed.
- **Marketplace:** separate role pages and useful offer/deal calculations, but localStorage sharing in one browser. No remote farmer/buyer connection, per-owner privacy, server reservations, verified buyer, verified payment or live dispute support.
- **Cold storage:** manual quote/cost/break-even tools and map search. No connected vacancy, booking or guaranteed price.
- **Reminders:** guest calendar export works. Current demo entry cannot reach real reminder/cloud/push capabilities; actual delivery remains unverified.
- **Life cycle:** polished educational visual, not evidence of growth prediction, harvest readiness or AI innovation.

## Design, performance and code

The distinctive green/cream/gold visual identity is coherent. Responsive layout, large actions, role separation and hiding guest history are substantial strengths. Appearance is not the dominant blocker now.

The main page is still long (about 5,500 CSS px at 390 px width) and asks for several different kinds of understanding. Progressive disclosure helps, but farmer testing is missing. Manual tracing, typed quantity/cost forms and multiple identity experiences could be hard for low-literacy users. This is a usability risk, not a conclusion from observing farmers.

The PWA precaches about 38.66 MiB uncompressed, including both models, a 13.32 MiB runtime and educational artwork. First download is a rural-data-budget concern. Warm-cache offline inference works on the review laptop; low-end hardware and first-time disconnected use were not proven. Offer a clear offline-pack download and separate optional life-cycle assets rather than equating installation with proven accessibility.

The dashboard combines many responsibilities and is approximately 56 KB of source. Marketplace app.js mixes template generation, local persistence and transaction state; blanket rerendering causes form loss. Keep current frameworks. Small extraction of pure deal/payment rules and preserving drafts is more useful than a large rewrite. Some legacy/template UI and dependencies remain; remove only after confirming unused references. Ponytail review does not justify cutting validation, access control or evidence.

Security review: hostile display names were escaped in tested marketplace paths, and backend input/auth safety tests passed. No tracked .env file was found. npm audit flagged seven dependency groups (six high, one moderate), mainly the Tailwind/glob/build-tool chain. This is a maintenance finding, not proof of a remotely exploitable production flaw. Patch in a separate verified change. Local demo records lack tenant ownership and can be changed by anyone using that browser; never deploy this as real trade without backend authorization and atomic quantity reservations.

## Competition assessment

| Criterion from original guide | Current assessment |
| --- | --- |
| Innovation and AI-native design | Moderate. Offline vision is real, but crop classifiers and marketplaces are familiar. Most added modules are rules/calculators, not additional trained models. |
| Technical excellence and architecture | Moderate. Real ONNX/PWA work and tests; weakened by generalization, identity mismatch and deal-state bugs. |
| Business value and commercial viability | Weak evidence. Important pain point and net-income logic, but no real buyer pipeline, completed trade, verified logistics quote or established operating model. |
| Scalability and real-world impact | Weak evidence. Potential is not a measured income, loss or adoption result. Current trade cannot cross devices. |
| Responsible AI, governance and presentation | Relatively strongest. Fail-closed leaf policy, limitations, model/data cards and clear demo labels; unsupported-image behavior and inconsistent claims still need attention. |

I would describe this as a promising prototype with a vulnerable qualification case, not a proven farmer product or prize-ready finalist. A visually strong video could pass an early prototype screen. A close inspection would ask what the farmer can reliably diagnose or sell today, and the current answer is limited.

## Priority order before submission

1. Freeze new features. Fix payout preview, offer demand limits, payment/balance state and demo-login wording. Add regression assertions for each reproduced failure.
2. Choose one honest, complete demonstration: crop evidence → optional expert report → actual buyer quote comparison → transparent net take-home → auditable weight/payment record. Do not hide research status to force a success-looking diagnosis.
3. Recruit 5–10 target farmers for unaided usability tasks now. Record misunderstandings, time, task completion and consent. This does not require harvest-season model data.
4. Recruit a small real buyer group and cold-store/transport contacts. Collect dated, permissioned quotes from at least two districts; do not label sample offers as actual demand. State who pays freight, rejection/return terms and payment time.
5. If live trade is part of the submission claim, build real ownership-bound accounts, cross-device records and server-side quantity reservations before accepting real commitments. If not, clearly keep trade as prototype and show partner evidence.
6. Keep harvest-season independent field testing on the roadmap as requested. Do not use the internal tuber number or controlled leaf number as a Bangladesh accuracy claim.
7. Refresh the evidence board, feature matrix, public demo and backup recording together. Existing competition README still says deployment skipped and refers to older three-photo flows.
8. Rehearse hostile judge questions: Why trust this with weak regional accuracy? Which AI is learned? Where do real buyers come from? Does price include all costs? What happens when weight/payment differs? What outcome have you actually measured?

No more frontend polish is needed before fixing the central trust and proof gaps. The strongest opportunity is not maximum price guaranteed; it is a defensible net-income decision and transaction record that the farmer can understand.

## Evidence files

- ml/artifacts/potato_mobilenet_v3.metrics.json
- ml/artifacts/regional_evaluation.json
- ml/artifacts/tuber_test_metrics.json
- ml/artifacts/tuber_model_metadata.json
- src/App.tsx; src/contexts/DemoContext.tsx; src/components/FarmerTools.tsx; src/components/TreatmentReminders.tsx
- src/lib/offline-model.ts; src/components/ScanInsights.tsx; src/lib/farmer-tools.ts
- public/marketplace/app.js; public/marketplace/market.mjs
- competition/USABILITY_TEST.md; competition/README.md
- vite.config.ts
- test-results/october-audit/results.json; marketplace-edges.json; field-tools.json

This review is an assessment, not an official judge score or qualification guarantee.

