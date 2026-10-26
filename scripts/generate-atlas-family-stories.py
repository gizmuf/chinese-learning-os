"""Authoring only; accepts JSON from export-atlas-family-stories.mjs.
Uses existing Edge voices, sends no learner data, and reuses only exact,
hash-verified, decodable recordings. Failed generation leaves the prior file intact.
"""
import argparse
import asyncio
import hashlib
import json
import subprocess
from pathlib import Path
import edge_tts

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--content', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('public/atlas/family-stories'))
    args = parser.parse_args()
    rows = json.loads(args.content.read_text())
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    manifest = out / 'manifest.json'
    old_manifest = json.loads(manifest.read_text()) if manifest.exists() else {}
    old = {r['file']: {**r, 'rate': r.get('rate', old_manifest.get('generationRate'))} for r in old_manifest.get('recordings',[])}
    sem = asyncio.Semaphore(3)

    def decodes(path):
        return subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'], capture_output=True).returncode == 0

    async def one(row):
        async with sem:
            target = out / row['file']
            prior = old.get(row['file'], {})
            cached = (target.exists() and target.stat().st_size > 1000
                and all(prior.get(k) == row[k] for k in ('text', 'voice', 'rate'))
                and hashlib.sha256(target.read_bytes()).hexdigest() == prior.get('sha256')
                and decodes(target))
            if not cached:
                temporary = target.with_suffix('.pending.mp3')
                try:
                    for attempt in range(3):
                        try:
                            await asyncio.wait_for(edge_tts.Communicate(row['text'], row['voice'], rate=row['rate']).save(str(temporary)), timeout=45)
                            if temporary.stat().st_size < 1000 or not decodes(temporary):
                                raise ValueError('Invalid recording: ' + row['file'])
                            temporary.replace(target)
                            break
                        except Exception:
                            if attempt == 2:
                                raise
                finally:
                    temporary.unlink(missing_ok=True)
            print(('Cached ' if cached else 'Generated ') + row['file'], flush=True)
            return {**row, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}

    records = await asyncio.gather(*(one(row) for row in rows))
    pending = manifest.with_suffix('.pending.json')
    pending.write_text(json.dumps({'provider': 'Microsoft Edge Read Aloud via edge-tts', 'edgeTtsVersion': edge_tts.__version__, 'recordings': records}, ensure_ascii=False, indent=2) + '\n')
    pending.replace(manifest)

asyncio.run(main())
