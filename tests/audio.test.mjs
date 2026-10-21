import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
const output = await build({
  entryPoints: ["app/audio.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const { speak, stopAudio } = await import(
  "data:text/javascript;base64," +
    Buffer.from(output.outputFiles[0].text).toString("base64")
);
test("homographs play their own card recording instead of whichever matching text was last indexed", () => {
  const played = [];
  const original = globalThis.Audio;
  globalThis.Audio = class {
    constructor(src) {
      played.push(src);
    }
    play() {
      return Promise.resolve();
    }
    pause() {}
    removeAttribute() {}
    load() {}
  };
  const verb = { id: "hsk2-347", hanzi: "过", sentence: "我们过这条路吧。" };
  const particle = { id: "hsk2-351", hanzi: "过", sentence: "我去过中国。" };
  try {
    speak(verb.hanzi, () => assert.fail("Unexpected audio error"), verb);
    speak(
      particle.hanzi,
      () => assert.fail("Unexpected audio error"),
      particle,
    );
    speak(
      particle.sentence,
      () => assert.fail("Unexpected audio error"),
      particle,
    );
    assert.deepEqual(played, [
      "/audio/hsk2-347-word.mp3",
      "/audio/hsk2-351-word.mp3",
      "/audio/hsk2-351-sentence.mp3",
    ]);
  } finally {
    stopAudio();
    globalThis.Audio = original;
  }
});
