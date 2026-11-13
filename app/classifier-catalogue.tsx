'use client';

import {useEffect, useRef, useState} from 'react';
import {BookOpen, Volume2} from 'lucide-react';
import {C} from './lesson06-data';
import {playRecording, releaseRecording} from './audio';
import {classifierGroups} from './classifier-catalogue-data';
import {useI18n} from './i18n';
import {StudyText} from './study-lookup-context';
import './classifier-catalogue.css';

export const classifierCatalogueTitle = C('Measure words','Classificateurs','Счётные слова','Sınıflandırıcılar');
const copy = {
  intro:C('Choose what you’re counting. Listen to the whole example, or select a Chinese word for its definition.','Choisissez ce que vous comptez. Écoutez l’exemple ou sélectionnez un mot chinois pour sa définition.','Выберите, что считаете. Прослушайте пример или нажмите на китайское слово, чтобы узнать его значение.','Neyi saydığınızı seçin. Örneği dinleyin veya anlamına bakmak için Çince bir sözcüğe dokunun.'),
  filters:C('What are you counting?','Que comptez-vous ?','Что вы считаете?','Neyi sayıyorsunuz?'),
  all:C('All','Tout','Все','Tümü'),
  listen:C('Listen','Écouter','Слушать','Dinle'),
  lesson:C('Lesson','Leçon','Урок','Ders'),
};

export default function ClassifierCatalogue({notify}:{notify:(message:string)=>void}) {
  const {locale} = useI18n();
  const [category, setCategory] = useState('all');
  const recording = useRef<HTMLAudioElement | null>(null);
  function stop() {
    if (recording.current) releaseRecording(recording.current);
    recording.current = null;
  }
  useEffect(() => stop, []);
  const groups = category === 'all' ? classifierGroups : classifierGroups.filter(group => group.id === category);

  return (
    <section className="classifier-catalogue" aria-labelledby="classifier-catalogue-title">
      <header>
        <h2 id="classifier-catalogue-title">{classifierCatalogueTitle[locale]} <span lang="zh-Hans">量词</span></h2>
        <p>{copy.intro[locale]}</p>
      </header>
      <fieldset className="classifier-filters">
        <legend>{copy.filters[locale]}</legend>
        {[{id:'all',label:copy.all}, ...classifierGroups].map(group => (
          <button key={group.id} type="button" aria-pressed={category === group.id}
            onClick={() => {stop(); setCategory(group.id);}}>
            {group.label[locale]}
          </button>
        ))}
      </fieldset>
      {groups.map(group => (
        <section key={group.id} className="classifier-group" aria-labelledby={'classifier-group-'+group.id}>
          <h3 id={'classifier-group-'+group.id}>{group.label[locale]}</h3>
          <div className="classifier-grid">
            {group.entries.map(entry => (
              <article className="classifier-card" key={entry.hanzi}>
                <div className="classifier-head">
                  <h4 lang="zh-Hans">{entry.hanzi}</h4>
                  <div><strong>{entry.pinyin}</strong><p>{entry.use[locale]}</p></div>
                </div>
                {entry.examples.map(example => (
                  <div key={example.id} className="classifier-example" data-study-sentence={example.hanzi}
                    data-study-pinyin={example.pinyin} data-study-meaning={example.meaning[locale]} data-study-source-id={example.id}>
                    <div>
                      <p className="classifier-hanzi" lang="zh-Hans">
                        <StudyText text={example.hanzi} pinyin={example.pinyin} anchor={entry.hanzi}/>
                      </p>
                      <p className="classifier-pinyin">{example.pinyin}</p>
                      <p className="classifier-meaning">{example.meaning[locale]}</p>
                    </div>
                    <div className="classifier-actions">
                      <button className="classifier-listen" type="button" aria-label={copy.listen[locale]+': '+example.hanzi}
                        onClick={() => {stop(); recording.current=playRecording(example.audio, notify);}}>
                        <Volume2 size={18} aria-hidden="true"/> {copy.listen[locale]}
                      </button>
                      {example.lesson && <a href={'/?course=intensive&lesson='+example.lesson}
                        onClick={stop}><BookOpen size={14} aria-hidden="true"/> {copy.lesson[locale]} {example.lesson}</a>}
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
