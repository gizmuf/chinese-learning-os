# Tencent SOE-N pronunciation experiment

## Current implementation audit

Source: Chinese OS deployed Sites repository, main at 3ea10d342ca44681d72f9c3c2c00188a649220c1 (5 November 2026). The public GitHub mirror was older (3d63cbb), so implementation uses the current Sites source. Existing course sentence/Pinyin practice, recording playback API, D1 course progress, ChatGPT/Firebase authentication and SRS remain in place. This adds an isolated `/pronunciation-lab` route and a navigation link. Experimental results are session-only, separate from learning events; audio is never persisted by this app.

## Run without Tencent

```
npm run install:ci
node --test tests/soe.test.mjs
npm run typecheck
npm run dev
```

Open `/pronunciation-lab` through the preview URL or HTTPS. Record → Stop → listen → consent → Evaluate. Without activation the server refuses paid calls. No fake score is displayed. Automated transport tests use synthetic PCM and fabricated responses: these test software, not pronunciation accuracy. They never contact Tencent.

## Activation (operator, only after explicit paid-test authorization)

1. Enable **SOE-N / 口语评测（新版）** in the intended Tencent account, confirm its current billing terms and spending alert. Obtain that account's AppID and a restricted service identity's SecretId/SecretKey. This experiment has NOT enabled Tencent service, purchased a package or sent a billable request.
2. In the Chinese OS server runtime's secret manager configure `TENCENT_APP_ID`, `TENCENT_SECRET_ID`, `TENCENT_SECRET_KEY`. Never use NEXT_PUBLIC/VITE prefixes or paste secrets into source, chat, browser code, commands, logs or a URL. Use native secret fields; preserve all other environment values.
3. Set `SOE_ALLOWED_USER_ID` to the exact authenticated `user.userId` from Chinese OS for the intended tester (not their display name/email). The page reuses the existing ChatGPT cookie session or verified Firebase user token; sign in to Chinese OS first. For Firebase the expected identifier is `firebase:<uid>`.
4. Against this Site's **production D1 DB binding**, execute the following SQL once using the D1 console or the authorized database migration runner:

```sql
CREATE TABLE IF NOT EXISTS soe_experiment_budget (
 id INTEGER PRIMARY KEY CHECK(id=1),
 used INTEGER NOT NULL DEFAULT 0 CHECK(used>=0),
 max_calls INTEGER NOT NULL CHECK(max_calls BETWEEN 1 AND 10)
);
INSERT INTO soe_experiment_budget(id,used,max_calls)
 VALUES(1,0,10) ON CONFLICT(id) DO NOTHING;
SELECT used,max_calls FROM soe_experiment_budget WHERE id=1;
```

The server atomically reserves a lifetime slot before connecting to Tencent. This limits this experiment to 10 attempted calls of at most 30 seconds each, including failures. It does not limit other applications using the same Tencent account. Do not reset `used` or increase `max_calls` without fresh authorization.

5. **Only after the operator has authorization for this bounded paid test**, set server `SOE_PAID_ENABLED=true`. Missing/false/any other spelling disables evaluation. Restart/redeploy runtime if its secret management requires it. Do not enable this merely to test configuration.
6. On iPad Safari over HTTPS, sign in, open `/pronunciation-lab`, permit microphone, record one short sentence, stop, replay, consent and submit once. Expect `source=tencent-audio`, provider score and tone coverage. Verify the budget count increased by one. Do not automatically retry failures.
7. Disable immediately with `SOE_PAID_ENABLED=false`. This blocks new calls; any already submitted call may finish and be billed.

## Transport and interpretation

Browser Web Audio captures mono samples, OfflineAudioContext resamples to 16 kHz, and PCM16 little endian is posted after stopping (0.5–30 seconds, <=960000 bytes). The browser also creates a local WAV for replay. ScriptProcessorNode is used for Safari compatibility in this bounded experiment; it is deprecated and should become an AudioWorklet for production. Device validation remains necessary.

The server opens Tencent's WebSocket through the Cloudflare Worker fetch upgrade API, signs server-side with HMAC-SHA1, and uses `16k_zh`, `eval_mode=1`, `rec_mode=1`, `voice_format=0`, strict adult `score_coeff=4`, and `ref_text={::cmd{F_TDET=true}}...`. In recording mode a single binary audio message is sent after the successful handshake, followed by `{type:"end"}`. Only a successful final response is returned. Timeouts, early close and provider errors do not turn into scores. No signed URLs or raw transport exceptions reach the browser.

A suggested score is a provider score out of 100, not a calibrated probability or a tone accuracy percentage. Only `Tone.Valid === true`, `MatchTag === 0`, exact sentence alignment and integer tones 1–4 produce a tone comparison. Missing/null/-1/neutral/unknown tones and word mismatches are uncertain. No aggregate tone percentage is invented. Invalid sentence alignment suppresses the overall score. A mismatch is marked for review, not declared an objective pronunciation error. Sandhi and neutral tone calibration must be reviewed with a teacher. The three pilot sentences deliberately avoid adjacent third tones and 一/不 sandhi.

## Verification and real-audio acceptance plan

Automated tests cover matching/different/invalid tones, neutral and unknown values, omissions/insertions, invalid scores, partial/error responses, quiet/malformed PCM, independent HMAC signature verification, handshake/final sequencing and fail-closed paid access policy. Synthetic fixtures are NOT evidence of acoustic reliability.

Before expanding: run teacher-reviewed recordings for each sentence: natural correct delivery, deliberate wrong tone on one syllable, wrong syllable, omission, silence, low volume and background noise. Log only sentence id, provider score, valid tone coverage and teacher agreement (no raw audio unless separately requested and consented). Test iPad Safari microphone permission denial, stop/replay/resubmit, 30s stop, 48kHz capture, route exit cleanup and unavailable network. Count false positives, especially connected-speech variants. No real recording has been evaluated in this implementation session; Tencent credentials, service entitlement and acoustic accuracy are unverified.

Official references: https://cloud.tencent.com/document/product/1774/107396 and https://cloud.tencent.cn/document/product/1774/107497 (checked 5 November 2026).

Validation in this session: 574/574 repository tests passed; TypeScript check passed; production build passed. Browser preview was unavailable (connection refused despite preview daemon reporting running), so no successful Safari/microphone UI verification is claimed.
