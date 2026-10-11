from pathlib import Path

import torch
from torchvision import models


SOURCE = Path("ml/artifacts/potato_mobilenet_v3.pt")
OUTPUT = Path("ml/artifacts/potato_mobilenet_v3.onnx")


def main() -> None:
    checkpoint = torch.load(SOURCE, map_location="cpu", weights_only=True)
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(checkpoint["class_names"]))
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        torch.zeros(1, 3, 224, 224),
        OUTPUT,
        input_names=["image"],
        output_names=["logits"],
        opset_version=17,
        do_constant_folding=True,
        dynamo=False,
    )
    print(f"Exported {OUTPUT} ({OUTPUT.stat().st_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
