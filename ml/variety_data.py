"""Audit labeled potato-tuber photos before training a variety classifier."""

from __future__ import annotations

import csv
import hashlib
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


VARIETIES = ("diamant", "cardinal", "granola", "asterix", "courage")
SPLITS = ("train", "val", "test")
FIELDS = ("path", "variety", "tuber_id", "source_id", "license", "split", "site", "session", "phone", "background", "condition")


@dataclass(frozen=True)
class Photo:
    path: Path
    variety: str
    tuber_id: str
    source_id: str
    license: str
    split: str
    site: str
    session: str
    phone: str
    background: str
    condition: str


def audit_manifest(manifest: Path, enforce_minimums: bool = True) -> tuple[list[Photo], dict]:
    """Reject untraceable labels, split leakage, and undersized five-class data."""
    with manifest.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or any(field not in reader.fieldnames for field in FIELDS):
            raise ValueError(f"Manifest needs columns: {', '.join(FIELDS)}")
        rows = list(reader)

    photos: list[Photo] = []
    seen_paths: set[Path] = set()
    seen_content: dict[str, Path] = {}
    tuber_groups: dict[tuple[str, str], tuple[str, str]] = {}
    counts: dict[str, dict[str, set[str]]] = {
        name: {split: set() for split in SPLITS} for name in VARIETIES
    }
    for line, row in enumerate(rows, start=2):
        if any(not (row.get(field) or "").strip() for field in FIELDS):
            raise ValueError(f"Row {line}: every field is required; use 'unknown' for unavailable phone/condition")
        values = {field: row[field].strip() for field in FIELDS}
        if values["variety"] not in VARIETIES or values["split"] not in SPLITS:
            raise ValueError(f"Row {line}: invalid variety or split")
        if values["license"].lower() in {"unknown", "unlicensed", "none"}:
            raise ValueError(f"Row {line}: image use rights must be documented")
        path = (manifest.parent / values["path"]).resolve()
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise ValueError(f"Row {line}: only JPG, PNG, and WebP photos are supported")
        if path in seen_paths:
            raise ValueError(f"Row {line}: duplicate photo path")
        if not path.is_file():
            raise FileNotFoundError(f"Row {line}: {path}")
        if path.stat().st_size > 25 * 1024 * 1024:
            raise ValueError(f"Row {line}: photo exceeds 25 MB")
        try:
            with Image.open(path) as image:
                image.verify()
        except Exception as error:
            raise ValueError(f"Row {line}: unreadable image: {path}") from error
        seen_paths.add(path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in seen_content:
            raise ValueError(f"Row {line}: duplicate image content also appears at {seen_content[digest]}")
        seen_content[digest] = path
        key = (values["source_id"], values["tuber_id"])
        identity = (values["variety"], values["split"])
        if key in tuber_groups and tuber_groups[key] != identity:
            raise ValueError(f"Row {line}: the same tuber appears in another variety or split")
        tuber_groups[key] = identity
        counts[values["variety"]][values["split"]].add(values["tuber_id"] + "@" + values["source_id"])
        photos.append(Photo(path=path, **{field: values[field] for field in FIELDS if field != "path"}))

    summary = {
        "photos": len(photos),
        "independent_tubers": {
            name: {split: len(counts[name][split]) for split in SPLITS} for name in VARIETIES
        },
        "sources": sorted({photo.source_id for photo in photos}),
        "sites_by_split": {
            name: {split: sorted({p.site for p in photos if p.variety == name and p.split == split})
                   for split in SPLITS} for name in VARIETIES
        },
        "sessions_by_split": {
            name: {split: sorted({p.session for p in photos if p.variety == name and p.split == split})
                   for split in SPLITS} for name in VARIETIES
        },
    }
    if enforce_minimums:
        for name in VARIETIES:
            sizes = summary["independent_tubers"][name]
            if sizes["train"] < 80 or sizes["val"] < 20 or sizes["test"] < 30:
                raise ValueError(
                    f"{name}: need at least 80 train, 20 validation, and 30 held-out independent tubers; got {sizes}"
                )
            development_sites = set(summary["sites_by_split"][name]["train"] + summary["sites_by_split"][name]["val"])
            development_sessions = set(summary["sessions_by_split"][name]["train"] + summary["sessions_by_split"][name]["val"])
            if set(summary["sites_by_split"][name]["test"]) & development_sites:
                raise ValueError(f"{name}: test sites must be absent from train/validation")
            if set(summary["sessions_by_split"][name]["test"]) & development_sessions:
                raise ValueError(f"{name}: test sessions must be absent from train/validation")
    return photos, summary
