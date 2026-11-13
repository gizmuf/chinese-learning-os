import source from '../data/my-day-01-v2.json';
import {items,type Item} from './content';
import {atlasByHanzi,componentById} from './atlas-model';
export const myDayLesson=source;
export const myDaySentences=source.sections.flatMap(section=>section.rows.map(row=>({...row,sectionId:section.id})));
const vocabulary=['去','回','家','学校','工作','中文','起床','早饭','出门','走','分钟','休息','咖啡','学习','晚上','睡觉','准备','厨房','吃','肉','然后','因为','所以','附近','散步'];
/** A rehearsal sentence is never registered as a curriculum Item or an FSRS card. */
export const myDayVocabulary=vocabulary.flatMap(text=>{
  const item=items.find(item=>item.hanzi===text);
  return item?[item]:[];
});
export function myDayAtlasLink(item:Item):{character:string;href:string}|null {
  const character=Array.from(item.hanzi).map(h=>atlasByHanzi.get(h)).find(Boolean);
  const component=character?.components.find(id=>componentById.has(id));
  if(!character||!component)return null;
  return {character:character.hanzi,href:'/?'+new URLSearchParams({atlas:'1',cloud:'1',collection:'atlas',layout:'space',hanzi:character.hanzi,part:component})};
}
/** Only an authored, exact full-sentence match can reuse an existing recording. */
export function myDaySentenceAudio(text:string):Item|undefined {
  return items.find(item=>item.sentence===text);
}
