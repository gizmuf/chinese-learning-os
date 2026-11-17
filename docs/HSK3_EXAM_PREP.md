# HSK 3.0 exam prep

This course uses the official HSK 3.0 sample bundle alongside the syllabus. The old 80-question HSK 3 paper, also available from CTI, is a different format. Confirm speaking enrollment and the paper/computer format with the test centre.

- [Official syllabus, samples and practice platform](https://www.chinesetest.cn/hsk)
- [HSK 3.0 launch notice for December 13, 2026](https://old.chinesetest.cn/gonewcontent.do?flag=kdnew&id=51336883)

| Section | Official sample | Core exercise formats |
| --- | --- | --- |
| Listening | 30 items, about 23 min | Match a conversation to an image. Select an answer after a conversation or short monologue. |
| Reading | 30 items, 30 min | Match replies, choose a word for a gap, answer questions on short texts. |
| Writing | 10 items, 20 min | Write the missing character from a pinyin cue. Write an original sentence using the given word. |
| Speaking sample | 15 items, about 15 min including preparation | Repeat what you hear, speak from a picture, answer open prompts. |

The main paper is about 83 minutes in the official sample, including the candidate information and answer-transfer windows.

## Course coverage

Course opens HSK 3 Exam Prep at `/?course=hsk3`. The landing page connects to the existing cumulative 1,000 word entries and their audio, the 655-character recognition and 250-character writing checklists, Grammar, the HSK 1–3 Atlas and Reading Lab. The optional reading aids display Hanzi, tone marks or pinyin in the review step, using authored contextual readings. There are no reading hints before answering.

The short diagnostic has eight original tasks, including a two-voice recorded dialogue, reply matching, a word gap, two short passages, a character gap, sentence writing and speaking. Use the previous/next buttons, question picker, horizontal swipe or keyboard arrows to move between tasks. Short diagnostic answers are preserved when moving within the session.

Grammar links all 57 syllabus groups to study cards. Forty-six additions expand previously partial or unmapped groups with explanations, contextual Hanzi and Pinyin, and choice exercises. Supplementary explanations and glosses currently use English. Existing exercise IDs and saved answers remain valid.

## Full timed mock

Open `/?course=hsk3&mock=1`. The main mock has 70 original questions and 73 timed minutes: listening (23), reading (30), writing (20). The two administrative periods in the paper sample are omitted in digital practice. The optional speaking prompt is in the short diagnostic.

Listening uses 30 prerecorded tracks with distinct Xiaoxiao/Yunxi roles and Yunjian for spoken questions. It includes picture matching, dialogue comprehension and short monologues. Start a track from its question; the web mock lets you replay and choose questions in the active section. Reading uses reply matching, cloze and passage comprehension.

The section locks when submitted or when its timer expires. Attempts resume on the same browser, with deadlines continuing in the background. Writing accepts a Chinese keyboard or the existing Pencil canvas. The result checks multiple choice and typed characters, shows transcripts and solutions, and opens written responses alongside examples for self-review. It reports practice counts rather than a scaled official score.

Authoring data lives in `resources/hsk3-mock`. Run `python3 scripts/build-hsk3-mock-data.py` after editing the task or grammar banks. The MP3 files are served from `public/audio/hsk3-mock`. If a listening script changes, regenerate that track using `scripts/build-hsk3-mock-audio.py` with Edge TTS and ffmpeg available.

## Suggested run-up

Use the short diagnostic on day one. Use 75-minute sessions in the next two weeks: 20 minutes for spaced recall, 20 for grammar in use, 20 for listening and reading, and 15 for handwriting and speaking. Practise one contrast family at a time and distinguish similar meanings, look-alike shapes and polyphonic readings. Do two timed official sample runs during the final stretch, then work from errors. On the last day, review previously missed material.

- [Distributed practice, Cepeda et al.](https://laplab.ucsd.edu/articles/Cepeda%20et%20al%202008_psychsci.pdf)
- [Mandarin tone perception training, Wang et al.](https://kuppl.ku.edu/sites/kuppl/files/documents/publications/Wang_Spence_Jongman_Sereno_training_JASA_1999.pdf)
- [Alibaba Model Studio synthesis controls](https://www.alibabacloud.com/help/en/model-studio/tts-model/)
