'use client';

import {useEffect, useState} from 'react';

type WordAids = {pinyin: boolean; english: boolean};

export function useWordAids<Id extends number | string>(storageKey: string) {
  const [aids, setAids] = useState<WordAids>({pinyin: true, english: true});
  const [overrides, setOverrides] = useState<Map<Id, boolean>>(() => new Map());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (typeof saved?.pinyin === 'boolean' && typeof saved?.english === 'boolean') setAids(saved);
    } catch { /* The switches work in this session when browser storage is unavailable. */ }
  }, [storageKey]);

  function toggleAid(key: keyof WordAids) {
    const next = {...aids, [key]: !aids[key]};
    setAids(next);
    setOverrides(new Map());
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Storage is optional. */ }
  }

  function rowAids(id: Id) {
    const override = overrides.get(id);
    return {pinyin: override ?? aids.pinyin, english: override ?? aids.english};
  }

  function toggleRow(id: Id) {
    setOverrides(current => {
      const override = current.get(id);
      const showBoth = !(override ?? (aids.pinyin && aids.english));
      const next = new Map(current);
      if (showBoth === aids.pinyin && showBoth === aids.english) next.delete(id);
      else next.set(id, showBoth);
      return next;
    });
  }

  return {aids, toggleAid, rowAids, toggleRow};
}
