import source from '../data/shuoshuo-companion.json';
import {items,type Item,type Mode} from './content';
import {atlasByHanzi,componentById} from './atlas-model';
export const companion=source;
export type CompanionTerm=typeof source.terms[number];
export const companionDraftKey='vocabulary-companion:shuoshuo-v1';
const modes=new Set(['watch','trace','copy','recall']);
export function canonicalTerm(term:CompanionTerm):Item|undefined {
  return term.canonicalItemId ? items.find(item=>item.id===term.canonicalItemId&&item.hanzi===term.hanzi) : undefined;
}
/** Character links are structural Atlas entries, never substitute vocabulary identities. */
export function companionAtlasLinks(term:CompanionTerm){
  return Array.from(term.hanzi).flatMap(hanzi=>{
    const character=atlasByHanzi.get(hanzi),component=character?.components.find(id=>componentById.has(id));
    return character&&component?[{hanzi,href:'/?'+new URLSearchParams({atlas:'1',cloud:'1',collection:'atlas',layout:'space',hanzi,part:component})}]:[];
  });
}
export type CompanionDraft={version:1;revision:number;lease:string;index:number;phases:(1|2|3)[];writing:number|null;writingModes:Mode[];written:boolean[]};
export function initialCompanion():CompanionDraft {
  return {version:1,revision:0,lease:'',index:0,phases:source.terms.map(()=>1),writing:null,writingModes:source.terms.map(()=>'watch'),written:source.terms.map(()=>false)};
}
export function validCompanion(value:unknown):value is CompanionDraft {
  if(!value||typeof value!=='object')return false;
  const v=value as CompanionDraft,n=source.terms.length,index=(x:unknown)=>Number.isInteger(x)&&Number(x)>=0&&Number(x)<n;
  return v.version===1&&Number.isSafeInteger(v.revision)&&v.revision>=0&&typeof v.lease==='string'&&index(v.index)&&
    (v.writing===null||index(v.writing))&&Array.isArray(v.phases)&&v.phases.length===n&&v.phases.every(p=>[1,2,3].includes(p))&&
    Array.isArray(v.writingModes)&&v.writingModes.length===n&&v.writingModes.every(mode=>modes.has(mode))&&
    Array.isArray(v.written)&&v.written.length===n&&v.written.every(v=>typeof v==='boolean');
}
export function changeCompanion(state:CompanionDraft,patch:Partial<Pick<CompanionDraft,'index'|'phases'|'writing'|'writingModes'|'written'>>):CompanionDraft {
  const next={...state,...patch};if(!validCompanion(next))throw Error('Unknown companion destination');return next;
}
/** Checkpoints contain exposure and writing practice, never learning events or ratings. */
export function claimCompanion(db:IDBDatabase,lease:string):Promise<CompanionDraft>{
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),request=store.get(companionDraftKey);let next:CompanionDraft;
    request.onsuccess=()=>{const before=validCompanion(request.result)?request.result:initialCompanion();next={...before,lease,revision:before.revision+1};store.put(next,companionDraftKey);};
    tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('Could not open companion practice'));
  });
}
export function saveCompanion(db:IDBDatabase,before:CompanionDraft,patch:CompanionDraft):Promise<CompanionDraft>{
  if(!validCompanion(patch))return Promise.reject(Error('Invalid companion checkpoint'));
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),request=store.get(companionDraftKey),next={...patch,revision:before.revision+1,lease:before.lease};
    request.onsuccess=()=>{if(request.result?.lease!==before.lease||request.result?.revision!==before.revision){tx.abort();return;}store.put(next,companionDraftKey);};
    tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('This practice changed in another tab. Reload to continue.'));
  });
}
