#!/usr/bin/env python3
"""Build conservative HSK component highlights from pinned, explicit source matches.

Usage: python3 scripts/build-extended-stroke-map.py DICTIONARY GRAPHICS
Raw upstream files remain outside the published tree. No geometric inference,
recursive stroke correspondence, semantic classification, or IDS replacement is
performed. A component must be a literal node in the ORIGINAL source IDS.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DICTIONARY_SHA = "744bb05d5b0742e9ee35c37791f94d56a173349b3367569e7ca11e510364d203"
GRAPHICS_SHA = "a28c478b5178e98f67f510b2d52fde08a69dc664654ef43498253b9b764d46ee"
ARITIES = {**dict.fromkeys("⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻", 2), "⿲": 3, "⿳": 3}


def source(path, expected):
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected:
        raise ValueError(f"Unrecognized source snapshot: {path}")
    records = [json.loads(line) for line in raw.decode().splitlines() if line]
    result = {record["character"]: record for record in records}
    if len(result) != len(records):
        raise ValueError("Duplicate source character")
    return result


def nodes(ids):
    """Return explicit non-operator node paths and valid match destinations."""
    offset = 0
    components = []
    paths = set()

    def visit(path):
        nonlocal offset
        if offset >= len(ids):
            raise ValueError("Incomplete IDS")
        glyph = ids[offset]
        offset += 1
        paths.add(path)
        if glyph in ARITIES:
            for child in range(ARITIES[glyph]):
                visit(path + (child,))
        elif glyph != "？":
            components.append((glyph, path))

    visit(())
    if offset != len(ids):
        raise ValueError("Trailing IDS content")
    return components, paths


def component_map(record, stroke_count):
    try:
        components, paths = nodes(record["decomposition"])
    except (ValueError, KeyError):
        return {}, "invalid-original-decomposition"
    matches = record.get("matches")
    if not isinstance(matches, list) or len(matches) != stroke_count:
        return {}, "source-match-count-mismatch"
    if any(match is None for match in matches):
        return {}, "source-has-unassigned-strokes"
    if any(not isinstance(match, list) or any(type(i) is not int for i in match)
           or tuple(match) not in paths for match in matches):
        return {}, "invalid-source-match-path"
    result = {}
    for glyph, path in components:
        selected = [index for index, match in enumerate(matches)
                    if tuple(match[:len(path)]) == path]
        if selected:
            result.setdefault(glyph, set()).update(selected)
    return {glyph: sorted(indices) for glyph, indices in sorted(result.items())}, None


def build(dictionary_path, graphics_path):
    dictionary = source(dictionary_path, DICTIONARY_SHA)
    graphics = source(graphics_path, GRAPHICS_SHA)
    structure = json.loads((ROOT / "data/hanzi-structure.json").read_text())
    if structure["sourceSha256"] != DICTIONARY_SHA:
        raise ValueError("Current curriculum uses a different dictionary snapshot")
    mappings, reasons, original_ids, unmapped = {}, {}, {}, {}
    exact, different_ids, mapped_chars, pairs = 0, 0, 0, 0
    for row in structure["characters"]:
        hanzi = row["hanzi"]
        key = "u" + format(ord(hanzi), "x")
        local_path = ROOT / "public/characters" / (hanzi + ".json")
        local = json.loads(local_path.read_text()) if local_path.exists() else {}
        record, geometry = dictionary.get(hanzi), graphics.get(hanzi)
        if (not record or not geometry or not geometry.get("strokes")
                or geometry["strokes"] != local.get("strokes")):
            mappings[key] = {}
            reasons[key] = "local-geometry-not-identical-to-pinned-source"
            unmapped[key] = sorted(set(row["recursiveComponents"]))
            continue
        exact += 1
        count = len(geometry["strokes"])
        selected, reason = component_map(record, count)
        # Whole-character shape is exact regardless of decomposition completeness.
        selected[hanzi] = list(range(count))
        mappings[key] = dict(sorted(selected.items()))
        original_ids[key] = record["decomposition"]
        if row["decomposition"] != record["decomposition"]:
            different_ids += 1
        if reason:
            reasons[key] = reason
        component_keys = set(selected) - {hanzi}
        if component_keys:
            mapped_chars += 1
        pairs += len(component_keys)
        missing = sorted(set(row["recursiveComponents"]) - set(selected))
        if missing:
            unmapped[key] = missing
        for indices in selected.values():
            if (not indices or indices != sorted(set(indices))
                    or any(type(i) is not int or i < 0 or i >= count for i in indices)):
                raise ValueError(f"Invalid emitted mapping: {hanzi}")
    return {
        "version": 1,
        "sourceStatus": "dataset-derived-original-source-stroke-matches",
        "epistemicNotice": "Geometry and explicit modern structural component matches only; no semantic, phonetic, etymological or grading claims. Unmapped does not mean absent.",
        "sources": {
            "dictionary": {"url": "https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt", "sha256": DICTIONARY_SHA, "license": "LGPL-3.0-or-later"},
            "graphics": {"url": "https://raw.githubusercontent.com/skishore/makemeahanzi/master/graphics.txt", "sha256": GRAPHICS_SHA, "license": "Arphic Public License"},
            "formatUrl": "https://github.com/skishore/makemeahanzi#format",
        },
        "derivation": {
            "componentKeys": "Literal original-source IDS glyphs; no alias normalization or Atlas IDs.",
            "matches": "Explicit source match paths under the literal original-source node, including all its descendant paths; repeated glyph occurrences are unioned.",
            "geometryGate": "Ordered full SVG stroke path arrays must equal the pinned graphics record exactly.",
            "wholeCharacter": "Each geometry-verified character also maps itself to every stroke.",
            "conservativeExclusions": "No recursive component projection, no replacement-tree path projection, and no component matches from characters with any unassigned source stroke. Resolved IDS may differ from original IDS retained below.",
            "unmappedReason": "Curriculum recursive component has no accepted literal original-source match; it may be nested only, source-resolved, or have unassigned/invalid source matches.",
        },
        "coverage": {
            "curriculumCharacters": len(structure["characters"]),
            "exactGeometryCharacters": exact,
            "charactersWithComponentMappingsExcludingSelf": mapped_chars,
            "componentMappingsExcludingSelf": pairs,
            "wholeCharacterMappings": exact,
            "currentDecompositionDiffersFromOriginal": different_ids,
            "charactersWithSkippedComponentMatches": len(reasons),
            "unmappedCurriculumRelationships": sum(map(len, unmapped.values())),
        },
        "originalDecompositions": original_ids,
        "skippedComponentMatches": reasons,
        "unmappedCurriculumComponents": unmapped,
        "mappings": mappings,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dictionary", type=Path)
    parser.add_argument("graphics", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "public/atlas/extended-component-strokes.json")
    args = parser.parse_args()
    result = build(args.dictionary, args.graphics)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result["coverage"], sort_keys=True))
