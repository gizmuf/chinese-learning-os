import type { WordBuild } from "./atlas-workshop-data";
export type WorkshopRecordingKind = "word" | "sentence";
// Stable Unicode-based IDs do not depend on gallery order, language or filters.
export function workshopAudioId(hanzi: string) {
  return "atlas-workshop-" + Array.from(hanzi).map(c => "u" + c.codePointAt(0)!.toString(16)).join("-");
}
export function workshopRecording(word: Pick<WordBuild, "hanzi" | "example">, kind: WorkshopRecordingKind) {
  if (kind === "sentence" && !word.example) return undefined;
  return "/atlas/workshop-audio/" + workshopAudioId(word.hanzi) + "-" + kind + ".mp3";
}
export function workshopAudioEntries(words: readonly WordBuild[]) {
  return words.flatMap(word => (["word", "sentence"] as const).flatMap(kind => {
    const source = workshopRecording(word, kind);
    return source ? [{ itemId: workshopAudioId(word.hanzi), kind, text: kind === "word" ? word.hanzi : word.example!.hanzi, file: source.split("/").at(-1)! }] : [];
  }));
}
