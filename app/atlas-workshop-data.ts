import { A, type AtlasCopy } from "./atlas-data";
import lin from "../public/characters/林.json";
import sen from "../public/characters/森.json";
import xiu from "../public/characters/休.json";
import ming from "../public/characters/明.json";
import qing from "../public/characters/清.json";
import sunny from "../public/characters/晴.json";
import feeling from "../public/characters/情.json";
import please from "../public/characters/请.json";
import wood from "../public/characters/木.json";
import sun from "../public/characters/日.json";
import water from "../public/characters/水.json";
import fire from "../public/characters/火.json";
import mountain from "../public/characters/山.json";
import sky from "../public/characters/天.json";
import hand from "../public/characters/手.json";
import machine from "../public/characters/机.json";
import electricity from "../public/characters/电.json";
import brain from "../public/characters/脑.json";
export type GlyphData = { strokes: string[]; medians: number[][][] };
export type Part = { glyph: string; pinyin: string; name: AtlasCopy; role: "meaning" | "sound" | "shape"; strokes: number[]; anchor?: boolean };
export type Assembly = { hanzi: string; pinyin: string; meaning: AtlasCopy; family: "wood" | "qing" | "light"; data: GlyphData; parts: Part[]; note: AtlasCopy; source: string };
const range = (start:number, length:number) => Array.from({length},(_,i)=>start+i);
const tree = (start:number, anchor=false):Part => ({glyph:"木",pinyin:"mù",name:A("tree","arbre","дерево"),role:"meaning",strokes:range(start,4),anchor});
const sound = (start:number):Part => ({glyph:"青",pinyin:"qīng",name:A("sound clue","indice sonore","подсказка звучания"),role:"sound",strokes:range(start,8),anchor:true});
const soundNote = A("The fixed part suggests a sound family, not an exact pronunciation. Read and hear each syllable and tone. The entering part is a meaning clue, not the complete definition.","La partie fixe suggère une famille sonore, pas une prononciation exacte. Apprenez chaque syllabe et son ton. La partie mobile donne un indice de sens, pas la définition complète.","Неподвижная часть подсказывает семейство звучаний, но не точное произношение. Учите слог и тон каждого знака. Подвижная часть — подсказка значения, а не полное определение.");
const source = (h:string) => "https://www.dong-chinese.com/wiki/"+encodeURIComponent(h);
export const assemblies: Assembly[] = [
 {hanzi:"林",pinyin:"lín",meaning:A("woods","bois","роща"),family:"wood",data:lin,parts:[tree(0,true),tree(4)],note:A("Two tree forms make a picture of woods. The modern shapes are drawn from the finished character.","Deux formes d’arbre évoquent un bois. Les formes modernes proviennent du caractère complet.","Два дерева изображают рощу. Современные формы взяты из готового иероглифа."),source:source("林")},
 {hanzi:"森",pinyin:"sēn",meaning:A("dense forest","forêt dense","густой лес"),family:"wood",data:sen,parts:[tree(0,true),tree(4),tree(8)],note:A("Three tree forms evoke many trees. Notice how each tree changes proportion to fit its place.","Trois formes d’arbre évoquent de nombreux arbres. Leurs proportions s’adaptent à leur place.","Три дерева передают множество деревьев. Их пропорции меняются в зависимости от места."),source:source("森")},
 {hanzi:"休",pinyin:"xiū",meaning:A("rest","se reposer","отдыхать"),family:"wood",data:xiu,parts:[{glyph:"亻",pinyin:"rén",name:A("person form","forme de personne","форма человека"),role:"meaning",strokes:[0,1]},tree(2,true)],note:A("A person beside a tree: a pictorial composition associated with resting. The person form comes from 人 · rén.","Une personne près d’un arbre : une composition liée au repos. La forme de personne vient de 人 · rén.","Человек рядом с деревом: образ отдыха. Форма человека происходит от 人 · rén."),source:source("休")},
 ...[
  {hanzi:"清",pinyin:"qīng",meaning:A("clear · clean","clair · propre","чистый · прозрачный"),data:qing,glyph:"氵",reading:"shuǐ",name:A("water form","forme de l’eau","форма воды"),count:3},
  {hanzi:"晴",pinyin:"qíng",meaning:A("clear weather","beau temps","ясная погода"),data:sunny,glyph:"日",reading:"rì",name:A("sun","soleil","солнце"),count:4},
  {hanzi:"情",pinyin:"qíng",meaning:A("feeling","sentiment","чувство"),data:feeling,glyph:"忄",reading:"xīn",name:A("heart form","forme du cœur","форма сердца"),count:3},
  {hanzi:"请",pinyin:"qǐng",meaning:A("please · invite","s’il vous plaît · inviter","пожалуйста · приглашать"),data:please,glyph:"讠",reading:"yán",name:A("speech form","forme de la parole","форма речи"),count:2},
 ].map(c=>({hanzi:c.hanzi,pinyin:c.pinyin,meaning:c.meaning,family:"qing" as const,data:c.data,parts:[{glyph:c.glyph,pinyin:c.reading,name:c.name,role:"meaning" as const,strokes:range(0,c.count)},sound(c.count)],note:soundNote,source:source(c.hanzi)})),
 {hanzi:"明",pinyin:"míng",meaning:A("bright","lumineux","светлый"),family:"light",data:ming,parts:[{glyph:"日",pinyin:"rì",name:A("sun","soleil","солнце"),role:"shape",strokes:range(0,4),anchor:true},{glyph:"月",pinyin:"yuè",name:A("moon","lune","луна"),role:"shape",strokes:range(4,4)}],note:A("Sun plus moon makes a useful memory image for brightness. This is a mnemonic for the modern shape; early forms have a more complex history.","Soleil et lune aident à retenir l’idée de clarté. C’est un moyen mnémotechnique de la forme moderne ; l’histoire des formes anciennes est plus complexe.","Солнце и луна помогают запомнить свет. Это подсказка для современной формы; история древних форм сложнее."),source:source("明")},
];
export type WordScene = "forest"|"volcano"|"water"|"tomorrow"|"phone"|"computer";
export type WordBuild = {hanzi:string;pinyin:string;meaning:AtlasCopy;scene:WordScene;parts:{hanzi:string;pinyin:string;meaning:AtlasCopy;data:GlyphData}[];note:AtlasCopy;source:string};
export const wordBuilds:WordBuild[]=[
 {hanzi:"森林",pinyin:"sēnlín",meaning:A("forest","forêt","лес"),scene:"forest",parts:[{hanzi:"森",pinyin:"sēn",meaning:A("dense trees","arbres denses","густые деревья"),data:sen},{hanzi:"林",pinyin:"lín",meaning:A("woods","bois","роща"),data:lin}],note:A("Two related meanings reinforce one word: forest. Say sēnlín as a whole word.","Deux sens proches forment un mot : forêt. Prononcez sēnlín comme un mot entier.","Два близких значения образуют слово «лес». Произносите sēnlín целиком."),source:source("林")},
 {hanzi:"火山",pinyin:"huǒshān",meaning:A("volcano","volcan","вулкан"),scene:"volcano",parts:[{hanzi:"火",pinyin:"huǒ",meaning:A("fire","feu","огонь"),data:fire},{hanzi:"山",pinyin:"shān",meaning:A("mountain","montagne","гора"),data:mountain}],note:A("Fire + mountain: picture a volcano. This literal association helps you remember the whole word.","Feu + montagne : imaginez un volcan. Cette association aide à retenir le mot entier.","Огонь + гора: представьте вулкан. Эта ассоциация помогает запомнить слово целиком."),source:"https://www.dong-chinese.com/dictionary/火山"},
 {hanzi:"清水",pinyin:"qīngshuǐ",meaning:A("clear water","eau claire","чистая вода"),scene:"water",parts:[{hanzi:"清",pinyin:"qīng",meaning:A("clear","clair","чистый"),data:qing},{hanzi:"水",pinyin:"shuǐ",meaning:A("water","eau","вода"),data:water}],note:A("The first character describes the second: clear water. Notice water inside the first character, too.","Le premier caractère décrit le second : de l’eau claire. Retrouvez l’eau aussi dans le premier caractère.","Первый знак описывает второй: чистая вода. Найдите воду и внутри первого знака."),source:"https://www.dong-chinese.com/dictionary/清水"},
 {hanzi:"明天",pinyin:"míngtiān",meaning:A("tomorrow","demain","завтра"),scene:"tomorrow",parts:[{hanzi:"明",pinyin:"míng",meaning:A("next, in this word","suivant, dans ce mot","следующий, в этом слове"),data:ming},{hanzi:"天",pinyin:"tiān",meaning:A("day","jour","день"),data:sky}],note:A("Imagine the next sunrise. Here míng points to the next day; translating every character by its first dictionary meaning would mislead you.","Imaginez le prochain lever du soleil. Ici, míng désigne le jour suivant ; ne traduisez pas chaque caractère par son premier sens.","Представьте следующий восход. Здесь míng указывает на следующий день; первый словарный перевод каждого знака не всегда подходит."),source:"https://www.dong-chinese.com/dictionary/明天"},
 {hanzi:"手机",pinyin:"shǒujī",meaning:A("mobile phone","téléphone portable","мобильный телефон"),scene:"phone",parts:[{hanzi:"手",pinyin:"shǒu",meaning:A("hand","main","рука"),data:hand},{hanzi:"机",pinyin:"jī",meaning:A("machine","machine","машина"),data:machine}],note:A("A machine that fits in your hand: a memory image for a mobile phone. Learn shǒujī together.","Une machine dans la main : une image pour retenir téléphone portable. Apprenez shǒujī ensemble.","Машина в руке — образ мобильного телефона. Учите shǒujī как одно слово."),source:"https://www.dong-chinese.com/dictionary/手机"},
 {hanzi:"电脑",pinyin:"diànnǎo",meaning:A("computer","ordinateur","компьютер"),scene:"computer",parts:[{hanzi:"电",pinyin:"diàn",meaning:A("electricity","électricité","электричество"),data:electricity},{hanzi:"脑",pinyin:"nǎo",meaning:A("brain","cerveau","мозг"),data:brain}],note:A("Electricity + brain: picture a computer. This is a word-level association, not the origin of either character.","Électricité + cerveau : imaginez un ordinateur. C’est une association du mot, pas l’origine des caractères.","Электричество + мозг: представьте компьютер. Это ассоциация для слова, а не происхождение отдельных знаков."),source:"https://www.dong-chinese.com/dictionary/电脑"},
];
export const workshopGlyphs = {wood,sun,water};
export function checkAssemblyChoice(parts:readonly {glyph:string}[], placed:readonly number[], glyph:string):number {
 return parts.findIndex((part,i)=>part.glyph===glyph&&!placed.includes(i));
}
