import type {Locale} from './translate';
/** Small source-backed comparisons, separate from dictionary senses and curriculum IDs. */
export function dictionaryLearningNote(text:string,locale:Locale){
 const note=text==='本日'?{
  en:'本日 běnrì means “today / this day”. The dictionary gives 本日公休 (“closed today”), a notice-style example. For speaking practice, compare 今天 jīntiān: 今天的事情，今天做完。 (“Finish today’s tasks today.”). 日 is read rì; 今天 uses 天 tiān.',
  fr:'本日 běnrì signifie « aujourd’hui / ce jour ». Le dictionnaire donne 本日公休 (« fermé aujourd’hui »), un exemple d’avis. Pour pratiquer, comparez 今天 jīntiān : 今天的事情，今天做完。 (« Finir aujourd’hui les tâches du jour. »). 日 se lit rì ; 今天 emploie 天 tiān.',
  ru:'本日 běnrì означает «сегодня / этот день». Словарный пример объявления: 本日公休 («сегодня закрыто»). Для разговорной практики сравните 今天 jīntiān: 今天的事情，今天做完。 («Сегодняшние дела закончить сегодня»). 日 читается rì; в 今天 используется 天 tiān.',
  tr:'本日 běnrì “bugün / bu gün” demektir. Sözlükteki duyuru örneği 本日公休, “bugün kapalı” anlamındadır. Konuşma alıştırması için 今天 jīntiān ile karşılaştırın: 今天的事情，今天做完。 (“Bugünün işini bugün bitir.”). 日 rì okunur; 今天 içinde 天 tiān kullanılır.'
 }:text==='朝日'?{
  en:'Two source senses share this spelling: “morning sun” and the proper name Asahi. CC-CEDICT capitalizes the name’s Chinese pinyin. This is not a separate Chinese spelling or a Japanese pronunciation recording.',
  fr:'Deux sens partagent cette graphie : « soleil du matin » et le nom propre Asahi. CC-CEDICT met une majuscule au pinyin chinois du nom. Ce n’est ni une autre graphie chinoise ni un enregistrement japonais.',
  ru:'У этого написания два значения: «утреннее солнце» и имя собственное Asahi. В CC-CEDICT китайский пиньинь имени начинается с прописной буквы. Это не другое китайское написание и не запись японского произношения.',
  tr:'Bu yazımın iki anlamı vardır: “sabah güneşi” ve Asahi özel adı. CC-CEDICT, adın Çince pinyinini büyük harfle başlatır. Bu, farklı bir Çince yazım veya Japonca telaffuz kaydı değildir.'
 }:undefined;
 if(!note)return;
 return {text:note[locale],sourceURL:text==='本日'?'https://dict.revised.moe.edu.tw/dictView.jsp?ID=17105':'https://www.mdbg.net/chinese/dictionary?page=cedict',secondSourceURL:text==='本日'?'https://dict.revised.moe.edu.tw/dictView.jsp?ID=93878':undefined};
}
