import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const r = await build({
  entryPoints: ["app/atlas-stories.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const { atlasStories,hasNarration } = await import(
  "data:text/javascript;base64," +
    Buffer.from(r.outputFiles[0].text).toString("base64")
);
const voices = {
  en: "en-GB-SoniaNeural",
  fr: "fr-FR-DeniseNeural",
  ru: "ru-RU-SvetlanaNeural",
  tr: "tr-TR-EmelNeural",
};
const rows = Object.entries(atlasStories).filter(([id])=>hasNarration(id)).flatMap(([id, story]) =>
  Object.entries(voices).flatMap(([locale, voice]) =>
    story.steps.map((step, index) => ({
      file: `${id}-${locale}-${index}.mp3`,
      text: step.caption[locale],
      voice,
      rate: "-5%",
      locale,
    })),
  ),
);
writeFileSync(
  "/tmp/chinese-atlas-build/story-narration.json",
  JSON.stringify(rows),
);
console.log(`Exported ${rows.length} authored story narrations.`);
