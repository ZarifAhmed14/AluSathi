import csv
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ml"))
from train_variety import score
from variety_data import FIELDS, VARIETIES, audit_manifest


class VarietyDataTests(unittest.TestCase):
    def make_manifest(self, root: Path, rows: list[dict]) -> Path:
        manifest = root / "manifest.csv"
        with manifest.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(rows)
        return manifest

    def row(self, root: Path, name: str, variety: str, tuber: str, split: str) -> dict:
        Image.new("RGB", (128, 128), (ord(name[0]), 150, 100)).save(root / name)
        return {"path": name, "variety": variety, "tuber_id": tuber,
                "source_id": "farm-1", "license": "owner consent", "split": split,
                "site": "bogura", "session": "2026-10-07", "phone": "phone-a",
                "background": "soil", "condition": "healthy"}

    def test_rejects_missing_classes_and_low_sample_counts(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = self.make_manifest(root, [self.row(root, "one.png", "diamant", "t1", "train")])
            photos, summary = audit_manifest(manifest, enforce_minimums=False)
            self.assertEqual(len(photos), 1)
            self.assertEqual(summary["independent_tubers"]["diamant"]["train"], 1)
            with self.assertRaisesRegex(ValueError, "need at least"):
                audit_manifest(manifest)

    def test_rejects_same_tuber_in_test_and_train(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rows = [self.row(root, "a.png", "diamant", "t1", "train"),
                    self.row(root, "b.png", "diamant", "t1", "test")]
            with self.assertRaisesRegex(ValueError, "same tuber"):
                audit_manifest(self.make_manifest(root, rows), enforce_minimums=False)

    def test_rejects_unlicensed_images(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row = self.row(root, "a.png", "diamant", "t1", "train")
            row["license"] = "unknown"
            with self.assertRaisesRegex(ValueError, "rights"):
                audit_manifest(self.make_manifest(root, [row]), enforce_minimums=False)

    def test_confusion_matrix_uses_five_fixed_classes(self):
        result = score(list(range(5)), [0, 1, 2, 4, 4])
        self.assertEqual(result["accuracy"], 0.8)
        self.assertEqual(result["per_class"][VARIETIES[3]]["recall"], 0.0)
        self.assertEqual(result["confusion_matrix"][3][4], 1)

    def test_complete_five_class_audit_requires_external_test_site(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rows = []
            index = 0
            for variety in VARIETIES:
                for split, count in (("train", 80), ("val", 20), ("test", 30)):
                    for _ in range(count):
                        index += 1
                        name = f"{index}.png"
                        Image.new("RGB", (128, 128), (index % 256, index // 256, 42)).save(root / name)
                        rows.append({"path": name, "variety": variety, "tuber_id": str(index),
                                     "source_id": "verified-farm", "license": "owner consent", "split": split,
                                     "site": "external-site" if split == "test" else "development-site",
                                     "session": "later-day" if split == "test" else "first-day",
                                     "phone": "phone-a", "background": "soil", "condition": "healthy"})
            manifest = self.make_manifest(root, rows)
            photos, summary = audit_manifest(manifest)
            self.assertEqual(len(photos), 650)
            self.assertEqual(summary["independent_tubers"]["courage"]["test"], 30)
            rows[-1]["site"] = "development-site"
            with self.assertRaisesRegex(ValueError, "test sites"):
                audit_manifest(self.make_manifest(root, rows))


if __name__ == "__main__":
    unittest.main()
