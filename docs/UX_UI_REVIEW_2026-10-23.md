# Chinese OS: UX/UI review and proposed direction

23 October 2026. Reviewed against the public v18 application and the integrated Learning Lab local preview. This document proposes changes; it does not claim that the proposed navigation has shipped.

## Direction and ownership

Keep one Chinese OS and every existing learning path while the owner compares approaches. The lead architect owns UX/UI, creative frontend, animation and learning experience. The existing executor owns bounded technical implementation, integration, data reliability and validation. Lessons follow classroom material; Atlas remains an independent discovery tool.

The current visual identity is worth keeping: restrained green and warm neutral surfaces, generous character forms, component colour cues, original scenes, and a calm pace. Organize these strengths around the learner's next action.

## Observed issues and proposed changes

| Priority | Observed evidence | Proposed change |
| --- | --- | --- |
| First | Mobile navigation contains seven destinations. My lessons and Course sound similar, while the first is the HSK vocabulary library and the second is the classroom course. | Five primary destinations: Today, Learn, Discover, Practice, Progress. Learn contains classroom lessons and HSK vocabulary with explicit descriptions. Keep existing links and paths. |
| First | Lesson 3 has six tabs, including Practice lab and Practice; Practice lab adds three further tabs. Atlas has its own tabs, workshop tabs, family choices and character choices. Lab embeds that workshop again. | Separate choosing material from doing an activity. Show one exercise with a compact step indicator during a session. Keep optional exploration in a contextual panel and retain a clear return path. |
| First | At the observed narrow viewport, the lesson header and navigation consume almost the entire first screen. At 1280×720, Lab writing starts below the fold after the Atlas header and Lab navigation. | Add a focused session layout with a small course/source label, current task and pause action. Keep prompt, input and primary action together. On iPad prioritize usable handwriting space and controls outside the drawing area. |
| First | Refreshing public My progress at `/` returns to Today. Library, writing and review navigation also uses `/`; Course and Atlas have query routes. | Give all primary screens and selected lesson/activity stable routes, with correct browser Back and reload behaviour. Preserve draft answers independently of route state. |
| First | Today, Course, Atlas and Lab display separate progress/review summaries. The global My progress view presents the HSK notebook; its title does not explain that scope. | Show one overview grouped by source and skill, linking to each existing queue. Do not merge identities or schedules. Mark assisted practice, independent attempts and delayed recall distinctly. |
| First | Lab is local-device-only, but its explicit storage explanation is at the bottom; the surrounding app exposes an account/sync status. | Put a compact local-storage label beside the Lab title and provide export nearby. Account sync elsewhere must not imply Lab sync. |
| Next | My lessons initially lists all 300 HSK1 words. Writing opens a native selector with the same large vocabulary. | Begin with topic collections, recent words and a search field. Keep the full searchable library accessible; reduce the initial choice burden. |
| Next | The Course heading advertises 60 lessons, while the expanded summary correctly says one is ready. | Lead with the available classroom lesson and show the 60-lesson structure as the planned course outline. |
| Next | The English Writing studio exposes “Notebook · Zeszyt”. Some supporting copy is visually very small and pale in the narrow layout. | Complete EN/FR/RU copy consistency; verify contrast and text sizes with measurements before claiming accessibility conformance. |
| Next | “Connections first” and “Recall first” explain their order, but a beginner still has to choose a method and one of many targets. | Offer one suggested starting target with a clear “Choose another” control. Explain the two routes through intent: learn a new connection or try what you remember. Retain both original method labels in details. |

## Proposed information architecture

- **Today**: one primary action, resume unfinished work, due work by source, and an optional route suggestion. No fabricated learning score or streak pressure.
- **Learn**: Classroom course and HSK vocabulary. Distinguish authored available lessons from the planned outline.
- **Discover**: Atlas, component families, original story trails, and Learning Lab. Keep Atlas independent of classroom chronology.
- **Practice**: Listening, handwriting and recall. Select material/source explicitly. Existing source-specific schedulers stay intact.
- **Progress**: a readable summary per skill and source, exports, and account/device storage status.

This is an organization of access, not deletion or migration of learning paths. Existing deep links must keep working.

## Animation and visual behaviour

Use animation to explain a relationship: preserve a component's position and colour as a character changes, then connect the character to a whole word and sentence. Keep origin evidence, modern function and invented mnemonic visually distinguishable. Provide replay and reduced-motion alternatives. Avoid decorative continuous movement while listening, choosing an answer or writing.

Maintain a common exercise structure: clear prompt → attempt → feedback → explicit save/continue. Writing should compare the learner's work with the model without implying machine grading. Listening must not leak the written answer through visible or accessible labels.

## Comparing learning paths honestly

Preserve guided and independent outcomes separately. In the current Lab, revealing one answer makes later tasks in that session supported; that is a useful safeguard, but must be explained in the interface. Session correctness or “felt helpful” feedback alone cannot choose a winning method. Compare delayed recall on comparable material after the same interval, including task duration and whether a hint was used. Report descriptive personal results without claiming a controlled efficacy experiment.

## Delivery sequence

1. Finish and publish the additive Lab with current v18 content, technical fixes and interaction checks.
2. Prototype the five-destination navigation and focused exercise layout; keep all paths reachable and do not migrate study data.
3. Validate on an actual iPad with Apple Pencil plus phone layouts, EN/FR/RU and reduced motion. Test choosing a path, resuming it and finding due work.
4. Implement the accepted organization in a separate release, with stable routes and regression checks.

## Verification limits

The review used the actual public app and local integrated preview through browser interactions and screenshots. It covered Today, the HSK library, Course and lesson 3, Practice lab, Atlas/story/listening views, Writing studio, Review, Progress, and the new Lab. It is not a full accessibility audit, authenticated multi-device test, physical Apple Pencil acceptance or measured learning-effectiveness study. Technical Lab QA and the exact release are recorded separately in its handoff.
