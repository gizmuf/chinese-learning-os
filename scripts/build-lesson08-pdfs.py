"""Reproducible Lesson 08 hybrid PDFs; the app and PDFs share content.json.
A4/navy/pale-blue, approved Source Han Serif, white 56.1 pt writing grids.
Flattened RGB delivery copies avoid font substitution in iPad annotation apps.
"""
import argparse,json,html,math,shutil
from pathlib import Path
import pymupdf as f
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
P=argparse.ArgumentParser();P.add_argument('--cjk-font',required=True);P.add_argument('--output',required=True);P.add_argument('--qa',required=True);a=P.parse_args()
d=json.loads(Path('data/lesson08/content.json').read_text());out=Path(a.output);out.mkdir(parents=True,exist_ok=True);qa=Path(a.qa);qa.mkdir(parents=True,exist_ok=True)
fontfile=qa/'lesson08-serif-subset.otf';font=TTFont(a.cjk_font);opts=subset.Options();opts.retain_gids=True;sub=subset.Subsetter(options=opts);sub.populate(text=json.dumps(d,ensure_ascii=False)+'零一二三四五六七八九十点差半刻分');sub.subset(font);font.save(fontfile)
latin=Path('public/fonts/NotoSans-Regular.ttf');archive=f.Archive(str(qa));archive.add(str(latin.parent));font=TTFont(fontfile);cmap=font.getBestCmap();glyphs=font.getGlyphSet();em=font['head'].unitsPerEm;bounds={}
CSS="@font-face{font-family:CJK;src:url('lesson08-serif-subset.otf')}@font-face{font-family:Latin;src:url('NotoSans-Regular.ttf')}body{font-family:Latin,CJK;font-size:10pt;line-height:1.35;color:#1d2f52}p{margin:0 0 4pt}.hz{font-family:CJK;font-size:18pt}.py{font-size:9pt;color:#345fa4}.small{font-size:8pt;color:#64758f}"
COL={k:tuple(int(v[i:i+2],16)/255 for i in (0,2,4)) for k,v in dict(navy='1d2f52',blue='345fa4',pale='eaf1fa',ghost='d3dae5',grid='9fb1cb',guide='cbd5e3').items()}
def C(en,fr,ru,tr):return dict(en=en,fr=fr,ru=ru,tr=tr)
labels={
 'title':C('Time, distance & everyday connections','Heures, distances et liens du quotidien','Время, расстояние и повседневные связи','Saatler, mesafeler ve günlük bağlantılar'),
 'hybrid':C('Hybrid study & handwriting workbook','Cahier hybride : étude et écriture','Гибридная тетрадь: учёба и письмо','Hibrit öğrenme ve yazma kitabı'),
 'intro':C('Read a pattern, use it in context, try without help, then write.','Lire un modèle, l’utiliser en contexte, essayer sans aide, puis écrire.','Изучите конструкцию, примените её, попробуйте без помощи, затем напишите.','Yapıyı oku, bağlamda kullan, yardımsız dene, sonra yaz.'),
 'source':C('From the classroom board; numeric times written out.','Du tableau ; heures numériques écrites en toutes lettres.','С доски; цифровое время записано словами.','Sınıf tahtasından; sayısal saatler yazıyla verildi.'),
 'extra':C('Additional practice example','Exemple complémentaire','Дополнительный пример','Ek alıştırma örneği'),
 'writing':C('Trace, then write from memory','Tracer, puis écrire de mémoire','Обведите, затем напишите по памяти','Üzerinden geç, sonra bellekten yaz'),
 'writingnote':C('Read the whole expression with its meaning. Pale models are for tracing; the white row is for recall.','Lire l’expression entière et son sens. Tracer les modèles pâles, puis écrire sur la ligne blanche.','Прочитайте выражение целиком и его значение. Обведите бледные образцы, затем пишите в пустых клетках.','İfadenin tamamını anlamıyla oku. Soluk modeli izle, sonra boş satırda bellekten yaz.'),
 'read':C('Read first - without pinyin','Lire d’abord - sans pinyin','Сначала прочитайте без пиньиня','Önce pinyin olmadan oku'),
 'answers':C('Answers - open after trying','Réponses - après avoir essayé','Ответы - после самостоятельной попытки','Yanıtlar - önce kendin dene'),
 'recall':C('Recall & speak','Se rappeler et parler','Вспомните и скажите','Hatırla ve söyle'),
 'timeline':C('One hour, several ways to say it','Une heure, plusieurs façons de la dire','Один час: разные способы сказать время','Bir saat, farklı söyleyişler'),
 'model':C('Model / trace','Modèle / tracé','Образец / обводка','Model / üzerinden geç'),
 'blank':C('Write from memory','Écrire de mémoire','Напишите по памяти','Bellekten yaz'),
 'readingnote':C('Describe the schedule, the route and the people. Cover the answers until you finish.','Décrire l’horaire, le trajet et les personnes. Cacher les réponses avant de terminer.','Опишите расписание, маршрут и людей. Сначала закройте ответы.','Programı, rotayı ve kişileri anlat. Bitirene kadar yanıtları kapat.'),
}
def E(x):return html.escape(str(x))
def box(p,r,text,size=10):
 spare,scale=p.insert_htmlbox(f.Rect(r),text,css=CSS+f'body{{font-size:{size}pt}}',archive=archive,scale_low=1)
 if spare<0:raise ValueError('Overflow: '+html.unescape(text)[:160])
 return spare
def page(doc,lang,title):
 p=doc.new_page(width=595.276,height=841.89);box(p,(40,24,555,48),'CHINESE PRACTICE OS / LESSON 08 / '+lang.upper(),8)
 box(p,(40,55,555,98),'<strong>'+E(title)+'</strong>',18);p.draw_line((40,104),(555,104),color=COL['blue'],width=1.2);return p
def sample(p,row,y,lang):
 p.draw_rect(f.Rect(40,y,555,y+101),color=COL['grid'],fill=COL['pale'],width=.5)
 box(p,(49,y+7,546,y+96),'<p class="hz">'+E(row['hanzi'])+'</p><p class="py">'+E(row['pinyin'])+'</p><p>'+E(row['meaning'][lang])+'</p><span class="small">'+E(labels['source' if row['origin'].startswith('source') else 'extra'][lang])+'</span>',9)
def cells(p,text,y,blank=False):
 for i,ch in enumerate(text):
  x=40+62.1*i;p.draw_rect(f.Rect(x,y,x+56.1,y+56.1),color=COL['grid'],fill=(1,1,1),width=.65);p.draw_line((x+28.05,y),(x+28.05,y+56.1),color=COL['guide'],width=.4);p.draw_line((x,y+28.05),(x+56.1,y+28.05),color=COL['guide'],width=.4)
  if not blank:
   if ch not in bounds:
    if ord(ch) not in cmap:raise ValueError('Missing glyph '+ch)
    pen=BoundsPen(glyphs);glyphs[cmap[ord(ch)]].draw(pen);bounds[ch]=pen.bounds
   x0,y0,x1,y1=bounds[ch];size=38;px=x+28.05-(x0+x1)*size/em/2;py=y+28.05+(y0+y1)*size/em/2;p.insert_font(fontname='Hanzi',fontfile=str(fontfile));p.insert_text((px,py),ch,fontname='Hanzi',fontsize=size,color=COL['ghost'])
def item(hz):return next(v for v in d['words']+d['sentences'] if v['hanzi']==hz)
checks=[
 (C('Say 2:02, 2:15, 2:30, 2:45 and 2:55. Give two alternatives for 2:45.','Dire 2 h 02, 2 h 15, 2 h 30, 2 h 45 et 2 h 55. Donner deux variantes pour 2 h 45.','Назовите 2:02, 2:15, 2:30, 2:45 и 2:55. Дайте два варианта для 2:45.','2:02, 2:15, 2:30, 2:45 ve 2:55’i söyle. 2:45 için iki alternatif ver.'),['两点零二','两点一刻','两点半','两点三刻','差一刻三点','差五分三点']),
 (C('State the class interval 08:40-12:00 and break 12:00-13:00.','Indiquer les cours de 08:40 à 12:00 et la pause de 12:00 à 13:00.','Назовите занятия 08:40-12:00 и перерыв 12:00-13:00.','Dersin 08:40-12:00, molanın 12:00-13:00 olduğunu söyle.'),[d['sentences'][1]['hanzi'],d['sentences'][2]['hanzi']]),
 (C('Ask if it is far from home to school. Answer that your home is near school.','Demander si l’école est loin de chez soi. Répondre que sa maison est près de l’école.','Спросите, далеко ли от дома до школы. Ответьте, что ваш дом рядом со школой.','Evden okula uzak mı diye sor. Evinin okula yakın olduğunu söyle.'),[d['sentences'][3]['hanzi'],d['sentences'][5]['hanzi']]),
 (C('Say who your deskmate and roommate are. Agree, then disagree.','Dire qui sont votre camarade de table et de chambre. Accepter, puis exprimer un désaccord.','Скажите, кто ваш сосед по парте и по комнате. Согласитесь, затем возразите.','Sıra ve oda arkadaşını tanıt. Katıldığını, sonra katılmadığını söyle.'),['他是我的同桌。','她是我的同屋。','我同意。','我不同意。']),
 (C('Ask for a sheet of paper and a map. Name the classifier for a chair and a key.','Demander une feuille de papier et une carte. Donner le classificateur d’une chaise et d’une clé.','Попросите лист бумаги и карту. Назовите счётное слово для стула и ключа.','Bir yaprak kâğıt ve harita iste. Sandalye ve anahtarın sayma sözcüğünü söyle.'),['请给我一张纸。','请给我一张地图。','这是一把钥匙。']),
 (C('Distinguish ask from smell by tone. Say where your keys are.','Distinguer demander et sentir par le ton. Dire où sont vos clés.','Различите «спрашивать» и «нюхать» по тону. Скажите, где ключи.','Sormak ile koklamak fiillerini tonla ayır. Anahtarının nerede olduğunu söyle.'),['问','闻','我的钥匙在你车里。'])]
selected=['上课','下课','上班','下班','两点零二','两点一刻','两点半','差一刻三点','从','到','距离','学校','同班同学','同屋','同桌','同事','地图','钥匙','萝卜','罗汉果']
for lang in ['en','fr','ru','tr']:
 doc=f.open();p=page(doc,lang,labels['title'][lang]);box(p,(40,123,555,215),'<p><strong>'+E(labels['hybrid'][lang])+'</strong></p><p>29.10.2026</p><p>'+E(labels['intro'][lang])+'</p><p>'+E(C('69 expressions / 8 topics','69 expressions / 8 thèmes','69 выражений / 8 тем','69 ifade / 8 konu')[lang])+'</p>',12)
 for i,t in enumerate(d['topics']):box(p,(40,240+i*56,555,290+i*56),f'<strong>{i+1:02} / '+E(t['title'][lang])+'</strong><br/><span class="py">'+E(' · '.join(w['hanzi']+' '+w['pinyin'] for w in [v for v in d['words'] if v['family']==t['id']][:2]))+'</span>',10)
 box(p,(40,720,555,780),E(C('Based on eleven classroom photographs. Added examples are labelled. Same lesson: chinese-os-study.gizmuf.chatgpt.site/?course=intensive&lesson=8','D’après onze photos du cours. Exemples ajoutés signalés. Leçon interactive : chinese-os-study.gizmuf.chatgpt.site/?course=intensive&lesson=8','По одиннадцати фотографиям занятия. Дополнительные примеры отмечены. Урок: chinese-os-study.gizmuf.chatgpt.site/?course=intensive&lesson=8','On bir sınıf fotoğrafına dayanır. Ek örnekler işaretlidir. Etkileşimli ders: chinese-os-study.gizmuf.chatgpt.site/?course=intensive&lesson=8')[lang]),9)
 for topic in d['topics']:
  group=[w for w in d['words'] if w['family']==topic['id']]
  for offset in range(0,len(group),10):
   p=page(doc,lang,topic['title'][lang]+(' / 2' if offset else ''));box(p,(40,119,555,223),E(topic['note'][lang]),8.6)
   chunk=group[offset:offset+10]
   for i,w in enumerate(chunk):
    x=40+(i%2)*263;y=237+(i//2)*84;p.draw_rect(f.Rect(x,y,x+252,y+77),color=COL['grid'],fill=COL['pale'],width=.5)
    box(p,(x+8,y+5,x+244,y+73),'<p class="hz">'+E(w['hanzi'])+'</p><p class="py">'+E(w['pinyin'])+'</p><p>'+E(w['meaning'][lang])+'</p>',9)
   row=next(s for s in d['sentences'] if s['id']==topic['target']);sample(p,row,674,lang)
 p=page(doc,lang,labels['timeline'][lang]);times=['两点','两点一刻','两点半','两点三刻','差五分三点'];numbers=['2:00','2:15','2:30','2:45','2:55']
 p.draw_line((68,171),(526,171),color=COL['blue'],width=2)
 for i,(hz,num) in enumerate(zip(times,numbers)):
  x=40+i*103;p.draw_circle((x+40,171),4,color=COL['blue'],fill=COL['blue']);w=item(hz);box(p,(x,122,x+97,160),'<strong>'+num+'</strong>',12);box(p,(x,190,x+99,300),'<p class="hz">'+E(hz)+'</p><p class="py">'+E(w['pinyin'])+'</p><p>'+E(w['meaning'][lang])+'</p>',8.5)
 for i,hz in enumerate(['一刻是十五分钟。','两点四十五分，也可以说差一刻三点。','两点五十五分，也可以说差五分三点。']):sample(p,item(hz),351+i*135,lang)
 # Reading is an explicitly pinyin-free exercise, followed by a separate answer key.
 p=page(doc,lang,labels['read'][lang]);box(p,(40,120,555,165),E(labels['readingnote'][lang]),10)
 reading=[d['sentences'][:3],d['sentences'][3:6],[item('他是我的同桌。'),item('她是我的同事。'),item('我的钥匙在你车里。')]]
 for i,group in enumerate(reading):box(p,(40,190+i*192,555,368+i*192),'<strong>'+str(i+1)+'</strong>'+''.join('<p class="hz">'+E(s['hanzi'])+'</p>' for s in group),12)
 for start in [0,3]:
  p=page(doc,lang,labels['recall'][lang])
  for i,(prompt,answers) in enumerate(checks[start:start+3]):
   y=125+i*210;box(p,(40,y,555,y+88),'<strong>'+str(start+i+1)+'.</strong> '+E(prompt[lang]),11)
   for line in [y+120,y+155,y+185]:p.draw_line((40,line),(555,line),color=COL['guide'],width=.7)
 for start in [0,2,4]:
  p=page(doc,lang,labels['answers'][lang]);y=121
  for i,(prompt,answers) in enumerate(checks[start:start+2]):
   # Compact model answers, always with pinyin and meaning.
   text='<p><strong>'+str(start+i+1)+'.</strong> '+E(prompt[lang])+'</p>'
   for hz in answers:
    w=item(hz);text+='<p><span style="font-family:CJK;font-size:14pt">'+E(hz)+'</span> <span class="py">'+E(w['pinyin'])+'</span><br/>'+E(w['meaning'][lang])+'</p>'
   height=245 if len(answers)<5 else 315;box(p,(40,y,555,y+height),text,8);y+=height+4
 for start in range(0,len(selected),4):
  p=page(doc,lang,labels['writing'][lang]);box(p,(40,115,555,153),E(labels['writingnote'][lang]),9)
  for i,hz in enumerate(selected[start:start+4]):
   w=item(hz);y=166+i*154;box(p,(40,y,555,y+38),'<span class="hz">'+E(hz)+'</span> <span class="py">'+E(w['pinyin'])+'</span> · '+E(w['meaning'][lang]),9)
   chars=[c for c in hz if '\u3400'<=c<='\u9fff'];cells(p,chars,y+39);cells(p,chars,y+98,blank=True)
 for hz in ['我家离学校很近。','我的钥匙在你车里。']:
  p=page(doc,lang,labels['writing'][lang]);w=item(hz);box(p,(40,120,555,230),'<p class="hz">'+E(hz)+'</p><p class="py">'+E(w['pinyin'])+'</p><p>'+E(w['meaning'][lang])+'</p>',11);chars=[c for c in hz if '\u3400'<=c<='\u9fff']
  for i in range(0,len(chars),8):cells(p,chars[i:i+8],260+(i//8)*150);cells(p,chars[i:i+8],320+(i//8)*150,blank=True)
 for i,p in enumerate(doc):
  p.draw_line((40,804),(555,804),color=COL['grid'],width=.5);box(p,(40,811,555,834),f'CHINESE PRACTICE OS / LESSON 08 / 29.10.2026 / {lang.upper()} / {i+1:02} / {len(doc):02}',7)
 doc.set_metadata(dict(title=labels['hybrid'][lang]+' - Lesson 08',author='Chinese OS',subject='29 October 2026 classroom lesson'))
 vector=qa/f'lesson08-{lang}-vector.pdf';doc.subset_fonts();doc.save(vector,garbage=4,deflate=True)
 safe=f.open()
 for i,p in enumerate(doc):
  pix=p.get_pixmap(matrix=f.Matrix(170/72,170/72),colorspace=f.csRGB,alpha=False);q=safe.new_page(width=p.rect.width,height=p.rect.height);q.insert_image(q.rect,stream=pix.tobytes('jpeg',jpg_quality=87))
  thumb=p.get_pixmap(matrix=f.Matrix(.45,.45),alpha=False);thumb.save(qa/f'{lang}-{i+1:02}.png')
 safe.set_metadata(doc.metadata);path=out/f'Chinese_Practice_Lesson_08_HYBRID_{lang.upper()}_iPad_SAFE.pdf';safe.save(path,garbage=4,deflate=True);print(lang,len(doc),'pages',path.stat().st_size,'bytes',flush=True)
 target=Path('public/course08/materials');target.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,target/f'workbook-{lang}.pdf');doc.close();safe.close()
