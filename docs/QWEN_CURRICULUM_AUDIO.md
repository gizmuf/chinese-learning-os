# Qwen study audio: My Day and Lesson 09

The offline recordings use Alibaba Qwen `qwen-audio-3.1-tts-plus`, system voice
`longanhuan_v3.1`, Beijing, natural speed (1.0), pitch 1.0, seed 0, mono 24 kHz
WAV originals. Web delivery uses 96 kbps MP3 at the same sample rate and speed.
They are synthetic study recordings, not recordings of a teacher.

The source scope is exactly the 26 sentence rows in `data/my-day-01-v2.json`
and the 322 recording references in `public/course09/audio/manifest.json`.
These resolve to 333 unique complete texts. Repeated references share a file.
My Day glossary entries, Shuoshuo, Compendium and unrelated HSK clips are outside
this batch. The contextual `audioText` readings from Lesson 09 remain contextual.

`data/qwen-curriculum-audio.json` is the validated mapping. The adapter replaces
a source only when material, original text, recording ID (where applicable),
model/voice/region and validated metadata agree. A pending manifest keeps the
old exact recordings. All original Lesson 09 media and its hashed manifest are
retained. New media lives under `public/audio/qwen-curriculum/`.

Generation is a local preparation step. No API credential, synthesis call,
provider URL, or live voice selection runs in the browser. The credential stays
in the existing Mac Keychain entry `ChineseOS-TTS-Aliyun-Beijing`; the canonical
reader is `/usr/bin/python3` with Security.framework. Generation requires a
fresh account quota observation and the provider's free-only stop switch on.
Unknown synthesis outcomes must be reconciled before any retry.

The local batch receipts retain request IDs, usage, exact text mappings, WAV
checksums and decoded PCM checksums. Delivery MP3 files are separately decoded
and hashed. WAV length headers may be repaired without
changing PCM, tempo, pitch or voice. Playback uses the existing local audio
player. This does not create curriculum cards, review credit or learner events.
