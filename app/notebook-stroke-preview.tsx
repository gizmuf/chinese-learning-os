'use client';

import {useEffect, useRef, useState} from 'react';
import {Play, RotateCcw} from 'lucide-react';
import type HanziWriter from 'hanzi-writer';
import type {CharacterJson} from 'hanzi-writer';
import {useI18n} from './i18n';
import {WritingSvgTarget} from './writing-pointer';
import './notebook-stroke-preview.css';

const SIZE = 38;

async function readCharacter(character: string, signal: AbortSignal) {
  async function read(url: string): Promise<CharacterJson> {
    const response = await fetch(url, {cache: 'force-cache', signal});
    if (!response.ok) throw Error('Missing character data');
    const data = await response.json() as CharacterJson;
    if (!Array.isArray(data.strokes) || !data.strokes.length || data.strokes.length > 100 ||
        !data.strokes.every(path => typeof path === 'string' && path.length > 0) ||
        !Array.isArray(data.medians) || data.strokes.length !== data.medians.length ||
        !data.medians.every(stroke => Array.isArray(stroke) && stroke.length > 0 &&
          stroke.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)))) {
      throw Error('Invalid character data');
    }
    return data;
  }

  try {
    return await read('/characters/' + encodeURIComponent(character) + '.json');
  } catch (error) {
    if (signal.aborted) throw error;
    return await read('/api/character-data?' + new URLSearchParams({character}));
  }
}

export default function NotebookStrokePreview({text, visible}: {text: string; visible: boolean}) {
  const {t} = useI18n();
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'done' | 'error'>('idle');
  const nodes = useRef<(HTMLSpanElement | null)[]>([]);
  const glyphs = Array.from(text);

  useEffect(() => {
    if (!visible) {
      setRun(0);
      setStatus('idle');
      return;
    }
    if (!run) return;
    const controller = new AbortController();
    const {signal} = controller;
    const writers: HanziWriter[] = [];
    const targets: WritingSvgTarget[] = [];
    const hosts = nodes.current.slice();
    const characters = Array.from(text);

    async function play() {
      const [{default: Writer}, data] = await Promise.all([
        import('hanzi-writer'),
        Promise.all([...new Set(characters)].map(async character => (
          [character, await readCharacter(character, signal)] as const
        ))).then(entries => new Map(entries)),
      ]);
      if (signal.aborted) return;
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      for (const [index, character] of characters.entries()) {
        const host = hosts[index];
        if (!host) throw Error('Missing stroke preview');
        writers.push(Writer.create(host, character, {
          rendererOverride: {createRenderTarget: () => {
            const target = WritingSvgTarget.create(host, () => true, SIZE, SIZE);
            targets.push(target);
            return target;
          }},
          width: SIZE,
          height: SIZE,
          padding: 4,
          showCharacter: false,
          showOutline: true,
          strokeColor: '#315f50',
          outlineColor: '#dbe2d7',
          strokeFadeDuration: 0,
          // Reduced motion reveals complete strokes in order without drawing them across the glyph.
          strokeAnimationSpeed: reducedMotion ? Infinity : 1,
          delayBetweenStrokes: reducedMotion ? 240 : 120,
          charDataLoader: glyph => data.get(glyph)!,
        }));
      }

      setStatus('playing');
      for (const writer of writers) {
        if (signal.aborted) return;
        await writer.animateCharacter();
      }
      if (!signal.aborted) setStatus('done');
    }

    setStatus('loading');
    void play().catch(() => {
      if (!signal.aborted) setStatus('error');
    });
    return () => {
      controller.abort();
      for (const writer of writers) void writer.hideCharacter({duration: 0}).catch(() => {});
      for (const target of targets) target.dispose();
      for (const host of hosts) host?.replaceChildren();
    };
  }, [run, text, visible]);

  const replay = status !== 'idle' && status !== 'loading';
  const label = status === 'error' ? t('Retry') : replay ? t('Replay') : t('Stroke order');
  const accessibleLabel = t('Stroke order for {0}', [text]);

  return <div className="sp-notebook-strokes">
    <button type="button" className="sp-notebook-strokes-button"
      aria-label={replay ? label + ' · ' + accessibleLabel : accessibleLabel}
      disabled={status === 'loading'}
      onClick={() => setRun(value => value + 1)}>
      {replay ? <RotateCcw size={14} aria-hidden="true"/> : <Play size={14} aria-hidden="true"/>}
      {label}
    </button>
    <div className="sp-notebook-strokes-preview">
      <div className="sp-notebook-strokes-glyphs" aria-hidden="true" hidden={status !== 'playing' && status !== 'done'}>
        {glyphs.map((character, index) => <span className="sp-notebook-strokes-glyph" key={index} data-character={character}
          ref={node => {nodes.current[index] = node;}}/>)}
      </div>
      <span role="status" className="sp-notebook-strokes-status">
        {status === 'loading' ? t('Loading stroke guide…') : status === 'error' ? t('Stroke guide unavailable.') : ''}
      </span>
    </div>
  </div>;
}
