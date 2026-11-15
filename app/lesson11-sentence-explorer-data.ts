import {C, lesson11ById, lesson11Pronunciation} from './lesson11-data';

export const sentenceExplorerLabel = C('Sentence Explorer','Explorateur de phrases','Разбор предложения','Cümle gezgini');
export const sentenceExplorerOrigin = 'c11-s021';

export const transportChoices = {
  metro: {lessonId: sentenceExplorerOrigin, hanzi: '地铁', pinyin: 'dìtiě'},
  taxi: {lessonId: 'c11-s025', hanzi: '出租车', pinyin: 'chūzūchē'},
} as const;

export type TransportChoice = keyof typeof transportChoices;

export function lesson11TransportSentence(choice: TransportChoice) {
  const transport = transportChoices[choice];
  const sentence = lesson11ById.get(transport.lessonId);
  const recording = sentence && lesson11Pronunciation(sentence);
  if (!sentence || !recording) throw Error('Missing Lesson 11 transport example or recording.');

  const parts = [
    {id:'subject', hanzi:'我', pinyin:'wǒ', label:C('Who','Qui','Кто','Kim'),
      explanation:C('The person making the trip.','La personne qui fait le trajet.','Кто совершает поездку.','Yolculuğu yapan kişi.')},
    {id:'vehicle-verb', hanzi:'坐', pinyin:'zuò', label:C('Travel by','Moyen de déplacement','Как едет','Nasıl gidiyor'),
      explanation:C('Put 坐 before the vehicle to say how you travel as a passenger.','Placez 坐 avant le véhicule pour dire comment vous voyagez en tant que passager.','坐 перед названием транспорта показывает, на чём едут пассажиром.','Yolcu olarak neyle gittiğinizi söylemek için taşıttan önce 坐 kullanın.')},
    {id:'vehicle', hanzi:transport.hanzi, pinyin:transport.pinyin, label:C('Vehicle','Véhicule','Транспорт','Taşıt'),
      explanation:C('This is the one part you can swap. Both choices work after 坐.','C’est le seul élément que vous pouvez changer. Les deux choix conviennent après 坐.','Только эту часть можно заменить. Оба варианта сочетаются с 坐.','Yalnızca bu kısmı değiştirebilirsiniz. İki seçenek de 坐 ile kullanılır.')},
    {id:'movement', hanzi:'来', pinyin:'lái', label:C('Direction','Direction','Направление','Yön'),
      explanation:C('来 means “come”. It points towards the place being talked about, here the school.','来 signifie « venir ». Le mouvement se fait vers le lieu dont on parle, ici l’école.','来 означает «приходить, приезжать» к месту, о котором говорят. Здесь это школа.','来 “gelmek” demektir. Yön, söz konusu yere, burada okula doğrudur.')},
    {id:'destination', hanzi:'学校', pinyin:'xuéxiào', label:C('Destination','Destination','Место назначения','Varış yeri'),
      explanation:C('学校 is where the person comes. It goes after 来.','学校 est le lieu où l’on vient. Il se place après 来.','学校 обозначает место прибытия и стоит после 来.','学校 varış yeridir ve 来 sözcüğünden sonra gelir.')},
  ];
  return {sentence, recording, parts};
}
