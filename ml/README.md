# AluSathi vision model

The demo fine-tunes MobileNetV3-Small on the three potato classes from the open PlantVillage dataset: early blight, healthy, and late blight.

## Colab retraining

Make a copy of the working notebook before retraining. In the copy, select a T4 GPU, mount Drive, clone this repository, and run:

```python
!pip install -q -r ml/requirements.txt
!python ml/train.py --data /content/dataset --epochs 25 --batch-size 64
```

For honest evaluation, `/content/dataset` should contain `train`, `val`, and `test` folders, each containing `early_blight`, `healthy`, and `late_blight`. Keep images from the same farm, collection session, or video in only one split; otherwise near-duplicate images can make the score misleading. A flat three-class directory is still accepted for the older random-split workflow. The trainer now uses stronger field-style augmentation, fine-tunes six MobileNet blocks, applies label smoothing, and selects the checkpoint with the best validation macro-F1.

After training, download `ml/artifacts/potato_mobilenet_v3.pt`, replace the repository artifact, then regenerate the offline model with `python ml/export_onnx.py`.

```powershell
git clone --depth 1 --filter=blob:none --sparse https://github.com/spMohanty/PlantVillage-Dataset.git .ml-data/plantvillage
cd .ml-data/plantvillage
git sparse-checkout set raw/color/Potato___Early_blight raw/color/Potato___Late_blight raw/color/Potato___healthy
cd ../..
.venv/Scripts/python.exe ml/train.py
.venv/Scripts/python.exe -m uvicorn ml.server:app --host 127.0.0.1 --port 8765
```

PlantVillage contains controlled-background images. The resulting model is suitable for screening-pipeline validation, not pesticide selection or field deployment. Replace it with locally collected, expert-labelled Bangladesh field data and evaluate using field-held-out splits before production use.

## External regional evaluation

Run the model against a manifest-based dataset that was not used for training:

```powershell
.venv\Scripts\python.exe ml\evaluate.py --data C:\path\to\AluSathi_dataset_upload
```

The checked-in Phase 1 report covers 13,800 regional images. Raw accuracy fell to 51.19%, so the backend now returns an uncertain result by default. `ALUSATHI_FIELD_VALIDATED=true` must only be set after a future field-validation review approves the replacement model. See `PHASE1_EVALUATION.md`.

The backend loads the checkpoint named by `ALUSATHI_MODEL` and exposes the loaded filename, version, classes and recorded test accuracy from `/health`. A replacement checkpoint must keep the same `class_names` and `state_dict` structure or the loader must be adapted and parity-tested before release.

Dataset citation: Mohanty, Hughes & Salathe, *Using Deep Learning for Image-Based Plant Disease Detection*, Frontiers in Plant Science (2016), DOI: 10.3389/fpls.2016.01419.

## Harvested-tuber model

`public/models/alusathi_tuber_binary.onnx` is the browser-ready MobileNetV2 model exported from `Potato_test_train.ipynb`. It accepts one 224×224 RGB image in NHWC layout with pixel values from 0–255 and returns a sigmoid defect score. The app uses the notebook's 0.41 decision threshold and treats scores within 0.10 of it as uncertain.

The matching export metadata and evaluation record are kept in `ml/artifacts/tuber_model_metadata.json` and `ml/artifacts/tuber_test_metrics.json`. Its 99.22% result is an internal holdout score, not independent Bangladesh field validation. It only screens for “healthy” versus “possible visible defect”; it does not identify a disease subtype, certify food safety, or assign a market grade.

## Potato photo and variety checks

The browser first runs `public/models/potato_presence.onnx`. It rejects clear non-potato photos, asks for another view when uncertain, and does not run variety or condition models unless the photo passes that gate. See `ml/POTATO_GATE.md` for training sources, tests, limits, and replay commands.

The experimental two-variety model compares Diamant and Asterix only. The planned five-variety scanner remains data-gated until verified photos exist for every class. See `ml/VARIETY_DATA.md`. The visible-defect model above remains separate.
