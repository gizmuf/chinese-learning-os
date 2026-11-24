'use client';

import {useEffect, useRef, useState} from 'react';
import {Volume2} from 'lucide-react';
import {playRecording, releaseRecording} from './audio';

export default function PreparedSentenceListen({text, source, label = 'Listen', iconOnly = false}: {
  text: string;
  source?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [error, setError] = useState('');
  const playing = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    if (playing.current) releaseRecording(playing.current);
  }, [source]);

  if (!source) return null;
  return <>
    <button type="button" className={iconOnly ? "secondary prepared-listen-icon" : "text-button"} title={iconOnly ? label + ': ' + text : undefined} aria-label={label + ': ' + text} onClick={() => {
      setError('');
      playing.current = playRecording(source, setError);
    }}><Volume2 size={16} aria-hidden="true"/>{!iconOnly && label}</button>
    {error && <small role="status">{error}</small>}
  </>;
}
