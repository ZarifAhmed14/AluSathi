"""Download and verify the CC BY 4.0 Bogura potato-photo archive."""

from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from pathlib import Path
from urllib.request import Request, urlopen


URL = "https://prod-dcd-datasets-public-files-eu-west-1.s3.eu-west-1.amazonaws.com/bf697525-6b0f-4078-ba36-ffefdd0ea900"
SIZE = 540742370
SHA256 = "0d6ff2f249993a404d3b533b0247063e0f442e0c6267c24b23d7463645492662"
ROOT = Path(".ml-data/variety")
PARTS = 12


def download_part(index: int) -> Path:
    start = index * SIZE // PARTS
    end = (index + 1) * SIZE // PARTS - 1
    path = ROOT / f"bogura.{index:02d}.part"
    if path.exists() and path.stat().st_size == end - start + 1:
        return path
    request = Request(URL, headers={"Range": f"bytes={start}-{end}"})
    with urlopen(request, timeout=120) as response, path.open("wb") as output:
        if response.status != 206:
            raise RuntimeError(f"Part {index}: expected HTTP 206, got {response.status}")
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
    if path.stat().st_size != end - start + 1:
        raise RuntimeError(f"Part {index}: incomplete download")
    print(f"Downloaded part {index + 1}/{PARTS}", flush=True)
    return path


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    archive = ROOT / "bogura.zip"
    if archive.exists() and archive.stat().st_size == SIZE:
        digest = sha256()
        with archive.open("rb") as source:
            while chunk := source.read(1024 * 1024):
                digest.update(chunk)
        if digest.hexdigest() == SHA256:
            print(f"Verified {archive}")
            return
    with ThreadPoolExecutor(max_workers=PARTS) as pool:
        paths = list(pool.map(download_part, range(PARTS)))
    digest = sha256()
    with archive.open("wb") as output:
        for path in paths:
            with path.open("rb") as source:
                while chunk := source.read(1024 * 1024):
                    output.write(chunk)
                    digest.update(chunk)
    if digest.hexdigest() != SHA256:
        archive.unlink()
        raise RuntimeError("Archive checksum does not match the publisher's SHA-256")
    for path in paths:
        path.unlink()
    print(f"Verified {archive}")


if __name__ == "__main__":
    main()
