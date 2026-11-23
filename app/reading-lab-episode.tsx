'use client';

import {useState} from 'react';
import {StudyText} from './study-lookup-context';
import type {ReadingLabEpisode} from './reading-lab-types';

function chapterTime(seconds: number) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

export default function ReadingLabEpisodePanel({episode}: {episode: ReadingLabEpisode}) {
  const [start, setStart] = useState<number | null>(null);
  const watchUrl = 'https://www.youtube.com/watch?v=' + episode.youtubeId + (start ? '&t=' + start + 's' : '');

  return <div className="rl-episode">
    <details>
      <summary>Listen to the original episode</summary>
      <p>Read the companion below. Open the publisher’s transcript to follow the original conversation.</p>
      <div className="rl-episode-links">
        <a href={watchUrl} target="_blank" rel="noreferrer">Open on YouTube</a>
        <a href={episode.transcriptUrl} target="_blank" rel="noreferrer">Full transcript on the podcast site</a>
      </div>
      <div className="rl-episode-chapters" role="group" aria-label="Episode chapters">
        {episode.chapters.map(chapter => <button key={chapter.seconds} type="button"
          aria-pressed={start === chapter.seconds} onClick={() => setStart(chapter.seconds)}>
          <span>{chapterTime(chapter.seconds)}</span> {chapter.label}
        </button>)}
      </div>
      {start !== null && <iframe title={episode.title}
        src={'https://www.youtube-nocookie.com/embed/' + episode.youtubeId + '?autoplay=1&start=' + start}
        referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen/>}
    </details>
    <details>
      <summary>Key words in this reading</summary>
      <dl className="rl-episode-vocabulary">
        {episode.vocabulary.map(word => <div key={word.hanzi}>
          <dt lang="zh-Hans"><StudyText text={word.hanzi} pinyin={word.pinyin} whole/></dt>
          <dd className="rl-episode-pinyin">{word.pinyin}</dd>
          <dd>{word.english}</dd>
        </div>)}
      </dl>
    </details>
  </div>;
}
