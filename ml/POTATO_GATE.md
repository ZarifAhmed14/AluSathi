# Potato-photo gate

The scanner accepts one photo first. It asks for a second or third view only when potato presence, variety, or visible condition is unclear. A clearly rejected object gets only “Not a potato”; it never receives a variety, defect, or storage-age result. The gate is separate from the two-variety and visible-defect models.

## Sources and replay

| Source | Use | License / caveat |
| --- | --- | --- |
| [Bogura multi-view tubers](https://data.mendeley.com/datasets/rgn2d2jb7f/1) | Potato examples | CC BY 4.0; specimen IDs unavailable. November 2025 photos for training, July 2026 for test. |
| [Zenodo potatoes, stones and plant debris](https://zenodo.org/records/17494607) | Both classes | CC BY 4.0; tiny industrial-camera crops, not phone photos. Its published train/val/test folders were preserved. |
| [COCO 2017 validation](https://cocodataset.org/#download) | Other objects | Image licenses vary by original Flickr photo. The source photos are local and ignored; they are not shipped in the app. COCO labels do not prove an image has no potato. |

Download Bogura using `ml/download_bogura.py`, prepare its two varieties with `ml/train_variety_pair.py prepare`, obtain the Zenodo archive from its record and extract it under `.ml-data/variety/potatoes-zenodo/`, then save COCO `instances_val2017.json` in `.ml-data/variety/` and run `ml/download_potato_gate_negatives.py`. Train, inspect and export with:

```powershell
.venv\Scripts\python.exe ml/train_potato_presence.py train --epochs 6
.venv\Scripts\python.exe ml/check_potato_presence.py
.venv\Scripts\python.exe ml/train_potato_presence.py export
```

The checked-in model was trained on 4,800 images. On the held-out images, the conservative reject threshold (`<=0.001`) rejected 111/125 broad COCO objects and 293/377 stones/plant debris, with 0/790 tested potato images rejected. Another 135/300 later-session Bogura potato images were *uncertain* after the first photo; only 165/300 passed the gate directly. The app's multi-potato harvest illustration was also uncertain. These are dataset results, **not field accuracy**. The images may repeat physical tubers, COCO may include unlabeled potatoes, and the split does not cover independent Bangladesh farm-phone uploads. A low score between the two thresholds asks for another photo; it does not prove “not a potato.”

`tests/fixtures/README.md` records the attribution for the public photos used in browser tests. Before claiming reliable rejection or using the scanner for farmer decisions, collect field photos of single tubers *and* confusing non-potatoes (ginger, sweet potato, stones, hands, leaves, bags) across phones/sites, hold out whole collection sessions and physical tubers, then measure false rejections and misses separately.
