# Five-variety tuber scanner

The app has **no trained five-variety model yet**. The existing condition ONNX model checks for possible visible defects. The Diamant/Asterix **two-way comparison** runs with the same photo, but other varieties still get one of these two names. `variety_sources.csv` records what can and cannot currently be used for variety training. Do not copy catalog images into training without permission. Hagrai is deferred until its labels and image rights are verified.

## Photo register

Put licensed images and `manifest.csv` under ignored `.ml-data/variety/`. Use this header:

```csv
path,variety,tuber_id,source_id,license,split,site,session,phone,background,condition
```

One row is one photo. Variety values are `diamant`, `cardinal`, `granola`, `asterix`, or `courage`; split is `train`, `val`, or `test`. `tuber_id` identifies the **physical potato**, not the image. Keep every view of it in the same split. Confirm the variety from seed records or a knowledgeable grower; never label it from the model's own guess. Record the right to use each photo. If phone or condition is unavailable, use `unknown`; do not invent metadata. A photo counted twice is not two independent potatoes. Augmented images do not count toward collection totals.

The audit requires at least **80 train + 20 validation + 30 held-out physical tubers per class**. This yields at least 100 development tubers and 30 additional test tubers per class. Each class's test set must include a site and session absent from its development set. The 2,500 **real photos per class** goal remains longer-term; it is not a claim about current data. Use multiple sites, sessions, phones, backgrounds, sizes, and visible conditions. Check duplicates and mislabels manually before model training.

## Run

From the repository root, with `ml/requirements.txt` installed:

```powershell
.venv\Scripts\python.exe ml\train_variety.py audit
.venv\Scripts\python.exe ml\train_variety.py train --epochs 20
.venv\Scripts\python.exe ml\train_variety.py export
```

`train` writes a checkpoint and test report under `ml/artifacts/`. `export` creates `public/models/potato_variety.onnx` and its JSON label manifest. The app loads these only if both exist. Do not export before reviewing per-class errors, subgroup performance, and the confusion matrix. Keep the model **experimental demo only**, even after export; it must not set marketplace variety automatically. Its top answer is a forced choice among five names, not proof of identity. Exact days since harvest cannot be inferred reliably from this photo. A future storage-condition model would need its own labels for visible sprouting, shriveling, and decay.

This first version has no reliable potato-versus-other-object detector. Do not claim it rejects non-potato images; collect negative examples and add that gate before real-world use.

The [Bogura multi-view dataset](https://data.mendeley.com/datasets/rgn2d2jb7f/1) is the confirmed starting source for Diamant and Asterix. Its 9,106 images cover four total varieties and multiple views of the same tubers, not 9,106 independent tubers. Cardinal, Granola, and Courage still need verified photos; until then the audit blocks training and the scanner does not show a fabricated variety name.

## Separate two-variety research run

Diamant and Asterix can be trained as a **two-way research comparison**, without claiming that the five-variety scanner is ready:

```powershell
.venv\Scripts\python.exe ml\download_bogura.py
.venv\Scripts\python.exe ml\train_variety_pair.py prepare
.venv\Scripts\python.exe ml\train_variety_pair.py train --epochs 8
.venv\Scripts\python.exe ml\train_variety_pair.py export
```

The download script checks the publisher's SHA-256 and keeps the CC BY 4.0 photos in ignored `.ml-data/variety/`. The research checkpoint and report stay there; the ONNX file is copied to `public/models/potato_variety_pair.onnx` for a limited two-way comparison. The model compares only known Diamant and Asterix photos. It will still force one of those answers for Cardinal, Granola, Hagrai, or a non-potato image, so it must not be offered as a general variety scanner.

The age panel refers to **time since harvest**. It does not automatically detect sprouts or shrivelling: the user selects the visible signs. Its broad sprouting estimate draws on [University of Idaho extension guidance](https://content-hub.uidaho.edu/api/public/content/5f2f5bada1aa482281c69a42d98e26cf?v=cceb4bae), which notes sprout onset can vary roughly 30–140 days by variety, and on [potato storage research](https://potatoassociation.org/wp-content/uploads/2014/04/A_ProductionHandbook_Final_000.pdf) describing strong effects of storage temperature. Do not display an exact harvest date or claim the photo alone determines age.

The source [README](https://data.mendeley.com/datasets/rgn2d2jb7f/1) says its variety labels were assigned visually and that physical tuber IDs were not retained. The run uses November 2025 images for development, approximate 10-minute groups for validation, and July 2026 images for a later-session test. The later session includes only dry-rot categories, not healthy tubers; all photos came from one cold-storage site. Results are exploratory image metrics, **not** verified-tuber or Bangladesh field accuracy. Obtain seed-record-confirmed photos with tuber IDs, an independent collection site, and out-of-scope potato varieties before considering deployment.
