"""Compile the paired word lessons with reviewed pronunciations and the Chinese OS syllabus."""
import argparse
import functools
import gzip
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/atlas-word-trial"
OUTPUT = ROOT / "public/atlas/word-trial/v1.json"
HAN = re.compile(r"[〇\u3400-\u9fff]")
HAN_WORDS = re.compile(r"[〇\u3400-\u9fff]+")
ACCENTS = set("\u0304\u0301\u030c\u0300")


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def compact(value):
    return "".join(c for c in unicodedata.normalize("NFC", value.lower()) if c.isalpha())


def toneless(value):
    decomposed = unicodedata.normalize("NFD", compact(value))
    return unicodedata.normalize("NFC", "".join(c for c in decomposed if c not in ACCENTS))


def displayed(parts):
    return "".join(("'" if index and toneless(syllable)[:1] in "aeo" else "") + syllable
                   for index, syllable in enumerate(parts))


class Lexicon:
    def __init__(self, wanted):
        self.readings = defaultdict(list)
        self.word_levels = defaultdict(list)
        self.glyph_levels = defaultdict(list)
        with gzip.open(ROOT / "public/dictionary/hsk-levels-2025.json.gz", "rt", encoding="utf-8") as f:
            official = json.load(f)
        for level, items in official["words"].items():
            for item in set(items.split("|")):
                self.word_levels[item].append(level)
        for level, chars in official["characters"].items():
            for char in chars:
                self.glyph_levels[char].append(level)
        for line in (DATA / "lexicon.tsv").read_text().splitlines():
            if not line or line.startswith("#"):
                continue
            word, pinyin, english = line.split("\t")
            parts = tuple(pinyin.split())
            if not parts or not english.strip():
                raise ValueError(f"Missing gloss or reading: {word}")
            rows = self.readings[word]
            if any(compact(displayed(p)) == compact(displayed(parts)) for p, _ in rows):
                raise ValueError(f"Duplicate lexical reading: {word} {pinyin}")
            rows.append((parts, english))
        missing = wanted.difference(self.readings)
        if missing:
            raise ValueError(f"Words without reviewed readings: {', '.join(sorted(missing))}")

    def candidates(self, word):
        if not self.readings.get(word):
            raise ValueError(f"No lexical entry for {word!r}")
        return self.readings[word]

    def character(self, char, reading):
        # Show a standalone citation sound for neutralized compound syllables.
        # True polyphones keep the sense used in the compound (银·行, 行·走).
        matches = self.candidates(char)
        match = next((row for row in matches if compact(displayed(row[0])) == compact(reading)), None)
        if not match:
            match = next((row for row in matches if toneless(displayed(row[0])) == toneless(reading)), None)
        if not match:
            raise ValueError(f"Missing character reading: {char} {reading}")
        parts, gloss = match
        return dict(hanzi=char, pinyin=displayed(parts), english=gloss, levels=self.glyph_levels[char])

    def term(self, word, row=None):
        parts, english = row or self.candidates(word)[0]
        result = dict(hanzi=word, pinyin=displayed(parts), english=english, levels=self.word_levels[word])
        if len(word) == 1:
            return result
        syllables = list(parts)
        erhua = word.endswith("儿") and len(syllables) == len(word) - 1 and syllables[-1].endswith("r")
        if erhua:
            syllables[-1] = syllables[-1][:-1]
            syllables.append("ér")
        if len(word) != len(syllables):
            raise ValueError(f"Missing syllable boundaries: {word} {parts}")
        result["characters"] = [self.character(char, reading) for char, reading in zip(word, syllables)]
        if erhua:
            result["characters"][-1]["english"] = "writes the -r ending here; ér when read on its own"
        return result

    def sentence_words(self, sentence):
        words = sentence["words"]
        if "".join(words) != "".join(HAN.findall(sentence["zh"])):
            raise ValueError(f"Word boundaries do not reproduce {sentence['zh']}: {words}")
        reading = compact(sentence["pinyin"])

        @functools.lru_cache(maxsize=None)
        def align(index, offset):
            if index == len(words):
                return (0, ()) if offset == len(reading) else None
            best = None
            for rank, row in enumerate(self.candidates(words[index])):
                sound = compact(displayed(row[0]))
                actual = reading[offset:offset + len(sound)]
                if toneless(sound) != toneless(actual):
                    continue
                tail = align(index + 1, offset + len(sound))
                if tail is None:
                    continue
                score = tail[0] + (actual != sound) * 100 + rank
                if best is None or score < best[0]:
                    best = score, (row,) + tail[1]
            return best
        aligned = align(0, 0)
        if not aligned:
            raise ValueError(f"Readings do not reproduce {sentence['zh']} ({sentence['pinyin']}) from {words}")
        return [self.term(word, row) for word, row in zip(words, aligned[1])]


def inline_words(version):
    fields = [version["story"], *(x["hint"] for x in version["related"]), *(x["label"] for x in version["situations"])]
    return list(dict.fromkeys(word for text in fields for word in HAN_WORDS.findall(text)))


def lexical_items(version):
    return [*version["cues"], *inline_words(version), *(r["zh"] for r in version["related"]),
            *(w for s in version["situations"] for w in s["words"])]


def compile_data():
    heads = load(DATA / "heads.json")
    variants = {source: load(DATA / f"{source}.json") for source in ("gpt", "deepseek")}
    if len(heads) != 20 or len(set(heads)) != 20 or any(set(entries) != set(heads) for entries in variants.values()):
        raise ValueError("The trial needs an independent lesson from each source for every headword.")
    wanted = set(heads)
    for entries in variants.values():
        for v in entries.values():
            wanted.update(lexical_items(v))
    lex = Lexicon(wanted | set("".join(wanted)))
    result = []
    errors = []
    for key in heads:
        if not set(lex.word_levels[key]).intersection({"1", "2", "3"}):
            raise ValueError(f"Trial headword outside the selected word syllabus: {key}")
        try:
            head = lex.term(key)
        except ValueError as exc:
            errors.append(f"{key}: {exc}")
            continue
        sources = {"gpt": "Model 6.2 Sol · lekcja do tej próby",
                   "deepseek": "Opracowanie przekazanego przykładu" if key in ("卫生间", "间")
                   else "Lekcja z czatu przygotowana do tej próby"}
        pair = {}
        for provider, entries in variants.items():
            v = entries[key]
            try:
                situations = []
                for s in v["situations"]:
                    situations.append(dict(label=s["label"], words=lex.sentence_words(s),
                                           sentence=dict(hanzi=s["zh"], pinyin=s["pinyin"], english=s["en"], levels=[])))
                pair[provider] = dict(story=v["story"], cues=[lex.term(w) for w in v["cues"]], situations=situations,
                                      related=[dict(term=lex.term(r["zh"]), hint=r["hint"]) for r in v["related"]],
                                      inlineTerms=[lex.term(w) for w in inline_words(v)])
            except ValueError as exc:
                errors.append(f"{key} ({provider}): {exc}")
        result.append(dict(head=head, versions=pair, sources=sources))
    if errors:
        raise SystemExit("\n".join(errors))
    return {"entries": result}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify that the saved catalog reproduces exactly")
    args = parser.parse_args()
    payload = json.dumps(compile_data(), ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != payload:
            raise SystemExit("Trial catalog is stale. Rebuild it before serving.")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(payload, encoding="utf-8")
    print("20 paired word lessons verified")
