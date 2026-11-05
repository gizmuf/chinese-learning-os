# 3D Lab and short real-audio pilot

Prepared 2026-11-04. Main application base: `fecbbbbf45bf8155f5e71f85067eb02563bec5db`. All edits are isolated in `codex/scene-lab-main-menu`; the active source owner's checkout was not changed.

## Implemented candidate

Global menu: **3D Lab**, literal **3D** SVG in the compact rail, tooltip retained. Route `/?view=labs&lab=room|speaking|journey|voice`; unknown selections fall back to room. The three scene tabs use same-origin iframes, preserving the application menu. Switching tabs or leaving unmounts the child. Existing StudyStudio files, workspaces and assessments are unchanged.

Scene assets are the accepted `ef81380` room/navigation and `1793706` guided-speaking lineage. `data/scene-lab-assets.json` pins a separate GitHub asset commit, SHA-256 and size for every allowed file. All 172 original recordings remain identical. HK can continue serving the prefix statically. Its old StudyLabLinks version transform remains applicable because that component is unchanged.

Voice pilot: three initial fruit cards, Hanzi/pinyin always visible, meanings on request, typed input or a recorded question up to ten seconds. The real-audio response is streamed through Qwen Realtime. It is a short push-to-talk pilot, not an always-open, interruptible phone call. The model can request an allowlisted `show_fruits` action; only catalogue IDs change existing React cards. Model-generated HTML is never executed.

The candidate backend is a Workers WebSocket relay in `lib/voice-demo.ts`, dispatched by `build/sites-worker.ts`. It is disabled without all activation conditions. After the explicit approval, a separate one-model key was stored in Native Sites secret environment revision 2 and the provider free-quota-only stop was enabled and read back. The relay remains inactive without the allowed tester identity and short expiry. No model calls have been made and no microphone permission has been requested during development. Fixtures simulate provider events; they do not prove provider acceptance or real audio quality.

## Activation after explicit approval

User approved one separate `qwen3.8-omni-flash-realtime` Beijing key, free-quota-only, on 2026-11-04. Existing TTS key must remain untouched. Before connecting, refresh actual quota and verify stop-after-free-quota is ON for the exact model; an application flag does not establish provider protection.

Runtime names, values never in source or chat:

- `QWEN_REALTIME_API_KEY`: only this one model, server only.
- `QWEN_REALTIME_WORKSPACE`: matching Beijing workspace.
- `VOICE_DEMO_ALLOWED_USER_ID`: approved tester's existing Sites identity.
- `VOICE_DEMO_FREE_ONLY_CONFIRMED=1`: set only after provider readback.
- `VOICE_DEMO_EXPIRES_AT`: an activation deadline no more than one hour ahead.

Relay checks trusted Sites identity and same-origin WebSocket requests; model and session instructions are server controlled. Limits: 120 seconds, three user turns, 30 seconds input PCM and 30 seconds generated PCM, bounded messages and tool calls. Stop/disconnect closes upstream. One connection per Worker isolate is a local concurrency guard, not a global distributed account cap. Repeated test sessions are not prevented globally; do not describe this as a hard monetary limit. No paid fallback, recording persistence or pronunciation grade.

Use the existing HTTPS Sites origin first. HK HTTP cannot provide the usual microphone secure context and has no approved voice relay/TLS configuration; do not activate the endpoint there or open public SSH. Its navigation/scenes can publish independently. No new database, provider purchase or DNS/TLS change is included.

## Required acceptance before calling the pilot live

Publish only through the existing application owner. Confirm unauthenticated/wrong-user and cross-origin connections are rejected by the actual hosted platform. Validate upstream authentication, session configuration and function-call event handling; then one bounded real spoken question, a typed follow-up and a card-change request. Measure end-of-input to first audio, verify the actual card IDs, test Stop and expiry, and read provider usage. Check physical Safari/iPad codec/mic behavior separately. Browser fixtures and passing builds do not replace these checks.

Current checks: 525 tests PASS, typecheck PASS, production build PASS. Actual local browser: main menu entry; compact 3D rail; room and guided-speaking iframes; disabled voice gate. Responsive 390px DOM width equals scroll width. No live inference acceptance yet.

## Content assistant: smallest useful next phase

Text and voice should operate on the same practice-set state. A contextual text assistant receives the selected word, current lesson and available source IDs. For ambiguous “shi”, resolve the selected Hanzi first or offer choices such as 是 / 十 / 时. Search actual lesson expressions, return their source locations, and say which corpus was searched rather than claiming all Chinese occurrences.

Expose narrow tools: `find_occurrences`, `show_practice_set`, `add_word`, `show_example`, `start_practice`. Retrieval supplies known Hanzi, pinyin, meaning and audio references; examples absent from the corpus must be marked as new examples. User selects the scope, then the same set is passed to the voice session. Do not transmit the whole notebook, generate arbitrary navigation URLs, or let model feedback create grades/mastery events.

React updates existing cards when validated state changes, without rebuilding the site. Stream conversational text; apply a card action only once its complete arguments are validated. Most perceived delay will be model/network time; end-to-end timings have not been measured. Live animation can select existing scene actions through the same allowlist. Full autonomous site navigation, complete corpus search and validated tone scoring are subsequent work, not implemented by this pilot.

Primary references: [Qwen Realtime](https://help.aliyun.com/zh/model-studio/realtime), [function calling](https://help.aliyun.com/zh/model-studio/qwen-function-calling), [Workers WebSockets](https://developers.cloudflare.com/workers/runtime-apis/websockets/), [React rendering](https://react.dev/learn/render-and-commit). Provider no-training wording does not establish zero retention; voice transmission and applicable retention must remain explicit.
