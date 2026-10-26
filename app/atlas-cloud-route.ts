import {validWordAnchor} from './word-family-model';
import { extendedComponent } from './atlas-cloud-extended';
import { cloudRelation, type CloudRelation } from './atlas-cloud-connections';
import type { CloudLevel } from './atlas-cloud-model';
import {isHybridLayout, type HybridLayout, type HybridSet} from './atlas-hybrid-model';

export type CloudRoute = {
  hanzi:string; component:string; word:string; kind:'character'|'word'; level:CloudLevel;
  parts:string[]; collection:'library'|'atlas'; nested:boolean;
  stage:'family'|'character'|'word'|'sentence'; layout:'family'|'path'|'cloud'|'space'|'words'|'journey'|HybridLayout; anchor:string; wordView:'board'|'train'; familyEntry:string; wordCompare:boolean; wordMemory:boolean; cards:'focus'|'compare'; relation:'all'|CloudRelation;
  mapSet:HybridSet;mapPart:string;mapWordPage:number;mapCharPage:number;
};
export const initialCloudRoute:CloudRoute = {hanzi:'明',component:'sun',word:'',kind:'character',level:'all',parts:[],collection:'library',nested:false,stage:'character',layout:'family',cards:'focus',relation:'all',anchor:'学',wordView:'board',familyEntry:'',wordCompare:false,wordMemory:false,mapSet:'family',mapPart:'',mapWordPage:0,mapCharPage:0};

export function readCloudRoute(search:string):CloudRoute {
  const p=new URLSearchParams(search),h=p.get('hanzi')??'明',l=p.get('hsk');
  const requested=p.get('stage'),kind=p.get('focus')==='word'?'word':'character',layout=p.get('layout')??'';
  const page=(key:string)=>{const n=Number(p.get(key));return Number.isSafeInteger(n)&&n>=0?Math.min(n,100000):0};
  const stage=requested==='family'||requested==='sentence'?requested:kind==='word'?'word':'character';
  const relation=p.get('relation'),wordView=p.get('wordview')==='train'?'train':'board',wordCompare=p.get('compare')==='na'&&wordView==='board';
  return {hanzi:/^[\u3400-\u9fff]$/.test(h)?h:'明',component:extendedComponent(p.get('part')??'')?p.get('part')!:'sun',word:p.get('word')??'',kind,
    level:l==='1'?1:l==='2'?2:l==='3'?3:'all',parts:[...new Set((p.get('with')??'').split(',').filter(id=>extendedComponent(id)))].slice(0,3),
    collection:p.get('collection')==='atlas'?'atlas':'library',nested:p.get('deep')==='1',stage,
    anchor:wordCompare?'哪':validWordAnchor(p.get('anchor')??'')?p.get('anchor')!:'学',wordView,familyEntry:(p.get('entry')??'').slice(0,100),wordCompare,wordMemory:p.get('memory')==='1',cards:p.get('cards')==='compare'?'compare':'focus',layout:isHybridLayout(layout)?layout:layout==='journey'?'journey':layout==='words'?'words':layout==='space'?'space':layout==='cloud'?'cloud':layout==='path'?'path':'family',relation:relation==='meaning'||relation==='sound'||relation==='shape'?relation:'all',
    mapSet:p.get('mapset')==='hundred'?'hundred':p.get('mapset')==='scope'?'scope':'family',mapPart:Array.from(p.get('mappart')??'').length===1?p.get('mappart')!:'',mapWordPage:page('wordpage'),mapCharPage:page('charpage')};
}
export function cloudRouteHref(route:CloudRoute):string {
  const p=new URLSearchParams({atlas:'1',cloud:'1',hanzi:route.hanzi,part:route.component});
  if(route.stage==='family'||route.stage==='sentence')p.set('stage',route.stage);
  if(route.nested)p.set('deep','1');if(route.collection==='atlas')p.set('collection','atlas');
  if(route.word)p.set('word',route.word);if(route.kind==='word')p.set('focus','word');
  if(route.level!=='all')p.set('hsk',String(route.level));if(route.parts.length)p.set('with',route.parts.join(','));
  if(route.cards==='compare')p.set('cards','compare');if(route.layout!=='family')p.set('layout',route.layout);if(route.relation!=='all')p.set('relation',route.relation);
  if(route.anchor!=='学')p.set('anchor',route.anchor);if(route.wordView!=='board')p.set('wordview',route.wordView);if(route.familyEntry)p.set('entry',route.familyEntry);if(route.wordCompare)p.set('compare','na');if(route.wordMemory)p.set('memory','1');
  if(route.mapSet!=='family')p.set('mapset',route.mapSet);if(route.mapPart)p.set('mappart',route.mapPart);if(route.mapWordPage)p.set('wordpage',String(route.mapWordPage));if(route.mapCharPage)p.set('charpage',String(route.mapCharPage));
  return '?'+p;
}
export function cloudFamilyGroups<T extends {hanzi:string}>(family:readonly T[],component:string):Record<CloudRelation,T[]> {
  const groups:Record<CloudRelation,T[]>={meaning:[],sound:[],shape:[]};
  for(const character of family)groups[cloudRelation(character.hanzi,component)].push(character);
  return groups;
}
/** Changing relation never leaves a stale word attached to a different selected character. */
export function cloudRelationSelection(route:CloudRoute,relation:CloudRoute['relation'],family:readonly {hanzi:string}[]):Partial<CloudRoute> {
  const members=relation==='all'?family:cloudFamilyGroups(family,route.component)[relation];
  if(members.some(character=>character.hanzi===route.hanzi)||!members.length)return {relation};
  return {relation,hanzi:members[0].hanzi,word:'',kind:'character',stage:'character'};
}
