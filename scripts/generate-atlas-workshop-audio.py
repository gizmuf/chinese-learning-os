"""Author bundled Xiaoxiao recordings from reviewed Atlas content only.
Uses the existing isolated edge-tts runtime; never sends learner text or progress.
Resume verifies text, voice, generation rate and SHA-256 before reusing audio.
"""
import argparse, asyncio, hashlib, json, shutil
from pathlib import Path
import edge_tts
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-10%'

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--content', required=True)
    parser.add_argument('--output', default='public/atlas/workshop-audio')
    args = parser.parse_args()
    rows = json.loads(Path(args.content).read_text())
    target = Path(args.output); target.mkdir(parents=True, exist_ok=True)
    manifest_path = target / 'manifest.json'
    records = {}; cache = {}
    # Reuse only exact text in the same Chinese voice/rate, without a special
    # pronunciation context. Such clips can differ from isolated text reading.
    for directory in [Path('public/audio'), Path('public/course03/audio'), Path('public/atlas/audio'), target]:
        manifest_file = directory / 'manifest.json'
        if not manifest_file.exists(): continue
        manifest = json.loads(manifest_file.read_text())
        if manifest.get('voice') != VOICE or manifest.get('generationRate') != RATE: continue
        for r in manifest.get('recordings', []):
            file = directory / r['file']
            if file.exists() and file.stat().st_size >= 1000 and digest(file) == r['sha256'] and not r.get('pronunciationContext'):
                cache.setdefault(r['text'], file)
                if directory == target: records[r['file']] = r
    wanted = {r['file'] for r in rows}
    if len(wanted) != len(rows): raise ValueError('Duplicate recording path')
    def save():
        manifest = {'voice':VOICE, 'language':'zh-CN', 'generationRate':RATE, 'provider':'Microsoft Edge Read Aloud via edge-tts', 'edgeTtsVersion':edge_tts.__version__, 'recordings': sorted([r for f,r in records.items() if f in wanted], key=lambda r:r['file'])}
        scratch = manifest_path.with_suffix('.tmp'); scratch.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n'); scratch.replace(manifest_path)
    semaphore = asyncio.Semaphore(3)
    async def generate(row):
        filename = row['file']; text = row['text']; dest = target / filename
        if Path(filename).name != filename or not filename.endswith('.mp3'): raise ValueError('Unsafe recording filename')
        old = records.get(filename)
        if old and all(old.get(k) == row[k] for k in ['itemId','kind','text']): return
        async with semaphore:
            cached = cache.get(text)
            if cached and cached != dest:
                shutil.copyfile(cached, dest); origin = 'reused'
            else:
                scratch = dest.with_suffix('.part')
                for attempt in range(5):
                    try:
                        await asyncio.wait_for(edge_tts.Communicate(text, VOICE, rate=RATE).save(str(scratch)), timeout=90)
                        if scratch.stat().st_size < 1000: raise ValueError('Empty speech output')
                        scratch.replace(dest); break
                    except Exception:
                        if attempt == 4: raise
                        await asyncio.sleep(3*(attempt+1))
                origin = 'generated'
            records[filename] = {**row, 'sha256':digest(dest)}
            cache[text] = dest; save()
            print(f"{origin}: {filename}", flush=True)
    await asyncio.gather(*(generate(row) for row in rows))
    save(); print(f'Complete: {len(rows)} recordings', flush=True)

asyncio.run(main())
