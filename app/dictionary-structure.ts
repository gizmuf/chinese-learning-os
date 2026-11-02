import readings from '../data/study-component-readings.json';
import type {Locale} from './translate';
const names:Record<string,string[][]>={
 '⿰':[['Left','Gauche','Слева','Sol'],['Right','Droite','Справа','Sağ']],
 '⿱':[['Top','Haut','Сверху','Üst'],['Bottom','Bas','Снизу','Alt']],
 '⿲':[['Left','Gauche','Слева','Sol'],['Middle','Milieu','Посередине','Orta'],['Right','Droite','Справа','Sağ']],
 '⿳':[['Top','Haut','Сверху','Üst'],['Middle','Milieu','Посередине','Orta'],['Bottom','Bas','Снизу','Alt']],
 '⿻':[['Overlapping part','Partie superposée','Наложенная часть','Üst üste parça'],['Overlapping part','Partie superposée','Наложенная часть','Üst üste parça']]
};
const enclosing=new Set(Array.from('⿴⿵⿶⿷⿸⿹⿺⿼⿽'));
export function dictionaryStructureParts(ids:string,locale:Locale='en'){
 const points=Array.from(ids),parts:{glyph:string;position:string}[]=[];let index=0;const language={en:0,fr:1,ru:2,tr:3}[locale];
 function node(path:string[]){const glyph=points[index++];if(!glyph)return;const layout=names[glyph]??(enclosing.has(glyph)?[['Enclosing part','Partie englobante','Охватывающая часть','Çevreleyen parça'],['Inside','Intérieur','Внутри','İç']]:undefined);if(layout){for(const label of layout)node([...path,label[language]]);}else if(glyph!=='？'&&glyph!=='?')parts.push({glyph,position:path.join(' · ')});}
 node([]);return index===points.length?parts:[];
}
const byGlyph=new Map(readings.components.map(row=>[row.glyph,row]));
export function dictionaryComponentReading(glyph:string){return byGlyph.get(glyph);}
