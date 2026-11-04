"""Authored lesson from the supplied 4 Nov handout and classroom photographs."""
import json
from pathlib import Path

def C(en,fr,ru,tr):return dict(zip(['en','fr','ru','tr'],[en,fr,ru,tr]))
words='''home|公寓|gōngyù|apartment|appartement|квартира|daire
home|卧室|wòshì|bedroom|chambre|спальня|yatak odası
home|厨房|chúfáng|kitchen|cuisine|кухня|mutfak
home|卫生间|wèishēngjiān|bathroom|salle de bains|ванная комната|banyo
home|客厅|kètīng|living room|salon|гостиная|oturma odası
home|房间|fángjiān|room|pièce|комната|oda
home|床|chuáng|bed|lit|кровать|yatak
home|桌子|zhuōzi|table; desk|table; bureau|стол|masa
home|椅子|yǐzi|chair|chaise|стул|sandalye
home|一套|yí tào|one set; classifier for an apartment|un ensemble ; classificateur d’appartement|один комплект; счётное слово для квартиры|bir takım; daire için sayma sözcüğü
home|一张|yì zhāng|one flat object; classifier for a bed or desk|un objet plat ; classificateur de lit ou table|один плоский предмет; счётное слово для кровати и стола|bir düz nesne; yatak ve masa için sayma sözcüğü
home|两把|liǎng bǎ|two; classifier for chairs or handled objects|deux ; classificateur de chaises ou objets à manche|два; счётное слово для стульев и предметов с ручкой|iki; sandalye ve saplı nesneler için sayma sözcüğü
rent|租房|zū fáng|rent a home|louer un logement|снимать жильё|ev kiralamak
rent|租车|zū chē|rent a car|louer une voiture|арендовать машину|araba kiralamak
rent|出租车|chūzūchē|taxi|taxi|такси|taksi
rent|坐|zuò|sit; take transport|s’asseoir ; prendre un transport|сидеть; ехать на транспорте|oturmak; taşıta binmek
rent|做|zuò|do; make|faire|делать|yapmak
rent|座|zuò|classifier for buildings, mountains and bridges|classificateur de bâtiments, montagnes et ponts|счётное слово для зданий, гор и мостов|bina, dağ ve köprü için sayma sözcüğü
rent|驾驶证|jiàshǐzhèng|driver’s licence|permis de conduire|водительское удостоверение|sürücü belgesi
rent|开车|kāi chē|drive a car|conduire|водить машину|araba sürmek
day|起床|qǐ chuáng|get up|se lever|вставать|kalkmak
day|早饭|zǎofàn|breakfast|petit-déjeuner|завтрак|kahvaltı
day|午饭|wǔfàn|lunch|déjeuner|обед|öğle yemeği
day|晚饭|wǎnfàn|dinner|dîner|ужин|akşam yemeği
day|上课|shàng kè|attend class|aller en cours|заниматься на уроке|derse girmek
day|下课|xià kè|finish class|finir le cours|заканчивать урок|dersi bitirmek
day|做作业|zuò zuòyè|do homework|faire ses devoirs|делать домашнее задание|ödev yapmak
day|坐地铁|zuò dìtiě|take the metro|prendre le métro|ехать на метро|metroya binmek
day|回家|huí jiā|return home|rentrer chez soi|возвращаться домой|eve dönmek
day|复习|fùxí|review; revise|réviser|повторять|tekrar etmek
day|睡觉|shuì jiào|sleep; go to bed|dormir ; se coucher|спать; ложиться спать|uyumak; yatmak
day|大概|dàgài|approximately; before the time expression|environ ; avant l’heure|примерно; перед обозначением времени|yaklaşık; saat ifadesinden önce
day|左右|zuǒyòu|about; after the time expression|environ ; après l’heure|около; после обозначения времени|civarı; saat ifadesinden sonra
directions|东边|dōngbian|east; eastern side|à l’est ; côté est|восток; восточная сторона|doğu; doğu tarafı
directions|西边|xībian|west; western side|à l’ouest ; côté ouest|запад; западная сторона|batı; batı tarafı
directions|南边|nánbian|south; southern side|au sud ; côté sud|юг; южная сторона|güney; güney tarafı
directions|北边|běibian|north; northern side|au nord ; côté nord|север; северная сторона|kuzey; kuzey tarafı
directions|前边|qiánbian|in front; depends on the viewpoint|devant ; selon le point de vue|впереди; зависит от точки зрения|ön; bakış yönüne bağlı
directions|后边|hòubian|behind; depends on the viewpoint|derrière ; selon le point de vue|сзади; зависит от точки зрения|arka; bakış yönüne bağlı
directions|左边|zuǒbian|left; depends on which way you face|à gauche ; selon l’orientation|слева; зависит от направления взгляда|sol; bakış yönüne bağlı
directions|右边|yòubian|right; depends on which way you face|à droite ; selon l’orientation|справа; зависит от направления взгляда|sağ; bakış yönüne bağlı
campus|银行|yínháng|bank|banque|банк|banka
campus|书店|shūdiàn|bookshop|librairie|книжный магазин|kitapçı
campus|学校|xuéxiào|school|école|школа|okul
campus|宿舍|sùshè|dormitory|résidence étudiante|общежитие|yurt
campus|楼|lóu|building; storey|bâtiment ; étage|здание; этаж|bina; kat
campus|号|hào|number; label for a building|numéro de bâtiment|номер здания|bina numarası
campus|地方|dìfang|place|endroit|место|yer
campus|哪儿|nǎr|where|où|где|nerede
campus|一座楼|yí zuò lóu|one building|un bâtiment|одно здание|bir bina
route|一直|yìzhí|continuously; straight on in a route|sans interruption ; tout droit pour un trajet|всё время; прямо при описании пути|sürekli; yol tarifinde dümdüz
route|往|wǎng|towards; in the direction of|vers ; en direction de|по направлению к|doğru; yönünde
route|走|zǒu|walk; go on foot|marcher ; aller à pied|идти пешком|yürümek
route|左转|zuǒ zhuǎn|turn left|tourner à gauche|повернуть налево|sola dönmek
route|右转|yòu zhuǎn|turn right|tourner à droite|повернуть направо|sağa dönmek
route|路口|lùkǒu|intersection|carrefour|перекрёсток|kavşak
weather|下雨|xià yǔ|rain; be raining|pleuvoir|идти о дожде|yağmur yağmak
weather|雨伞|yǔsǎn|umbrella|parapluie|зонт|şemsiye
weather|外卖|wàimài|takeaway; food delivery|repas à emporter ; livraison|еда навынос; доставка еды|paket yemek; yemek teslimatı
weather|钱|qián|money|argent|деньги|para
weather|千|qiān|thousand|mille|тысяча|bin
weather|找|zhǎo|look for; give change|chercher ; rendre la monnaie|искать; давать сдачу|aramak; para üstü vermek
weather|用|yòng|use|utiliser|использовать|kullanmak
weather|勇敢|yǒnggǎn|brave|courageux|смелый|cesur
weather|祈祷|qídǎo|pray|prier|молиться|dua etmek'''
sentences='''home|我|有|一套公寓。|Wǒ yǒu yí tào gōngyù.|I have an apartment.|J’ai un appartement.|У меня есть квартира.|Bir dairem var.
home|我的公寓里|有|两个卧室。|Wǒ de gōngyù lǐ yǒu liǎng ge wòshì.|There are two bedrooms in my apartment.|Il y a deux chambres dans mon appartement.|В моей квартире две спальни.|Dairemde iki yatak odası var.
home|还有|一个厨房、|一个卫生间|和一个客厅。|Hái yǒu yí ge chúfáng, yí ge wèishēngjiān hé yí ge kètīng.|There is also a kitchen, a bathroom and a living room.|Il y a aussi une cuisine, une salle de bains et un salon.|Также есть кухня, ванная и гостиная.|Ayrıca bir mutfak, bir banyo ve bir oturma odası var.
home|我的房间里|有|一张床、|一张桌子|和两把椅子。|Wǒ de fángjiān lǐ yǒu yì zhāng chuáng, yì zhāng zhuōzi hé liǎng bǎ yǐzi.|My room has a bed, a desk and two chairs.|Dans ma chambre, il y a un lit, un bureau et deux chaises.|В моей комнате кровать, стол и два стула.|Odamda bir yatak, bir masa ve iki sandalye var.
rent|你|想租房|吗？|Nǐ xiǎng zū fáng ma?|Do you want to rent a place?|Veux-tu louer un logement ?|Ты хочешь снять жильё?|Ev kiralamak istiyor musun?
rent|我|要租房，|不是租车。|Wǒ yào zū fáng, bú shì zū chē.|I want to rent a home, not a car.|Je veux louer un logement, pas une voiture.|Я хочу снять жильё, а не арендовать машину.|Araba değil, ev kiralamak istiyorum.
rent|我|想|坐出租车。|Wǒ xiǎng zuò chūzūchē.|I would like to take a taxi.|Je voudrais prendre un taxi.|Я хочу поехать на такси.|Taksiye binmek istiyorum.
rent|你|在干什么？|Nǐ zài gàn shénme?|What are you doing?|Qu’est-ce que tu fais ?|Что ты делаешь?|Ne yapıyorsun?
rent|先考驾驶证，|再开车。|Xiān kǎo jiàshǐzhèng, zài kāi chē.|First get a driver’s licence, then drive.|Passe d’abord le permis, puis conduis.|Сначала получи права, потом води машину.|Önce ehliyet al, sonra araba sür.
day|我|六点半|起床。|Wǒ liù diǎn bàn qǐ chuáng.|I get up at 6:30.|Je me lève à 6 h 30.|Я встаю в 6:30.|Saat 6.30’da kalkarım.
day|六点五十|吃早饭。|Liù diǎn wǔshí chī zǎofàn.|I eat breakfast at 6:50.|Je prends le petit-déjeuner à 6 h 50.|Я завтракаю в 6:50.|Saat 6.50’de kahvaltı ederim.
day|七点半|来学校。|Qī diǎn bàn lái xuéxiào.|I come to school at 7:30.|Je viens à l’école à 7 h 30.|Я прихожу в школу в 7:30.|Saat 7.30’da okula gelirim.
day|八点四十|上课。|Bā diǎn sìshí shàng kè.|Class starts at 8:40.|Le cours commence à 8 h 40.|Урок начинается в 8:40.|Ders saat 8.40’ta başlar.
day|十二点|下课。|Shí’èr diǎn xià kè.|Class ends at noon.|Le cours finit à midi.|Урок заканчивается в полдень.|Ders öğlen biter.
day|十二点一刻|吃午饭。|Shí’èr diǎn yí kè chī wǔfàn.|I eat lunch at 12:15.|Je déjeune à 12 h 15.|Я обедаю в 12:15.|Saat 12.15’te öğle yemeği yerim.
day|下午|我也有课。|Xiàwǔ wǒ yě yǒu kè.|I also have class in the afternoon.|J’ai aussi cours l’après-midi.|После обеда у меня тоже занятия.|Öğleden sonra da dersim var.
day|下课后|我|做作业。|Xià kè hòu wǒ zuò zuòyè.|After class, I do homework.|Après le cours, je fais mes devoirs.|После уроков я делаю домашнее задание.|Dersten sonra ödev yaparım.
day|晚上六点|我|坐地铁|回家。|Wǎnshang liù diǎn wǒ zuò dìtiě huí jiā.|At 6 p.m. I take the metro home.|À 18 heures, je rentre en métro.|В шесть вечера я еду домой на метро.|Akşam altıda metroyla eve dönerim.
day|回家后|我|吃晚饭，|复习汉语。|Huí jiā hòu wǒ chī wǎnfàn, fùxí Hànyǔ.|After getting home, I have dinner and review Chinese.|Après mon retour, je dîne et révise le chinois.|Вернувшись домой, я ужинаю и повторяю китайский.|Eve döndükten sonra akşam yemeği yer, Çince tekrar ederim.
day|我|大概晚上十一点|睡觉。|Wǒ dàgài wǎnshang shíyī diǎn shuì jiào.|I go to bed at about 11 p.m.|Je me couche vers 23 heures.|Я ложусь спать примерно в одиннадцать вечера.|Gece saat on bir civarında yatarım.
campus|请问，|银行|在哪儿？|Qǐngwèn, yínháng zài nǎr?|Excuse me, where is the bank?|Excusez-moi, où est la banque ?|Скажите, пожалуйста, где банк?|Affedersiniz, banka nerede?
campus|银行|在|书店东边。|Yínháng zài shūdiàn dōngbian.|The bank is east of the bookshop.|La banque est à l’est de la librairie.|Банк к востоку от книжного магазина.|Banka kitapçının doğusunda.
campus|这|是|什么地方？|Zhè shì shénme dìfang?|What place is this?|Quel est cet endroit ?|Что это за место?|Burası neresi?
campus|哪座楼|是|银行？|Nǎ zuò lóu shì yínháng?|Which building is the bank?|Quel bâtiment est la banque ?|В каком здании банк?|Hangi bina banka?
campus|宿舍楼|都在|北边。|Sùshè lóu dōu zài běibian.|The dormitory buildings are all in the north.|Les résidences sont toutes au nord.|Все общежития находятся на севере.|Yurt binalarının hepsi kuzeyde.
campus|一号楼、二号楼|在前边，|三号楼、四号楼|在后边。|Yī hào lóu, èr hào lóu zài qiánbian, sān hào lóu, sì hào lóu zài hòubian.|Buildings 1 and 2 are in front; 3 and 4 are behind.|Les bâtiments 1 et 2 sont devant ; les 3 et 4 sont derrière.|Здания 1 и 2 спереди, а 3 и 4 сзади.|1 ve 2 numaralı binalar önde, 3 ve 4 arkada.
campus|我的宿舍|在|四号楼。|Wǒ de sùshè zài sì hào lóu.|My dorm room is in Building 4.|Ma chambre est dans le bâtiment 4.|Моя комната в общежитии в здании 4.|Yurt odam 4 numaralı binada.
route|一直|往前|走。|Yìzhí wǎng qián zǒu.|Go straight ahead.|Allez tout droit.|Идите всё время прямо.|Dümdüz ilerleyin.
route|到路口|往左|转。|Dào lùkǒu wǎng zuǒ zhuǎn.|At the intersection, turn left.|Au carrefour, tournez à gauche.|На перекрёстке поверните налево.|Kavşağa gelince sola dönün.
route|书店|在|银行西边。|Shūdiàn zài yínháng xībian.|The bookshop is west of the bank.|La librairie est à l’ouest de la banque.|Книжный магазин к западу от банка.|Kitapçı bankanın batısında.
weather|今天|下雨，|我|用雨伞。|Jīntiān xià yǔ, wǒ yòng yǔsǎn.|It is raining today; I use an umbrella.|Il pleut aujourd’hui ; j’utilise un parapluie.|Сегодня идёт дождь, я пользуюсь зонтом.|Bugün yağmur yağıyor; şemsiye kullanıyorum.
weather|我|点了|外卖。|Wǒ diǎn le wàimài.|I ordered food delivery.|J’ai commandé un repas à livrer.|Я заказал еду с доставкой.|Yemek sipariş ettim.
weather|请|找我|十块钱。|Qǐng zhǎo wǒ shí kuài qián.|Please give me ten yuan in change.|Rendez-moi dix yuans, s’il vous plaît.|Дайте мне, пожалуйста, десять юаней сдачи.|Lütfen on yuan para üstü verin.
weather|你|很勇敢！|Nǐ hěn yǒnggǎn!|You are brave!|Tu es courageux !|Ты очень смелый!|Çok cesursun!'''
topics=[('home',C('At home','À la maison','Дома','Evde'),'家'),('rent',C('Renting & getting around','Louer et se déplacer','Аренда и транспорт','Kiralama ve ulaşım'),'坐 / 做 / 座'),('day',C('My day','Ma journée','Мой день','Günüm'),'先 → 再'),('directions',C('Find your bearings','Se repérer','Ориентируемся','Yönünü bul'),'北 · 东 · 南 · 西'),('campus',C('Around the campus','Sur le campus','На территории школы','Kampüste'),'A 在 B 的……边'),('route',C('Give directions','Indiquer le chemin','Объясняем дорогу','Yol tarifi'),'往前走 · 左转 · 右转'),('weather',C('Rain, money & similar sounds','Pluie, argent et sons proches','Дождь, деньги и похожие звуки','Yağmur, para ve benzer sesler'),'钱 qián · 千 qiān · 前 qián')]
d={'id':'intensive-12','number':12,'date':'2026-11-04','title':C('Home, my day & finding your way','Chez soi, ma journée et les directions','Дом, мой день и ориентирование','Ev, günüm ve yön bulma'),'topics':[{'id':i,'title':t,'pattern':p} for i,t,p in topics],'words':[],'sentences':[],'provenance':{'pdf':'Chinese_Classroom_Hybrid_Home_Day_EN_iPad.pdf','photos':['IMG_0433','IMG_0435','IMG_0455','IMG_0456','IMG_0457'],'note':'Core home/day material from supplied PDF; campus/locality from textbook photos; route and linking examples are labelled additions. No photographs or personal images are published. The campus is a teaching diagram, not a real geographic map.'}}
for i,line in enumerate(words.splitlines(),1):
 topic,hz,py,*mean=line.split('|');d['words'].append(dict(id=f'c12-w{i:03}',family=topic,hanzi=hz,pinyin=py,meaning=C(*mean),origin='classroom'))
for i,line in enumerate(sentences.splitlines(),1):
 parts=line.split('|');topic=parts[0];mean=parts[-4:];py=parts[-5];chunks=parts[1:-5];d['sentences'].append(dict(id=f'c12-s{i:03}',family=topic,hanzi=''.join(chunks),chunks=chunks,pinyin=py,meaning=C(*mean),origin='practice' if i in [29,30,31,32,33] else 'source'))
for hz,py,ch,mean in [
 ('这是我们学校。','Zhè shì wǒmen xuéxiào.',['这','是','我们学校。'],C('This is our school.','Voici notre école.','Это наша школа.','Burası bizim okulumuz.')),
 ('东边的那座楼是银行。','Dōngbian de nà zuò lóu shì yínháng.',['东边的','那座楼','是银行。'],C('That building on the east side is the bank.','Le bâtiment à l’est est la banque.','То здание с восточной стороны — банк.','Doğudaki o bina banka.'))]:
 d['sentences'].append(dict(id=f"c12-s{len(d['sentences'])+1:03}",family='campus',hanzi=hz,pinyin=py,chunks=ch,meaning=mean,origin='source'))
for hz,py,ch,mean in [
 ('不用。','Bú yòng.',['不用。'],C('No need.','Pas besoin.','Не нужно.','Gerek yok.')),
 ('你在干嘛？','Nǐ zài gàn má?',['你','在干嘛？'],C('What are you doing? (casual)','Tu fais quoi ? (familier)','Что делаешь? (разговорное)','Ne yapıyorsun? (gündelik)')),
 ('今天天气不好。','Jīntiān tiānqì bù hǎo.',['今天','天气','不好。'],C('The weather is bad today.','Il fait mauvais aujourd’hui.','Сегодня плохая погода.','Bugün hava kötü.')),
 ('我不用出租车。','Wǒ bú yòng chūzūchē.',['我','不用','出租车。'],C('I do not need a taxi.','Je n’ai pas besoin de taxi.','Мне не нужно такси.','Taksiye ihtiyacım yok.'))]:
 d['sentences'].append(dict(id=f"c12-s{len(d['sentences'])+1:03}",family='weather',hanzi=hz,pinyin=py,chunks=ch,meaning=mean,origin='source'))
Path('data/lesson12/content.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print(len(d['words']),'words',len(d['sentences']),'sentences')
