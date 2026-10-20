# Chinese OS

A calm daily Chinese practice space for beginner classmates. Works in a browser on iPad, iPhone and desktop; no Xcode or native app installation is required. The interface is English. Learning material pairs simplified characters with tone-marked pinyin and translations.

## Daily use

1. Open **Today** and choose a short practice session, or explore **My lessons**.
2. In **Writing studio**, progress through **Watch → Trace → Copy → Recall**. Complete whole words one character at a time.
3. For Recall, write before comparing the answer. Rate your memory: Again, Hard, Good or Easy. This is honest self-assessment, not automatic handwriting recognition.
4. Use **Review** for separate recognition, listening and writing queues. Choose an estimated 5, 10 or 20 minute session; the displayed duration is a workload estimate, not a countdown.
5. **My progress** shows attempts and each skill's next review. Export your history as JSON for a personal backup.

**Pencil only** rejects finger/mouse drawing inside the writing surface. Turn it off for finger practice. The left-handed layout moves the reference away from the writing hand. Undo, Clear, Hint, Replay and Next character remain available in the studio. Completed free-writing strokes and drafts survive page refresh and screen rotation.

## Learning rules

- Vocabulary items are whole words, including words containing more than one character.
- FSRS tracks recognition, listening and writing independently, with a 90% target retention. This target is a scheduling setting, not a measured success rate.
- Watch, Trace, Copy and assisted attempts are practice records; they do not earn successful independent-recall credit.
- Due reviews precede new words. A session has a finite number of words and a completion screen.
- The initial library contains 32 words in four lessons: introductions, everyday language, food, and time/plans. It is starter material, not a claimed full curriculum or a transcription of unprovided class materials.

## Accounts, saving and privacy

A guest notebook belongs to the current browser. Clearing browser data can remove it. Sign in with Google or email/password for an account notebook synchronized through Sites D1. No ChatGPT account is required. Email accounts must verify their address before syncing. The sign-in dialog includes registration, resend verification, and password reset. Guest and signed-in notebooks are separate; signing in does not silently import another notebook.

Each learning event has a unique ID. The server derives the owner from authenticated identity, never from a client-submitted user ID. Repeated uploads are deduplicated per user. Review state is replayed deterministically from event time and ID, preserving both devices' history. There is no teacher dashboard or access to classmates' progress.

An already open page can continue saving attempts while offline and synchronize when the network returns. Status text distinguishes device-only storage, pending synchronization and synced progress. First loading the app while fully offline is not supported in this release.

## Audio and current boundaries

Pronunciation recordings are delivered with the app; see `public/audio/manifest.json` for voice and generation details. No student text or microphone recording is sent to a speech provider during use. Natural and slower playback preserve pitch.

Real Apple Pencil pressure, palm rejection, device speakers and installed browser behavior need acceptance on the actual iPad. Free writing uses self-assessment; it does not claim stroke-shape scoring or OCR. Pronunciation grading, speech recognition, teacher assignments, custom lesson import in the UI, and cold-start offline support remain future work.

## Adding a lesson

Edit `app/content.ts`: add a lesson and vocabulary rows with stable unique IDs, full words, pinyin with tone marks, an English meaning, a Chinese example, example pinyin and its translation. Never repurpose an existing ID: historical reviews depend on it. Generate bundled audio for the new text and run `npm run prebuild` to add character data. Run the documented checks and deploy an updated version of the same Site.

## Account identity and deployment

Firebase Authentication is isolated in `chinese-os-gizmuf-auth` (Chinese OS Auth); it stores credentials, not learning records. Google and Email/Password are enabled. Passwords need at least 8 characters; email enumeration protection is enabled. Google support contact: gizmuf@gmail.com. Only verified Firebase ID tokens issued by this exact project are accepted. The server verifies RS256 signatures, issuer, audience, expiry, subject, and verification status. Learning records remain in the existing Sites D1 database under `firebase:<uid>`.

The existing ChatGPT sign-in remains available for existing notebooks. ChatGPT and Firebase identities are not merged by email. Use the original sign-in method to see an old notebook. Guest work is also separate. The client remounts its notebook on identity changes and binds every sync request to the expected owner; the server rejects an owner mismatch. Clearing local data does not remove synchronized account records.

Production uses a Sites runtime variable `FIREBASE_WEB_CONFIG`, containing the Firebase web client fields apiKey, authDomain, projectId, and appId. These are public client configuration, served by `/api/auth/config`; they grant no admin access. Never store admin credentials in the browser or repository. The Firebase authorized domains include the production Sites hostname and local development loopback. For development use an ignored `.dev.vars` file, not a committed config.
