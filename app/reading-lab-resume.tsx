'use client';

import {useEffect, useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {readingLabReadings} from './reading-lab-data';
import {readingLabHref} from './reading-lab-route';
import {readReadingLabSession, readingLabSessionKey, type ReadingLabResume} from './reading-lab-session';
import './reading-lab.css';

export default function ReadingLabResume({owner}: {owner: string | null}) {
  const [saved, setSaved] = useState<{owner: string | null; resume?: ReadingLabResume}>();
  useEffect(() => {
    function load() {
      try {setSaved({owner, resume: readReadingLabSession(localStorage, owner).resume});}
      catch {setSaved({owner});}
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === readingLabSessionKey(owner)) load();
    };
    load();
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', load);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', load);
    };
  }, [owner]);
  const resume = saved?.owner === owner ? saved.resume : undefined;
  const reading = resume && readingLabReadings.find(item => item.id === resume.article);
  if (!resume || !reading) return null;
  return <section className="panel rl-today-resume" aria-label="Continue reading">
    <div><h2>Continue reading</h2><strong lang="zh-Hans">{reading.title.hanzi}</strong>
      <span>{reading.title.pinyin} · {reading.title.english}</span></div>
    <a className="secondary" href={readingLabHref(resume)}>Resume reading <ArrowRight size={16}/></a>
  </section>;
}
