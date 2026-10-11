# AluSathi Competition Package

## One-line pitch

AluSathi helps Bangladesh potato farmers record leaf symptoms, check relevant weather and share a photo report with an agricultural expert before treatment.

## Why it matters

Leaf-disease AI often performs well on clean online images and poorly in real fields. After weak regional validation, AluSathi stopped running the leaf classifier in the farmer flow. Farmers can still record observations and share them with an expert. The separate tuber variety/condition scanner remains experimental.

## Evidence status

| Evidence | Status | Location |
| --- | --- | --- |
| Working local end-to-end demo | Complete | repository run commands |
| Controlled model evaluation | Complete | `ml/artifacts/potato_mobilenet_v3.metrics.json` |
| External regional evaluation | Complete | `PHASE1_EVALUATION.md` |
| Model card | Complete | `competition/MODEL_CARD.md` |
| Dataset card | Complete | `competition/DATASET_CARD.md` |
| Architecture and technical documentation | Complete | `PROJECT_DOCUMENTATION.md` |
| Responsible-AI statement | Complete | `competition/RESPONSIBLE_AI.md` |
| Before/after farmer journey | Complete | below |
| Five-to-ten-person usability study | Pending real participants | `competition/USABILITY_TEST.md` |
| Two-minute backup recording | Pending recording | `competition/DEMO_RUNBOOK.md` |
| Public deployment | Previously reported Vercel URL; not re-verified, and this local change is not deployed | `https://alusathi-fieldwatch.vercel.app/` |

## Before and after

| Without AluSathi | With AluSathi |
| --- | --- |
| Farmer notices a mark but may not know what evidence to collect | App guides one clear close photo at a time |
| One leaf may be treated as proof of the whole field | Four questions record visible symptoms without claiming a field diagnosis |
| A confident AI answer may be mistaken for a diagnosis | The unvalidated leaf classifier is not run in the farmer flow |
| Poor internet can end the attempt | Leaf notes work on this device without the classifier; potato scanner needs a prior model download |
| Farmer may act before speaking to an expert | The photo, district, date, answers and weather context can be shared; 16123 is available |

## Honest judging statement

The leaf model is not field-ready: it reached 51.19% on an external regional evaluation and is not used for farmer diagnosis. The symptom questions need local pathologist review. The tuber model's internal holdout is not independent field validation; verified variety IDs and new-site testing remain necessary. The role picker and marketplace localStorage preview are not real accounts or transactions.
