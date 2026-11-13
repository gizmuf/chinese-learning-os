# Chinese OS contextual tutor: next step

Proposal for review, 4 November 2026. The current StudyStudio has a typed component controller and five fixture commands; it does not call an AI model. The earlier plan is [ASSISTANT_ARCHITECTURE.md](ASSISTANT_ARCHITECTURE.md).

## Learner experience

A small companion button opens an Assistant tab in the current side panel. It preserves the lesson, dictionary navigation and notebook. The panel shows a short, visible context label: selected 都, source sentence 基本上，我每天都学习。, lesson and current exercise. Selecting another word changes the next question's context without replacing an answer already being read.

The learner can type, dictate into the input, or use push-to-talk. First ship editable transcription followed by a text response; spoken replies are optional. This keeps voice input and speech generation costs independently controllable. The mockup under output/tutor-proposal-20261104 is an interaction example with authored responses, not a live model or recording feature.

## Context and composition

Each turn receives a versioned pedagogical context: selected text, source sentence with authored Pinyin/translation, visible dictionary entry, canonical content IDs, route/return target, and exercise assistance/reveal state. A diagram supplies its semantic building/position data. An optional selected-region image can cover genuinely visual questions. Normal grammar questions need structured text, rather than continuous screenshots.

Extend the existing StudyStudio controller with registered operations to search the full dictionary, retrieve source examples, inspect a character family, compare sounds/readings, open a notebook and compose these existing panels. A request such as “show dōu, duō and dào” retrieves actual entries, then renders their existing cards, examples and pronunciation actions. Relations are labelled sound/shape/meaning. The model returns a validated component plan with existing IDs, never executable React/HTML or arbitrary SQL. Unsupported IDs or stale context revisions cannot replace the current screen.

Adding selected vocabulary uses the existing Practice Book transaction and an explicit add intent. Model explanations and guided hints must mark the active attempt as assisted. Models never award SRS grades. Preserve unsaved ink when opening or changing panels. Keep API credentials and account identifiers out of model context.

## API and subscription options

Current OpenAI documentation describes API-credit benefits for eligible Pro and Business subscriptions, activated by linking an owned API organization. This is not a universal entitlement for every ChatGPT plan. Usage is billed to the organization whose API credential performs the call. A Chinese OS account or PulsAI/Candao subscription does not by itself delegate another person's API credits. With no remaining credits, the documented API failure is credit_balance_exhausted; purchased credits can otherwise continue paying for requests. [OpenAI credits guide](https://developers.openai.com/api/docs/guides/chatgpt-api-credits).

For standalone Chinese OS, use a server-side provider gateway with an explicit per-user budget. A shared PulsAI/Candao plan could fund this gateway after account/entitlement integration. A personal-API option needs separately scoped credentials stored server-side. Another product route is a Chinese OS app/plugin inside ChatGPT: its component can update model-visible context and request a follow-up turn through the host bridge. That requires a ChatGPT integration; merely opening this website does not create it. [OpenAI UI bridge](https://developers.openai.com/plugins/build/chatgpt-ui).

Illustrative text-only cost for 1,000 turns, each 2,000 input and 500 output tokens, using published standard uncached rates checked on 4 November 2026:

| Candidate | Input / 1M | Output / 1M | Calculated total |
|---|---:|---:|---:|
| GPT-6 Luna | $0.10 | $0.50 | $0.45 |
| DeepSeek Flash, peak | $0.30 | $1.20 | $1.20 |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 | $1.25 |

These are calculations, not measured tutor workloads or quality results. Longer histories, reasoning, repeated tool turns, voice and infrastructure add cost. Compare a small set of real Chinese-learning questions before choosing a provider. Qwen is also a candidate; its rates depend on deployment scope and model. No paid calls or provider activation were performed for this proposal.

Sources: [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Qwen pricing](https://www.alibabacloud.com/help/en/model-studio/qwen-flash).

Existing open-source implementations to inspect are [CopilotKit / AG-UI](https://github.com/CopilotKit/CopilotKit), which connects agents, application state and registered UI actions, and [Tambo](https://github.com/tambo-ai/tambo), a React generative-UI toolkit. Chinese OS already has its own learning components and a controller, so the immediate integration can remain small and preserve the current screens.

## Suggested first delivery

One Assistant tab, the context envelope, text questions plus editable voice transcription, full-dictionary/example retrieval, existing compare/family/notebook components and a hard application budget. Evaluate explanations of 都/多, 得/de/děi, tones and family relationships. Keep generated lessons as previews until the learner explicitly saves them. A later stage can extend conversation memory and spoken replies without replacing the teaching interface.
