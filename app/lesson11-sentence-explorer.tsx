'use client';

import {useLayoutEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {stopAudio} from './audio';
import {C} from './lesson11-data';
import {lesson11TransportSentence, sentenceExplorerLabel, transportChoices, type TransportChoice} from './lesson11-sentence-explorer-data';
import {useI18n} from './i18n';
import {DictionaryAudio} from './study-dictionary';
import {useRecordingPlayback} from './use-recording-playback';
import './lesson11-sentence-explorer.css';

const labels = {
  back:C('Back to the lesson','Retour à la leçon','Вернуться к уроку','Derse dön'),
  parts:C('How the sentence works','Comment la phrase fonctionne','Как устроено предложение','Cümlenin yapısı'),
  change:C('Change one part','Changer un élément','Изменить одну часть','Bir kısmı değiştir'),
  audioError:C('Could not play the pronunciation.','Impossible de lire la prononciation.','Не удалось воспроизвести произношение.','Telaffuz oynatılamadı.'),
  retry:C('Retry pronunciation','Réessayer la lecture','Повторить воспроизведение','Telaffuzu yeniden oynat'),
  vehicle:C('Choose a vehicle','Choisir un véhicule','Выберите транспорт','Taşıt seçin'),
  choices:{
    metro:C('metro','métro','метро','metro'),
    taxi:C('taxi','taxi','такси','taksi'),
  },
};

export default function Lesson11SentenceExplorer({onBack}:{onBack:()=>void}) {
  const {locale} = useI18n();
  const [choice, setChoice] = useState<TransportChoice>('metro');
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const audioControls = useRef<HTMLDivElement>(null);
  const [audioError, setAudioError] = useState(false);
  const player = useRecordingPlayback(() => setAudioError(true));
  const {sentence, recording, parts} = lesson11TransportSentence(choice);
  const currentVehicle = parts.find(part => part.id === 'vehicle')!;
  const vehicleOffset = sentence.hanzi.indexOf(currentVehicle.hanzi);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    title.current?.focus({preventScroll:true});
    return () => {
      stopAudio();
      if (element.open) element.close();
    };
  }, []);

  function selectVehicle(next: TransportChoice) {
    if (next === choice) return;
    stopAudio();
    setAudioError(false);
    setChoice(next);
  }

  function playPronunciation() {
    setAudioError(false);
    player.play(recording.source);
  }

  return (
    <dialog className="sentence-explorer" ref={dialog} aria-labelledby="sentence-explorer-title"
      onCancel={event => {event.preventDefault(); onBack();}}>
      <header className="se-header">
        <h2 id="sentence-explorer-title" tabIndex={-1} ref={title}>{sentenceExplorerLabel[locale]}</h2>
        <button type="button" className="secondary" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true"/>{labels.back[locale]}
        </button>
      </header>

      <div className="se-sentence" aria-live="polite" aria-atomic="true">
        <p className="se-hanzi" lang="zh-Hans">
          {sentence.hanzi.slice(0,vehicleOffset)}<mark>{currentVehicle.hanzi}</mark>
          {sentence.hanzi.slice(vehicleOffset+currentVehicle.hanzi.length)}
        </p>
        <p className="se-pinyin">{sentence.pinyin}</p>
        <p>{sentence.meaning[locale]}</p>
      </div>
      <div className="se-audio" ref={audioControls}>
        <DictionaryAudio recording={recording} playing={player.playing} onPlay={playPronunciation}/>
        <div role="status">{audioError && <p>{labels.audioError[locale]}</p>}</div>
        {audioError && <button type="button" className="secondary" onClick={() => {
          audioControls.current?.querySelector('button')?.focus({preventScroll:true});
          playPronunciation();
        }}>{labels.retry[locale]}</button>}
      </div>

      <h3>{labels.parts[locale]}</h3>
      <dl className="se-parts">
        {parts.map(part => (
          <div className="se-part" key={part.id} data-swappable={part.id === 'vehicle' || undefined}>
            <dt><strong lang="zh-Hans">{part.hanzi}</strong><span className="se-pinyin">{part.pinyin}</span></dt>
            <dd><strong>{part.label[locale]}</strong><p>{part.explanation[locale]}</p></dd>
          </div>
        ))}
      </dl>

      <fieldset className="se-choices">
        <legend>{labels.change[locale]}</legend>
        <div role="group" aria-label={labels.vehicle[locale]}>
          {(['metro','taxi'] as const).map(option => (
            <button className="secondary" key={option} type="button" aria-pressed={choice === option}
              onClick={() => selectVehicle(option)}>
              <strong lang="zh-Hans">{transportChoices[option].hanzi}</strong>
              <span>{labels.choices[option][locale]}</span>
              {choice !== option && <ArrowRight size={16} aria-hidden="true"/>}
            </button>
          ))}
        </div>
      </fieldset>
    </dialog>
  );
}
