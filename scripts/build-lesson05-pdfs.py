"""Build vector, searchable EN/FR/RU PDFs from the same dataset as the app.
Preserves the supplied Lesson 03 A4/navy/pale-blue/56.1pt handwriting design.
Fonts are authoring inputs, not distributed as standalone files.
"""
import argparse,json,re,html,math,hashlib
from pathlib import Path
import pymupdf as f
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools import subset
P=argparse.ArgumentParser();P.add_argument('--content',required=True);P.add_argument('--cjk-font',required=True);args=P.parse_args()
data=json.loads(Path(args.content).read_text());fontpath=Path(args.cjk_font)
# Pre-subset CFF locally: MuPDF cannot subset this original CJK face itself.
subsetfont=TTFont(str(fontpath));options=subset.Options();options.retain_gids=True;subsetter=subset.Subsetter(options=options);subsetter.populate(text=json.dumps(data,ensure_ascii=False)+'准备兴奋苹果包子');subsetter.subset(subsetfont)
fontpath=fontpath.parent/'lesson05-serif-subset.otf';subsetfont.save(str(fontpath))
latin=Path('public/fonts/NotoSans-Regular.ttf');fontdir=fontpath.parent
# PyMuPDF's HTML shaper supports the approved CFF serif and Cyrillic/diacritics.
archive=f.Archive(str(fontdir));archive.add(str(latin.parent))
CSS="@font-face{font-family:CJK;src:url('"+fontpath.name+"')}@font-face{font-family:Latin;src:url('NotoSans-Regular.ttf')}body{font-family:Latin,CJK;font-size:10pt;color:#1d2f52;line-height:1.45}p{margin:0 0 5pt}strong{font-weight:bold}.hz{font-family:CJK;font-size:19pt}.py{color:#345fa4;font-size:9pt}.small{font-size:8pt;color:#64758f}"
COL={k:tuple(int(v[i:i+2],16)/255 for i in (0,2,4)) for k,v in dict(navy='1d2f52',blue='345fa4',pale='eaf1fa',ghost='d3dae5',grid='9fb1cb',guide='cbd5e3',orange='cc734b').items()}
font=TTFont(str(fontpath));glyphset=font.getGlyphSet();cmap=font.getBestCmap();em=font['head'].unitsPerEm
OUT=Path('public/course05/materials');OUT.mkdir(parents=True,exist_ok=True)
LABEL={
'en':dict(workbook='Hanzi practice workbook',guide='Study guide',lesson='LESSON 05 / 26 OCTOBER 2026',practice='Read the complete expression. Trace it, then write it without the model.',model='Model + trace',blank='Write from memory',source='From the classroom board',extra='Additional practice example',read='Short reading check - without pinyin',answers='Answer key - check after trying',name='Name:',date='Date:',steps='New stroke highlighted; diagrams are writing guides, not an origin story.',start='Study a pattern, change one block, recall it, then write it.',materials='65 expressions, 34 sentences. Six groups from today’s class.',contrast='Compare before memorising',instruction='Try saying the meaning and reading aloud. Cover the answer key until finished.'),
'fr':dict(workbook='Cahier de pratique des hanzi',guide='Guide d’étude',lesson='LEÇON 05 / 26 OCTOBRE 2026',practice='Lire l’expression entière. La tracer, puis l’écrire sans le modèle.',model='Modèle + tracé',blank='Écrire de mémoire',source='Du tableau du cours',extra='Exemple d’entraînement ajouté',read='Petite vérification de lecture - sans pinyin',answers='Corrigé - à consulter après avoir essayé',name='Nom :',date='Date :',steps='Nouveau trait en couleur ; les schémas guident l’écriture, pas l’étymologie.',start='Étudier un modèle, changer un bloc, se rappeler, puis écrire.',materials='65 expressions, 34 phrases. Six groupes du cours.',contrast='Comparer avant de mémoriser',instruction='Dire le sens et lire à voix haute. Cacher le corrigé avant de terminer.'),
'ru':dict(workbook='Прописи и практика иероглифов',guide='Учебное пособие',lesson='УРОК 05 / 26 ОКТЯБРЯ 2026',practice='Прочитайте целое выражение. Обведите его, затем напишите без образца.',model='Образец и обводка',blank='Напишите по памяти',source='С доски на занятии',extra='Дополнительный учебный пример',read='Короткая проверка чтения - без пиньиня',answers='Ответы - проверьте после самостоятельной попытки',name='Имя:',date='Дата:',steps='Новый штрих выделен; схема помогает писать, а не объясняет происхождение.',start='Изучите образец, измените один блок, вспомните, затем напишите.',materials='65 выражений, 34 предложения. Шесть групп сегодняшнего урока.',contrast='Сначала сравните, затем запоминайте',instruction='Назовите значение и прочитайте вслух. До конца задания закройте ответы.')}
def E(s):return html.escape(str(s))
def box(p,rect,content,size=10):
 spare,scale=p.insert_htmlbox(f.Rect(rect),content,css=CSS+f'body{{font-size:{size}pt}}',archive=archive,scale_low=1)
 if spare<0:raise ValueError('Text overflow: '+re.sub('<[^>]+>','',content)[:100])
 return spare
def page(doc,lang,kind,title=None):
 p=doc.new_page(width=595.276,height=841.89)
 box(p,(39.7,26,555.5,46),'<span class="py">CHINESE OS / '+E(LABEL[lang]['lesson'])+' / '+lang.upper()+'</span>',8)
 box(p,(39.7,51,555.5,88),'<strong>'+E(title or LABEL[lang][kind])+'</strong>',17)
 p.draw_line((39.7,100),(555.5,100),color=COL['blue'],width=1.5)
 return p
bounds={}
def glyph(p,ch,x,y,size=38,color='ghost'):
 if ch not in bounds:
  if ord(ch) not in cmap:raise ValueError('Missing glyph '+ch)
  pen=BoundsPen(glyphset);glyphset[cmap[ord(ch)]].draw(pen);bounds[ch]=pen.bounds
 x0,y0,x1,y1=bounds[ch]; px=x+28.05-(x0+x1)/2*size/em;py=y+28.05+(y0+y1)/2*size/em
 p.insert_font(fontname='Hanzi',fontfile=str(fontpath));p.insert_text((px,py),ch,fontname='Hanzi',fontsize=size,color=COL[color])
def cells(p,chars,y,trace=True,empty=False):
 for i,ch in enumerate(chars):
  x=39.7+i*62.1;r=f.Rect(x,y,x+56.1,y+56.1)
  p.draw_rect(r,color=COL['grid'],fill=(1,1,1),width=.65)
  p.draw_line((x+28.05,y),(x+28.05,y+56.1),color=COL['guide'],width=.4)
  p.draw_line((x,y+28.05),(x+56.1,y+28.05),color=COL['guide'],width=.4)
  if not empty:glyph(p,ch,x,y,color='ghost' if trace else 'navy')
def stroke_strip(p,chars,y):
 # Vector cumulative outlines from the same licensed data as Writing Studio.
 x=39.7
 for ch in chars:
  d=json.loads(Path('public/characters',ch+'.json').read_text());n=len(d['strokes']);w=min(19,490/max(1,sum(len(json.loads(Path('public/characters',c+'.json').read_text())['strokes'])+1 for c in chars)))
  for i in range(n):
   # Embed SVG per cumulative step; convert through a tiny PDF for true vectors.
   paths=''.join('<path d="'+path+'" fill="'+('#cc734b' if j==i else '#64758f')+'"/>' for j,path in enumerate(d['strokes'][:i+1]))
   svg=('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><g transform="translate(0 900) scale(1 -1)">'+paths+'</g></svg>').encode()
   temp=f.open(stream=svg,filetype='svg');pdf=f.open('pdf',temp.convert_to_pdf());p.show_pdf_page(f.Rect(x,y,x+w,y+w),pdf,0);x+=w+1
  x+=4
 return y+24

def finish(doc,path,lang,kind):
 for i,p in enumerate(doc):
  p.draw_line((39.7,802),(555.5,802),color=COL['grid'],width=.5)
  box(p,(39.7,810,555.5,831),'<span class="small">Chinese OS · '+E(LABEL[lang][kind])+' · '+str(i+1)+' / '+str(len(doc))+'</span>',7)
 doc.set_metadata(dict(title=LABEL[lang][kind]+' - Lesson 05',author='Chinese OS',subject='Classroom lesson 05, 26 October 2026'))
 doc.subset_fonts();doc.save(path,garbage=4,deflate=True);doc.close()

allrows=data['terms']+data['sentences'];lookup={r['id']:r for r in allrows}
# Reserve the largest actual note height across languages, keeping pagination equal.
note_heights={}
for topic in data['topics']:
 probe=f.open();heights=[]
 for lang in ['en','fr','ru']:
  q=probe.new_page();spare=box(q,(39.7,0,555.5,220),'<p>'+E(topic['note'][lang])+'</p>',9.3);heights.append(220-spare)
 note_heights[topic['id']]=math.ceil(max(heights)/10)*10+5
 probe.close()

for lang in ['en','fr','ru']:
 lab=LABEL[lang];doc=f.open();p=page(doc,lang,'guide');y=120
 box(p,(39.7,y,555.5,y+100),'<p class="hz">认识　又　看起来　准备好</p><p class="py">rènshi　yòu　kàn qǐlái　zhǔnbèi hǎo</p><p>'+E(lab['start'])+'</p><p>'+E(lab['materials'])+'</p>');y+=120
 for i,topic in enumerate(data['topics']):
  box(p,(39.7,y,555.5,y+33),f'<strong>0{i+1}　'+E(topic['title'][lang])+'</strong>');y+=39
 for topic in data['topics']:
  p=page(doc,lang,'guide',topic['title'][lang]);y=115
  note=topic['note'][lang]
  # Notes and all Hanzi examples remain searchable; full readings are in adjacent vocabulary/example rows.
  note_height=note_heights[topic['id']];box(p,(39.7,y,555.5,y+note_height),'<p>'+E(note)+'</p>',9.3);y+=note_height+10
  for row in [v for v in data['terms'] if v['topic']==topic['id']]:
   if y+39>785:p=page(doc,lang,'guide',topic['title'][lang]);y=115
   p.draw_rect(f.Rect(39.7,y,555.5,y+35),color=COL['grid'],width=.45)
   box(p,(47,y+1,210,y+34),'<span class="hz">'+E(row['hanzi'])+'</span>',16)
   box(p,(218,y+1,548,y+34),'<span class="py">'+E(row['pinyin'])+'</span><br>'+E(row['meaning'][lang]),8.2);y+=39
  for row in [v for v in data['sentences'] if v['topic']==topic['id']]:
   if y+78>785:p=page(doc,lang,'guide',topic['title'][lang]);y=115
   box(p,(39.7,y,555.5,y+76),'<p class="small">'+E(lab['extra'] if row['source']=='extension' else lab['source'])+'</p><span class="hz">'+E(row['hanzi'])+'</span><br><span class="py">'+E(row['pinyin'])+'</span><br>'+E(row['meaning'][lang]),9);y+=80
 # Explicitly compare confusable whole expressions in one visual place.
 p=page(doc,lang,'guide',lab['contrast']);y=118
 for ids in [['c05-t09','c05-t10'],['c05-t35','c05-t36'],['c05-t47','c05-t48'],['c05-t04','c05-t34'],['c05-s12','c05-s15']]:
  for ident in ids:
   v=lookup[ident];box(p,(39.7,y,555.5,y+54),'<span class="hz">'+E(v['hanzi'])+'</span> <span class="py">'+E(v['pinyin'])+'</span><br>'+E(v['meaning'][lang]),9);y+=56
  y+=8
 testrows=[lookup[x] for x in ['c05-s01','c05-s04','c05-s08','c05-s09','c05-s12','c05-s13','c05-s14','c05-s20','c05-s23','c05-s27']]
 p=page(doc,lang,'guide',lab['read']);box(p,(39.7,115,555.5,155),E(lab['instruction']));y=170
 for i,v in enumerate(testrows):box(p,(39.7,y,555.5,y+45),str(i+1)+'.　<span class="hz">'+E(v['hanzi'])+'</span>');y+=53
 p=page(doc,lang,'guide',lab['answers']);y=118
 for i,v in enumerate(testrows):box(p,(39.7,y,555.5,y+59),str(i+1)+'.　<span class="hz">'+E(v['hanzi'])+'</span><br><span class="py">'+E(v['pinyin'])+'</span><br>'+E(v['meaning'][lang]),9);y+=64
 # Grammar paths make the same building blocks visible offline.
 for offset in range(0,len(data.get('paths',[])),2):
  p=page(doc,lang,'guide',{'en':'Sentence building blocks','fr':'Les blocs des phrases','ru':'Из чего строится предложение'}[lang]);y=116
  for path in data['paths'][offset:offset+2]:
   row=lookup[path['target']]
   box(p,(39.7,y,555.5,y+66),'<span class="hz">'+E(row['hanzi'])+'</span><br><span class="py">'+E(row['pinyin'])+'</span><br>'+E(row['meaning'][lang]),9);y+=72
   for text,role in path['parts']:
    box(p,(48,y,552,y+38),'<span class="hz">'+E(text)+'</span> - '+E(role[lang]),9);y+=40
   y+=12
 finish(doc,OUT/f'guide-{lang}.pdf',lang,'guide')
 # One-page reminder is optional; the two main documents stay separate.
 quick=f.open();q=page(quick,lang,'guide',{'en':'Lesson 05 - quick reference','fr':'Leçon 05 - mémo','ru':'Урок 05 - краткая памятка'}[lang]);yy=116
 for path in data.get('paths',[]):
  row=lookup[path['target']]
  box(q,(39.7,yy,555.5,yy+89),'<span class="hz">'+E(row['hanzi'])+'</span><br><span class="py">'+E(row['pinyin'])+'</span><br>'+E(row['meaning'][lang]),9);yy+=96
 finish(quick,OUT/f'quick-reference-{lang}.pdf',lang,'guide')
 doc=f.open();p=page(doc,lang,'workbook');box(p,(39.7,116,555.5,230),'<p class="hz">准备　苹果　自己</p><p class="py">zhǔnbèi　píngguǒ　zìjǐ</p><p>'+E(lab['start'])+'</p><p>'+E(lab['practice'])+'</p>');box(p,(39.7,260,555.5,310),E(lab['name'])+' ____________________　'+E(lab['date'])+' __________');box(p,(39.7,330,555.5,400),E(lab['steps']));
 p=None;y=0
 for topic in data['topics']:
  p=None # Never carry a new topic under the preceding topic’s heading.
  for row in [v for v in data['terms'] if v['topic']==topic['id']]:
   chars=list(row['hanzi']);repeats=2 if len(chars)<=4 else 1;rows=2 if repeats==2 else 3;height=76+rows*63+8
   if p is None or y+height>788:p=page(doc,lang,'workbook',topic['title'][lang]);y=116
   box(p,(39.7,y,555.5,y+52),'<span class="hz">'+E(row['hanzi'])+'</span> <span class="py">'+E(row['pinyin'])+'</span><br>'+E(row['meaning'][lang]),9);y+=54
   y=stroke_strip(p,chars,y)
   cells(p,chars*repeats,y);y+=63
   if repeats==1:cells(p,chars,y);y+=63
   cells(p,chars*repeats,y,empty=True);y+=72
 # Whole-sentence practice keeps the full expression and reading above all cells.
 for row in [lookup[x] for x in ['c05-s01','c05-s04','c05-s08','c05-s12','c05-s13','c05-s20','c05-s23','c05-s27']]:
  p=page(doc,lang,'workbook',{'en':'Whole-sentence practice','fr':'Pratique des phrases entières','ru':'Практика целых предложений'}[lang]);box(p,(39.7,116,555.5,195),'<p class="hz">'+E(row['hanzi'])+'</p><p class="py">'+E(row['pinyin'])+'</p><p>'+E(row['meaning'][lang])+'</p>',10);y=213;chars=re.findall('[\u3400-\u9fff]',row['hanzi'])
  for start in range(0,len(chars),8):
   part=chars[start:start+8];cells(p,part,y);cells(p,part,y+64);cells(p,part,y+128,empty=True);y+=198
  box(p,(39.7,740,555.5,785),E(lab['blank'])+' ________________________________',9)
 finish(doc,OUT/f'workbook-{lang}.pdf',lang,'workbook')
 print(lang,'PDFs ready',flush=True)

manifest={'sourceSha256':hashlib.sha256(Path('data/lesson05/content.json').read_bytes()+Path('app/lesson05-data.ts').read_bytes()).hexdigest(),'documents':[]}
for path in sorted(OUT.glob('*.pdf')):
 document=f.open(path);manifest['documents'].append({'file':path.name,'pages':len(document),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});document.close()
Path('data/lesson05/materials-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
