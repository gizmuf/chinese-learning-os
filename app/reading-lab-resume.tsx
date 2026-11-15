'use client';

import {useEffect, useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {reviewDate, useReadingReviews} from './reading-lab-review';
import {readingReviewSchedule} from './reading-lab-review-model';
import {readingLabReadings} from './reading-lab-data';
import {readingLabHref} from './reading-lab-route';
import {readReadingLabSession, readingLabSessionKey, type ReadingLabResume} from './reading-lab-session';
import './reading-lab.css';

export default function ReadingLabResume({owner}: {owner: string | null}) {
  const {store, now} = useReadingReviews(owner);
  const schedule = readingReviewSchedule(store, now);
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
  const due = schedule.due[0];
  if (!reading && !due && !schedule.nextDue) return null;
  return <>
    {resume && reading && <section className="panel rl-today-resume" aria-label="Continue reading">
      <div><h2>Continue reading</h2><strong lang="zh-Hans">{reading.title.hanzi}</strong>
        <span>{reading.title.pinyin} · {reading.title.english}</span></div>
      <a className="secondary" href={readingLabHref(resume)}>Resume reading <ArrowRight size={16}/></a>
    </section>}
    {(due || schedule.nextDue) && <section className="panel rl-today-resume" aria-label="Reading reviews">
      <div><h2>Reading reviews</h2>{due && <span>{schedule.due.length} due</span>}
        {schedule.nextDue && <span>Next scheduled {reviewDate(schedule.nextDue)}</span>}</div>
      {due && <a className="secondary" href={readingLabHref({level: 2, article: '', paragraph: '', grammar: '', aid: 'hanzi', chunks: false, review: due})}>Start due review <ArrowRight size={16}/></a>}
    </section>}
  </>;
}
