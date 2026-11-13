"""Reproducible transcription of the 30 classroom photographs, 26 October 2026.
Photographs stay local. B=board, V=classroom video excerpt, E=authored extension.
"""
import json
from pathlib import Path
def copy(en,fr,ru): return dict(en=en,fr=fr,ru=ru)
topics=[]
def topic(id,title,note,photos):
    topics.append(dict(id=id,title=copy(*title),note=copy(*note),photos=photos))
topic('meet',('Meet again, introduce yourself','Se retrouver et se présenter','Встреча и знакомство'),(
 '我叫 + name introduces you. 也 goes before the predicate: 我也很高兴. 自己 means “oneself”; 一下 makes an action brief or softens a request. 好久不见 is a greeting after time apart. In speech, 不 before a fourth tone becomes bú; dictionaries still list bù.',
 '我叫 + prénom sert à se présenter. 也 précède le prédicat : 我也很高兴. 自己 signifie « soi-même » ; 一下 indique une action brève ou adoucit une demande. 好久不见 se dit après une longue séparation. À l’oral, 不 devant un quatrième ton devient bú ; le dictionnaire indique bù.',
 '我叫 + имя — представление. 也 стоит перед сказуемым: 我也很高兴. 自己 — «сам, себя»; 一下 обозначает краткость или смягчает просьбу. 好久不见 говорят после долгой разлуки. Перед четвёртым тоном 不 произносится bú; словарный тон — bù.'),[72,76,82,83])
topic('both',('Two qualities, one pattern','Deux qualités, une construction','Два качества — одна конструкция'),(
 '又 A 又 B and 既 A 又 B connect two descriptions of the same subject. Practise a complete frame, then replace one block. 不 stays inside the second description in 又贵又不好吃. These frames can also join suitable actions; they are not restricted to positive adjectives.',
 '又 A 又 B et 既 A 又 B relient deux descriptions du même sujet. Réutilisez la structure entière en changeant un bloc. 不 reste dans la seconde description : 又贵又不好吃. Ces structures peuvent aussi relier certaines actions ; elles ne sont pas réservées aux adjectifs positifs.',
 '又 A 又 B и 既 A 又 B соединяют два описания одного предмета. Выучите рамку и меняйте один блок. 不 остаётся внутри второго описания: 又贵又不好吃. Эти конструкции могут соединять и подходящие действия; они не ограничены положительными прилагательными.'),[80,82,88])
topic('senses',('What your senses suggest','Ce que suggèrent les sens','Что подсказывают чувства'),(
 '看 / 听 / 闻 / 尝 + 起来 + description reports an impression: looks, sounds, smells or tastes. Here 起来 does not mean “stand up”. 好听 describes a pleasant sound; 好吃 describes pleasant food. 首 counts songs. Compare 问 wèn “ask” and 闻 wén “smell”: tone and written component both differ.',
 '看 / 听 / 闻 / 尝 + 起来 + description exprime une impression visuelle, sonore, olfactive ou gustative. Ici, 起来 ne signifie pas « se lever ». 好听 concerne un son agréable ; 好吃, un aliment. 首 compte les chansons. Comparez 问 wèn « demander » et 闻 wén « sentir » : le ton et le composant écrit diffèrent.',
 '看 / 听 / 闻 / 尝 + 起来 + описание передаёт впечатление: выглядит, звучит, пахнет, на вкус. Здесь 起来 не означает «встать». 好听 — о приятном звуке; 好吃 — о вкусной еде. 首 — счётное слово для песен. Сравните 问 wèn «спрашивать» и 闻 wén «нюхать»: различаются тон и компонент.'),[83,89,99])
topic('ready',('Feelings, time to prepare, ready','Émotions et préparation','Чувства и готовность'),(
 'Learn 高兴 gāoxìng and 兴奋 xīngfèn as whole words: 兴 has different readings. 让 + person + description means “make someone feel…”. 准备好 means “get ready”; in 我准备好了, 好 gives the achieved result and 了 marks the new situation. It is not a general past-tense ending. 十五分钟 is a duration; 十五分钟后 is a later point.',
 'Apprenez 高兴 gāoxìng et 兴奋 xīngfèn comme des mots entiers : 兴 change de lecture. 让 + personne + description signifie « rendre quelqu’un… ». 准备好 signifie « être prêt » ; dans 我准备好了, 好 exprime le résultat et 了 la nouvelle situation, pas un passé général. 十五分钟 est une durée ; 十五分钟后, un moment ultérieur.',
 'Учите 高兴 gāoxìng и 兴奋 xīngfèn целиком: чтение 兴 меняется. 让 + человек + описание — «вызывать у кого-то состояние». 准备好 — «подготовиться»; в 我准备好了 好 указывает достигнутый результат, 了 — новую ситуацию, а не общее прошедшее время. 十五分钟 — длительность, 十五分钟后 — момент позже.'),[89,90,99])
topic('time',('After, days and generations','Après, les jours et les générations','После, дни и поколения'),(
 'Put 后 after a time or event: 八点后, 饭后, 十五分钟后. Compare Lesson 3’s 昨天 / 明天 with the new greeting 明天见. 90后 names people born in 1990–1999, not an age. 白 bái “white”, 百 bǎi “hundred” and 自 zì “self” need separate readings. The walking proverb is a traditional saying, not a medical promise; sunrise and sunset times vary.',
 '后 suit un moment ou un événement : 八点后, 饭后, 十五分钟后. Retrouvez 昨天 / 明天 de la leçon 3 dans 明天见. 90后 désigne les personnes nées de 1990 à 1999, pas un âge. 白 bái « blanc », 百 bǎi « cent » et 自 zì « soi » se lisent différemment. Le proverbe sur la marche n’est pas une promesse médicale ; les heures du lever et du coucher du soleil varient.',
 '后 ставится после времени или события: 八点后, 饭后, 十五分钟后. Вспомните 昨天 / 明天 из урока 3 в новом 明天见. 90后 — люди, родившиеся в 1990–1999 годах, а не возраст. Различайте 白 bái «белый», 百 bǎi «сто» и 自 zì «сам». Пословица о ходьбе — не медицинское обещание; время восхода и заката меняется.'),[72,74,76,78,80])
topic('classroom',('Follow a short conversation','Suivre une courte conversation','Понимаем короткий разговор'),(
 'Read in small meaning groups, not character by character. 在 + place + action recalls Lesson 4; 在…中 means “in/during…” in the new context. …的时候 gives a time setting, 或者 offers an alternative. 变得 + adjective describes a change. The classroom video fragments are grouped into complete practice sentences; added endings are labelled as extensions.',
 'Lisez par petits groupes de sens. 在 + lieu + action rappelle la leçon 4 ; 在…中 signifie ici « dans/pendant… ». …的时候 situe le moment ; 或者 propose une alternative. 变得 + adjectif décrit un changement. Les fragments de la vidéo du cours sont complétés pour la pratique ; les ajouts sont signalés.',
 'Читайте смысловыми группами. 在 + место + действие напоминает урок 4; 在…中 в новом контексте — «в/во время…». …的时候 задаёт время, 或者 предлагает альтернативу. 变得 + прилагательное обозначает изменение. Фрагменты видео дополнены до учебных предложений; добавления отмечены.'),[84,85,86,87,91,92,95,96,100,101])
terms=[]; sentences=[]
def rows(text,topic,kind,photos):
    dest=terms if kind=='t' else sentences
    for line in text.strip().splitlines():
        hz,py,en,fr,ru,origin=line.split('|')
        dest.append(dict(id=f'c05-{kind}{len(dest)+1:02}',topic=topic,hanzi=hz,pinyin=py,meaning=copy(en,fr,ru),source='extension' if origin=='E' else 'video' if origin=='V' else 'board',photos=photos))
rows('''好久不见|hǎo jiǔ bú jiàn|long time no see|ça fait longtemps|давно не виделись|B
明天见|míngtiān jiàn|see you tomorrow|à demain|до завтра|B
认识|rènshi|to know; to meet|connaître ; faire connaissance|знать; знакомиться|B
高兴|gāoxìng|happy; pleased|content ; heureux|радостный; довольный|B
也|yě|also; too|aussi|тоже|B
自己|zìjǐ|oneself|soi-même|сам; себя|B
介绍|jièshào|to introduce|présenter|представлять; знакомить|V
一下|yíxià|briefly; a little|un instant ; un peu|немного; ненадолго|V
欢迎|huānyíng|to welcome|accueillir ; bienvenue|приветствовать; добро пожаловать|B
欢迎光临|huānyíng guānglín|welcome (to a shop or venue)|bienvenue (dans un établissement)|добро пожаловать (в заведение)|B
来到|láidào|to arrive at; come to|arriver à ; venir à|прибывать; приходить в|V
回到|huídào|to return to|retourner à|возвращаться в|V''','meet','t',[72,76,82,83,84])
rows('''又|yòu|both… (in 又…又…); again|à la fois… (又…又…) ; encore|и… (в 又…又…); снова|B
既|jì|both… (in 既…又…)|à la fois… (既…又…)|и… (в 既…又…)|B
便宜|piányi|inexpensive|bon marché|недорогой|B
贵|guì|expensive|cher|дорогой|B
好吃|hǎochī|tasty|bon (au goût)|вкусный|B
包子|bāozi|steamed bun|petit pain farci à la vapeur|паровая булочка с начинкой|B
简单|jiǎndān|simple|simple|простой|V
有趣|yǒuqù|interesting; fun|intéressant ; amusant|интересный; увлекательный|V
胖|pàng|plump; fat|rond ; gros|полный; толстый|B''','both','t',[80,82,88])
rows('''看起来|kàn qǐlái|to look; seem visually|avoir l’air|выглядеть; казаться на вид|B
听起来|tīng qǐlái|to sound; seem when heard|sembler à l’écoute|звучать; казаться на слух|B
闻起来|wén qǐlái|to smell (give an impression)|sentir (dégager une odeur)|пахнуть|B
尝起来|cháng qǐlái|to taste (give an impression)|avoir un goût|быть на вкус|B
苹果|píngguǒ|apple|pomme|яблоко|B
首|shǒu|classifier for songs and poems|classificateur des chansons et poèmes|счётное слово для песен и стихов|B
歌|gē|song|chanson|песня|B
好听|hǎotīng|pleasant to listen to|agréable à écouter|приятный на слух|B
臭豆腐|chòu dòufu|stinky tofu|tofu fermenté à forte odeur|ферментированный тофу с сильным запахом|B
臭|chòu|smelly; stinky|malodorant|вонючий|B
问|wèn|to ask|demander|спрашивать|B
闻|wén|to smell; to hear news|sentir ; apprendre une nouvelle|нюхать; слышать новости|B''','senses','t',[83,89,99])
rows('''兴奋|xīngfèn|excited|enthousiaste ; excité|воодушевлённый; возбуждённый|B
咖啡|kāfēi|coffee|café|кофе|B
让|ràng|to let; to make someone…|laisser ; rendre quelqu’un…|позволять; вызывать у кого-то…|B
准备|zhǔnbèi|to prepare|préparer|готовить; готовиться|B
准备好|zhǔnbèi hǎo|to get ready|être prêt|подготовиться|B
分钟|fēnzhōng|minute|minute|минута|B
需要|xūyào|to need|avoir besoin de|нуждаться|E''','ready','t',[89,90,99])
rows('''后|hòu|after; behind|après ; derrière|после; позади|B
饭后|fàn hòu|after a meal|après le repas|после еды|B
昨天|zuótiān|yesterday|hier|вчера|B
今天|jīntiān|today|aujourd’hui|сегодня|B
明天|míngtiān|tomorrow|demain|завтра|B
后天|hòutiān|the day after tomorrow|après-demain|послезавтра|B
日出|rìchū|sunrise|lever du soleil|восход солнца|B
日落|rìluò|sunset|coucher du soleil|закат|B
白|bái|white|blanc|белый|B
百|bǎi|hundred|cent|сто|B
九十九|jiǔshíjiǔ|ninety-nine|quatre-vingt-dix-neuf|девяносто девять|B
活|huó|to live; alive|vivre ; vivant|жить; живой|B
年代|niándài|decade; era|décennie ; époque|десятилетие; эпоха|E''','time','t',[72,74,76,78,80])
rows('''问题|wèntí|question; problem|question ; problème|вопрос; проблема|V
话题|huàtí|topic of conversation|sujet de conversation|тема разговора|V
常见|chángjiàn|common; often seen|courant|распространённый|V
经常|jīngcháng|often|souvent|часто|V
重要|zhòngyào|important|important|важный|V
或者|huòzhě|or (an alternative)|ou (une possibilité)|или (вариант)|V
朋友|péngyou|friend|ami|друг|V
有时候|yǒu shíhou|sometimes|parfois|иногда|V
知道|zhīdào|to know (a fact)|savoir|знать (факт)|V
谈谈|tán tan|to talk a little|discuter un peu|немного поговорить|V
变得|biàn de|to become (before a description)|devenir (avant une description)|становиться (перед описанием)|V
课堂|kètáng|classroom; class session|classe ; cours|аудитория; занятие|V''','classroom','t',[84,85,86,87,91,92,95,96,100,101])
rows('''我叫小花。|Wǒ jiào Xiǎohuā.|My name is Xiaohua.|Je m’appelle Xiaohua.|Меня зовут Сяохуа.|B
我叫大卫。|Wǒ jiào Dàwèi.|My name is David.|Je m’appelle David.|Меня зовут Давид.|B
认识你很高兴。|Rènshi nǐ hěn gāoxìng.|Pleased to meet you.|Enchanté de faire ta connaissance.|Рад с тобой познакомиться.|B
认识你我也很高兴。|Rènshi nǐ wǒ yě hěn gāoxìng.|I am pleased to meet you too.|Moi aussi, je suis ravi de te rencontrer.|Я тоже рад с тобой познакомиться.|B
请介绍一下你自己。|Qǐng jièshào yíxià nǐ zìjǐ.|Please briefly introduce yourself.|Présente-toi brièvement, s’il te plaît.|Пожалуйста, кратко представься.|V
我自己做。|Wǒ zìjǐ zuò.|I do it myself.|Je le fais moi-même.|Я делаю это сам.|B
大家好，很高兴来到这里。|Dàjiā hǎo, hěn gāoxìng láidào zhèlǐ.|Hello everyone, I am happy to be here.|Bonjour à tous, je suis heureux d’être ici.|Всем привет, я рад быть здесь.|V''','meet','s',[76,82,83,84,87])
rows('''这个包子又贵又不好吃。|Zhège bāozi yòu guì yòu bù hǎochī.|This bun is expensive and not tasty.|Ce petit pain est cher et n’est pas bon.|Эта булочка и дорогая, и невкусная.|B
这个包子又便宜又好吃。|Zhège bāozi yòu piányi yòu hǎochī.|This bun is inexpensive and tasty.|Ce petit pain est bon marché et délicieux.|Эта булочка и недорогая, и вкусная.|E
在这里学习中文既简单又有趣。|Zài zhèlǐ xuéxí Zhōngwén jì jiǎndān yòu yǒuqù.|Learning Chinese here is both simple and interesting.|Apprendre le chinois ici est à la fois simple et intéressant.|Учить китайский здесь и просто, и интересно.|V
他又白又胖。|Tā yòu bái yòu pàng.|He is fair-skinned and plump.|Il a la peau claire et il est rond.|Он светлокожий и полный.|B''','both','s',[80,82,88])
rows('''这个苹果看起来很好吃。|Zhège píngguǒ kàn qǐlái hěn hǎochī.|This apple looks tasty.|Cette pomme a l’air bonne.|Это яблоко выглядит вкусным.|B
这首歌听起来很好听。|Zhè shǒu gē tīng qǐlái hěn hǎotīng.|This song sounds lovely.|Cette chanson est agréable à écouter.|Эта песня приятно звучит.|B
臭豆腐闻起来很臭。|Chòu dòufu wén qǐlái hěn chòu.|Stinky tofu smells strong.|Le tofu fermenté sent très fort.|Ферментированный тофу сильно пахнет.|B
这个包子尝起来很好吃。|Zhège bāozi cháng qǐlái hěn hǎochī.|This bun tastes delicious.|Ce petit pain est délicieux.|Эта булочка вкусная.|E
你想问什么问题？|Nǐ xiǎng wèn shénme wèntí?|What question do you want to ask?|Quelle question veux-tu poser ?|Какой вопрос ты хочешь задать?|E''','senses','s',[83,89,99])
rows('''咖啡让我兴奋。|Kāfēi ràng wǒ xīngfèn.|Coffee makes me excited.|Le café m’excite.|Кофе меня возбуждает.|B
我对我们今天的话题很兴奋。|Wǒ duì wǒmen jīntiān de huàtí hěn xīngfèn.|I am excited about today’s topic.|Le sujet d’aujourd’hui m’enthousiasme.|Меня воодушевляет наша сегодняшняя тема.|V
那么，小明，你准备好了吗？|Nàme, Xiǎomíng, nǐ zhǔnbèi hǎo le ma?|So, Xiaoming, are you ready?|Alors, Xiaoming, es-tu prêt ?|Итак, Сяомин, ты готов?|V
我准备好了。|Wǒ zhǔnbèi hǎo le.|I am ready now.|Ça y est, je suis prêt.|Я уже готов.|B
我需要十五分钟准备。|Wǒ xūyào shíwǔ fēnzhōng zhǔnbèi.|I need fifteen minutes to prepare.|J’ai besoin de quinze minutes pour me préparer.|Мне нужно пятнадцать минут на подготовку.|E
十五分钟后，我准备好了。|Shíwǔ fēnzhōng hòu, wǒ zhǔnbèi hǎo le.|Fifteen minutes later, I was ready.|Quinze minutes plus tard, j’étais prêt.|Через пятнадцать минут я был готов.|E''','ready','s',[89,90,99])
rows('''八点后，我在家。|Bā diǎn hòu, wǒ zài jiā.|After eight, I am at home.|Après huit heures, je suis chez moi.|После восьми я дома.|E
饭后百步走，活到九十九。|Fàn hòu bǎi bù zǒu, huó dào jiǔshíjiǔ.|Walk a hundred steps after a meal, live to ninety-nine (traditional saying).|Cent pas après le repas, vivre jusqu’à quatre-vingt-dix-neuf ans (proverbe).|Сто шагов после еды — доживёшь до девяноста девяти (пословица).|B
你是几零后？|Nǐ shì jǐ líng hòu?|Which decade cohort were you born in?|De quelle génération décennale es-tu ?|В каком десятилетии ты родился?|B
我是九零后。|Wǒ shì jiǔ líng hòu.|I was born in the 1990s.|Je suis né dans les années 1990.|Я родился в девяностые.|E
明天见！|Míngtiān jiàn!|See you tomorrow!|À demain !|До завтра!|B''','time','s',[72,74,78,80])
rows('''这是一个很常见的问题。|Zhè shì yí ge hěn chángjiàn de wèntí.|This is a very common question.|C’est une question très courante.|Это очень распространённый вопрос.|V
人们经常问这个问题。|Rénmen jīngcháng wèn zhège wèntí.|People often ask this question.|Les gens posent souvent cette question.|Люди часто задают этот вопрос.|V
在新的课堂上，人们会问这个问题。|Zài xīn de kètáng shàng, rénmen huì wèn zhège wèntí.|In a new class, people may ask this question.|Dans un nouveau cours, les gens peuvent poser cette question.|На новом занятии люди могут задать этот вопрос.|E
认识新朋友的时候，人们会问这个问题。|Rènshi xīn péngyou de shíhou, rénmen huì wèn zhège wèntí.|When meeting new friends, people may ask this question.|En rencontrant de nouveaux amis, on peut poser cette question.|При знакомстве с новыми друзьями могут задать этот вопрос.|E
有时候很难知道该说什么。|Yǒu shíhou hěn nán zhīdào gāi shuō shénme.|Sometimes it is hard to know what to say.|Parfois, il est difficile de savoir quoi dire.|Иногда трудно понять, что сказать.|V
所以今天我们会谈谈这个话题。|Suǒyǐ jīntiān wǒmen huì tán tan zhège huàtí.|So today we will talk a little about this topic.|Aujourd’hui, nous allons donc parler un peu de ce sujet.|Поэтому сегодня мы немного поговорим об этой теме.|V
我们会让它变得简单又有趣。|Wǒmen huì ràng tā biàn de jiǎndān yòu yǒuqù.|We will make it simple and interesting.|Nous allons rendre cela simple et intéressant.|Мы сделаем это простым и интересным.|V''','classroom','s',[91,92,95,96,100,101])
data=dict(date='2026-10-26',title=copy('Meet, describe & get ready','Se présenter, décrire et se préparer','Знакомимся, описываем и готовимся'),topics=topics,terms=terms,sentences=sentences)
Path('data/lesson05/content.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'Lesson05: {len(terms)} expressions, {len(sentences)} sentences, {len(topics)} topics')
