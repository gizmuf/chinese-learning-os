"""Render the original HSK mock dialogue bank with the existing Mandarin voices."""
import argparse
import asyncio
import csv
from pathlib import Path
import subprocess
import tempfile

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
FEMALE = 'zh-CN-XiaoxiaoNeural'
MALE = 'zh-CN-YunxiNeural'
NARRATOR = 'zh-CN-YunjianNeural'

async def render(force: bool, form: str):
    folder = 'hsk3-mock' if form == 'a' else 'hsk3-mock-b'
    output = ROOT / 'public/audio' / folder
    output.mkdir(parents=True, exist_ok=True)
    with (ROOT / 'resources' / folder / 'listening.tsv').open(encoding='utf-8') as handle:
        rows = list(csv.reader(handle, delimiter='|'))
    assert len(rows) == 30 and all(len(row) == 6 for row in rows)
    limit = asyncio.Semaphore(6)
    async def speak(text, voice, path):
        async with limit:
            for attempt in range(3):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(text, voice, rate='-5%').save(str(path)), timeout=28)
                    return
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(attempt + 1)
    async def item(index, row, scratch):
        dest = output / f'listening-{index:02d}.mp3'
        if dest.exists() and not force:
            return
        phrase, reply, question, *_ = row
        lines = [(phrase, FEMALE if index <= 20 or index % 2 else MALE)]
        if reply:
            lines.append((reply, MALE))
        if question:
            lines.append((question, NARRATOR))
        files = [scratch / f'{index}-{n}.mp3' for n in range(len(lines))]
        await asyncio.gather(*(speak(text, voice, path) for (text, voice), path in zip(lines, files)))
        command = ['ffmpeg', '-nostdin', '-y', '-hide_banner', '-loglevel', 'error']
        for path in files:
            command += ['-i', str(path)]
        filters = ';'.join(f'[{n}:a]apad=pad_dur=0.5[a{n}]' for n in range(len(files)))
        filters += ';' + ''.join(f'[a{n}]' for n in range(len(files))) + f'concat=n={len(files)}:v=0:a=1[out]'
        combined = scratch / f'clip-{index}.mp3'
        subprocess.run(command + ['-filter_complex', filters, '-map', '[out]', '-q:a', '4', str(combined)], check=True)
        combined.replace(dest)
        print(dest.name, flush=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as temporary:
        await asyncio.gather(*(item(index, row, Path(temporary)) for index, row in enumerate(rows, 1)))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--form', choices=('a', 'b'), default='a')
    args = parser.parse_args()
    asyncio.run(render(args.force, args.form))
