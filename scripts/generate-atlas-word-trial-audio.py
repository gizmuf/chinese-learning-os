"""Bundle Xiaoxiao clips for every pronunciation in the Atlas Words trial.

Run from the checkout with the isolated edge-tts interpreter. ffmpeg is used
for context edits and to decode the finished inventory with --verify.
Only static lesson text is submitted to the authoring speech provider.
"""

import argparse
import asyncio
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CONTENT = PUBLIC / "atlas/word-trial/v1.json"
AUDIO = PUBLIC / "atlas/word-trial/audio"
MANIFEST = AUDIO / "manifest.json"
SOURCES = ROOT / "data/atlas-word-trial/audio-sources.json"
OVERRIDES = ROOT / "data/atlas-word-trial/audio-pronunciations.json"
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-10%"
PROVIDER = "Microsoft Edge Read Aloud via edge-tts"
PINYIN_SEPARATORS = re.compile(r"[\s.,!?;:'’ʼ\-，。！？；：]+")
PINYIN_TONES = set("\u0304\u0301\u030c\u0300")


def audio_key(hanzi, pinyin):
    pinyin = unicodedata.normalize("NFC", pinyin).lower()
    return unicodedata.normalize("NFC", hanzi) + "\t" + PINYIN_SEPARATORS.sub("", pinyin)


def targets_in(value, result, role="word"):
    if isinstance(value, list):
        for item in value:
            targets_in(item, result, role)
    elif isinstance(value, dict):
        hanzi, pinyin = value.get("hanzi"), value.get("pinyin")
        if isinstance(hanzi, str) and isinstance(pinyin, str):
            key = audio_key(hanzi, pinyin)
            kind = "sentence" if role == "sentence" else "character" if len(hanzi) == 1 else "word"
            previous = result.setdefault(key, {"hanzi": hanzi, "pinyin": pinyin, "kind": kind})
            if not hanzi or not pinyin or previous["kind"] != kind:
                raise ValueError(f"Invalid or inconsistent pronunciation: {key!r}")
        for field, child in value.items():
            targets_in(child, result, field)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    pending = path.with_suffix(".tmp")
    pending.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    pending.replace(path)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_url(path):
    return "/" + path.relative_to(PUBLIC).as_posix()


def published_clip(url):
    path = (PUBLIC / url.removeprefix("/")).resolve()
    if not path.is_relative_to(PUBLIC) or path.suffix != ".mp3":
        raise ValueError(f"Unexpected pronunciation asset path: {url}")
    return path


def clip_matches(path, sha):
    return path.is_file() and path.stat().st_size >= 1000 and digest(path) == sha


def course_audio(target_keys):
    """Resolve HSK clips against the pinyin of the exact curriculum entry."""
    content = (ROOT / "app/content.ts").read_text(encoding="utf-8")
    content_start = content.split("export const items: Item[] = ", 1)[1]
    items, _ = json.JSONDecoder().raw_decode(content_start.lstrip())
    by_id = {item["id"]: item for item in items}
    directory = PUBLIC / "audio"
    manifest = read_json(directory / "manifest.json")
    if manifest["voice"] != VOICE or manifest["generationRate"] != RATE:
        raise ValueError("Unexpected source voice or rate in public/audio")
    verified = {}
    for record in manifest["recordings"]:
        item = by_id[record["itemId"]]
        word = record["kind"] == "word"
        text = item["hanzi" if word else "sentence"]
        pinyin = item["pinyin" if word else "sentencePinyin"]
        key = audio_key(text, pinyin)
        if key not in target_keys or record["text"] != text:
            continue
        path = directory / record["file"]
        if clip_matches(path, record["sha256"]):
            verified.setdefault(key, []).append({
                "source": source_url(path),
                "sha256": record["sha256"],
                "courseItem": item["id"],
                "pronunciation": {"context": record["pronunciationContext"]}
                if "pronunciationContext" in record else {"spoken": text},
            })
    return verified


def build_plan(targets):
    overrides = {}
    for row in read_json(OVERRIDES):
        key = audio_key(row["hanzi"], row["pinyin"])
        phonetics = {field: row[field] for field in ("spoken", "context") if field in row}
        if len(phonetics) != 1 or not all(phonetics.values()) or key in overrides:
            raise ValueError(f"Invalid pronunciation override: {row}")
        if "excerpt" in row:
            excerpt = row["excerpt"]
            if ("context" not in phonetics or not excerpt.get("boundary", row["hanzi"]).endswith(row["hanzi"])
                    or not all(isinstance(excerpt.get(field, 0), int) for field in ("startMs", "endPaddingMs"))):
                raise ValueError(f"Invalid contextual excerpt: {row}")
            phonetics["excerpt"] = excerpt
        overrides[key] = phonetics

    by_hanzi = {}
    for key, target in targets.items():
        by_hanzi.setdefault(target["hanzi"], []).append(key)

    course = course_audio(targets)
    plan = {}
    for key, target in sorted(targets.items()):
        hanzi, pinyin, kind = (target[field] for field in ("hanzi", "pinyin", "kind"))
        override = overrides.get(key)
        needs_context = kind == "character" and not PINYIN_TONES.intersection(unicodedata.normalize("NFD", pinyin))
        multiple_readings = len(by_hanzi[hanzi]) > 1
        course_clip = next((clip for clip in course.get(key, []) if (
            clip["pronunciation"] == override if override else
            "context" in clip["pronunciation"] or not (needs_context or multiple_readings)
        )), None)
        pronunciation = override or (course_clip or {}).get("pronunciation")
        if not pronunciation and (needs_context or multiple_readings):
            raise ValueError(f"Add a pronunciation override for {hanzi} ({pinyin})")
        pronunciation = pronunciation or {"spoken": hanzi}

        if course_clip:
            plan[key] = {**target, **course_clip, "pronunciation": pronunciation, "origin": "course"}
        else:
            filename = hashlib.sha256(key.encode()).hexdigest()[:24] + ".mp3"
            plan[key] = {**target, "source": source_url(AUDIO / filename),
                         "pronunciation": pronunciation, "origin": "generated"}
    return plan


async def read_context(communicate, target, scratch, excerpt):
    boundary = excerpt.get("boundary", target)
    offset = excerpt.get("startMs", 0) / 1000
    end_padding = excerpt.get("endPaddingMs", 0) / 1000
    with tempfile.TemporaryDirectory() as temp:
        source = Path(temp) / "context.mp3"
        matching = []
        with source.open("wb") as audio:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio.write(chunk["data"])
                elif chunk["type"] == "WordBoundary" and chunk["text"] == boundary:
                    matching.append(chunk)
        if len(matching) != 1:
            raise ValueError(f"Expected one isolated boundary for {target} in its pronunciation context")
        timing, = matching
        start = timing["offset"] / 10_000_000 + offset
        duration = timing["duration"] / 10_000_000 + end_padding - offset
        if duration < 0.06:
            raise ValueError(f"Pronunciation context excerpt has an invalid duration for {target}")
        process = await asyncio.create_subprocess_exec(
            "ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(source),
            "-ss", str(start), "-t", str(duration),
            "-codec:a", "libmp3lame", "-q:a", "3", "-f", "mp3", str(scratch),
            stderr=asyncio.subprocess.PIPE,
        )
        _, error = await process.communicate()
        if process.returncode:
            raise RuntimeError(error.decode())


async def generate(plan, concurrency):
    import edge_tts

    AUDIO.mkdir(parents=True, exist_ok=True)
    old = read_json(MANIFEST) if MANIFEST.exists() else {}
    if old.get("voice") != VOICE or old.get("generationRate") != RATE:
        old = {}
    records = {key: row for key, row in plan.items() if row["origin"] == "course"}
    pending = []
    for key, row in plan.items():
        if key in records:
            continue
        previous = old.get("recordings", {}).get(key)
        if previous and all(previous.get(field) == row[field] for field in ("source", "pronunciation", "origin")):
            path = published_clip(row["source"])
            if clip_matches(path, previous["sha256"]):
                records[key] = {**row, "sha256": previous["sha256"]}
                continue
        pending.append((key, row))

    def save():
        write_json(MANIFEST, {"voice": VOICE, "language": "zh-CN", "generationRate": RATE,
                              "provider": PROVIDER, "edgeTtsVersion": edge_tts.__version__,
                              "recordings": dict(sorted(records.items()))})

    print(f"{len(records)}/{len(plan)} clips ready, {len(pending)} to generate", flush=True)
    semaphore = asyncio.Semaphore(concurrency)

    async def record(key, row):
        async with semaphore:
            destination = published_clip(row["source"])
            scratch = destination.with_suffix(".part")
            pronunciation = row["pronunciation"]
            context = pronunciation.get("context")
            for attempt in range(4):
                try:
                    speech = edge_tts.Communicate(context or pronunciation["spoken"], VOICE, rate=RATE,
                                                  boundary="WordBoundary")
                    coroutine = (read_context(speech, row["hanzi"], scratch, pronunciation.get("excerpt", {}))
                                 if context else speech.save(str(scratch)))
                    await asyncio.wait_for(coroutine, timeout=55)
                    if scratch.stat().st_size < 1000:
                        raise ValueError("Speech output is under 1000 bytes")
                    scratch.replace(destination)
                    break
                except Exception as error:
                    scratch.unlink(missing_ok=True)
                    if attempt == 3:
                        raise RuntimeError(f"{row['hanzi']} ({row['pinyin']}): {error}") from error
                    await asyncio.sleep(2 * (attempt + 1))
            records[key] = {**row, "sha256": digest(destination)}
            save()
            if len(records) % 20 == 0 or len(records) == len(plan):
                print(f"{len(records)}/{len(plan)} clips ready", flush=True)

    await asyncio.gather(*(record(key, row) for key, row in pending))
    save()
    write_json(SOURCES, {key: records[key]["source"] for key in sorted(records)})
    used = {row["source"] for row in records.values()}
    for path in AUDIO.glob("*.mp3"):
        if source_url(path) not in used:
            path.unlink()


def decode(path):
    result = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-xerror", "-f", "mp3", "-i", str(path),
                             "-map", "0:a:0", "-f", "null", "-"], capture_output=True)
    if result.returncode:
        raise RuntimeError(f"Undecodable MP3 {path}: {result.stderr.decode()}")


def verify(plan):
    manifest = read_json(MANIFEST)
    if (manifest["voice"], manifest["language"], manifest["generationRate"], manifest["provider"]) != (
        VOICE, "zh-CN", RATE, PROVIDER
    ):
        raise ValueError("Unexpected voice, language, rate or recording provider")
    records = manifest["recordings"]
    sources = read_json(SOURCES)
    if records.keys() != plan.keys() or sources.keys() != plan.keys():
        raise ValueError("The lesson, MP3 manifest, and runtime index have different coverage")
    paths = set()
    for key, expected in plan.items():
        row = records[key]
        if any(row.get(field) != value for field, value in expected.items()) or row["source"] != sources[key]:
            raise ValueError(f"Stale metadata for {key}")
        path = published_clip(row["source"])
        if not clip_matches(path, row["sha256"]):
            raise ValueError(f"Missing or mismatched recording: {path}")
        paths.add(path)
    if set(AUDIO.glob("*.mp3")) != {path for path in paths if path.parent == AUDIO}:
        raise ValueError("Unexpected MP3 file in the trial audio directory")
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(decode, paths))
    counts = {kind: sum(row["kind"] == kind for row in records.values())
              for kind in ("character", "word", "sentence")}
    reused = sum(row["origin"] == "course" for row in records.values())
    print(f"Verified {len(paths)} MP3s ({reused} reused). Coverage: {counts}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--content", type=Path, default=CONTENT)
    parser.add_argument("--concurrency", type=int, default=6, choices=range(1, 9))
    operation = parser.add_mutually_exclusive_group()
    operation.add_argument("--verify", action="store_true")
    operation.add_argument("--list", action="store_true", help="List term keys and types without generating")
    args = parser.parse_args()
    targets = {}
    targets_in(read_json(args.content), targets)
    if not targets:
        raise ValueError("No lesson pronunciations found")
    if args.list:
        for key, row in sorted(targets.items()):
            print(f"{key}\t{row['kind']}")
        return
    plan = build_plan(targets)
    if args.verify:
        verify(plan)
    else:
        asyncio.run(generate(plan, args.concurrency))


if __name__ == "__main__":
    main()
