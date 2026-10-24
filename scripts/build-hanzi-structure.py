#!/usr/bin/env python3
"""Build a reproducible, dataset-derived IDS index for the HSK vocabulary.

The output describes modern structural decompositions from Make Me a Hanzi. It
does not assert historical etymology or curated/certified component membership.
Run with the exact dictionary snapshot and exported app content used for a build:

  python3 scripts/build-hanzi-structure.py /path/to/dictionary.txt \
    --content /path/to/hsk-content.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import unicodedata
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT = ROOT / "app" / "content.ts"
DEFAULT_OUTPUT = ROOT / "data" / "hanzi-structure.json"
LICENSE_INPUTS = {
    "hanzi-structure-COPYING.txt": ROOT / "public" / "licenses" / "makemeahanzi-COPYING.txt",
    "hanzi-structure-LGPL.txt": ROOT / "public" / "licenses" / "makemeahanzi-dictionary-LGPL.txt",
    "hanzi-structure-GPL-3.0.txt": ROOT / "public" / "licenses" / "makemeahanzi-GPL-3.0.txt",
}

IDS_ARITY = {
    "⿰": 2,
    "⿱": 2,
    "⿲": 3,
    "⿳": 3,
    "⿴": 2,
    "⿵": 2,
    "⿶": 2,
    "⿷": 2,
    "⿸": 2,
    "⿹": 2,
    "⿺": 2,
    "⿻": 2,
}
UNKNOWN_MARKERS = {"？", "?"}
IDS_OPERATOR_RANGE = range(0x2FF0, 0x3000)


class IDSParseError(ValueError):
    pass


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_items(path: Path) -> list[dict[str, Any]]:
    """Read either the exported JSON array or the generated TypeScript array."""
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".ts":
        marker = "export const items: Item[] ="
        start = text.find(marker)
        if start < 0:
            raise ValueError(f"Could not find {marker!r} in {path}")
        decoder_start = start + len(marker)
        items, _ = json.JSONDecoder().raw_decode(text[decoder_start:].lstrip())
    else:
        items = json.loads(text)
        if isinstance(items, dict):
            items = items.get("items")
    if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
        raise ValueError(f"Expected an array of content items in {path}")
    return items


def is_han(character: str) -> bool:
    name = unicodedata.name(character, "")
    return name.startswith(("CJK UNIFIED IDEOGRAPH-", "CJK COMPATIBILITY IDEOGRAPH-"))


def load_dictionary(path: Path) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            row = json.loads(line)
            character = row.get("character")
            if not isinstance(character, str) or len(character) != 1:
                raise ValueError(f"Dictionary line {line_number} has no single-character key")
            if character in result:
                raise ValueError(f"Duplicate dictionary character {character!r} at line {line_number}")
            result[character] = row
    return result


def parse_ids(decomposition: str) -> tuple[dict[str, Any], list[str], list[str]]:
    """Parse one IDS and return its tree, known leaves, and unresolved markers."""
    cursor = 0
    known_leaves: list[str] = []
    unresolved: list[str] = []

    def parse_node() -> dict[str, Any]:
        nonlocal cursor
        if cursor >= len(decomposition):
            raise IDSParseError("missing IDS operand")
        symbol = decomposition[cursor]
        cursor += 1
        if symbol in IDS_ARITY:
            operands = [parse_node() for _ in range(IDS_ARITY[symbol])]
            return {"operator": symbol, "operands": operands}
        if ord(symbol) in IDS_OPERATOR_RANGE:
            raise IDSParseError(f"unsupported IDS operator U+{ord(symbol):04X}")
        if symbol in UNKNOWN_MARKERS:
            unresolved.append(symbol)
            return {"unknown": symbol}
        known_leaves.append(symbol)
        return {"component": symbol}

    tree = parse_node()
    if cursor != len(decomposition):
        raise IDSParseError("trailing data after IDS tree")
    return tree, known_leaves, unresolved


def ordered_unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dictionary", type=Path, help="Make Me a Hanzi dictionary.txt snapshot")
    parser.add_argument("--content", type=Path, default=DEFAULT_CONTENT,
                        help="JSON export or generated app/content.ts (default: app/content.ts)")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT,
                        help="Output JSON path (default: data/hanzi-structure.json)")
    parser.add_argument("--expected-characters", type=int, default=655,
                        help="Expected distinct Han characters across HSK1-3 (default: 655)")
    args = parser.parse_args()

    dictionary_path = args.dictionary.resolve()
    content_path = args.content.resolve()
    output_path = args.output.resolve()
    copying_path = LICENSE_INPUTS["hanzi-structure-COPYING.txt"]
    lgpl_path = LICENSE_INPUTS["hanzi-structure-LGPL.txt"]

    for path in (dictionary_path, content_path, copying_path, lgpl_path):
        if not path.is_file():
            raise FileNotFoundError(path)

    source_records = load_dictionary(dictionary_path)
    items = load_items(content_path)
    counts_by_level = {level: 0 for level in (1, 2, 3)}
    word_ids_by_character: dict[str, list[str]] = {}
    seen_ids: set[str] = set()
    canonical_content: list[dict[str, Any]] = []
    for item in items:
        level = item.get("hskLevel")
        if level not in counts_by_level:
            continue
        item_id = item.get("id")
        hanzi = item.get("hanzi")
        if not isinstance(item_id, str) or not item_id:
            raise ValueError(f"An HSK{level} item has no canonical string ID")
        if item_id in seen_ids:
            raise ValueError(f"Duplicate canonical word ID {item_id!r}")
        seen_ids.add(item_id)
        if not isinstance(hanzi, str) or not hanzi:
            raise ValueError(f"Item {item_id!r} has no hanzi string")
        counts_by_level[level] += 1
        canonical_content.append({
            "id": item_id,
            "hskEntry": item.get("hskEntry"),
            "hskLevel": level,
            "hanzi": hanzi,
        })
        # A canonical word ID appears once per character, even for reduplication
        # such as 谢谢 or 爸爸.
        for character in ordered_unique(list(hanzi)):
            if not is_han(character):
                raise ValueError(f"Non-Han character {character!r} in HSK item {item_id!r}")
            word_ids_by_character.setdefault(character, []).append(item_id)

    expected_level_counts = {1: 300, 2: 200, 3: 500}
    if counts_by_level != expected_level_counts:
        raise ValueError(f"Expected HSK content counts {expected_level_counts}, got {counts_by_level}")
    characters = sorted(word_ids_by_character)
    if len(characters) != args.expected_characters:
        raise ValueError(
            f"Expected {args.expected_characters} distinct HSK characters, got {len(characters)}"
        )
    canonical_content_sha = hashlib.sha256(
        json.dumps(canonical_content, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    structures: dict[str, dict[str, Any]] = {}
    for character, row in source_records.items():
        decomposition = row.get("decomposition")
        tree: dict[str, Any] | None = None
        leaves: list[str] = []
        unresolved: list[str] = []
        parse_error: str | None = None
        if isinstance(decomposition, str) and decomposition:
            try:
                tree, leaves, unresolved = parse_ids(decomposition)
            except IDSParseError as error:
                parse_error = str(error)
        structures[character] = {
            "tree": tree,
            "leaves": leaves,
            "unresolved": unresolved,
            "parseError": parse_error,
            "complete": tree is not None and not unresolved and parse_error is None,
        }

    parsed: dict[str, dict[str, Any]] = {}
    parse_error_count = 0
    missing_decomposition_count = 0
    unknown_marker_count = 0
    complete_count = 0
    for character in characters:
        row = source_records.get(character)
        decomposition = row.get("decomposition") if row else None
        radical = row.get("radical") if row else None
        structure = structures.get(character, {
            "tree": None,
            "leaves": [],
            "unresolved": [],
            "parseError": None,
            "complete": False,
        })
        if not isinstance(decomposition, str) or not decomposition:
            missing_decomposition_count += 1
        if structure["parseError"]:
            parse_error_count += 1
        unresolved = structure["unresolved"]
        if unresolved:
            unknown_marker_count += len(unresolved)
        complete = structure["complete"]
        if complete:
            complete_count += 1
        parsed[character] = {
            "hanzi": character,
            "readings": row.get("pinyin", []) if row else [],
            "definition": row.get("definition", "") if row else "",
            "decomposition": decomposition,
            "radical": radical if isinstance(radical, str) and radical else None,
            "decompositionTree": structure["tree"],
            # Keep IDS leaf order and occurrences; unresolved '?' placeholders are separate.
            "leafComponents": structure["leaves"],
            "unresolvedComponents": ordered_unique(unresolved),
            "recursiveComponents": [],
            "decompositionComplete": complete,
            "source": "makemeahanzi",
            "sourceStatus": "dataset-derived-modern-structure",
            "wordIds": word_ids_by_character[character],
        }
        if structure["parseError"]:
            parsed[character]["decompositionParseError"] = structure["parseError"]

    cycle_edges: set[tuple[str, str]] = set()

    def expand(character: str, ancestors: tuple[str, ...]) -> list[str]:
        components: list[str] = []
        row = structures.get(character)
        if not row:
            return components
        for component in row["leaves"]:
            if component not in components:
                components.append(component)
            if component in ancestors:
                cycle_edges.add((character, component))
                continue
            nested = expand(component, ancestors + (component,))
            for nested_component in nested:
                if nested_component not in components:
                    components.append(nested_component)
        return components

    for character in characters:
        parsed[character]["recursiveComponents"] = expand(character, (character,))

    reverse_index: dict[str, list[str]] = {}
    for character in characters:
        for component in parsed[character]["recursiveComponents"]:
            reverse_index.setdefault(component, []).append(character)
    reverse_index = {component: sorted(parents) for component, parents in sorted(reverse_index.items())}

    output_path.parent.mkdir(parents=True, exist_ok=True)
    license_dir = ROOT / "public" / "licenses"
    license_dir.mkdir(parents=True, exist_ok=True)
    for destination_name, source_path in LICENSE_INPUTS.items():
        shutil.copyfile(source_path, license_dir / destination_name)

    dictionary_sha = sha256(dictionary_path)
    copying_sha = sha256(license_dir / "hanzi-structure-COPYING.txt")
    lgpl_sha = sha256(license_dir / "hanzi-structure-LGPL.txt")
    gpl_path = license_dir / "hanzi-structure-GPL-3.0.txt"
    gpl_sha = sha256(gpl_path)
    source_url = "https://github.com/skishore/makemeahanzi/blob/master/dictionary.txt"
    copying_url = "https://github.com/skishore/makemeahanzi/blob/master/COPYING"
    lgpl_url = "https://github.com/skishore/makemeahanzi/blob/master/LGPL"

    source_note = (
        "This index is derived from Make Me a Hanzi dictionary.txt. The upstream COPYING notice "
        "says dictionary.txt is derived from Unihan and CJKlib and is distributable under the "
        "GNU Lesser General Public License version 3 or (at your option) any later version. "
        "The accompanying COPYING, LGPL, and GPL texts preserve the upstream notices. "
        "Decompositions are dataset-derived modern structure; they are not historical etymology, "
        "a curated teaching map, or a certified linguistic classification."
    )
    (license_dir / "hanzi-structure-SOURCE.txt").write_text(
        f"{source_note}\n\n"
        f"Dictionary URL: {source_url}\n"
        f"Dictionary SHA-256: {dictionary_sha}\n"
        f"Upstream COPYING URL: {copying_url}\n"
        f"Upstream LGPL URL: {lgpl_url}\n"
        f"Bundled COPYING SHA-256: {copying_sha}\n"
        f"Bundled LGPL SHA-256: {lgpl_sha}\n"
        f"Bundled GPL-3.0 SHA-256: {gpl_sha}\n",
        encoding="utf-8",
    )

    records = [parsed[character] for character in characters]
    output = {
        "schemaVersion": 1,
        "title": "HSK 1-3 modern structural component index",
        "source": "makemeahanzi",
        "sourceStatus": "dataset-derived-modern-structure",
        "epistemicNotice": (
            "Dataset-derived modern structural decomposition only. This is not historical "
            "etymology, a curated teaching map, or a certified linguistic classification."
        ),
        "sourceUrl": source_url,
        "sourceSha256": dictionary_sha,
        "wordIdSource": "canonical app/content.ts item IDs filtered to HSK levels 1-3",
        "wordIdSourceSha256": canonical_content_sha,
        "license": "LGPL-3.0-or-later",
        "licenseUrl": lgpl_url,
        "licenseSha256": lgpl_sha,
        "upstreamCopyingUrl": copying_url,
        "upstreamCopyingSha256": copying_sha,
        "sourceLicenseFiles": [
            "/licenses/hanzi-structure-COPYING.txt",
            "/licenses/hanzi-structure-LGPL.txt",
            "/licenses/hanzi-structure-GPL-3.0.txt",
            "/licenses/hanzi-structure-SOURCE.txt",
        ],
        "coverage": {
            "curriculum": "HSK 2025 syllabus entries from app content, levels 1-3",
            "wordCount": sum(counts_by_level.values()),
            "wordCountsByLevel": {str(level): count for level, count in counts_by_level.items()},
            "characterCount": len(records),
            "dictionaryEntryCount": len(source_records),
            "charactersMissingFromDictionary": sum(c not in source_records for c in characters),
            "decompositionCompleteCount": complete_count,
            "decompositionIncompleteCount": len(records) - complete_count,
            "missingDecompositionCount": missing_decomposition_count,
            "unknownMarkerCount": unknown_marker_count,
            "invalidIDSCount": parse_error_count,
            "cycleEdgesSkipped": len(cycle_edges),
            "reverseIndexComponentCount": len(reverse_index),
            "reverseIndexRelationshipCount": sum(len(parents) for parents in reverse_index.values()),
        },
        "componentSemantics": {
            "leafComponents": "Parsed IDS terminal glyphs in source order; unknown markers are listed separately.",
            "recursiveComponents": "Unique, first-seen traversal of leaf components and nested known IDS parts, with cycle protection.",
            "reverseIndex": "Each recursive component maps to the sorted HSK characters containing it.",
        },
        "characters": records,
        "reverseIndex": reverse_index,
    }
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "output": str(output_path),
        "wordCountsByLevel": output["coverage"]["wordCountsByLevel"],
        "characterCount": len(records),
        "dictionarySha256": dictionary_sha,
        "wordIdSourceSha256": canonical_content_sha,
        "licenseSha256": lgpl_sha,
        "decompositionCompleteCount": complete_count,
        "decompositionIncompleteCount": len(records) - complete_count,
        "missingFromDictionary": output["coverage"]["charactersMissingFromDictionary"],
        "unknownMarkerCount": unknown_marker_count,
        "invalidIDSCount": parse_error_count,
        "cycleEdgesSkipped": len(cycle_edges),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
