"""Audit, train, evaluate, and export the five-variety demo model.

Run from the repository root. Photos and manifests belong in ignored .ml-data/.
"""

from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path

from variety_data import VARIETIES, Photo, audit_manifest


def score(actual: list[int], predicted: list[int]) -> dict:
    matrix = [[0] * len(VARIETIES) for _ in VARIETIES]
    for truth, guess in zip(actual, predicted):
        matrix[truth][guess] += 1
    total = len(actual)
    per_class = {}
    for index, name in enumerate(VARIETIES):
        tp = matrix[index][index]
        support = sum(matrix[index])
        predicted_count = sum(row[index] for row in matrix)
        precision = tp / predicted_count if predicted_count else 0.0
        recall = tp / support if support else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class[name] = {"support": support, "precision": precision, "recall": recall, "f1": f1}
    return {
        "accuracy": sum(matrix[i][i] for i in range(len(VARIETIES))) / total if total else 0.0,
        "macro_f1": sum(value["f1"] for value in per_class.values()) / len(VARIETIES),
        "per_class": per_class,
        "confusion_matrix": matrix,
    }


def train(photos: list[Photo], summary: dict, epochs: int, batch_size: int, output: Path) -> None:
    import torch
    from PIL import Image
    from torch.utils.data import DataLoader, Dataset
    from torchvision import transforms
    from train import make_model

    class ImageRows(Dataset):
        def __init__(self, rows: list[Photo], transform):
            self.rows = rows
            self.transform = transform

        def __len__(self):
            return len(self.rows)

        def __getitem__(self, index):
            with Image.open(self.rows[index].path) as image:
                tensor = self.transform(image.convert("RGB"))
            return tensor, VARIETIES.index(self.rows[index].variety)

    torch.manual_seed(42)
    random.seed(42)
    normalise = transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12),
        transforms.ColorJitter(0.18, 0.18, 0.15),
        transforms.ToTensor(), normalise,
    ])
    test_transform = transforms.Compose([
        transforms.Resize((224, 224)), transforms.ToTensor(), normalise,
    ])
    rows = {split: [photo for photo in photos if photo.split == split] for split in ("train", "val", "test")}
    loaders = {
        split: DataLoader(ImageRows(items, train_transform if split == "train" else test_transform),
                          batch_size=batch_size, shuffle=split == "train", num_workers=0)
        for split, items in rows.items()
    }
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = make_model(len(VARIETIES)).to(device)
    counts = [sum(p.variety == name for p in rows["train"]) for name in VARIETIES]
    weights = torch.tensor([len(rows["train"]) / (len(VARIETIES) * count) for count in counts], device=device)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=0.0001)

    def predict(split: str) -> tuple[list[int], list[int]]:
        model.eval()
        actual, predicted = [], []
        with torch.inference_mode():
            for images, labels in loaders[split]:
                guesses = model(images.to(device)).argmax(dim=1).cpu().tolist()
                actual.extend(labels.tolist())
                predicted.extend(guesses)
        return actual, predicted

    best_f1, best_state = -1.0, None
    for epoch in range(1, epochs + 1):
        model.train()
        for images, labels in loaders["train"]:
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(images.to(device)), labels.to(device))
            loss.backward()
            optimizer.step()
        validation = score(*predict("val"))
        print(f"Epoch {epoch}: validation macro-F1 {validation['macro_f1']:.3f}")
        if validation["macro_f1"] > best_f1:
            best_f1 = validation["macro_f1"]
            best_state = {name: tensor.detach().cpu().clone() for name, tensor in model.state_dict().items()}

    model.load_state_dict(best_state)
    actual, predicted = predict("test")
    test = score(actual, predicted)
    groups = {}
    for field in ("site", "session", "phone", "background", "condition"):
        indices = defaultdict(list)
        for index, photo in enumerate(rows["test"]):
            indices[getattr(photo, field)].append(index)
        groups[field] = {
            value: {"photos": len(group), "accuracy": sum(actual[i] == predicted[i] for i in group) / len(group)}
            for value, group in sorted(indices.items())
        }
    metrics = {"classes": VARIETIES, "data": summary, "validation_macro_f1": best_f1,
               "test": test, "test_groups": groups,
               "scope": "Experimental demo only; not independently validated across Bangladesh farms."}
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": best_state, "classes": VARIETIES, "metrics": metrics}, output)
    output.with_suffix(".metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(test, indent=2))


def export(checkpoint_path: Path, model_path: Path) -> None:
    import onnx
    import torch
    from torchvision import models

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    if tuple(checkpoint["classes"]) != VARIETIES:
        raise ValueError("Checkpoint does not contain the five approved varieties")
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(VARIETIES))
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    model_path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(model, torch.zeros(1, 3, 224, 224), model_path,
                      input_names=["image"], output_names=["logits"], opset_version=17, dynamo=False)
    onnx.checker.check_model(str(model_path))
    metadata = {"model": model_path.name, "classes": VARIETIES,
                "input": "RGB 224x224 NCHW, ImageNet normalisation",
                "field_validated": False, "test": checkpoint["metrics"]["test"]}
    model_path.with_suffix(".json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Exported {model_path} and {model_path.with_suffix('.json')}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("audit", "train", "export"))
    parser.add_argument("--manifest", type=Path, default=Path(".ml-data/variety/manifest.csv"))
    parser.add_argument("--checkpoint", type=Path, default=Path("ml/artifacts/potato_variety_mobilenet_v3.pt"))
    parser.add_argument("--model", type=Path, default=Path("public/models/potato_variety.onnx"))
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()
    if args.action == "export":
        export(args.checkpoint, args.model)
    else:
        try:
            photos, summary = audit_manifest(args.manifest)
        except (FileNotFoundError, ValueError) as error:
            parser.error(f"{error}. See ml/VARIETY_DATA.md for the photo register.")
        print(json.dumps(summary, indent=2))
        if args.action == "train":
            train(photos, summary, args.epochs, args.batch_size, args.checkpoint)
