"""Generate missing static Atlas clips from the inventory in build-atlas-study-audio.mjs."""

import argparse
import asyncio
import json
from pathlib import Path

import edge_tts


async def generate(tasks, workers):
    failures = 0
    completed = 0
    queue = iter(tasks)

    async def worker():
        nonlocal failures, completed
        while True:
            row = next(queue, None)
            if row is None or failures >= 24:
                return
            destination = Path("public") / row["file"].lstrip("/")
            if destination.is_file() and destination.stat().st_size > 1000:
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            scratch = destination.with_suffix(".part")
            for attempt in range(3):
                try:
                    speech = edge_tts.Communicate(row["spoken"], "zh-CN-XiaoxiaoNeural", rate="-10%")
                    await asyncio.wait_for(speech.save(str(scratch)), 18)
                    if scratch.stat().st_size <= 1000:
                        raise ValueError("empty or incomplete clip")
                    scratch.replace(destination)
                    completed += 1
                    if completed % 50 == 0:
                        print(f"{completed} recordings completed", flush=True)
                    break
                except Exception as error:
                    scratch.unlink(missing_ok=True)
                    if attempt == 2:
                        failures += 1
                        print(f"{row['spoken']} ({row['pinyin']}): {type(error).__name__}", flush=True)
                    else:
                        await asyncio.sleep(2 * (attempt + 1))

    await asyncio.gather(*(worker() for _ in range(workers)))
    print(json.dumps({"generated": completed, "failures": failures, "targets": len(tasks)}), flush=True)
    if failures:
        raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("plan", type=Path)
    parser.add_argument("--workers", type=int, default=6, choices=range(1, 7))
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    tasks = json.loads(args.plan.read_text())[:args.limit]
    asyncio.run(generate(tasks, args.workers))


if __name__ == "__main__":
    main()
