import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const output = await build({
  entryPoints: ["app/course-data.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const { terms, sentences, termBase, termItem, sentenceItem, topicInfo } =
  await import(
    "data:text/javascript;base64," +
      Buffer.from(output.outputFiles[0].text).toString("base64")
  );
const audioItems = [
  ...terms.filter((t) => !termBase(t)).map((t) => termItem(t, "en")),
  ...sentences.map((s) => sentenceItem(s, "en")),
];
const manifest = JSON.parse(
  readFileSync("public/course03/audio/manifest.json", "utf8"),
);
for (const item of audioItems)
  for (const [field, kind] of [
    ["hanzi", "word"],
    ["sentence", "sentence"],
  ]) {
    const file = `${item.id}-${kind}.mp3`;
    const r = manifest.recordings.find(
      (r) =>
        r.file === file &&
        r.itemId === item.id &&
        r.kind === kind &&
        r.text === item[field],
    );
    const bytes = readFileSync("public/course03/audio/" + file);
    if (
      !r ||
      bytes.length < 1000 ||
      createHash("sha256").update(bytes).digest("hex") !== r.sha256
    )
      throw Error("Missing or outdated course recording: " + file);
  }
for (const item of [...terms, ...sentences])
  for (const char of item.hanzi.match(/[\u3400-\u9fff]/gu) ?? []) {
    const data = JSON.parse(
      readFileSync(`public/characters/${char}.json`, "utf8"),
    );
    if (!data.strokes?.length || data.strokes.length !== data.medians?.length)
      throw Error("Invalid character " + char);
  }
for (const { photo } of Object.values(topicInfo))
  if (!existsSync(`public/course03/boards/${photo}.jpg`))
    throw Error("Missing board photo");
for (const locale of ["en", "fr", "ru"])
  for (const kind of ["workbook", "guide", "reference"])
    if (
      readFileSync(`public/course03/materials/${kind}-${locale}.pdf`)
        .subarray(0, 4)
        .toString() !== "%PDF"
    )
      throw Error("Invalid course document");
console.log(
  `Verified lesson 03: ${terms.length} expressions, ${sentences.length} sentences, ${audioItems.length * 2} recordings, writing data, six boards and nine PDFs.`,
);
