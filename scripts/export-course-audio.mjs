import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const result = await build({
  entryPoints: ["app/course-data.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { terms, sentences, termItem, termBase, sentenceItem } = await import(
  "data:text/javascript;base64," +
    Buffer.from(result.outputFiles[0].text).toString("base64")
);
const audioItems = [
  ...terms.filter((t) => !termBase(t)).map((t) => termItem(t, "en")),
  ...sentences.map((s) => sentenceItem(s, "en")),
];
writeFileSync(
  "/tmp/chinese-os-course03-audio.json",
  JSON.stringify(audioItems),
);
console.log(audioItems.length, "course audio items exported.");
