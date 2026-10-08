import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ml"))

import train_variety_pair as pair


class VarietyPairTests(unittest.TestCase):
    def test_metrics(self):
        result = pair.metrics([0, 0, 1, 1], [0, 1, 1, 1])
        self.assertEqual(result["confusion_matrix"], [[1, 1], [0, 2]])
        self.assertEqual(result["balanced_accuracy"], 0.75)

    def test_later_session_is_test_only(self):
        with tempfile.TemporaryDirectory() as temp:
            images = Path(temp)
            for name in ("BARI_Alu_7_Diamant__Healthy", "BARI_Alu_25_Asterix__Healthy"):
                folder = images / name
                folder.mkdir()
                for minute in range(0, 60, 10):
                    for second in (0, 1):
                        (folder / f"IMG2025111112{minute:02d}{second:02d}.jpg").touch()
                (folder / "IMG_20260722_120000.jpg").touch()
            with patch.object(pair, "IMAGES", images):
                splits = pair.rows_by_split()
            self.assertEqual(len(splits["test"]), 2)
            self.assertTrue(splits["train"] and splits["val"])
            self.assertTrue(all("202607" in row[0].name for row in splits["test"]))
            self.assertTrue(all("202511" in row[0].name for split in ("train", "val") for row in splits[split]))
            groups = {}
            for split in ("train", "val"):
                for path, _, _ in splits[split]:
                    key = (path.parent.name, path.stem[:14])
                    groups.setdefault(key, set()).add(split)
            self.assertTrue(all(len(owners) == 1 for owners in groups.values()))


if __name__ == "__main__":
    unittest.main()
