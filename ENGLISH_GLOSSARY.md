# AluSathi English glossary

Approved Phase 2 glossary. The 784 approved English replacements are implemented; the 40 uncertain strings remain unchanged. No Bangla, logic, keys, units or routes were changed. Snapshot base: `e7ab25ef8e9525c772d8c1435c68dbcea54b62bc`, branch `codex/farmer-buyer-profiles`, reviewed 15 November 2026. Publication was subsequently authorised on the separate branch `codex/english-copy-localization`.

## Core terms

| Bangla source | English | Usage / decision |
|---|---|---|
| কৃষক | Farmer | Role name. Lowercase farmer is fine in sentences. Never replace the role. |
| ক্রেতা | Buyer | Exactly this role, never Business, Customer or Merchant. Business name is a legitimate profile field, not a role. |
| আজকের কাজ | Today's tasks | Same label across navigation, links and headings. Use an ordinary apostrophe consistently. |
| মৌসুমের অগ্রগতি | Season progress | Approximate stages; not confirmed Field conditions. |
| খাতা | Khata | Keep the feature name. An existing descriptive subtitle can say farm record book. Do not add a new subtitle or screen. |
| জমির খাতা | Field Khata | Proposed heading for the existing Field diary/field notebook. |
| বিক্রির আগে | Before selling | Preparation, not a sale confirmation. |
| বাজারে দিন / বাজারে ছাড়ুন | List for sale | Publishing a listing. A save-and-navigation step uses Save and prepare listing; it does not finish a sale. |
| ছবি | Photo | Navigation label. Use photos naturally for multiple pictures. Do not alter counts. |
| খেত / জমি | Field | Agricultural land. Use field in ordinary sentence text; capitalise a heading normally. |
| জমির পরিমাণ / জমির মাপ | Land size | Not land information when the value is an area. |
| শতক / শতাংশ | shatak | First useful dropdown: shatak (1/100 acre). Do not change stored decimal unit values or conversions. |
| একর | acre | Display unit. Stored acre stays unchanged. |
| হেক্টর | hectare | Keep ha where already used as a shared unit. |
| বিঘা | bigha | Preserve local conversion inputs and warnings. Do not assume a fixed size in copy. |
| সার | fertiliser | UK spelling in all display text. Keep fertilizer API/property names unchanged. |
| পচা গোবর | rotted cow dung | Use the specific Bangla meaning. Well-rotted manure is acceptable where already supported. |
| স্প্রে | spray | A photo result must not become a spray instruction. |
| কন্দ | potato | Tuber is unnecessary in ordinary farmer-facing copy. Keep scientific dataset titles/model identifiers unchanged. |
| রোপণ / আলু লাগানো | planting | Planting date, not manufacturing or crop-start date. |
| অঙ্কুর | sprouts | Use sprouts appearing for the stage where supported. |
| ফসল সংগ্রহ / আলু তোলা | harvest | Collection refers to a Buyer taking potatoes, not harvesting them. |
| হিসাব | record / calculation / account | Choose by function. Khata is not a bank account. |

## Marketplace and photo terms

| Bangla source | English | Usage / decision |
|---|---|---|
| আলুর তালিকা | Potato listings | Listing is an advertisement/record, not a completed sale. |
| লট | lot | An amount of potatoes offered together. Keep lot IDs and keys unchanged. |
| পছন্দের লট | Saved lots | Consistent with the save/heart action. Compare is a separate action. |
| দর | price / offer / quote | Listing price, Buyer offer and transport quote have different meanings. |
| চাওয়া দাম | Asking price | What the seller asks, not a confirmed sale price. |
| চাহিদা | potato needs / request | My potato needs for navigation; request for one saved or published entry. |
| আগ্রহ | enquiry / interest | Contact interest is not an accepted offer or purchase. |
| টাকা হাতে | money after costs | Not profit when growing costs have not been deducted. Preserve that warning. |
| লাভ–লোকসান নেই | no profit or loss | Plain alternative to break-even. Price to cover costs for a per-kg threshold. |
| গাড়িভাড়া | transport cost / fare | Freight is unnecessarily technical. Quote remains an amount entered from a provider. |
| বস্তা | sack | Use sack consistently; never imply all sacks have the same weight. |
| মণ | maund | Display only. Keep existing 1 maund = 40 kg assumption and local-weight warning. No calculation changes. |
| সংগ্রহ | collection | Buyer takes the potatoes. Profile options: Collect myself / Have it delivered / Discuss with seller. |
| আলুর পরিচয়পত্র | potato information sheet | Plain alternative to potato-lot passport. It is not a grade or food-safety certificate. |
| নমুনা / উদাহরণ | example / sample | Prepared photos and sample listings must remain labelled. |
| আনুমানিক | estimated / about / a guess | Estimated cost/profit is clearer than a guess for money. Use a guess for uncertain photo-age wording. |
| AI-এর মিল | AI match | Not confidence or how sure unless the score is actually a calibrated confidence measure. |
| নিশ্চিত নয় | not certain / unclear | Keep uncertainty; never turn it into a confirmed diagnosis. |
| যাচাই হয়নি | not verified / not checked | Preserve who did or did not check it. |
| মনে করানো | reminder | Delivery is not guaranteed by sent-to-service status. |
| রোগের পরীক্ষা | photo check | A check is not a confirmed disease diagnosis. |

## Style and implementation boundaries

Use UK English, sentence case and short action labels. Use Add work and Add expense for the compact Khata buttons, and update references to those exact labels together. Retain safety conditions even when a sentence exceeds 12 words. Keep numbers, dates, units, interpolation expressions, plural branches and their order unchanged. Do not rewrite user-entered data, official citations, company names, chemical names, model classes, route strings or translation keys.

The Farmer and Buyer profiles both use Profile photo and Add photo. Phone and WhatsApp remain separate fields. Khata expenses, crop costs, sale value, money after costs and profit are different quantities. No change to their formulas is proposed.

## Decisions requiring review

The held strings in ENGLISH_COPY_UNCERTAINTIES.md take precedence over this glossary. In particular, do not automatically rewrite Healthy, the Maturity stage, the middle-yield label, legacy AI promises, watering commands or stored sample-offer terms. The public language button's Show Bangla / show English actions intentionally point to opposite languages.
