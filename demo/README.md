# Chinese OS teacher demo

This is an isolated static build of Chinese OS for testing access from mainland China. It uses the same lessons, audio, handwriting and review logic as the existing Sites app. The original Sites version 5 source is commit `85a082bf2b3758c21508961888cb25f05e514205` (confirmed through Sites version provenance and GitHub HEAD on 2026-10-22).

The demo starts directly as a guest. It does not initialize ChatGPT or Firebase, offer login, or sync to an account. Its IndexedDB notebook is named `chinese-os-v1-teacher-demo` and belongs to the demo origin. No production data is copied or migrated. Export history before clearing browser storage if you want to keep it.

## Build and serve

Use Node.js 24 and install the lockfile dependencies:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build:demo
python3 -m http.server 4173 --directory dist-demo
```

Publish only the contents of `dist-demo` on a static host. The output supports an origin root or a subfolder when opened at its directory URL or `index.html`. It contains 1,040 Mandarin audio files, 401 character JSON files, and dependency license notices in `licenses/`. Preserve those notices. No environment variables, API keys, database, server, or external font/CDN connection is needed by the browser.

The default Sites build (`npm run build`) is separate. The demo Vite configuration rejects account dependencies in its module graph and substitutes a sync function that fails locally if mistakenly invoked. Its UI disables sync and removes account actions. Root asset URLs remain the default for the existing Sites build.

## Testing access from mainland China

Open the published URL on a mainland connection without a VPN. Record network provider, city, browser, date/time and results for the initial load, lessons, audio, character outlines, free handwriting and progress after reload. Test the same URL outside mainland China for comparison. This build has not established mainland availability. Vercel and other free hosts may be unreachable there.

This is a connectivity test build; a first visit requires a working network connection. There is no service worker or guaranteed cold-start offline support. Progress stays local, while uncached lessons' recordings and character data still require the host.

## Verification

`npm test` checks the curriculum, learning, token validation and audio mapping. `npm run typecheck` checks the whole repository. The browser check requires Playwright and Chromium (provided by the test environment here):

```sh
DEMO_URL=http://127.0.0.1:4173/ node demo/verify-browser.cjs
```

Set `PLAYWRIGHT_MODULE` to an installed Playwright module path and `CHROMIUM_PATH` to an existing Chromium executable if using system tooling. `DEMO_SCREENSHOT` optionally saves a screenshot. The same browser check can run against the published address. It checks real audio playback, both HSK levels, character SVGs, handwriting storage, progress after reload and notebook stroke controls, and rejects external or API requests.
