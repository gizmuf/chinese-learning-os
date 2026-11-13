import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createElement } from "react";
import { act, create } from "react-test-renderer";

const require = createRequire(import.meta.url);
const bundle = await build({
  stdin: {
    contents: `export {default as Explorer} from './app/atlas-story-explorer';
      export {atlasExplorerStories, isStoryTarget} from './app/atlas-story-explorer-model';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "esm",
  jsx: "automatic",
  loader: { ".css": "empty" },
  platform: "node",
  write: false,
  plugins: [{
    name: "shared-react",
    setup(builder) {
      builder.onResolve({ filter: /^(?:react(?:\/jsx-runtime)?|lucide-react)$/ }, ({ path }) => ({
        path: require.resolve(path), external: true,
      }));
    },
  }],
});
const directory = mkdtempSync(join(tmpdir(), "atlas-story-explorer-"));
const bundlePath = join(directory, "bundle.mjs");
const { Explorer, atlasExplorerStories, isStoryTarget } = await (async () => {
  try {
    writeFileSync(bundlePath, bundle.outputFiles[0].text);
    return await import(pathToFileURL(bundlePath));
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
})();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function childrenText(node) {
  return typeof node === "string" ? node : node.children.map(childrenText).join("");
}

function button(renderer, label) {
  const match = renderer.root.findAllByType("button").find((node) => childrenText(node).includes(label));
  assert.ok(match, `Button '${label}' is present`);
  return match;
}

test("the story entry points use canonical Chinese, readings, examples and local recordings", () => {
  assert.deepEqual(Object.keys(atlasExplorerStories), ["幕", "明天", "姓"]);
  for (const target of ["幕", "明天", "姓"]) assert.ok(isStoryTarget(target));
  for (const target of ["夜幕", "明", "姓名", "constructor", "__proto__"]) assert.ok(!isStoryTarget(target));
  const { 幕: curtain, 明天: tomorrow, 姓: surname } = atlasExplorerStories;
  assert.deepEqual([curtain.target.pinyin, tomorrow.target.pinyin, surname.target.pinyin], ["mù", "míngtiān", "xìng"]);
  assert.deepEqual([curtain.example.text, tomorrow.example.text, surname.example.text], ["夜幕降临了。", "明天见。", "你姓什么？"]);
  assert.equal(tomorrow.example.pinyin, "Míngtiān jiàn.");
  assert.equal(tomorrow.example.english, "See you tomorrow.");
  assert.equal(surname.example.pinyin, "Nǐ xìng shénme?");
  assert.deepEqual([surname.related.text, surname.related.pinyin, surname.related.english], ["姓名", "xìngmíng", "full name"]);
  for (const story of Object.values(atlasExplorerStories)) {
    for (const audio of [story.target.audio, story.example.audio, story.related?.audio, story.scene.narration]) {
      if (audio) assert.ok(existsSync(`public${audio}`), audio);
    }
  }
});

test("structure cards preserve character positions and read 明天 as a whole word", () => {
  const structures = Object.fromEntries(Object.entries(atlasExplorerStories).map(([target, { structure }]) => [
    target, [structure.layout, structure.parts.map(({ text, pinyin, position, kind }) => [text, pinyin, position, kind])],
  ]));
  assert.deepEqual(structures, {
    幕: ["stacked", [["莫", "mò", "Top", "component"], ["巾", "jīn", "Bottom", "component"]]],
    明天: ["word", [["明", "míng", "First", "character"], ["天", "tiān", "Second", "character"]]],
    姓: ["paired", [["女", "nǚ", "Left", "component"], ["生", "shēng", "Right", "component"]]],
  });
  assert.equal(atlasExplorerStories.明天.target.kind, "word");
});

test("scene actions are reversible and step and explore events go to the parent", async () => {
  const events = [];
  const props = {
    target: "幕", step: 0,
    onStepChange: (step) => events.push(["step", step]),
    onExplore: (text, kind) => events.push(["explore", text, kind]),
    onBack: () => events.push(["back"]),
  };
  let renderer;
  await act(() => { renderer = create(createElement(Explorer, props)); });
  assert.equal(childrenText(renderer.root.findByType("h2")), "幕");
  assert.equal(childrenText(renderer.root.findByProps({ "aria-live": "polite" })), "Curtain open");
  await act(() => button(renderer, "Close the curtain").props.onClick());
  assert.equal(childrenText(renderer.root.findByProps({ "aria-live": "polite" })), "Curtain closed");
  await act(() => button(renderer, "Open the curtain").props.onClick());
  assert.equal(childrenText(renderer.root.findByProps({ "aria-live": "polite" })), "Curtain open");
  await act(() => button(renderer, "Structure").props.onClick());
  assert.equal(button(renderer, "Scene").props["aria-pressed"], true);
  await act(() => renderer.update(createElement(Explorer, { ...props, step: 1 })));
  assert.equal(button(renderer, "Structure").props["aria-pressed"], true);
  await act(() => button(renderer, "莫").props.onClick());
  await act(() => renderer.update(createElement(Explorer, { ...props, step: 2, target: "姓" })));
  assert.equal(childrenText(renderer.root.findByType("h2")), "姓");
  await act(() => button(renderer, "你姓什么？").props.onClick());
  await act(() => button(renderer, "姓名").props.onClick());
  await act(() => button(renderer, "Back to Atlas").props.onClick());
  assert.deepEqual(events, [["step", 1], ["explore", "莫", "component"], ["explore", "你姓什么？", "sentence"], ["explore", "姓名", "word"], ["back"]]);
  await act(() => renderer.unmount());
});
