#!/usr/bin/env python3
"""Generate verified stroke-to-IDS paths for the Atlas builder from pinned source files."""
import argparse
import json
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
upstream = runpy.run_path(str(ROOT / "scripts" / "build-extended-stroke-map.py"))


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dictionary", type=Path)
    parser.add_argument("graphics", type=Path)
    args = parser.parse_args()
    dictionary = upstream["source"](args.dictionary, upstream["DICTIONARY_SHA"])
    graphics = upstream["source"](args.graphics, upstream["GRAPHICS_SHA"])
    rows = read_json(ROOT / "data" / "hanzi-structure.json")["characters"]
    rows += read_json(ROOT / "data" / "hsk-browse-index.json")["characters"]

    mappings = {}
    for row in rows:
        hanzi, ids = row["hanzi"], row["decomposition"]
        source = dictionary.get(hanzi, {})
        if not ids or source.get("decomposition") != ids:
            continue
        try:
            leaves, _ = upstream["nodes"](ids)
        except ValueError:
            continue
        # Unknown leaves and strokes assigned only to a parent cannot be separated faithfully.
        paths = {path for _, path in leaves}
        matches = source.get("matches")
        if len(paths) < 2 or not isinstance(matches, list):
            continue
        if any(not isinstance(path, list) or any(type(index) is not int for index in path) for path in matches):
            continue
        if set(map(tuple, matches)) != paths:
            continue
        asset = ROOT / "public" / "characters" / f"{hanzi}.json"
        if not asset.is_file():
            asset = ROOT / "node_modules" / "hanzi-writer-data" / f"{hanzi}.json"
        if not asset.is_file():
            continue
        strokes = read_json(asset)["strokes"]
        if len(matches) != len(strokes) or strokes != graphics.get(hanzi, {}).get("strokes"):
            continue
        mappings[hanzi] = {"ids": ids, "paths": [".".join(map(str, path)) for path in matches]}

    output = {
        "source": "/licenses/hanzi-structure-SOURCE.txt",
        "outlineLicense": "/licenses/hanzi-writer-data-ARPHICPL.TXT",
        "dictionarySha256": upstream["DICTIONARY_SHA"],
        "graphicsSha256": upstream["GRAPHICS_SHA"],
        "mappings": mappings,
    }
    target = ROOT / "data" / "atlas-assembly-strokes.json"
    target.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(mappings)} characters with exact component paths; {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()
