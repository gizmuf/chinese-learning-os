import {findSwipeStory} from './atlas-swipe-story-data';
import type {Locale} from './translate';

type StoryTranslation = {meaning:string; structure: readonly string[]; scene:readonly string[]; sentence:string};
const stories = [
 {
  text:'零', pinyin:'líng', id:'零', mode:'characters', anchor:'雨',
  fr:{meaning:'zéro',structure:['雨 (yǔ), la pluie, est en haut.','令 (lìng), donner un ordre, fournit un indice de prononciation.','雨 au-dessus de 令 forme 零.'],scene:['Des gouttes glissent sur la vitre.','La météo donne un ordre : « Descendez à zéro ! »','Le thermomètre affiche 0 °C.'],sentence:'Combien font cent un ?'},
  ru:{meaning:'ноль',structure:['Сверху 雨 (yǔ), «дождь».','令 (lìng), «приказ», подсказывает звучание.','雨 над 令 образует 零.'],scene:['По стеклу стекают капли.','Синоптик командует: «Температуру до нуля!»','Термометр показывает 0 °C.'],sentence:'Сколько будет сто один?'},
  tr:{meaning:'sıfır',structure:['Üstte yağmur anlamındaki 雨 (yǔ) var.','Emir anlamındaki 令 (lìng), ses ipucudur.','雨, 令 üzerinde yer alınca 零 oluşur.'],scene:['Damlalar camdan süzülür.','Meteorolog emreder: “Sıcaklık sıfıra insin!”','Termometre 0 °C’yi gösterir.'],sentence:'Yüz bir kaç eder?'},
 },
 {
  text:'面条儿', pinyin:'miàntiáor', id:'hsk1-127', mode:'words', anchor:'面',
  fr:{meaning:'nouilles',structure:['面 (miàn) évoque ici la farine de blé.','条 (tiáo) désigne ici une longue bande.','儿 ajoute le son r à la fin de tiáo. 面条 et 面条儿 veulent dire « nouilles ».'],scene:['Le cuisinier étale la pâte.','Il la découpe en longues bandes.','Une nouille s’enroule : pensez au r final.'],sentence:'Ce bol de nouilles est délicieux.'},
  ru:{meaning:'лапша',structure:['面 (miàn) здесь связано с пшеничной мукой.','条 (tiáo) — длинная полоска.','儿 добавляет звук r к tiáo. 面条 и 面条儿 означают «лапша».'],scene:['Повар раскатывает тесто.','Он нарезает его длинными полосками.','Одна полоска завивается, напоминая конечное r.'],sentence:'Эта лапша очень вкусная.'},
  tr:{meaning:'erişte',structure:['面 (miàn) burada buğday ununu çağrıştırır.','条 (tiáo) uzun bir şerit demektir.','儿, tiáo sonuna r sesi ekler. 面条 ve 面条儿 erişte demektir.'],scene:['Aşçı hamuru açar.','Hamuru uzun şeritler halinde keser.','Bir şerit kıvrılır ve sondaki r sesini hatırlatır.'],sentence:'Bu kâsedeki erişte çok lezzetli.'},
 },
 {
  text:'挤', pinyin:'jǐ', id:'挤', mode:'characters', anchor:'扌',
  fr:{meaning:'se serrer · être bondé',structure:['扌, la main, est à gauche.','齐 (qí), « aligné », occupe la droite.','扌 et 齐 forment 挤. Avec 氵 à gauche, on obtient 济 (jì), comme dans 经济 (jīngjì).'],scene:['Une main pousse lorsque les portes du métro s’ouvrent.','Les voyageurs attendent bien alignés.','Toute la file se serre dans la rame.'],sentence:'La station de métro est de plus en plus bondée.'},
  ru:{meaning:'протискиваться · быть переполненным',structure:['Слева 扌, «рука».','Справа 齐 (qí), «ровный».','扌 и 齐 образуют 挤. С 氵 слева получается 济 (jì), как в 经济 (jīngjì).'],scene:['Когда двери метро открываются, рука толкает вперёд.','Пассажиры стоят ровной очередью.','Вся очередь втискивается в вагон.'],sentence:'На станции метро становится всё теснее.'},
  tr:{meaning:'sıkışmak · kalabalık olmak',structure:['Solda el bileşeni 扌 var.','Sağda düzgün ve hizalı anlamındaki 齐 (qí) yer alır.','扌 ile 齐, 挤 olur. Sola 氵 koyarsanız 经济 (jīngjì) sözcüğündeki 济 (jì) ortaya çıkar.'],scene:['Metro kapıları açılınca bir el öne doğru iter.','Yolcular düzgün bir sıra oluşturur.','Herkes vagona sıkışır.'],sentence:'Metro istasyonu gittikçe kalabalıklaşıyor.'},
 },
] as const;

export function sprintStories(locale:Locale) {
 return stories.flatMap(row=>{
  const source=findSwipeStory(row);
  if(!source)return [];
  const localized:StoryTranslation|undefined=locale==='en'?undefined:row[locale];
  const frames=source.frames.map((frame,i)=>({...frame,structure:localized?.structure[i]??(source.id==='crowded-subway'&&i===2?'扌 and 齐 form 挤. Put 氵 on the left and you get 济 (jì), as in 经济 (jīngjì).':frame.structure),scene:localized?.scene[i]??frame.scene}));
  return [{...source,meaning:localized?.meaning??source.meaning,frames,anchor:row.anchor,wordId:row.id,
    translation:localized?.sentence??source.example.english}];
 });
}

export function sprintAtlas(hanzi:string, part:string, wordId?:string){
 const query=new URLSearchParams({atlas:'1',workspace:'1',hsk:'all'});
 if(wordId){
  query.set('anchor',part);
  query.set('word',wordId);
  query.set('text',hanzi);
 }else{
  query.set('mode','swipe');
  query.set('buildHanzi',hanzi);
  query.set('buildPart',part);
 }
 return '/?'+query;
}
