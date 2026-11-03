# My Day speaking chapters · 3 November 2026

The existing My Day entry now presents **New in My Day · 3 November** with two visible practice buttons, beside the retained original lesson. The catalog and StudyStudio entry describe the new chapters. All chapters belong to the same My Day lesson UI; the selector and **My Day · All chapters** return keep them discoverable without separate links.

Original `my-day-01-v2` content, IDs, recordings and view checkpoint remain unchanged. New authored chapters:

- `?rehearsal=voice-live-2026-11-03`: 8 sentences.
- `?rehearsal=my-day-full-2026-11-03`: 30 sentences, five scenes.

Each visible row presents Hanzi, pinyin and English in that order. Existing StudyText lookup connects words to the dictionary, characters, Atlas and writing. Context checkpoints validate the new source IDs against authored content; dictionary sentence playback can reuse the new full-sentence recordings too.

A visible Playback speed selector uses the existing account-scoped slow-audio preference: normal (1×) or slow (0.8×), including changes during playback. Audio preserves pitch; changing playback timing does not improve or regenerate the original intonation. New Xiao Xiao audio is synthesized at the established -10% generation rate with complete sentences; the optional playback control slows it further. No additional synthesis is performed for speed selection.

Practice shows one or two sentences, supports repeatable audio, hides text for recall, and counts up to three learner-reported repetitions per sentence for the current visit. It does not record learning events, issue review credit, infer accuracy or grade tones. Session storage remembers only position, independently per owner and chapter. Existing original reading preferences use their unchanged key.

## Complete audio

All 38 sentence rows have full-sentence audio. Existing validated Qwen `longanhuan_v3.1` recordings cover 3/8 and 8/30; the remaining 27 unique texts use `zh-CN-XiaoxiaoNeural` at -10%, the project's established Microsoft Edge Read Aloud voice. Repeated texts share one file. Qwen stays preferred. Each player labels its actual voice. No stitched syllables, approximate wording or browser-installed voice fallback is used.

`data/my-day-speaking-audio.json` records text, voice, rate, SHA-256 and decoded duration. `scripts/generate-my-day-speaking-audio.py` verifies/resumes completed files and stops failed requests without automatic retries. It uses edge-tts 7.3.1, the inherited proxy and the environment CA with TLS verification. Only the lesson text is sent. The 27-text Qwen pending inventory is retained for an optional future voice upgrade; it is not a request to regenerate the completed Xiao Xiao clips.

## Access, costs and terms checked

- The [edge-tts upstream README](https://github.com/rany2/edge-tts) documents use of Edge's online service without an API key. Actual synthesis succeeded from this Linux executor. No Azure/Google billing account, API key, trial activation or paid endpoint was used. This is the existing project's authoring method, not a claim of a contracted, unlimited free cloud API or a commercial redistribution license. [Microsoft's Read Aloud page](https://www.microsoft.com/en-us/edge/features/read-aloud) describes the consumer feature. Availability may change.
- [Google Cloud TTS pricing](https://cloud.google.com/text-to-speech/pricing) requires enabled billing and automatically charges beyond model-specific free allowances. No Google TTS credentials, current quota or the user's older two-Google-voice HTML were available in this checkout; no Google voice was guessed or paid service enabled.
- Qwen's documented credential remains `ChineseOS-TTS-Aliyun-Beijing` in Mac Keychain (see `QWEN_CURRICULUM_AUDIO.md`); no Mac access or Qwen synthesis was used for this completion.
- This environment reports no secret bindings, runtime variables or outbound identities. Sites runtime names inspected earlier contained only `FIREBASE_WEB_CONFIG`. No Google Cloud TTS project, Secret Manager secret name or TTS execution identity is documented in this repository. The Firebase project `chinese-os-gizmuf-auth` is authentication infrastructure, not evidence of TTS/Secret Manager access. No secret values were needed or read for this work.
