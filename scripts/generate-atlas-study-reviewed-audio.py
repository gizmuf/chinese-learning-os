"""Render reviewed pinyin using Kokoro's Mandarin phoneme alphabet and local weights."""

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile
import torch
from kokoro import KModel
from misaki.zh_frontend import ZH_MAP
from pypinyin.contrib.tone_convert import to_finals_tone3, to_initials, to_tone3


def syllable(text):
    numbered = to_tone3(text, neutral_tone_with_five=True, v_to_u=False)
    body, tone = numbered[:-1], numbered[-1]
    erhua = body.endswith("r") and body != "er"
    base = body[:-1] + tone if erhua else numbered
    initial = to_initials(base)
    final = to_finals_tone3(base, neutral_tone_with_five=True, v_to_u=False)[:-1]
    if body == "m":
        initial, final = "", "m"
    if final == "i" and initial in ("z", "c", "s", "zh", "ch", "sh", "r"):
        final = "ii" if initial in ("z", "c", "s") else "iii"
    suffix = "R" if erhua and final != "e" else ""
    if erhua and final == "e":
        final = "er"
    if not final or tone not in "12345":
        raise ValueError(f"Unsupported Mandarin syllable: {text!r}")
    return "".join(ZH_MAP[phone] for phone in (initial, final, suffix) if phone), tone


def phonemes(pinyin):
    parts = list(map(syllable, pinyin.split()))
    return "".join(segment + ("2" if tone == "3" and i + 1 < len(parts) and parts[i + 1][1] == "3" else tone)
                   for i, (segment, tone) in enumerate(parts))


# An isolated interjection has no surrounding words to establish its tone.
# Make the teaching contours unambiguous while preserving the recorded timbre.
ISOLATED_TONES = {
    "á": (0.80, 0.82, 0.96, 1.17),
    "ǎ": (0.97, 0.77, 0.73, 1.01),
    "à": (1.19, 1.10, 0.88, 0.73),
    "ó": (0.80, 0.82, 0.96, 1.17),
}


def make_isolated_tone_clear(waveform, reading):
    profile = ISOLATED_TONES.get(reading)
    if not profile:
        return waveform
    from parselmouth import Sound
    from parselmouth.praat import call
    sound = Sound(waveform, sampling_frequency=24000)
    pitch = sound.to_pitch(time_step=0.01, pitch_floor=110, pitch_ceiling=460)
    frequency = pitch.selected_array["frequency"]
    voiced = frequency > 0
    assert voiced.sum() >= 8, reading
    times = pitch.xs()[voiced]
    centre = np.median(frequency[voiced])
    start, end = times[0], times[-1]
    manipulation = call(sound, "To Manipulation", 0.01, 110, 460)
    tier = call("Create PitchTier", "Mandarin tone", sound.xmin, sound.xmax)
    for fraction, ratio in zip((0.04, 0.32, 0.62, 0.94), profile):
        call(tier, "Add point", start + fraction * (end - start), centre * ratio)
    call([tier, manipulation], "Replace pitch tier")
    return call(manipulation, "Get resynthesis (overlap-add)").values[0]


def main():
    cli = argparse.ArgumentParser()
    cli.add_argument("plan", type=Path)
    cli.add_argument("--check", action="store_true")
    cli.add_argument("--refresh-isolated-tones", action="store_true")
    args = cli.parse_args()
    rows = json.loads(args.plan.read_text())
    tasks = []
    for row in rows:
        source = row["source"]
        reading = row["pinyin"]
        assert re.fullmatch(r"/audio/atlas-study/review-[0-9a-f]{24}\.mp3", source), source
        tasks.append((Path("public" + source), phonemes(reading), reading))
    if args.check:
        for output, phones, reading in tasks:
            print(output.name, reading, phones)
        return

    torch.set_num_threads(3)
    model_id = "hexgrad/Kokoro-82M-v1.1-zh"
    from huggingface_hub import hf_hub_download
    config = hf_hub_download(model_id, "config.json", local_files_only=True)
    weights = hf_hub_download(model_id, "kokoro-v1_1-zh.pth", local_files_only=True)
    voice = hf_hub_download(model_id, "voices/zf_001.pt", local_files_only=True)
    model = KModel(repo_id=model_id, config=config, model=weights).eval()
    pack = torch.load(voice, weights_only=True, map_location="cpu")
    completed = 0
    for output, phones, reading in tasks:
        if output.exists() and not (args.refresh_isolated_tones and reading in ISOLATED_TONES):
            continue
        assert all(phone in model.vocab for phone in phones), (reading, phones)
        output.parent.mkdir(parents=True, exist_ok=True)
        with torch.inference_mode():
            waveform = model(phones, pack[len(phones) - 1], speed=0.92).cpu().numpy()
        waveform = make_isolated_tone_clear(waveform, reading)
        peak = np.abs(waveform).max()
        assert np.isfinite(waveform).all() and 0.014 < peak < 3 and 2500 < len(waveform) < 8*24000, (reading, peak, len(waveform))
        waveform = np.pad(waveform * (0.74 / peak), (2400, 2400))
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "clip.wav"
            soundfile.write(wav, waveform, 24000)
            partial = output.with_suffix(".part")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "64k",
                            "-f", "mp3", str(partial)], check=True)
            partial.replace(output)
        completed += 1
        if completed % 24 == 0:
            print(f"{completed} clips rendered locally", flush=True)
    print(json.dumps({"generated": completed, "planned": len(tasks)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
