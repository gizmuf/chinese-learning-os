import { extendedComponent } from './atlas-cloud-extended';
import { cloudRelation, type CloudRelation } from './atlas-cloud-connections';
import type { CloudLevel } from './atlas-cloud-model';

export type CloudRoute = {
  hanzi:string; component:string; word:string; kind:'character'|'word'; level:CloudLevel;
  parts:string[]; collection:'library'|'atlas'; nested:boolean;
  stage:'family'|'character'|'word'|'sentence'; layout:'family'|'path'; relation:'all'|CloudRelation;
};
export const initialCloudRoute:CloudRoute = {hanzi:'明',component:'sun',word:'',kind:'character',level:'all',parts:[],collection:'library',nested:false,stage:'character',layout:'family',relation:'all'};

export function readCloudRoute(search:string):CloudRoute {
  const p=new URLSearchParams(search),h=p.get('hanzi')??'明',l=p.get('hsk');
  const requested=p.get('stage'),kind=p.get('focus')==='word'?'word':'character';
  const stage=requested==='family'||requested==='sentence'?requested:kind==='word'?'word':'character';
  const relation=p.get('relation');
  return {hanzi:/^[\u3400-\u9fff]$/.test(h)?h:'明',component:extendedComponent(p.get('part')??'')?p.get('part')!:'sun',word:p.get('word')??'',kind,
    level:l==='1'?1:l==='2'?2:l==='3'?3:'all',parts:[...new Set((p.get('with')??'').split(',').filter(id=>extendedComponent(id)))].slice(0,3),
    collection:p.get('collection')==='atlas'?'atlas':'library',nested:p.get('deep')==='1',stage,
    layout:p.get('layout')==='path'?'path':'family',relation:relation==='meaning'||relation==='sound'||relation==='shape'?relation:'all'};
}
export function cloudRouteHref(route:CloudRoute):string {
  const p=new URLSearchParams({atlas:'1',cloud:'1',hanzi:route.hanzi,part:route.component});
  if(route.stage==='family'||route.stage==='sentence')p.set('stage',route.stage);
  if(route.nested)p.set('deep','1');if(route.collection==='atlas')p.set('collection','atlas');
  if(route.word)p.set('word',route.word);if(route.kind==='word')p.set('focus','word');
  if(route.level!=='all')p.set('hsk',String(route.level));if(route.parts.length)p.set('with',route.parts.join(','));
  if(route.layout==='path')p.set('layout','path');if(route.relation!=='all')p.set('relation',route.relation);
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
