'use client';

import {useEffect, useState} from 'react';
import {Bookmark} from 'lucide-react';

export const readingReviewTokenEvent = 'chinese-os:reading-review-token';
export type ReadingReviewTokenResult = {
  pinyin: string;
  dueAt?: number;
  error?: boolean;
};
export type ReadingReviewTokenRequest = {save: boolean; reply: (result: ReadingReviewTokenResult) => void};

export function ReadingReviewTokenAction({opener, text}: {opener: HTMLElement; text: string}) {
  const [state, setState] = useState<{opener: HTMLElement; text: string; result: ReadingReviewTokenResult}>();
  function request(save: boolean) {
    opener.dispatchEvent(new CustomEvent<ReadingReviewTokenRequest>(readingReviewTokenEvent,
      {bubbles: true, detail: {save, reply: result => setState({opener, text, result})}}));
  }
  useEffect(() => {request(false);}, [opener, text]);
  const result = state?.opener === opener && state.text === text ? state.result : undefined;
  if (!result) return null;
  const saved = result.dueAt !== undefined;
  const date = result.dueAt !== undefined ? new Date(result.dueAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '';
  return <div className="sp-reading-review-action">
    <button type="button" className="text-button" aria-disabled={saved || undefined} onClick={() => {if (!saved) request(true);}}>
      <Bookmark size={16}/> {saved ? 'Saved for later' : 'Save for later'}
    </button>
    {result.dueAt !== undefined && <span role="status">{result.dueAt <= Date.now() ? 'Due now' : `Next review ${date}`}</span>}
    <small>In this sentence · {result.pinyin}</small>
    {result.error && <p role="alert">Could not save in this browser. Try again.</p>}
  </div>;
}
