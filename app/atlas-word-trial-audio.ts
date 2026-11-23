"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import sources from "../data/atlas-word-trial/audio-sources.json";

export type WordTrialSpokenTerm = { hanzi: string; pinyin: string };

export function wordTrialAudioKey({ hanzi, pinyin }: WordTrialSpokenTerm): string {
  return `${hanzi.normalize("NFC")}\t${pinyin.normalize("NFC").toLowerCase().replace(/[\s.,!?;:'’ʼ\-，。！？；：]/g, "")}`;
}

export function wordTrialRecording(term: WordTrialSpokenTerm): string | undefined {
  return (sources as Record<string, string | undefined>)[wordTrialAudioKey(term)];
}

type Playback = { audio: HTMLAudioElement; key: string; release: () => void };

export function useWordTrialPlayback() {
  const current = useRef<Playback | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);

  const stop = useCallback(() => {
    current.current?.release();
    setActiveKey(null);
    setFailure(null);
  }, []);

  useEffect(() => () => current.current?.release(), []);

  const play = useCallback((term: WordTrialSpokenTerm) => {
    const key = wordTrialAudioKey(term);
    const toggleOff = current.current?.key === key;
    stop();
    if (toggleOff) return;

    const source = wordTrialRecording(term);
    if (!source) {
      setFailure({ key, message: "Brak nagrania wymowy." });
      return;
    }

    const audio = new Audio(source);
    const release = () => {
      current.current = null;
      audio.removeEventListener("ended", ended);
      audio.removeEventListener("error", failed);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
    const ended = () => {
      if (current.current?.audio !== audio) return;
      release();
      setActiveKey(null);
    };
    const failed = () => {
      if (current.current?.audio !== audio) return;
      release();
      setActiveKey(null);
      setFailure({ key, message: "Nie udało się odtworzyć nagrania. Spróbuj ponownie." });
    };

    current.current = { audio, key, release };
    audio.addEventListener("ended", ended, { once: true });
    audio.addEventListener("error", failed, { once: true });
    setActiveKey(key);
    void audio.play().catch(failed);
  }, [stop]);

  return { play, stop, activeKey, error: failure?.message ?? null, errorKey: failure?.key ?? null };
}
