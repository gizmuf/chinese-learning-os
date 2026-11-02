import {items, type Mode} from './content';

export const studioDraftKey = 'study-studio-v1';
export type StudioPane = 'atlas'|'writing'|'vocabulary'|'cards'|'day';
export type StudioLocation = {pane:StudioPane; itemId:string; mode:Mode; atlasQuery:string};
export type StudioCheckpoint = StudioLocation & {
  version:1; revision:number; lease:string; trail:StudioLocation[]; selected:string[];
  review:null|{id:string; itemIds:string[]}; applied:string[];
};
export type StudioCommand =
  | {tool:'atlas.open'; itemId:string; character:string; component:'wood'|'enclosure'|'sun'; actionId:string}
  | {tool:'writing.open'; itemId:string; mode:Mode; actionId:string}
  | {tool:'vocabulary.select'; itemIds:string[]; actionId:string}
  | {tool:'examples.open'; actionId:string}
  | {tool:'flashcards.open'; actionId:string};
const known = new Map(items.map(item=>[item.id,item]));
const panes = new Set(['atlas','writing','vocabulary','cards','day']);
const modes = new Set(['watch','trace','copy','recall']);
export const dayItemIds = ['hsk1-167','hsk1-081','hsk1-086','hsk1-250'];
export const studioFixtures = [
  {label:'Explore the 木 character family', command:{tool:'atlas.open',itemId:'hsk1-081',character:'林',component:'wood'}},
  {label:'Practise writing 回', command:{tool:'writing.open',itemId:'hsk1-081',mode:'watch'}},
  {label:'Add words to practice', command:{tool:'vocabulary.select',itemIds:dayItemIds}},
  {label:'My day', command:{tool:'examples.open'}},
  {label:'Practise flashcards', command:{tool:'flashcards.open'}},
] as const;
export function fixtureCommand(text:string,actionId:string):StudioCommand|null {
  const fixture=studioFixtures.find(f=>f.label.toLocaleLowerCase()===text.trim().toLocaleLowerCase());
  return fixture ? {...fixture.command,actionId} as StudioCommand : null;
}
export function initialStudio():StudioCheckpoint {
  return {version:1,revision:0,lease:'',pane:'atlas',itemId:'hsk1-081',mode:'watch',
    atlasQuery:'?atlas=1&cloud=1&hanzi=林&part=wood&layout=space&collection=atlas',trail:[],selected:dayItemIds,review:null,applied:[]};
}
const validIds=(ids:unknown):ids is string[]=>Array.isArray(ids)&&ids.length<=24&&new Set(ids).size===ids.length&&ids.every(id=>typeof id==='string'&&known.has(id));
const validLocation=(value:unknown):value is StudioLocation=>{
  if(!value||typeof value!=='object')return false;
  const v=value as StudioLocation;
  return panes.has(v.pane)&&known.has(v.itemId)&&modes.has(v.mode)&&typeof v.atlasQuery==='string'&&v.atlasQuery.length<1600;
};
export function validStudio(value:unknown):value is StudioCheckpoint {
  if(!validLocation(value))return false;
  const v=value as StudioCheckpoint;
  return v.version===1&&Number.isSafeInteger(v.revision)&&v.revision>=0&&typeof v.lease==='string'&&
    Array.isArray(v.trail)&&v.trail.length<=16&&v.trail.every(validLocation)&&validIds(v.selected)&&
    Array.isArray(v.applied)&&v.applied.length<=32&&v.applied.every(id=>typeof id==='string'&&id.length<=100)&&
    (v.review===null||!!v.review&&typeof v.review.id==='string'&&v.review.id.length<=100&&validIds(v.review.itemIds)&&v.review.itemIds.length>0);
}
export function locationOf(v:StudioLocation):StudioLocation {
  return {pane:v.pane,itemId:v.itemId,mode:v.mode,atlasQuery:v.atlasQuery};
}
export function visitStudio(state:StudioCheckpoint,patch:Partial<StudioLocation>):StudioCheckpoint {
  const next={...state,...patch};
  if(!validLocation(next))throw Error('Unknown study destination');
  if(JSON.stringify(locationOf(next))===JSON.stringify(locationOf(state)))return state;
  return {...next,trail:[...state.trail,locationOf(state)].slice(-16)};
}
export function backStudio(state:StudioCheckpoint):StudioCheckpoint {
  const previous=state.trail.at(-1);
  return previous ? {...state,...previous,trail:state.trail.slice(0,-1)} : state;
}
/** Only structured, validated tools can change the workspace. No text is executed. */
export function applyStudioCommand(state:StudioCheckpoint,input:unknown,runId:string):StudioCheckpoint {
  if(!input||typeof input!=='object')throw Error('Unknown command');
  const c=input as StudioCommand;
  if(typeof c.actionId!=='string'||!c.actionId||c.actionId.length>100)throw Error('Invalid action');
  if(state.applied.includes(c.actionId))return state;
  let next:StudioCheckpoint;
  switch(c.tool){
    case 'atlas.open':
      if(!known.has(c.itemId)||!['wood','enclosure','sun'].includes(c.component)||!/^\p{Script=Han}$/u.test(c.character))throw Error('Unknown Atlas target');
      next=visitStudio(state,{pane:'atlas',itemId:c.itemId,atlasQuery:'?atlas=1&cloud=1&layout=space&collection=atlas&hanzi='+encodeURIComponent(c.character)+'&part='+c.component});break;
    case 'writing.open':
      if(!known.has(c.itemId)||!modes.has(c.mode))throw Error('Unknown writing target');
      next=visitStudio(state,{pane:'writing',itemId:c.itemId,mode:c.mode});break;
    case 'vocabulary.select':
      if(!validIds(c.itemIds))throw Error('Unknown vocabulary');
      next={...visitStudio(state,{pane:'vocabulary'}),selected:[...c.itemIds]};break;
    case 'examples.open':next=visitStudio(state,{pane:'day'});break;
    case 'flashcards.open':
      if(!state.selected.length)throw Error('Select at least one word first.');
      if(!runId||runId.length>100)throw Error('Invalid practice session');
      next={...visitStudio(state,{pane:'cards'}),review:state.review??{id:runId,itemIds:[...state.selected]}};break;
    default:throw Error('Unknown command');
  }
  return {...next,applied:[...state.applied,c.actionId].slice(-32)};
}

/** A new mount claims the checkpoint. Stale tabs cannot overwrite the newer owner. */
export function claimStudio(db:IDBDatabase,lease:string):Promise<StudioCheckpoint> {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),request=store.get(studioDraftKey);
    let next:StudioCheckpoint;
    request.onsuccess=()=>{const previous=validStudio(request.result)?request.result:initialStudio();next={...previous,lease,revision:previous.revision+1};store.put(next,studioDraftKey);};
    tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('Checkpoint unavailable'));
  });
}
export function writeStudio(db:IDBDatabase,previous:StudioCheckpoint,next:StudioCheckpoint):Promise<StudioCheckpoint> {
  if(!validStudio(next))return Promise.reject(Error('Invalid checkpoint'));
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),request=store.get(studioDraftKey);
    const saved={...next,revision:previous.revision+1,lease:previous.lease};
    request.onsuccess=()=>{const current=request.result;if(current?.lease!==previous.lease||current?.revision!==previous.revision){tx.abort();return;}store.put(saved,studioDraftKey);};
    tx.oncomplete=()=>resolve(saved);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('StudyStudio changed in another tab. Reload to continue.'));
  });
}
