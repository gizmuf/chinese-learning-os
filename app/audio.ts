"use client";
import { items } from "./content";
const recordings = new Map<string, string>();
for (const item of items) {
  recordings.set(item.hanzi, `/audio/${encodeURIComponent(item.id)}-word.mp3`);
  recordings.set(
    item.sentence,
    `/audio/${encodeURIComponent(item.id)}-sentence.mp3`,
  );
}
let current: HTMLAudioElement | null = null;
let playbackRate = 1;
export function setSpeechRate(rate: number) {
  playbackRate = rate === 0.8 ? 0.8 : 1;
  if (current) current.playbackRate = playbackRate;
}
export function stopAudio() {
  if (!current) return;
  current.pause();
  current.removeAttribute("src");
  current.load();
  current = null;
}
export function speak(text: string, notify: (message: string) => void) {
  const source = recordings.get(text);
  if (!source) {
    notify("This pronunciation recording is not available yet.");
    return;
  }
  stopAudio();
  const audio = new Audio(source);
  current = audio;
  audio.playbackRate = playbackRate;
  audio.preservesPitch = true;
  audio.onended = () => {
    if (current === audio) current = null;
  };
  audio.onerror = () => {
    if (current === audio)
      notify("Could not load the pronunciation. Reconnect and try again.");
  };
  // Start directly from the user's tap: no async voice lookup or third-party call.
  void audio.play().catch((error: unknown) => {
    if (
      current !== audio ||
      (error instanceof DOMException && error.name === "AbortError")
    )
      return;
    notify("Tap the speaker again to play the pronunciation.");
  });
}
