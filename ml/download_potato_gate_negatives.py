"""Download varied COCO 2017 validation photos for potato-gate negatives.

COCO photos retain their individual source licenses. Images stay in ignored
.ml-data and are never redistributed in the app or repository.
"""

from __future__ import annotations

import json
import random
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from PIL import Image

ROOT = Path(".ml-data/variety")
MANIFEST = ROOT / "instances_val2017.json"
TARGET = ROOT / "coco-val2017"
COUNT_PER_CATEGORY = 110
CATEGORIES = ("car", "truck", "dog", "cat", "person", "cell phone", "chair",
              "book", "bottle", "sports ball", "apple", "banana", "carrot", "orange")


def main():
    metadata = json.loads(MANIFEST.read_text(encoding="utf-8"))
    names = {category["id"]: category["name"] for category in metadata["categories"]}
    by_category = defaultdict(set)
    for annotation in metadata["annotations"]:
        by_category[names[annotation["category_id"]]].add(annotation["image_id"])
    image_by_id = {image["id"]: image for image in metadata["images"]}
    rng = random.Random(43)
    selected = set()
    for name in CATEGORIES:
        candidates = sorted(by_category[name] - selected)
        rng.shuffle(candidates)
        selected.update(candidates[:COUNT_PER_CATEGORY])
    TARGET.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {len(selected)} COCO photos", flush=True)

    def download(image_id):
        entry = image_by_id[image_id]
        target = TARGET / entry["file_name"]
        if target.is_file() and target.stat().st_size > 1000:
            try:
                with Image.open(target) as image:
                    image.verify()
                return
            except Exception:
                pass
        url = entry["coco_url"].replace("http://images.cocodataset.org/", "https://s3.amazonaws.com/images.cocodataset.org/")
        request = urllib.request.Request(url,
                                         headers={"User-Agent": "AluSathi research contact: dataset source URL in repository"})
        temporary = target.with_suffix(".part")
        with urllib.request.urlopen(request, timeout=40) as response, temporary.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        with Image.open(temporary) as image:
            image.verify()
        temporary.replace(target)

    failures = []
    with ThreadPoolExecutor(max_workers=18) as pool:
        future_to_id = {pool.submit(download, image_id): image_id for image_id in selected}
        for future in as_completed(future_to_id):
            try:
                future.result()
            except Exception as error:
                failures.append((future_to_id[future], str(error)))
    (ROOT / "coco-selected.json").write_text(json.dumps({"images": [image_by_id[image_id] for image_id in sorted(selected)],
                                                          "licenses": metadata["licenses"], "failures": failures}, indent=2),
                                                encoding="utf-8")
    print(f"Saved {len(list(TARGET.glob('*.jpg')))} photos; failed {len(failures)}", flush=True)
    for image_id, error in failures[:10]:
        print(image_id, error, flush=True)


if __name__ == "__main__":
    main()
