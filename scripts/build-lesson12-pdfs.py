"""Four hybrid workbooks, embedded subset fonts; content shared with Lesson 12."""
import json,html,hashlib,math,argparse
from pathlib import Path
import pymupdf as f
from fontTools.ttLib import TTFont
from fontTools import subset
P=argparse.ArgumentParser();P.add_argument('--font',required=True);P.add_argument('--out',required=True);P.add_argument('--qa',required=True);a=P.parse_args()
d=json.loads(Path('data/lesson12/content.json').read_text());out=Path(a.out);qa=Path(a.qa);out.mkdir(parents=True,exist_ok=True);qa.mkdir(parents=True,exist_ok=True)
langs=['en','fr','ru','tr'];C=lambda *s:dict(zip(langs,s));E=lambda s:html.escape(str(s))
labels={
 'title':d['title'],'read':C('Read in meaning groups','Lire par groupes de sens','Читайте смысловыми блоками','Anlam gruplarıyla oku'),
 'words':C('Words & connections','Mots et liens','Слова и связи','Sözcükler ve bağlantılar'),
 'write':C('Hanzi + Pinyin by hand','Hanzi et pinyin à la main','Ханьцзы и пиньинь от руки','Elle Hanzi ve Pinyin'),
 'practice':C('Try without the model','Essayer sans modèle','Попробуйте без образца','Örneğe bakmadan dene'),
 'answers':C('Check after your attempt','Vérifier après votre essai','Проверьте после попытки','Denedikten sonra kontrol et'),
 'guide':C('Look → listen → cover → recall → write → type','Regarder → écouter → cacher → rappeler → écrire → saisir','Смотрите → слушайте → закройте → вспомните → напишите → напечатайте','Bak → dinle → kapat → hatırla → yaz → klavyede dene'),
 'map':C('Where is the building?','Où est le bâtiment ?','Где находится здание?','Bina nerede?'),
 'mapnote':C('Teaching diagram. North is always up. East is right. The front dormitory row is nearer the school.','Schéma pédagogique. Le nord reste en haut, l’est à droite. Le premier rang des résidences est plus près de l’école.','Учебная схема. Север сверху, восток справа. Передний ряд общежитий ближе к школе.','Öğretim şeması. Kuzey yukarıda, doğu sağdadır. Ön sıradaki yurtlar okula daha yakındır.'),
 'perspectiveTitle':C('Change your viewpoint','Changer de point de vue','Смените точку зрения','Bakış yönünü değiştir'),
 'perspective':C('Left and right depend on which way you face. North and south do not change.','Gauche et droite dépendent de votre orientation. Nord et sud ne changent pas.','Лево и право зависят от направления взгляда. Север и юг не меняются.','Sol ve sağ baktığın yöne bağlıdır. Kuzey ve güney değişmez.'),
 'writehelp':C('One model, three attempts. Cover the model; write BOTH the Hanzi and tone-marked Pinyin.','Un modèle, trois essais. Cacher le modèle et écrire les hanzi ET le pinyin avec tons.','Один образец и три попытки. Закройте образец; напишите И ханьцзы, И пиньинь с тонами.','Bir örnek, üç deneme. Örneği kapat; HEM Hanzi HEM ton işaretli Pinyin yaz.'),
 'model':C('Model / trace','Modèle / tracé','Образец / обводка','Örnek / üzerinden geç'),
 'recall':C('From memory','De mémoire','По памяти','Bellekten'),
 'hanzi':C('Hanzi','Hanzi','Ханьцзы','Hanzi'),'pinyin':C('Pinyin with tones','Pinyin avec tons','Пиньинь с тонами','Ton işaretli Pinyin'),
 'hint':C('Related example','Exemple complémentaire','Дополнительный пример','Ek örnek'),
 'ime':C('Use your Chinese keyboard. Type the Pinyin letters without tone marks, then select the intended Hanzi candidate.','Utiliser le clavier chinois : saisir le pinyin sans tons, puis choisir le bon candidat.','На китайской клавиатуре вводите пиньинь без тонов и выбирайте нужный иероглиф.','Çince klavyede Pinyin harflerini tonsuz yaz, ardından doğru Hanzi adayını seç.'),
 'say':C('Speak, then check','Dire, puis vérifier','Скажите, затем проверьте','Söyle, sonra kontrol et'),
}
extra='北东南西前后左右面对坐做座钱千找租房出租车课客国天一二三四号楼书店银行学校宿舍一直往前走两把一张一套雨伞'
font=TTFont(a.font);opts=subset.Options();opts.retain_gids=True;sub=subset.Subsetter(options=opts);sub.populate(text=json.dumps(d,ensure_ascii=False)+json.dumps(labels,ensure_ascii=False)+extra);sub.subset(font);font.save(qa/'lesson12-cjk.otf')
cmap=TTFont(qa/'lesson12-cjk.otf').getBestCmap();missing={ch for ch in json.dumps(d,ensure_ascii=False)+extra if '\u3400'<=ch<='\u9fff' and ord(ch) not in cmap};assert not missing,missing
archive=f.Archive(str(qa));archive.add(str(Path('public/fonts').resolve()))
CSS="@font-face{font-family:CJK;src:url('lesson12-cjk.otf')}@font-face{font-family:Latin;src:url('NotoSans-Regular.ttf')}body{font-family:Latin,CJK;font-size:10pt;line-height:1.38;color:#29483d}p{margin:0 0 4pt}.hz{font-family:CJK;font-size:19pt;line-height:1.4}.py{font-family:Latin;font-size:9pt;color:#977746}.note{font-size:8pt;color:#6d7f68}.chunk{background:#edf2e7;border-bottom:1pt solid #c7d7bd;padding:0 2pt}"
forest=(.18,.32,.25);green=(.8,.85,.76);pale=(.96,.97,.94);gray=(.75,.79,.71)
def box(p,r,text,size=10):
 spare,scale=p.insert_htmlbox(f.Rect(r),text,css=CSS+f'body{{font-size:{size}pt}}',archive=archive,scale_low=1)
 if spare<0:raise ValueError('Overflow: '+html.unescape(text)[:130])
 return spare

def page(doc,lang,title):
 p=doc.new_page(width=595.276,height=841.89);box(p,(36,23,559,45),'CHINESE OS / LESSON 12 / '+lang.upper(),8);box(p,(36,58,559,112),'<strong>'+E(title)+'</strong>',21);p.draw_line((36,119),(559,119),color=green,width=1);return p

def reading(p,row,y,lang):
 p.draw_rect(f.Rect(36,y,559,y+118),fill=pale,color=green,radius=.06,width=.6)
 chunks=' '.join('<span class="chunk">'+E(ch)+'</span>' for ch in row['chunks'])
 text='<p class="hz">'+chunks+'</p><p class="py">'+E(row['pinyin'])+'</p><p>'+E(row['meaning'][lang])+'</p>'
 if row['origin']=='practice':text+='<span class="note">'+E(labels['hint'][lang])+'</span>'
 box(p,(47,y+8,548,y+112),text,9)

buildings=[('3号楼',1,0),('4号楼',3,0),('1号楼',1,1),('2号楼',3,1),('书店',1,2),('银行',3,2),('学校',2,4)]
def mapdraw(p,y=160):
 rect=f.Rect(80,y,515,y+350);p.draw_rect(rect,fill=pale,color=green,radius=.04)
 p.draw_line((300,y+13),(300,y+331),color=(.88,.9,.85),width=17);p.draw_line((88,y+217),(507,y+217),color=(.88,.9,.85),width=17)
 for name,x,row in buildings:
  xx=100+x*77;yy=y+20+row*61;r=f.Rect(xx-27,yy,xx+53,yy+43);p.draw_rect(r,fill=(1,1,1),color=gray,radius=.12);box(p,(r.x0+4,r.y0+6,r.x1-4,r.y1-4),'<span class="hz">'+E(name)+'</span>',10)
 box(p,(433,y+4,508,y+58),'<p>↑ N</p><span class="hz">北</span>',11)

words={w['hanzi']:w for w in d['words']};selected=['公寓','卧室','厨房','卫生间','房间','出租车','租房','驾驶证','做作业','坐地铁','回家','睡觉','东边','西边','南边','北边','前边','后边','左边','右边','银行','书店','学校','宿舍','一直','左转','钱','千']
mapqs=['银行在书店的哪边？','书店在银行的哪边？','一号楼在书店的哪边？','书店在一号楼的哪边？','四号楼在三号楼的哪边？','三号楼在四号楼的哪边？','四号楼在二号楼的哪边？','二号楼在四号楼的哪边？']
mapanswers=['东边','西边','北边','南边','东边','西边','北边','南边']
materials=[]
for lang in langs:
 doc=f.open();p=page(doc,lang,d['title'][lang]);box(p,(36,145,559,255),'<p>'+E(labels['guide'][lang])+'</p><p>'+E(C('Classroom material: 4 November 2026. Home, renting, routine, buildings and directions.','Cours du 4 novembre 2026 : logement, location, journée, bâtiments et directions.','Материалы занятия 4 ноября 2026: жильё, аренда, распорядок, здания и направления.','4 Kasım 2026 dersi: ev, kiralama, günlük düzen, binalar ve yönler.')[lang])+'</p>',12)
 for i,topic in enumerate(d['topics']):
  y=276+i*57;box(p,(44,y,551,y+52),'<strong>'+E(topic['title'][lang])+'</strong><br/><span class="hz">'+E(topic['pattern'])+'</span>',10)
 box(p,(36,720,559,780),'<p class="note">'+E(C('Original class sentences are retained; related examples are marked. Textbook maps are redrawn as teaching diagrams. Pinyin displays 一/不 tone changes in phrases; the syllable 边 is neutral here.','Phrases du cours conservées ; ajouts signalés. Cartes redessinées. Le pinyin note les changements de ton de 一/不 ; 边 est neutre ici.','Предложения занятия сохранены, дополнения отмечены. Карты перерисованы. Пиньинь передаёт изменения тонов 一/不; 边 здесь нейтральный.','Ders cümleleri korunur, ekler işaretlidir. Haritalar yeniden çizilir. Pinyin, 一/不 ton değişimlerini gösterir; 边 burada nötrdür.')[lang])+'</p>',9)
 p=page(doc,lang,labels['map'][lang]);mapdraw(p);box(p,(36,530,559,600),E(labels['mapnote'][lang]),11)
 for i,s in enumerate(['银行在书店东边。','书店在银行西边。','宿舍楼都在北边。']):
  row=next(v for v in d['sentences'] if v['hanzi']==s);box(p,(40,616+i*51,555,664+i*51),'<span class="hz">'+E(s)+'</span><br/><span class="py">'+E(row['pinyin'])+'</span>',10)
 p=page(doc,lang,labels['perspectiveTitle'][lang]);box(p,(36,138,559,196),E(labels['perspective'][lang]),12)
 for i,(name,rows) in enumerate([(C('Facing north','Face au nord','Лицом на север','Kuzeye bakarken')[lang],[('东边','右边'),('西边','左边'),('北边','前边'),('南边','后边')]),(C('Facing south','Face au sud','Лицом на юг','Güneye bakarken')[lang],[('东边','左边'),('西边','右边'),('北边','后边'),('南边','前边')])]):
  x=36+i*267;box(p,(x,218,x+255,259),'<strong>'+E(name)+'</strong>',14)
  for j,(a1,b1) in enumerate(rows):box(p,(x,272+j*65,x+255,331+j*65),'<p class="hz">'+a1+' → '+b1+'</p><p class="py">'+E(words[a1]['pinyin'])+' → '+E(words[b1]['pinyin'])+'</p>',11)
 box(p,(36,565,559,652),E(C('Memory cue: 东西 means east–west, but dōngxi also means “things”. The compass directions have a stable map reference; left/right use the person’s orientation.','Repère : 东西 signifie est–ouest, mais dōngxi veut aussi dire « objets ». Les directions ont un repère fixe ; gauche/droite dépendent de la personne.','Подсказка: 东西 — восток–запад, а dōngxi — «вещи». Стороны света имеют постоянную точку отсчёта, лево/право зависят от человека.','İpucu: 东西 doğu–batı demektir; dōngxi ise “şeyler” anlamına da gelir. Yönler sabittir; sağ/sol kişinin bakışına bağlıdır.')[lang]),11)
 box(p,(36,676,559,766),'<span class="hz">A 在 B 的……边。</span><br/>'+E(C('Name A, choose reference B, then add the direction. The 的 is often omitted: 银行在书店东边。','Nommer A, choisir le repère B, puis la direction. 的 peut être omis : 银行在书店东边。','Назовите A, выберите ориентир B и добавьте направление. 的 часто опускается: 银行在书店东边。','A’yı söyle, B referansını seç, yönü ekle. 的 sıkça atılır: 银行在书店东边。')[lang]),11)
 for offset in range(0,len(d['sentences']),5):
  p=page(doc,lang,labels['read'][lang])
  for j,row in enumerate(d['sentences'][offset:offset+5]):reading(p,row,134+j*126,lang)
 for offset in range(0,len(d['words']),13):
  p=page(doc,lang,labels['words'][lang])
  for j,row in enumerate(d['words'][offset:offset+13]):
   y=134+j*47;p.draw_line((36,y+43),(559,y+43),color=green,width=.4);box(p,(40,y,198,y+41),'<span class="hz">'+E(row['hanzi'])+'</span>',11);box(p,(205,y+2,349,y+41),'<span class="py">'+E(row['pinyin'])+'</span>',9);box(p,(352,y+2,555,y+42),E(row['meaning'][lang]),8.6)
 for offset in range(0,len(selected),4):
  p=page(doc,lang,labels['write'][lang]);box(p,(36,133,559,176),E(labels['writehelp'][lang]),10)
  for j,hz in enumerate(selected[offset:offset+4]):
   row=words[hz];y=186+j*145;box(p,(36,y,559,y+34),'<span class="hz">'+E(hz)+'</span> <span class="py">'+E(row['pinyin'])+'</span> · '+E(row['meaning'][lang]),9)
   for k in range(4):
    x=36+k*132;r=f.Rect(x,y+38,x+124,y+111);p.draw_rect(r,color=gray,width=.6);p.draw_line((x,y+75),(x+124,y+75),color=green,width=.3)
    if k==0:box(p,(x+4,y+46,x+120,y+106),'<span class="hz" style="color:#bcc9b1">'+E(hz)+'</span><br/><span class="py" style="color:#bcc9b1">'+E(row['pinyin'])+'</span>',8)
    box(p,(x+3,y+115,x+124,y+134),E(labels['model' if k==0 else 'recall'][lang]),7)
 p=page(doc,lang,labels['practice'][lang]+' / 1');mapdraw(p,142)
 for i,text in enumerate(mapqs):
  y=514+i*31;box(p,(40,y,416,y+29),f'{i+1}. <span class="hz" style="font-size:14pt">'+text+'</span>',10);p.draw_line((425,y+25),(552,y+25),color=gray,width=.6)
 p=page(doc,lang,labels['practice'][lang]+' / 2');box(p,(36,136,559,193),E(labels['ime'][lang]),11)
 for j,(letters,candidates,context) in enumerate([('zuo','坐 / 做 / 座','我……地铁。'),('zuo','坐 / 做 / 座','我……作业。'),('zuo','坐 / 做 / 座','一……楼。'),('qian','钱 / 千 / 前','请找我十块……。'),('fang','方 / 房 / 放','……间'),('shi','试 / 室 / 事','卧……'),('ke','课 / 客 / 可','上……'),('zhao','找 / 我 / 戏','我……书店。')]):
  y=211+j*60;box(p,(40,y,559,y+55),f'<strong>{j+1}. {letters}</strong> · <span class="hz">'+context+'</span><br/><span class="hz" style="font-size:14pt">'+candidates+'</span>',10)
 p=page(doc,lang,labels['practice'][lang]+' / 3');box(p,(36,135,559,190),E(C('Write the missing system: Hanzi → Pinyin with tones; Pinyin → Hanzi.','Écrire le système manquant : hanzi → pinyin avec tons ; pinyin → hanzi.','Заполните пропуски: ханьцзы → пиньинь с тонами; пиньинь → ханьцзы.','Eksik sistemi yaz: Hanzi → tonlu Pinyin; Pinyin → Hanzi.')[lang]),11)
 for i,hz in enumerate(['东边','银行','厨房','坐地铁','钱','千','学校','雨伞']):
  row=words[hz];y=209+i*53;text=hz if i<4 else row['pinyin'];box(p,(40,y,290,y+44),'<span class="hz">'+E(text)+'</span>',12);p.draw_line((310,y+37),(550,y+37),color=gray,width=.7)
 box(p,(40,657,559,760),'<p><strong>'+E(labels['say'][lang])+'</strong></p><span class="hz">银行在哪儿？你的宿舍在哪座楼？你几点起床？</span>',11)
 p=page(doc,lang,labels['answers'][lang]);box(p,(36,140,559,190),'<strong>'+E(labels['map'][lang])+'</strong>',14)
 for i,hz in enumerate(mapanswers):box(p,(45,196+i*42,550,235+i*42),f'{i+1}. <span class="hz">'+hz+'</span> <span class="py">'+words[hz]['pinyin']+'</span>',11)
 box(p,(36,565,559,620),'<strong>IME</strong><br/><span class="hz">1 坐 · 2 做 · 3 座 · 4 钱 · 5 房 · 6 室 · 7 课 · 8 找</span>',11)
 box(p,(36,650,559,776),'<strong>'+E(labels['hanzi'][lang])+' / '+E(labels['pinyin'][lang])+'</strong><p class="py">dōngbian · yínháng · chúfáng · zuò dìtiě</p><p class="hz">钱 · 千 · 学校 · 雨伞</p>',11)
 for i,p in enumerate(doc):p.draw_line((36,800),(559,800),color=green,width=.6);box(p,(36,807,500,831),'Chinese OS · Hanzi / Pinyin / IME · 04.11.2026',7);p.insert_text((505,819),str(i+1)+' / '+str(len(doc)),fontname='helv',fontsize=7,color=forest)
 name='Chinese_Practice_Lesson_12_HYBRID_'+lang.upper()+'_iPad_SAFE.pdf';dest=out/('hybrid-'+lang+'.pdf');doc.set_metadata({'title':'Chinese OS · Lesson 12 · '+d['title'][lang],'author':'Chinese OS','subject':'Home, daily routine and campus directions; Hanzi, Pinyin and IME'});doc.save(dest,garbage=4,deflate=True);b=dest.read_bytes();materials.append(dict(locale=lang,label={'en':'English','fr':'Français','ru':'Русский','tr':'Türkçe'}[lang],filename=name,pages=len(doc),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),path='resources/lesson12/hybrid-'+lang+'.pdf'));print(lang,len(doc),len(b));doc.close()
Path('data/lesson12/materials.json').write_text(json.dumps(materials,ensure_ascii=False,indent=2)+'\n')
