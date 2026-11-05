"""Reviewed additions from the two 4-Nov visual / transport source PDFs.
Append only: published IDs and original sentences keep their exact meaning.
"""
def extend(d,C):
 words='''transport|走路|zǒu lù|walk; go on foot|marcher ; aller à pied|идти пешком|yürümek; yaya gitmek
transport|骑自行车|qí zìxíngchē|ride a bicycle|faire du vélo|ехать на велосипеде|bisiklete binmek
transport|骑电动车|qí diàndòngchē|ride an e-bike|rouler à vélo électrique|ехать на электровелосипеде|elektrikli bisiklete binmek
transport|坐公交车|zuò gōngjiāochē|take the bus|prendre le bus|ехать на автобусе|otobüse binmek
transport|坐出租车|zuò chūzūchē|take a taxi|prendre un taxi|ехать на такси|taksiye binmek
transport|叫网约车|jiào wǎngyuēchē|book an app-based ride|réserver une voiture avec une application|заказать поездку через приложение|uygulamadan araç çağırmak
transport|坐火车|zuò huǒchē|take the train|prendre le train|ехать на поезде|trene binmek
transport|坐高铁|zuò gāotiě|take a high-speed train|prendre le train à grande vitesse|ехать на скоростном поезде|hızlı trene binmek
transport|坐飞机|zuò fēijī|take a plane; fly|prendre l’avion|лететь на самолёте|uçağa binmek
transport|打车|dǎ chē|get a taxi / ride-hailing car|prendre un taxi / un VTC|вызвать такси|taksi çağırmak
transport|打的|dǎ dī|take a taxi (colloquial)|prendre un taxi (familier)|взять такси (разговорное)|taksiye binmek (gündelik)
transport|滴滴|Dīdī|DiDi; a ride-hailing app|DiDi ; application de VTC|DiDi; приложение для вызова машины|DiDi; araç çağırma uygulaması
transport|骑|qí|ride a bicycle or a similar vehicle|monter à vélo ou sur un véhicule similaire|ехать верхом; на велосипеде|bisiklet vb. sürmek
transport|开|kāi|drive; open (context matters)|conduire ; ouvrir (selon le contexte)|водить; открывать (по контексту)|sürmek; açmak (bağlama göre)
transport|打|dǎ|hail (a taxi); strike (context matters)|héler un taxi ; frapper (selon le contexte)|вызывать такси; ударять (по контексту)|taksi çağırmak; vurmak (bağlama göre)
transport|叫|jiào|call; order; be called|appeler ; commander ; s’appeler|звать; заказывать; называться|çağırmak; sipariş etmek; adı olmak
transport|租|zū|rent; hire|louer|арендовать|kiralamak
campus|在|zài|be at; located at|être à ; se trouver|находиться|bir yerde bulunmak
day|再|zài|then; again|puis ; de nouveau|затем; снова|sonra; tekrar
campus|哪里|nǎlǐ|where (variant of 哪儿)|où (variante de 哪儿)|где (вариант 哪儿)|nerede (哪儿 biçiminin eşdeğeri)
weather|两千|liǎng qiān|two thousand|deux mille|две тысячи|iki bin
weather|找到|zhǎo dào|find; successfully locate|trouver|найти|bulmak
weather|带|dài|bring; take along|emporter ; apporter|брать с собой; приносить|yanına almak; getirmek
weather|点外卖|diǎn wàimài|order food delivery|commander un repas à livrer|заказывать еду с доставкой|yemek sipariş etmek'''
 for line in words.splitlines():
  family,hz,py,*meaning=line.split('|');d['words'].append(dict(id=f"c12-w{len(d['words'])+1:03}",family=family,hanzi=hz,pinyin=py,meaning=C(*meaning),origin='supplement'))
 sentences='''transport|我|走路|去学校。|Wǒ zǒu lù qù xuéxiào.|I walk to school.|Je vais à l’école à pied.|Я иду в школу пешком.|Okula yürüyerek giderim.
transport|我|骑电动车|去学校。|Wǒ qí diàndòngchē qù xuéxiào.|I ride an e-bike to school.|Je vais à l’école à vélo électrique.|Я еду в школу на электровелосипеде.|Okula elektrikli bisikletle giderim.
transport|我|坐公交车|回家。|Wǒ zuò gōngjiāochē huí jiā.|I take the bus home.|Je rentre chez moi en bus.|Я еду домой на автобусе.|Eve otobüsle dönerim.
transport|我想|打车，|不想|租车。|Wǒ xiǎng dǎ chē, bù xiǎng zū chē.|I want to get a taxi, not rent a car.|Je veux prendre un taxi, pas louer une voiture.|Я хочу вызвать такси, а не арендовать машину.|Taksi çağırmak istiyorum, araba kiralamak istemiyorum.
transport|我们|坐高铁|去上海。|Wǒmen zuò gāotiě qù Shànghǎi.|We take the high-speed train to Shanghai.|Nous allons à Shanghai en train à grande vitesse.|Мы едем в Шанхай на скоростном поезде.|Şanghay’a hızlı trenle gideriz.
transport|我|骑自行车|去书店。|Wǒ qí zìxíngchē qù shūdiàn.|I ride a bicycle to the bookshop.|Je vais à la librairie à vélo.|Я еду в книжный магазин на велосипеде.|Kitapçıya bisikletle giderim.
transport|我|坐出租车|回家。|Wǒ zuò chūzūchē huí jiā.|I take a taxi home.|Je rentre chez moi en taxi.|Я еду домой на такси.|Eve taksiyle dönerim.
transport|我|叫网约车|去学校。|Wǒ jiào wǎngyuēchē qù xuéxiào.|I book an app-based ride to school.|Je réserve une voiture avec une application pour aller à l’école.|Я заказываю поездку в школу через приложение.|Okula gitmek için uygulamadan araç çağırırım.
transport|我|坐火车|去上海。|Wǒ zuò huǒchē qù Shànghǎi.|I take the train to Shanghai.|Je vais à Shanghai en train.|Я еду в Шанхай на поезде.|Şanghay’a trenle giderim.
transport|我|坐飞机|去上海。|Wǒ zuò fēijī qù Shànghǎi.|I fly to Shanghai.|Je vais à Shanghai en avion.|Я лечу в Шанхай на самолёте.|Şanghay’a uçakla giderim.
transport|我|开车|去学校。|Wǒ kāi chē qù xuéxiào.|I drive to school.|Je vais à l’école en voiture, au volant.|Я сам веду машину в школу.|Okula arabayı kendim sürerek giderim.
transport|我|租车|去旅行。|Wǒ zū chē qù lǚxíng.|I rent a car for a trip.|Je loue une voiture pour voyager.|Я арендую машину для поездки.|Seyahat için araba kiralarım.
campus|银行|在|东边。|Yínháng zài dōngbian.|The bank is to the east.|La banque est à l’est.|Банк находится на востоке.|Banka doğuda.
campus|这是|书店，|东边的那座楼|是银行。|Zhè shì shūdiàn, dōngbian de nà zuò lóu shì yínháng.|This is the bookshop; the building east of it is the bank.|Voici la librairie ; le bâtiment à l’est est la banque.|Это книжный магазин; здание к востоку от него — банк.|Burası kitapçı; doğusundaki bina banka.
campus|谢谢！|不客气！|Xièxie! Bú kèqi!|Thank you! You’re welcome!|Merci ! De rien !|Спасибо! Не за что!|Teşekkürler! Rica ederim!
campus|这是|书店，|那是|银行。|Zhè shì shūdiàn, nà shì yínháng.|This is the bookshop; that is the bank.|Voici la librairie ; là-bas, c’est la banque.|Это книжный магазин, а то — банк.|Burası kitapçı, orası banka.
campus|那座楼|是四号楼，|我的宿舍|在四号楼。|Nà zuò lóu shì sì hào lóu, wǒ de sùshè zài sì hào lóu.|That is Building 4; my dorm room is in Building 4.|C’est le bâtiment 4 ; ma chambre y est.|Это здание № 4; моя комната в нём.|O bina 4 numaralı bina; yurt odam orada.
campus|书店|在哪儿？|Shūdiàn zài nǎr?|Where is the bookshop?|Où est la librairie ?|Где книжный магазин?|Kitapçı nerede?
campus|学校|在|宿舍南边。|Xuéxiào zài sùshè nánbian.|The school is south of the dormitory.|L’école est au sud de la résidence.|Школа находится к югу от общежития.|Okul yurdun güneyinde.
campus|请问，|银行|在哪里？|Qǐngwèn, yínháng zài nǎlǐ?|Excuse me, where is the bank?|Excusez-moi, où est la banque ?|Скажите, пожалуйста, где банк?|Affedersiniz, banka nerede?
weather|外面|下雨了，|带雨伞吧。|Wàimian xià yǔ le, dài yǔsǎn ba.|It is raining outside; take an umbrella.|Il pleut dehors ; emporte un parapluie.|На улице пошёл дождь; возьми зонт.|Dışarıda yağmur yağıyor; yanına şemsiye al.
weather|我|想|点外卖。|Wǒ xiǎng diǎn wàimài.|I want to order food delivery.|Je veux commander un repas à livrer.|Я хочу заказать еду с доставкой.|Yemek sipariş etmek istiyorum.
weather|我|在找|我的钱。|Wǒ zài zhǎo wǒ de qián.|I am looking for my money.|Je cherche mon argent.|Я ищу свои деньги.|Paramı arıyorum.
weather|外面|下雨了，|我|带雨伞。|Wàimian xià yǔ le, wǒ dài yǔsǎn.|It is raining outside; I take an umbrella.|Il pleut dehors ; je prends un parapluie.|На улице пошёл дождь; я беру зонт.|Dışarıda yağmur yağıyor; şemsiyemi alıyorum.
weather|我|有|两千块钱。|Wǒ yǒu liǎng qiān kuài qián.|I have two thousand yuan.|J’ai deux mille yuans.|У меня две тысячи юаней.|İki bin yuanım var.'''
 for i,line in enumerate(sentences.splitlines()):
  parts=line.split('|');family=parts[0];chunks=parts[1:-5];d['sentences'].append(dict(id=f"c12-s{len(d['sentences'])+1:03}",family=family,hanzi=''.join(chunks),chunks=chunks,pinyin=parts[-5],meaning=C(*parts[-4:]),origin='practice' if 5<=i<12 else 'supplement'))
 d['topics'].append({'id':'transport','title':C('Choose how to travel','Choisir son transport','Выбираем транспорт','Nasıl gideceğini seç'),'pattern':'走 · 骑 · 坐 · 开 · 打 / 叫 · 租'})
 d['provenance']['supplements']=['Chinese_Practice_OS_Directions_Visual_Hybrid_EN_iPad_SAFE.pdf','Chinese_Classroom_Hybrid_Home_Day_Transport_EN_iPad_SAFE_v3.pdf']
