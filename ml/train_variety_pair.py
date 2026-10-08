"""Experimental Diamant/Asterix model from the published Bogura photo archive.

This source has no physical-tuber IDs or seed-record confirmation. Its metrics
must not be presented as independent field accuracy or used for auto-listings.
"""

from __future__ import annotations

import argparse
import json
import random
import re
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(".ml-data/variety")
ARCHIVE = ROOT / "bogura.zip"
IMAGES = ROOT / "images"
CHECKPOINT = ROOT / "potato_variety_pair.pt"
CLASSES = ("diamant", "asterix")
SEED = 42


def prepare() -> None:
    if not ARCHIVE.is_file():
        raise FileNotFoundError(f"Run python ml/download_bogura.py first: {ARCHIVE}")
    with ZipFile(ARCHIVE) as archive:
        for member in archive.infolist():
            name = member.filename
            if not name.lower().endswith(".jpg"):
                continue
            folder, sep, filename = name.partition("/")
            if not sep or not folder.startswith(("BARI_Alu_7_Diamant__", "BARI_Alu_25_Asterix__")):
                continue
            if not re.fullmatch(r"[A-Za-z0-9_.-]+\.jpg", filename, re.IGNORECASE):
                raise ValueError(f"Unexpected archive filename: {name}")
            target = IMAGES / folder / filename
            if target.is_file() and target.stat().st_size == member.file_size:
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as source, target.open("wb") as output:
                while chunk := source.read(1024 * 1024):
                    output.write(chunk)
    print(f"Prepared {sum(1 for _ in IMAGES.rglob('*.jpg'))} Diamant/Asterix photos")


def rows_by_split() -> dict[str, list[tuple[Path, int, str]]]:
    if not IMAGES.is_dir():
        raise FileNotFoundError("Run python ml/train_variety_pair.py prepare first")
    groups: dict[tuple[int, str, str], list[tuple[Path, int, str]]] = defaultdict(list)
    splits: dict[str, list[tuple[Path, int, str]]] = {name: [] for name in ("train", "val", "test")}
    for path in sorted(IMAGES.glob("*/*.jpg")):
        label = 0 if "Diamant" in path.parent.name else 1
        condition = path.parent.name.split("__", 1)[1]
        digits = "".join(re.findall(r"\d+", path.stem))
        if len(digits) < 12 or not digits.startswith(("2025", "2026")):
            raise ValueError(f"Cannot determine capture date: {path.name}")
        row = (path, label, condition)
        if digits.startswith("202607"):
            splits["test"].append(row)  # Later collection session; no image-level random test split.
        elif digits.startswith("202511"):
            groups[(label, condition, digits[:11])].append(row)  # Approximate 10-minute group, not a tuber ID.
        else:
            raise ValueError(f"Unexpected capture date: {path.name}")
    rng = random.Random(SEED)
    by_stratum: dict[tuple[int, str], list[tuple[int, str, str]]] = defaultdict(list)
    for key in groups:
        by_stratum[key[:2]].append(key)
    for keys in by_stratum.values():
        rng.shuffle(keys)
        val_count = max(1, round(len(keys) * 0.2)) if len(keys) > 1 else 0
        val_keys = set(keys[:val_count])
        for key in keys:
            splits["val" if key in val_keys else "train"].extend(groups[key])
    for split in splits:
        rng.shuffle(splits[split])
    if any(not splits[split] for split in splits):
        raise ValueError("Training, validation, and later-session test photos are all required")
    return splits


def metrics(actual: list[int], predicted: list[int]) -> dict:
    matrix = [[0, 0], [0, 0]]
    for truth, guess in zip(actual, predicted):
        matrix[truth][guess] += 1
    recalls = [matrix[i][i] / sum(matrix[i]) if sum(matrix[i]) else 0.0 for i in range(2)]
    return {"photos": len(actual), "confusion_matrix": matrix,
            "image_accuracy": sum(matrix[i][i] for i in range(2)) / len(actual),
            "balanced_accuracy": sum(recalls) / 2,
            "recall": dict(zip(CLASSES, recalls))}


def train(epochs: int, batch_size: int) -> None:
    import torch
    from PIL import Image
    from torch import nn
    from torch.utils.data import DataLoader, Dataset
    from torchvision import transforms
    from train import make_model

    class Photos(Dataset):
        def __init__(self, rows, transform):
            self.rows, self.transform = rows, transform

        def __len__(self):
            return len(self.rows)

        def __getitem__(self, index):
            path, label, _ = self.rows[index]
            with Image.open(path) as image:
                return self.transform(image.convert("RGB")), label

    rows = rows_by_split()
    random.seed(SEED)
    torch.manual_seed(SEED)
    normalize = transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    training = transforms.Compose([transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
                                   transforms.RandomHorizontalFlip(), transforms.ColorJitter(0.12, 0.12, 0.12),
                                   transforms.ToTensor(), normalize])
    testing = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor(), normalize])
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    loaders = {split: DataLoader(Photos(items, training if split == "train" else testing),
                                 batch_size=batch_size, shuffle=split == "train", pin_memory=device.type == "cuda")
               for split, items in rows.items()}
    model = make_model(2).to(device)
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=0.0001)
    criterion = nn.CrossEntropyLoss()

    def predict(split):
        model.eval()
        actual, guesses = [], []
        with torch.inference_mode():
            for images, labels in loaders[split]:
                guesses.extend(model(images.to(device)).argmax(1).cpu().tolist())
                actual.extend(labels.tolist())
        return actual, guesses

    best_score, best_state = -1.0, None
    print(f"Device: {device}; photos: { {key: len(value) for key, value in rows.items()} }", flush=True)
    for epoch in range(1, epochs + 1):
        model.train()
        for images, labels in loaders["train"]:
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(images.to(device)), labels.to(device))
            loss.backward()
            optimizer.step()
        val = metrics(*predict("val"))
        print(f"Epoch {epoch}/{epochs}: grouped-time validation balanced accuracy {val['balanced_accuracy']:.3f}", flush=True)
        if val["balanced_accuracy"] > best_score:
            best_score = val["balanced_accuracy"]
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
    model.load_state_dict(best_state)
    actual, guessed = predict("test")
    conditions = {}
    for condition in sorted({row[2] for row in rows["test"]}):
        indices = [index for index, row in enumerate(rows["test"]) if row[2] == condition]
        conditions[condition] = metrics([actual[index] for index in indices],
                                        [guessed[index] for index in indices])
    report = {"classes": CLASSES, "source": "https://doi.org/10.17632/rgn2d2jb7f.1",
              "license": "CC BY 4.0", "train_photos": len(rows["train"]), "val_photos": len(rows["val"]),
              "input": "RGB 224x224 NCHW, ImageNet normalisation",
              "test_session": "July 2026; development photos from November 2025",
              "test_conditions": sorted({row[2] for row in rows["test"]}),
              "test": metrics(actual, guessed), "test_by_condition": conditions,
              "phone_and_background_breakdown": "Unavailable: the public filenames have no per-image device or background labels.",
              "limitations": ["Variety labels were assigned visually, not confirmed from seed records.",
                              "No physical-tuber IDs; the validation grouping is an approximation.",
                              "The later-session test has no healthy tubers and uses only one collection site.",
                              "Only compares known Diamant/Asterix photos; all other varieties are out of scope.",
                              "Not independently field validated; do not deploy for farmer decisions."]}
    CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": best_state, "classes": CLASSES, "report": report}, CHECKPOINT)
    CHECKPOINT.with_suffix(".json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["test"], indent=2), flush=True)
    print(f"Saved {CHECKPOINT}", flush=True)


def export() -> None:
    import onnx
    import torch
    from torchvision import models

    checkpoint = torch.load(CHECKPOINT, map_location="cpu", weights_only=True)
    if tuple(checkpoint["classes"]) != CLASSES:
        raise ValueError("Expected only Diamant and Asterix")
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, 2)
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    target = ROOT / "potato_variety_pair.onnx"
    torch.onnx.export(model, torch.zeros(1, 3, 224, 224), target,
                      input_names=["image"], output_names=["logits"], opset_version=17, dynamo=False)
    onnx.checker.check_model(str(target))
    print(f"Exported {target} (research-only; not wired into the app)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("prepare", "train", "export"))
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=64)
    args = parser.parse_args()
    if args.action == "prepare":
        prepare()
    elif args.action == "train":
        train(args.epochs, args.batch_size)
    else:
        export()
