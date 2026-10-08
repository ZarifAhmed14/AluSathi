"""Train an experimental potato-photo gate from public, source-separated data.

The gate can reject some non-potato objects. It is not an open-world guarantee.
Keep the test split untouched when choosing thresholds or model settings.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

ROOT = Path(".ml-data/variety")
ZENODO = ROOT / "potatoes-zenodo/dataset_potatoes"
COCO = ROOT / "coco-val2017"
BOGURA = ROOT / "images"
CHECKPOINT = ROOT / "potato_presence.pt"
CLASSES = ("not_potato", "potato")
SEED = 43


def rows():
    if not ZENODO.is_dir() or not BOGURA.is_dir() or not COCO.is_dir():
        raise FileNotFoundError("Extract the Zenodo, Bogura and COCO images under .ml-data/variety first")
    rng = random.Random(SEED)

    def sample(paths, count):
        paths = sorted(paths)
        rng.shuffle(paths)
        return paths[:count]

    bogura_train = sample((p for p in BOGURA.glob("*/*.jpg") if "202511" in p.name), 1600)
    bogura_test = sample((p for p in BOGURA.glob("*/*.jpg") if "202607" in p.name), 300)
    coco = sample(COCO.glob("*.jpg"), 1400)
    zenodo_train_potato = sample((p for name in ("Good", "Damaged") for p in (ZENODO / "train" / name).glob("*.bmp")), 1200)
    zenodo_train_other = sample((p for name in ("Plant", "Stone") for p in (ZENODO / "train" / name).glob("*.bmp")), 1000)
    zenodo_val_potato = [p for name in ("Good", "Damaged") for p in (ZENODO / "val" / name).glob("*.bmp")]
    zenodo_val_other = [p for name in ("Plant", "Stone") for p in (ZENODO / "val" / name).glob("*.bmp")]
    zenodo_test_potato = [p for split in ("test1", "test2", "test3") for name in ("Good", "Damaged") for p in (ZENODO / split / name).glob("*.bmp")]
    zenodo_test_other = [p for split in ("test1", "test2", "test3") for name in ("Plant", "Stone") for p in (ZENODO / split / name).glob("*.bmp")]
    splits = {
        "train": [(p, 1, "bogura") for p in bogura_train] + [(p, 1, "zenodo") for p in zenodo_train_potato]
                 + [(p, 0, "zenodo") for p in zenodo_train_other] + [(p, 0, "coco") for p in coco[:1000]],
        "val": [(p, 1, "zenodo") for p in zenodo_val_potato] + [(p, 0, "zenodo") for p in zenodo_val_other]
               + [(p, 0, "coco") for p in coco[1000:1200]],
        "test": [(p, 1, "bogura_later") for p in bogura_test] + [(p, 1, "zenodo_heldout") for p in zenodo_test_potato]
                + [(p, 0, "zenodo_heldout") for p in zenodo_test_other] + [(p, 0, "coco_heldout") for p in coco[1200:]],
    }
    if any(not part for part in splits.values()):
        raise ValueError("Every split needs data")
    for part in splits.values():
        rng.shuffle(part)
    return splits


def train(epochs: int, batch_size: int):
    import torch
    from PIL import Image
    from torch import nn
    from torch.utils.data import DataLoader, Dataset
    from torchvision import transforms
    from train import make_model

    class Photos(Dataset):
        def __init__(self, items, transform):
            self.items, self.transform = items, transform

        def __len__(self):
            return len(self.items)

        def __getitem__(self, index):
            path, label, _ = self.items[index]
            with Image.open(path) as image:
                return self.transform(image.convert("RGB")), label

    splits = rows()
    print({name: len(items) for name, items in splits.items()}, flush=True)
    torch.manual_seed(SEED)
    random.seed(SEED)
    normalize = transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
    train_transform = transforms.Compose((transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
                                          transforms.RandomHorizontalFlip(), transforms.ColorJitter(0.25, 0.25, 0.25),
                                          transforms.ToTensor(), normalize))
    eval_transform = transforms.Compose((transforms.Resize((224, 224)), transforms.ToTensor(), normalize))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    loaders = {name: DataLoader(Photos(items, train_transform if name == "train" else eval_transform),
                                batch_size=batch_size, shuffle=name == "train", pin_memory=device.type == "cuda")
               for name, items in splits.items()}
    model = make_model(2).to(device)
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=0.0001)
    loss = nn.CrossEntropyLoss()

    def evaluate(split):
        model.eval()
        results = []
        with torch.inference_mode():
            for images, _ in loaders[split]:
                results.extend(model(images.to(device)).softmax(1)[:, 1].cpu().tolist())
        return [(float(score), label, source) for score, (_, label, source) in zip(results, splits[split])]

    best_score, best_state = -1.0, None
    for epoch in range(1, epochs + 1):
        model.train()
        for images, labels in loaders["train"]:
            optimizer.zero_grad(set_to_none=True)
            loss(model(images.to(device)), labels.to(device)).backward()
            optimizer.step()
        values = evaluate("val")
        accuracy = sum((score >= 0.5) == bool(label) for score, label, _ in values) / len(values)
        print(f"Epoch {epoch}: validation image accuracy {accuracy:.3f}", flush=True)
        if accuracy > best_score:
            best_score = accuracy
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
    model.load_state_dict(best_state)
    test = evaluate("test")
    report = {"sources": {
        "potato_bogura": "https://doi.org/10.17632/rgn2d2jb7f.1 (CC BY 4.0)",
        "potato_stone_zenodo": "https://doi.org/10.5281/zenodo.17494607 (CC BY 4.0)",
        "general_objects_coco": "https://cocodataset.org/#download (per-image licenses vary; source photos not redistributed)",
    }, "counts": {key: len(items) for key, items in splits.items()},
        "validation_accuracy": best_score,
        "test_by_source": {source: {"potato_photos": sum(label for _, label, name in test if name == source),
                                    "other_photos": sum(1 - label for _, label, name in test if name == source),
                                    "accepted_potato": sum(score >= 0.8 for score, label, name in test if name == source and label),
                                    "rejected_other": sum(score <= 0.2 for score, label, name in test if name == source and not label)}
                           for source in sorted({name for _, _, name in test})},
        "limits": ["COCO negatives are broad but not guaranteed potato-free or representative of all objects.",
                   "Bogura photos may show repeated tubers; specimen IDs are unavailable.",
                   "Zenodo images are tiny industrial-camera crops, unlike mobile phone uploads.",
                   "Do not claim a field-validated potato detector from these test sets."]}
    CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": best_state, "report": report}, CHECKPOINT)
    CHECKPOINT.with_suffix(".json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["test_by_source"], indent=2), flush=True)


def export():
    import onnx
    import torch
    from torchvision import models

    checkpoint = torch.load(CHECKPOINT, map_location="cpu", weights_only=True)
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, 2)
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    target = ROOT / "potato_presence.onnx"
    torch.onnx.export(model, torch.zeros(1, 3, 224, 224), target,
                      input_names=["image"], output_names=["logits"], opset_version=17, dynamo=False)
    onnx.checker.check_model(str(target))
    print(f"Exported {target}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("train", "export"))
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--batch-size", type=int, default=64)
    args = parser.parse_args()
    train(args.epochs, args.batch_size) if args.action == "train" else export()
