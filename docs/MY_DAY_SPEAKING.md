# My Day speaking variants · 3 November 2026

Original `my-day-01-v2` content, IDs, recordings and view checkpoint remain unchanged.
The My Day variant selector adds two independently addressed readings from Robert's supplied transcript:

- `?rehearsal=voice-live-2026-11-03`: 8 sentences.
- `?rehearsal=my-day-full-2026-11-03`: 30 sentences, five scenes.

Each visible row presents Hanzi, pinyin and English in that order. Existing StudyText lookup connects words to the dictionary, characters, Atlas and writing. Context checkpoints validate the new source IDs against authored content.

Practice shows one or two sentences, supports repeatable audio, hides text for recall, and counts up to three learner-reported repetitions per sentence for the current visit. It does not record learning events, issue review credit, infer accuracy or grade tones. Session storage remembers only the position, independently per owner and variant. Existing original reading preferences use their unchanged key.

Existing validated Qwen `longanhuan_v3.1` full-sentence recordings are reused by exact text: 3/8 in Voice Live and 8/30 in the full story. Both materials share existing files. The 27 unique missing texts are inventoried in `data/my-day-speaking-audio-pending.json`. Missing recordings are explicitly marked pending; no approximate sentence or stitched character audio is substituted.

Generation is blocked in this managed environment: no Alibaba secret or quota observation is configured, and the canonical provider credential is in the Mac Keychain per `QWEN_CURRICULUM_AUDIO.md`. Mac access is excluded by this task. No synthesis API call, account/access change, or generation expense was made. Complete the pending inventory through authorized provider access after verifying free quota and its stop switch.
