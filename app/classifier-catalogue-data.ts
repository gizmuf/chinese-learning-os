import {items} from './content';
import {localizeItem, type Locale} from './translate';
import {C, lesson06Audio, lesson06Terms} from './lesson06-data';
import {lesson07Audio, lesson07ById} from './lesson07-data';
import {lesson08Audio, lesson08ById} from './lesson08-data';
import {lesson09Audio, lesson09ById} from './lesson09-data';
import type {Copy} from './course-data';

type Example = {id:string; hanzi:string; pinyin:string; meaning:Copy; audio:string; lesson?:number};

function lessonExample(row: Pick<Example,'id'|'hanzi'|'pinyin'|'meaning'>, audio:string, lesson:number): Example {
  return {...row, audio, lesson};
}

function hskExample(id:string): Example {
  const item = items.find(row => row.id === id);
  if (!item) throw new Error('Unknown classifier example: '+id);
  const translation = (locale:Locale) => localizeItem(item, locale).translation;
  return {
    id, hanzi:item.sentence, pinyin:item.sentencePinyin,
    meaning:C(translation('en'), translation('fr'), translation('ru'), translation('tr')),
    audio:'/audio/'+id+'-sentence.mp3',
  };
}

const from06 = (id:string) => lessonExample(lesson06Terms.find(row => row.id === id)!, lesson06Audio({id}), 6);
const from08 = (id:string) => lessonExample(lesson08ById.get(id)!, lesson08Audio({id}), 8);

export const classifierGroups = [
  {
    id:'general', label:C('General use','Usage général','Общее употребление','Genel kullanım'),
    entries:[{hanzi:'个', pinyin:'gè (ge)', use:C('A common classifier for people and many things. Learn the more specific classifier when one is usual.','Classificateur courant pour les personnes et de nombreuses choses. Apprenez le classificateur plus précis lorsqu’il est d’usage.','Частый счётный суффикс для людей и многих предметов. Если принято более точное слово, выучите его.','İnsanlar ve pek çok şey için yaygın bir sınıflandırıcı. Yaygın bir özel sınıflandırıcı varsa onu öğrenin.'),
      examples:[from08('c08-s38'), lessonExample(lesson09ById.get('c09-s58')!,lesson09Audio({id:'c09-s58'}),9)]}],
  },
  {
    id:'people', label:C('Household members','Membres du foyer','Члены семьи','Hane üyeleri'),
    entries:[{hanzi:'口', pinyin:'kǒu', use:C('Counts people in a household, as in 几口人.','Sert à compter les personnes d’un foyer, comme dans 几口人.','Считает людей в семье, как в 几口人.','几口人 örneğinde olduğu gibi bir hanedeki kişileri sayar.'),
      examples:[hskExample('hsk1-085')]}],
  },
  {
    id:'animals', label:C('Animals','Animaux','Животные','Hayvanlar'),
    entries:[{hanzi:'只', pinyin:'zhī', use:C('Counts many animals, including cats and dogs.','Sert à compter de nombreux animaux, dont les chats et les chiens.','Считает многих животных, в том числе кошек и собак.','Kedi ve köpek dahil pek çok hayvanı sayar.'),
      examples:[hskExample('hsk1-201'),hskExample('hsk1-287')]}],
  },
  {
    id:'books', label:C('Books','Livres','Книги','Kitaplar'),
    entries:[{hanzi:'本', pinyin:'běn', use:C('Counts bound volumes such as books and dictionaries.','Sert à compter les ouvrages reliés, comme les livres et dictionnaires.','Считает книги, словари и другие переплетённые издания.','Kitap ve sözlük gibi ciltli yayınları sayar.'),
      examples:[from06('c06-t40'),lessonExample(lesson09ById.get('c09-s26')!,lesson09Audio({id:'c09-s26'}),9)]}],
  },
  {
    id:'objects', label:C('Paper and objects','Papier et objets','Бумага и предметы','Kâğıt ve eşyalar'),
    entries:[
      {hanzi:'张', pinyin:'zhāng', use:C('Counts sheets and maps, and items with a flat surface such as tables.','Sert à compter les feuilles, les cartes et certains objets plats, comme les tables.','Считает листы, карты и предметы с плоской поверхностью, например столы.','Kâğıt ve haritaların yanı sıra masa gibi düz yüzeyli nesneleri sayar.'),
        examples:[from08('c08-s44'),from08('c08-s42')]},
      {hanzi:'把', pinyin:'bǎ', use:C('Used with keys and some objects you can hold by a handle. It is also used with chairs.','S’emploie avec les clés et certains objets munis d’une poignée. Il s’emploie aussi avec les chaises.','Употребляется с ключами, некоторыми предметами с ручкой, а также со стульями.','Anahtarlar ve sapından tutulabilen bazı nesneler için kullanılır. Sandalyeler için de kullanılır.'),
        examples:[from06('c06-t39'),from08('c08-s42')]},
    ],
  },
  {
    id:'vehicles', label:C('Vehicles','Véhicules','Транспорт','Araçlar'),
    entries:[{hanzi:'辆', pinyin:'liàng', use:C('Counts wheeled vehicles such as cars and bicycles.','Sert à compter les véhicules à roues, comme les voitures et les vélos.','Считает колёсный транспорт, например автомобили и велосипеды.','Araba ve bisiklet gibi tekerlekli araçları sayar.'),
      examples:[from06('c06-t41')]}],
  },
  {
    id:'drinks', label:C('Drinks','Boissons','Напитки','İçecekler'),
    entries:[{hanzi:'杯', pinyin:'bēi', use:C('Counts cups or glasses of a drink.','Sert à compter les tasses ou les verres d’une boisson.','Считает чашки или стаканы напитка.','Bir içeceğin fincan veya bardak sayısını belirtir.'),
      examples:[lessonExample(lesson07ById.get('c07-s60')!,lesson07Audio({id:'c07-s60'}),7)]}],
  },
];
