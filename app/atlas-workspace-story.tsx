'use client';

import {ArrowLeft, ArrowRight, BookOpen, RotateCcw, Volume2} from 'lucide-react';
import {useState, type ReactNode} from 'react';
import {FamilyScene} from './atlas-family-stories';
import {storySource, type FamilyStory} from './atlas-family-stories-data';
import AtlasStoryExplorer, {type StoryTarget} from './atlas-story-explorer';
import {useI18n} from './i18n';
import type {Pronunciation} from './atlas-spatial-model';
import type {WorkspaceAudio} from './atlas-workspace-content';
import {workspacePanelOutsideScope, workspacePanelStory, workspaceScopeLabel, type WorkspaceContext} from './atlas-workspace-model';
import type {WorkspaceKind, WorkspaceRoute} from './atlas-workspace-route';

type StoryActions = {
  step: number;
  onStep: (step: number) => void;
  onExplore: (text: string, kind: WorkspaceKind) => void;
  onBack: () => void;
};

export function WorkspaceStoryPane({route, context, audio, inspector, onFullStory, ...actions}: StoryActions & {
  route: WorkspaceRoute; context: WorkspaceContext; audio: WorkspaceAudio; inspector: ReactNode;
  onFullStory: (target: StoryTarget) => void;
}) {
  const story = workspacePanelStory(route.kind, context.text);
  return <aside id="aw-story-pane" className="aw-story-pane" aria-label="Story beside family" tabIndex={-1}>
    {workspacePanelOutsideScope(route, context) && <p className="aw-scope-note aw-story-scope-note">
      Selected entry is outside {workspaceScopeLabel(route.scope)}.
    </p>}
    {story?.kind === 'explorer' ? <>
      <AtlasStoryExplorer target={story.target} step={actions.step} onStepChange={actions.onStep}
        onExplore={actions.onExplore} onBack={actions.onBack} backLabel="Back to family"/>
      <div className="aw-actions aw-story-tools">
        <button type="button" onClick={() => onFullStory(story.target)}><BookOpen size={16}/> Open full story</button>
      </div>
      <details className="aw-story-context"><summary>Selected context</summary>{inspector}</details>
    </> : story?.kind === 'family' ? <>
      <WorkspaceFamilyStory key={story.story.id} story={story.story} context={context} audio={audio} {...actions}/>
      <details className="aw-story-context"><summary>Selected context</summary>{inspector}</details>
    </> : <>
      <div className="aw-panel aw-story-fallback">
        <div className="aw-actions"><button type="button" onClick={actions.onBack}><ArrowLeft size={16}/> Back to family</button></div>
        <p>{context.text ? 'No story prepared yet.' : 'Select a family member to look for its story.'}</p>
      </div>
      {inspector}
    </>}
  </aside>;
}

function WorkspaceFamilyStory({story, context, audio, step, onStep, onExplore, onBack}: StoryActions & {
  story: FamilyStory; context: WorkspaceContext; audio: WorkspaceAudio;
}) {
  const {locale} = useI18n();
  const [replay, setReplay] = useState(0);
  const asset = '/atlas/family-stories/' + story.id;
  const {word} = story;

  function listen(clip: Pronunciation, label: string) {
    const playing = audio.playing === clip.source;
    return <button type="button" aria-pressed={playing} onClick={() => audio.listen(clip)}>
      <Volume2 size={16}/> {playing ? 'Stop audio' : label}
    </button>;
  }

  return <section className="aw-panel aw-family-story" data-story-target={story.hanzi}>
    <div className="aw-actions">
      <button type="button" onClick={onBack}><ArrowLeft size={16}/> Back to family</button>
    </div>
    <div className="aw-actions" role="group" aria-label="Story steps">
      {['Scene', 'Structure', 'In use'].map((label, index) => <button key={label} type="button"
        aria-pressed={step === index} onClick={() => onStep(index)}>{label}</button>)}
    </div>
    <div className="aw-family-story-heading">
      <h2 lang="zh-Hans">{story.hanzi}</h2>
      <p className="aw-reading">{story.pinyin}</p>
      <p>{story.meaning[locale]}</p>
    </div>
    {step === 0 && <>
      <FamilyScene key={replay} story={story} label={story.captions[0][locale]}/>
      <p className="aw-relation">{story.origin ? 'Illustrated origin story' : 'Memory scene'}</p>
      <p>{story.captions[0][locale]}</p>
      <div className="aw-actions">
        <button type="button" onClick={() => setReplay(value => value + 1)}><RotateCcw size={16}/> Replay scene</button>
        {listen({text: story.hanzi, pinyin: story.pinyin, source: asset + '-' + locale + '.mp3', context: false}, 'Listen to narration')}
      </div>
    </>}
    {step === 1 && <div className="aw-related">
      <strong>Indexed modern components</strong>
      {context.parts.length ? <div className="aw-chips">{context.parts.map(part => <button key={part} type="button"
        onClick={() => onExplore(part, 'component')} lang="zh-Hans">{part}</button>)}</div>
        : <p>Direct component links are unavailable for this character.</p>}
    </div>}
    {step === 2 && (word ? <div className="aw-example">
      <div className="aw-chips"><button type="button" onClick={() => onExplore(word.hanzi, 'word')} lang="zh-Hans">{word.hanzi} <ArrowRight size={14}/></button></div>
      <p className="aw-reading">{word.pinyin}</p>
      <p>{word.meaning[locale]}</p>
      <div className="aw-chips"><button type="button" onClick={() => onExplore(word.sentence, 'sentence')} lang="zh-Hans">{word.sentence} <ArrowRight size={14}/></button></div>
      <p className="aw-reading">{word.sentencePinyin}</p>
      <p>{word.translation[locale]}</p>
      <div className="aw-actions">
        {listen({text: word.hanzi, pinyin: word.pinyin, source: asset + '-word.mp3', context: false, kind: 'word'}, 'Listen to word')}
        {listen({text: word.sentence, pinyin: word.sentencePinyin, source: asset + '-sentence.mp3', context: false, kind: 'sentence'}, 'Listen to sentence')}
      </div>
    </div> : <p>See the indexed examples under Selected context.</p>)}
    <details className="ase-source"><summary>Sources</summary>
      <a href={storySource(story.hanzi)} target="_blank" rel="noreferrer">CUHK · {story.hanzi} ↗</a>
    </details>
  </section>;
}
