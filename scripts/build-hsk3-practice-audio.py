"""Render the original review and five-minute drill clips."""
import asyncio
import json
from pathlib import Path
import tempfile

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICES = {
    'xiaoxiao': 'zh-CN-XiaoxiaoNeural',
    'xiaoyi': 'zh-CN-XiaoyiNeural',
    'yunxi': 'zh-CN-YunxiNeural',
}


async def main():
    bank = json.loads((ROOT / 'data/hsk3-practice.json').read_text(encoding='utf-8'))
    prompts = {}
    for group in bank['review'].values():
        for task in group:
            if 'audio' in task:
                prompts[task['audio']] = (task.get('transcript') or task['example'], VOICES['xiaoxiao'])
    for item in bank['drill']:
        text = ''.join(hanzi for hanzi, _ in item['chunks'])
        for voice in item['voices']:
            prompts[f"drill-{item['id']}-{voice}"] = (text, VOICES[voice])
    output = ROOT / 'public/audio/hsk3-practice'
    output.mkdir(parents=True, exist_ok=True)
    limit = asyncio.Semaphore(6)

    async def render(name, phrase, voice, scratch):
        destination = output / f'{name}.mp3'
        if destination.is_file():
            return
        clip = scratch / destination.name
        async with limit:
            for attempt in range(3):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(phrase, voice, rate='-10%').save(str(clip)), 40)
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(attempt + 1)
        if clip.stat().st_size < 1500:
            raise ValueError(f'Empty audio for {name}')
        clip.replace(destination)
        print(destination.name, flush=True)

    with tempfile.TemporaryDirectory(dir=output.parent) as temporary:
        await asyncio.gather(*(render(name, phrase, voice, Path(temporary)) for name, (phrase, voice) in prompts.items()))


if __name__ == '__main__':
    asyncio.run(main())
