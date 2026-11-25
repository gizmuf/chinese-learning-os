import type {Locale} from './translate';
import type {Position} from './atlas-build-view';

type Copy = Record<Locale, string>;
const copy = (en: string, fr: string, ru: string, tr: string): Copy => ({en, fr, ru, tr});

export const positionPartsCopy = {
  title: copy('Character parts', 'Composants du caractère', 'Части иероглифа', 'Karakter bileşenleri'),
  layout: copy('Parts layout', 'Disposition des composants', 'Вид панели частей', 'Bileşen paneli'),
  beside: copy('Beside the family', 'À côté de la famille', 'Рядом с семьёй', 'Ailenin yanında'),
  below: copy('Under the tiles', 'Sous les caractères', 'Под карточками', 'Kartların altında'),
  popup: copy('Popup', 'Fenêtre flottante', 'Всплывающее окно', 'Açılır pencere'),
  close: copy('Close', 'Fermer', 'Закрыть', 'Kapat'),
  character: copy('Character', 'Caractère', 'Иероглиф', 'Karakter'),
  word: copy('In a word', 'Dans un mot', 'В слове', 'Sözcük içinde'),
  inside: copy('Inside', 'Dans', 'Внутри', 'İçinde'),
  meaning: copy('Meaning cue', 'Indice de sens', 'Подсказка к значению', 'Anlam ipucu'),
  sound: copy('Sound cue', 'Indice de prononciation', 'Подсказка к чтению', 'Okunuş ipucu'),
  oldSound: copy('Historical sound cue', 'Indice phonétique historique', 'Историческая подсказка к чтению', 'Tarihsel okunuş ipucu'),
  shape: copy('Written shape', 'Forme écrite', 'Письменная форма', 'Yazı biçimi'),
  cue: copy('Memory cue', 'Astuce de mémorisation', 'Ассоциация для запоминания', 'Hatırlama ipucu'),
  example: copy('In use', 'En contexte', 'В употреблении', 'Kullanımda'),
  words: copy('Words with', 'Mots avec', 'Слова с', 'İçeren sözcükler:'),
  source: copy('CUHK source', 'Source CUHK', 'Источник CUHK', 'CUHK kaynağı'),
  examplePanel: copy('Hand forms in a sentence', 'Formes de la main dans une phrase', 'Формы руки в одном предложении', 'Cümlede el biçimleri'),
  unknown: copy('Unresolved part', 'Composant non identifié', 'Неопределённая часть', 'Belirlenmemiş bileşen'),
  empty: copy('No component breakdown is available for this character.', 'Aucune décomposition disponible pour ce caractère.', 'Для этого иероглифа нет разбора.', 'Bu karakter için bileşen çözümlemesi yok.'),
  meaningNote: copy('This component hints at the meaning of the whole character.', 'Ce composant donne un indice sur le sens du caractère entier.', 'Этот компонент подсказывает значение целого иероглифа.', 'Bu bileşen karakterin anlamına dair ipucu verir.'),
  soundNote: copy('Compare the reading of this component with the reading of the whole character.', 'Comparez la lecture de ce composant à celle du caractère entier.', 'Сравните чтение этой части с чтением целого иероглифа.', 'Bu bileşenin okunuşunu karakterin okunuşuyla karşılaştırın.'),
  shapeNote: copy('Use this shape to recognise the character. Its role in this character has not been reviewed.', 'Utilisez cette forme pour reconnaître le caractère. Son rôle dans ce caractère reste à vérifier.', 'Эта форма помогает узнать иероглиф. Её роль в этом иероглифе ещё не проверена.', 'Karakteri tanımak için bu biçimi kullanın. Bu karakterdeki rolü henüz incelenmedi.'),
};

const regionLabels: Record<Position, Copy> = {
  'left': copy('Left', 'À gauche', 'Слева', 'Solda'),
  'middle': copy('Middle', 'Au milieu', 'Посередине', 'Ortada'),
  'right': copy('Right', 'À droite', 'Справа', 'Sağda'),
  'top': copy('Top', 'En haut', 'Сверху', 'Üstte'),
  'bottom': copy('Bottom', 'En bas', 'Снизу', 'Altta'),
  'upper left': copy('Upper left', 'En haut à gauche', 'Сверху слева', 'Sol üstte'),
  'upper right': copy('Upper right', 'En haut à droite', 'Сверху справа', 'Sağ üstte'),
  'lower left': copy('Lower left', 'En bas à gauche', 'Снизу слева', 'Sol altta'),
  'lower right': copy('Lower right', 'En bas à droite', 'Снизу справа', 'Sağ altta'),
  'around': copy('Around', 'Autour', 'Снаружи', 'Çevrede'),
  'inside': copy('Inside', 'À l’intérieur', 'Внутри', 'İçte'),
  'overlapping': copy('Overlapping', 'Superposé', 'Перекрытие', 'Üst üste'),
};

export const partPosition = (position: Position, locale: Locale) => regionLabels[position]?.[locale] ?? position;
type Role = 'meaning' | 'sound' | 'oldSound' | 'shape';
type PartNote = {role: Role; text: Copy};
const note = (role: Role, text: Copy): PartNote => ({role, text});
const hand = note('meaning', copy('The hand on the left often points to an action done by hand.', 'La main à gauche indique souvent une action faite à la main.', 'Рука слева часто указывает на действие рукой.', 'Soldaki el, çoğunlukla elle yapılan bir hareketi çağrıştırır.'));
const bottomHand = note('meaning', copy('The full hand at the bottom suggests handling or holding something.', 'La main entière en bas évoque le geste de tenir ou de saisir.', 'Полная форма руки внизу напоминает о хватании и удержании.', 'Alttaki tam el biçimi, tutmayı veya kavramayı çağrıştırır.'));

export const componentNotes: Readonly<Record<string, PartNote>> = {
  '看手': note('meaning', copy('A modified hand above the eye. Together they suggest shading your eyes to look.', 'Une main modifiée au-dessus de l’œil. Imaginez la main qui protège les yeux pour mieux voir.', 'Изменённая форма руки над глазом. Вместе они напоминают жест, когда ладонью прикрывают глаза от солнца.', 'Gözün üstünde elin değişmiş biçimi. İkisi, daha iyi görmek için gözü elle gölgelemeyi çağrıştırır.')),
  '看目': note('meaning', copy('目 is the eye. It points to looking or seeing.', '目 représente l’œil et évoque le regard ou la vue.', '目 — глаз. Он связан со взглядом и зрением.', '目 gözdür. Bakmayı veya görmeyi çağrıştırır.')),
  '打扌': hand, '找扌': hand, '拍扌': hand, '搬扌': hand, '把扌': hand,
  '拿手': bottomHand, '握扌': hand,
  '打丁': note('oldSound', copy('丁, read dīng on its own today, was the sound component. 打 is pronounced dǎ.', '丁, lu dīng aujourd’hui, servait d’indice phonétique. 打 se prononce dǎ.', '丁, который сейчас читается dīng, был фонетиком. 打 произносится dǎ.', 'Bugün tek başına dīng okunan 丁, tarihsel ses bileşenidir. 打 ise dǎ okunur.')),
  '找戈': note('oldSound', copy('戈 is the dagger-axe shape. It supplied a historical sound clue.', '戈 a la forme d’une hache-dague et donnait un indice phonétique.', '戈 изображает древнее оружие и исторически подсказывал чтение.', '戈, eski bir silahın biçimidir ve tarihsel bir ses ipucu verir.')),
  '拍白': note('oldSound', copy('白 means “white” on its own. It served as a sound component in early forms of 拍.', '白 signifie « blanc » seul. Il servait d’indice phonétique dans d’anciennes formes de 拍.', 'Самостоятельно 白 означает «белый». В ранних формах 拍 он подсказывал чтение.', '白 tek başına “beyaz” demektir. 拍 karakterinin eski biçimlerinde ses bileşeni olarak kullanılmıştır.')),
  '把巴': note('sound', copy('巴 bā helps you remember the syllable in 把 bǎ. Listen for the different tone.', '巴 bā aide à retenir la syllabe de 把 bǎ. Écoutez la différence de ton.', '巴 bā помогает запомнить слог в 把 bǎ. Обратите внимание на разницу в тонах.', '巴 bā, 把 bǎ hecesini hatırlatır. Tonların farklı olduğuna dikkat edin.')),
  '拿合': note('oldSound', copy('合 is the upper component. It means “join” and is read hé on its own today.', '合 est le composant supérieur. Seul, il signifie « unir » et se lit hé aujourd’hui.', '合 находится сверху. Сам по себе он означает «соединять» и сейчас читается hé.', '合 üstteki bileşendir. Tek başına “birleştirmek” anlamına gelir ve bugün hé okunur.')),
  '搬般': note('sound', copy('般 and 搬 both read bān. Open the parts inside 般 to see how the right side is built.', '般 et 搬 se lisent tous deux bān. Ouvrez les composants de 般 pour comprendre le côté droit.', '般 и 搬 читаются bān. Откройте части 般, чтобы разобрать правую сторону.', '般 ve 搬, bān okunur. Sağ tarafın yapısını görmek için 般 içindeki bileşenleri açın.')),
  '般舟': note('shape', copy('舟 means “boat”. Its outline makes up the left side of 般.', '舟 signifie « bateau ». Sa forme constitue le côté gauche de 般.', '舟 означает «лодка». Его контур образует левую сторону 般.', '舟 “tekne” demektir. Biçimi 般 karakterinin sol tarafını oluşturur.')),
  '般殳': note('shape', copy('殳 is an old weapon shape. Look for it on the right of 般.', '殳 représente une arme ancienne. Repérez cette forme à droite de 般.', '殳 — форма старинного оружия. Ищите её справа в 般.', '殳 eski bir silahın biçimidir. 般 karakterinin sağında yer alır.')),
  '话讠': note('meaning', copy('讠 is the simplified speech component. It points to words or talking.', '讠 est la forme simplifiée du composant de la parole. Il évoque les mots ou la conversation.', '讠 — упрощённый компонент речи. Он связан со словами и разговором.', '讠 basitleştirilmiş konuşma bileşenidir. Sözcükleri veya konuşmayı çağrıştırır.')),
  '话舌': note('shape', copy('The right side looks like 舌, “tongue”. The historical form had a sound component in this position.', 'Le côté droit ressemble à 舌, « langue ». La forme ancienne avait un composant phonétique à cet endroit.', 'Правая сторона похожа на 舌 «язык». В исторической форме на этом месте был фонетик.', 'Sağ taraf “dil” anlamındaki 舌 biçimine benzer. Tarihsel biçimde burada bir ses bileşeni vardı.')),
};

export const memoryCues: Readonly<Record<string, Copy>> = {
  看: copy('Shade your eyes with your hand to look into the distance.', 'Protégez vos yeux du soleil avec la main pour regarder au loin.', 'Прикройте глаза ладонью от солнца и посмотрите вдаль.', 'Uzağa bakmak için elinizle gözlerinizi gölgeleyin.'),
  打: copy('Picture a hand tapping a T-shaped peg.', 'Imaginez une main qui tape sur une cheville en forme de T.', 'Представьте, как рука стучит по колышку в форме буквы Т.', 'Bir elin T biçiminde bir çiviye vurduğunu hayal edin.'),
  搬: copy('Picture moving a small boat by hand. Spot the boat inside the right side.', 'Imaginez déplacer un petit bateau à la main. Repérez-le dans la partie droite.', 'Представьте, как переносите лодку руками. Найдите её в правой части.', 'Küçük bir tekneyi elinizle taşıdığınızı hayal edin. Sağ taraftaki tekneyi bulun.'),
  拿: copy('Picture a hand reaching up to take a phone from a shelf.', 'Imaginez une main qui saisit un téléphone sur une étagère.', 'Представьте руку, которая тянется вверх за телефоном на полке.', 'Bir raftan telefon almak için yukarı uzanan bir el hayal edin.'),
};

export const componentGlosses: Readonly<Record<string, {pinyin: string; meaning: Copy}>> = {
  '殳': {pinyin: 'shū', meaning: copy('old weapon', 'arme ancienne', 'старинное оружие', 'eski silah')},
  '丁': {pinyin: 'dīng', meaning: copy('peg-like shape', 'forme de cheville', 'форма колышка', 'çiviye benzer biçim')},
  '戈': {pinyin: 'gē', meaning: copy('dagger-axe', 'hache-dague', 'боевой топор', 'eski savaş baltası')},
  '白': {pinyin: 'bái', meaning: copy('white', 'blanc', 'белый', 'beyaz')},
  '合': {pinyin: 'hé', meaning: copy('join', 'unir', 'соединять', 'birleştirmek')},
  '般': {pinyin: 'bān', meaning: copy('kind, sort', 'genre, sorte', 'вид, род', 'tür, çeşit')},
  '舟': {pinyin: 'zhōu', meaning: copy('boat', 'bateau', 'лодка', 'tekne')},
  '舌': {pinyin: 'shé', meaning: copy('tongue', 'langue', 'язык', 'dil')},
};
