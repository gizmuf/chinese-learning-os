"""Render the original oral mock with the Chinese OS Mandarin voice."""
import asyncio
import json
from pathlib import Path
import tempfile

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICE = 'zh-CN-XiaoxiaoNeural'

async def main():
    bank = json.loads((ROOT / 'data/hsk3-speaking.json').read_text(encoding='utf-8'))
    prompts = dict(bank['introductions'])
    prompts['speak-now'] = bank['speakCue']
    prompts.update((f'question-{index:02}', task['prompt']) for index, task in enumerate(bank['tasks'], 1))
    output = ROOT / 'public/audio/hsk3-speaking'
    output.mkdir(parents=True, exist_ok=True)
    limit = asyncio.Semaphore(5)

    async def render(name, phrase, temporary):
        destination = output / f'{name}.mp3'
        if destination.exists():
            return
        clip = temporary / destination.name
        async with limit:
            for attempt in range(3):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(phrase, VOICE, rate='-10%').save(str(clip)), 40)
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
        await asyncio.gather(*(render(name, phrase, Path(temporary)) for name, phrase in prompts.items()))

if __name__ == '__main__':
    asyncio.run(main())
