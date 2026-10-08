"""Inspect potato-gate errors before accepting any rejection threshold."""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

import torch
from PIL import Image
from torchvision import models, transforms

from train_potato_presence import CHECKPOINT, rows

checkpoint = torch.load(CHECKPOINT, map_location="cpu", weights_only=True)
model = models.mobilenet_v3_small(weights=None)
model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, 2)
model.load_state_dict(checkpoint["state_dict"])
model.eval()
transform = transforms.Compose((transforms.Resize((224, 224)), transforms.ToTensor(),
                                transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))))


def score(path):
    with Image.open(path) as image, torch.inference_mode():
        return model(transform(image.convert("RGB")).unsqueeze(0)).softmax(1)[0, 1].item()


if len(sys.argv) > 1:
    for name in sys.argv[1:]:
        print(f"{score(Path(name)):.4f} {name}", flush=True)
else:
    by_source = defaultdict(list)
    for path, label, source in rows()["test"]:
        by_source[(source, label)].append((score(path), path))
    for (source, label), values in sorted(by_source.items()):
        scores = sorted(value for value, _ in values)
        print(source, "potato" if label else "other", len(scores),
              "min/p10/median/p90/max", *(round(scores[int((len(scores) - 1) * quantile)], 4)
                                            for quantile in (0, 0.1, 0.5, 0.9, 1)),
              "reject/ask/accept", sum(s <= 0.001 for s in scores),
              sum(0.001 < s < 0.8 for s in scores), sum(s >= 0.8 for s in scores))
        if label:
            print("lowest", [(round(value, 3), str(path)) for value, path in sorted(values)[:5]])
