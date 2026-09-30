import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('d:/transkrip-konten/raw_yt_transcript.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    sec = item['offset'] / 1000
    if 470 <= sec <= 550:
        m, s = divmod(int(sec), 60)
        dur = item['duration'] / 1000
        print(f"{m:02d}:{s:02d} ({sec:.1f}s, dur {dur:.1f}s): {item['text']}")
