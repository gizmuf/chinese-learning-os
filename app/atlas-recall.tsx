"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./i18n";
import Ink from "./ink";
import AtlasGlyph from "./atlas-glyph";
import type { AtlasCharacter } from "./atlas-data";
import type { Stroke } from "./learning";
import { readDraft, saveDraft } from "./local-store";
import { newAtlasEvent, type AtlasEvent } from "./atlas-learning";
export default function AtlasRecall({
  character,
  db,
  penOnly,
  record,
  notify,
  onBack,
}: {
  character: AtlasCharacter;
  db: IDBDatabase | null;
  penOnly: boolean;
  record: (event: AtlasEvent) => Promise<void>;
  notify: (m: string) => void;
  onBack: () => void;
}) {
  const { t, locale } = useI18n();
  const [ink, setInk] = useState<Stroke[]>([]);
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const id = useRef(crypto.randomUUID());
  const key = "atlas-recall:" + character.id;
  useEffect(() => {
    let active = true;
    if (!db) return;
    readDraft<{ ink: Stroke[]; revealed: boolean; id: string }>(db, key)
      .then((d) => {
        if (!active) return;
        if (d) {
          setInk(d.ink);
          setRevealed(d.revealed);
          id.current = d.id;
        }
        setReady(true);
      })
      .catch(() => {
        if (active)
          notify(
            t("Could not restore this worksheet. You can start a new one."),
          );
      });
    return () => {
      active = false;
    };
  }, [db, key]);
  useEffect(() => {
    if (db && ready && !saved)
      void saveDraft(db, key, { ink, revealed, id: id.current }).catch(() =>
        notify(t("Could not save the worksheet on this device.")),
      );
  }, [db, key, ready, saved, ink, revealed]);
  async function save(rating: 1 | 2 | 3 | 4) {
    if (saving || saved) return;
    setSaving(true);
    try {
      await record({
        ...newAtlasEvent(character.id, "writing", "recall", rating, false),
        id: id.current,
      });
      setSaved(true);
      if (db) await saveDraft(db, key, undefined);
    } catch {
      notify(t("Could not save this review. Please try again."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel atlas-recall">
      <p className="eyebrow">{t("WRITE FROM MEMORY")}</p>
      <h3>{character.meaning[locale]}</h3>
      <p className="pinyin">{character.pinyin}</p>
      <p>
        {t("Write the character before comparing. Rate your memory honestly.")}
      </p>
      <div className="atlas-recall-square">
        <svg
          viewBox="0 0 100 100"
          className="notebook-guidelines"
          aria-hidden="true"
        >
          <path d="M50 0V100 M0 50H100 M0 0L100 100 M100 0L0 100" />
        </svg>
        <Ink
          strokes={ink}
          onChange={setInk}
          penOnly={penOnly}
          disabled={!ready || revealed}
        />
      </div>
      {!revealed ? (
        <div className="atlas-actions">
          <button
            className="secondary"
            disabled={!ready}
            onClick={() => setInk([])}
          >
            {t("Clear")}
          </button>
          <button
            className="primary"
            disabled={!ready || !ink.length}
            onClick={() => setRevealed(true)}
          >
            {t("Compare answer")}
          </button>
        </div>
      ) : (
        <>
          <div className="atlas-recall-model">
            <AtlasGlyph character={character} showParts={false} />
          </div>
          <p>
            {t(
              "Free writing is self-assessed. Rate what you remembered before comparing.",
            )}
          </p>
          {saved ? (
            <p role="status">{t("Practice saved.")}</p>
          ) : (
            <div className="atlas-actions">
              {([1, 2, 3, 4] as const).map((rating, i) => (
                <button
                  className="secondary"
                  key={rating}
                  disabled={saving}
                  onClick={() => void save(rating)}
                >
                  {t(["Again", "Hard", "Good", "Easy"][i])}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <button className="text-button" onClick={onBack}>
        {t("Back to notebook")}
      </button>
    </section>
  );
}
