"use client";
import type { Item } from "./content";
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
export function speak(
  text: string,
  notify: (message: string) => void,
  item: Item,
) {
  const prefix = item.id.startsWith("atlas-") ? "/atlas/audio" : item.id.startsWith("course03-") ? "/course03/audio" : "/audio";
  const source = `${prefix}/${encodeURIComponent(item.id)}-${text === item.hanzi ? "word" : "sentence"}.mp3`;
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
