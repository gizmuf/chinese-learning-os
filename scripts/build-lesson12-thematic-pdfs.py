"""Rebuild the two supplied raster workbooks as searchable vector/text editions.
Source material is reorganized, with corrected glosses; originals stay untouched.
"""
import sys,runpy,argparse,json,hashlib,html
from pathlib import Path
P=argparse.ArgumentParser();P.add_argument('--font',required=True);a=P.parse_args();sys.argv=['build-lesson12-pdfs.py','--font',a.font,'--out','resources/lesson12','--qa','output/lesson12-supplement/pdf-qa','--library'];g=runpy.run_path('scripts/build-lesson12-pdfs.py')
f=g['f'];box=g['box'];page=g['page'];reading=g['reading'];C=g['C'];E=g['E'];pale=g['pale'];green=g['green'];d=g['d'];words={v['hanzi']:v for v in d['words']};lang='en'
visuals=runpy.run_path('scripts/lesson12-pdf-visuals.py');illustrations=f.open();visuals['add_visuals'](illustrations,'en',d,C,E,page,box,f,pale,green)
materials=[]
for edition,families,title,filename in [
 ('directions',{'directions','campus','route','weather'},'Visual directions & place relations','Chinese_Practice_OS_Directions_Visual_Hybrid_EN_SEARCHABLE_iPad_SAFE.pdf'),
 ('transport',{'home','rent','day','transport'},'Home, my day & transport','Chinese_Classroom_Hybrid_Home_Day_Transport_EN_SEARCHABLE_iPad_SAFE.pdf')]:
 doc=f.open();p=page(doc,lang,title);box(p,(36,145,559,225),'Text and embedded fonts, vector diagrams and writing lines. Read, listen in Chinese OS, cover, recall, write Hanzi and tone-marked Pinyin, then practise your Chinese keyboard.',12)
 if edition=='directions':
  # North-up fixed map is deliberately distinct from the person-relative frame.
  g['mapdraw'](p,270);box(p,(36,643,559,755),'<span class="hz">银行在书店东边。</span><br/><span class="py">Yínháng zài shūdiàn dōngbian.</span><br/>The bank is east of the bookshop. North stays at the top; front/back requires a viewer.',11)
  doc.insert_pdf(illustrations,from_page=0,to_page=0)
  p=page(doc,lang,'Turn yourself, not the compass')
  for i,(label,arrow,pairs) in enumerate([('Facing north','↑',[('西边','左边'),('东边','右边'),('北边','前边'),('南边','后边')]),('Facing south','↓',[('西边','右边'),('东边','左边'),('北边','后边'),('南边','前边')])]):
   x=36+i*267;box(p,(x,142,x+252,193),label+' '+arrow,17)
   for j,(hz,relative) in enumerate(pairs):box(p,(x,210+j*85,x+252,286+j*85),'<span class="hz">'+hz+' → '+relative+'</span><br/><span class="py">'+words[hz]['pinyin']+' → '+words[relative]['pinyin']+'</span>',11)
  box(p,(36,583,559,743),'The viewer is at the bottom of the campus map, looking towards the dorms. Buildings 1–2 are in the front row, nearer the viewer; 3–4 are behind. Front/back is not another name for north/south.',13)
 else:
  box(p,(36,262,559,370),'<span class="hz">走 · 骑 · 坐 · 开 · 打 / 叫 · 租</span><br/>Walk, ride, travel as a passenger, drive, hail or book, rent. A vehicle alone does not tell you which action is happening.',13)
  doc.insert_pdf(illustrations,from_page=1,to_page=2)
 sentences=[v for v in d['sentences'] if v['family'] in families];vocab=[v for v in d['words'] if v['family'] in families]
 for offset in range(0,len(sentences),5):
  p=page(doc,lang,'Read in meaning groups')
  for j,row in enumerate(sentences[offset:offset+5]):reading(p,row,134+j*126,lang)
 for offset in range(0,len(vocab),12):
  p=page(doc,lang,'Vocabulary & related words')
  for j,row in enumerate(vocab[offset:offset+12]):
   y=140+j*51;p.draw_line((36,y+47),(559,y+47),color=green,width=.5);box(p,(39,y,205,y+45),'<span class="hz" style="font-size:17pt">'+row['hanzi']+'</span>',10);box(p,(209,y+4,354,y+45),'<span class="py">'+row['pinyin']+'</span>',9);box(p,(359,y+4,556,y+45),E(row['meaning']['en']),8)
 selected=([v['hanzi'] for v in vocab if v['family'] in {'directions','campus'}]+['下雨','雨伞','外卖','钱','找','两千','找到','千','在']) if edition=='directions' else ['公寓','卧室','厨房','卫生间','客厅','房间','床','桌子','椅子','出租车','租房','租车','驾驶证','起床','早饭','上课','下课','做作业','回家','复习','午饭','睡觉','大概','左右','走路','骑自行车','骑电动车','坐公交车','坐地铁','坐出租车','开车','坐高铁','坐飞机','叫网约车']
 selected=list(dict.fromkeys(selected))
 for offset in range(0,len(selected),4):
  p=page(doc,lang,'Write Hanzi + tone-marked Pinyin');box(p,(36,135,559,183),'Trace once, then write both systems four times. Cover the model for the final attempts. Scroll outside the writing boxes when using Apple Pencil.',10)
  for j,hz in enumerate(selected[offset:offset+4]):
   row=words[hz];y=195+j*144;box(p,(36,y,559,y+33),'<span class="hz" style="font-size:17pt">'+hz+'</span> <span class="py">'+row['pinyin']+'</span> · '+E(row['meaning']['en']),9)
   for k in range(5):
    x=36+k*105;p.draw_rect(f.Rect(x,y+36,x+99,y+112),color=green,width=.7);p.draw_line((x,y+77),(x+99,y+77),color=green,width=.5)
    if k==0:box(p,(x+3,y+39,x+96,y+110),'<span class="hz" style="font-size:13pt;color:#bac8b4">'+hz+'</span><br/><span class="py" style="font-size:7pt;color:#bac8b4">'+row['pinyin']+'</span>',8)
    box(p,(x+2,y+115,x+99,y+137),str(k+1)+(' TRACE' if k==0 else ' WRITE'),7)
 # Recall: independent writing, contextual candidate choice, chunk ordering.
 p=page(doc,lang,'Recall both directions');box(p,(36,136,559,183),'Write Pinyin with tones for the first four items. Write Hanzi for the next four. Check the vocabulary only after your attempt.',11)
 recall=[words[h] for h in (['东边','前边','银行','钱','西边','宿舍','两千','哪里'] if edition=='directions' else ['厨房','出租车','做作业','坐地铁','公寓','卫生间','起床','骑自行车'])]
 for i,w in enumerate(recall):
  y=207+i*63;box(p,(39,y,290,y+52),'<span class="hz">'+E(w['hanzi'] if i<4 else w['pinyin'])+'</span>',13);p.draw_line((308,y+43),(553,y+43),color=green,width=.7)
 p=page(doc,lang,'Chinese keyboard / IME');box(p,(36,138,559,197),'On your Chinese keyboard, type the Pinyin letters WITHOUT tones. Select the Hanzi that matches the context. Handwritten Pinyin practice still needs the correct tone marks.',11)
 ime=[('qian','money','前 / 钱 / 千','钱'),('qian','thousand','钱 / 千 / 前','千'),('zhao','look for','找 / 我 / 钱','找'),('zuo','classifier for a building','坐 / 座 / 做','座'),('zai','be located at','在 / 再 / 才','在')] if edition=='directions' else [('zuo','ride the metro','坐 / 做 / 座','坐'),('zuo','do homework','坐 / 做 / 座','做'),('zu','rent a home','组 / 租 / 祖','租'),('fang','room','方 / 房 / 放','房'),('shi','bedroom component','试 / 室 / 事','室'),('yi','chair component','以 / 椅 / 已','椅'),('ke','class','课 / 客 / 可','课'),('hui','return home','会 / 回 / 灰','回')]
 for i,(py,context,choices,answer) in enumerate(ime):
  y=213+i*64;box(p,(39,y,559,y+58),f'{i+1}. <strong>{py}</strong> · '+E(context)+'<br/><span class="hz" style="font-size:16pt">'+choices+'</span>',10)
 prompts=[next(v for v in sentences if v['hanzi']==hz) for hz in (['银行在书店东边。','学校在宿舍南边。','请问，银行在哪儿？'] if edition=='directions' else ['我有一套公寓。','我的公寓里有两个卧室。','下课后我做作业。','晚上六点我坐地铁回家。','我大概晚上十一点睡觉。','我想打车，不想租车。'])]
 p=page(doc,lang,'Build the sentence');box(p,(36,136,559,187),'Put the meaning groups in natural Chinese order. Write the complete sentence and its tone-marked Pinyin.',11)
 for i,v in enumerate(prompts):
  y=205+i*92;ch=v['chunks'];ch=ch[1:]+ch[:1];box(p,(39,y,559,y+44),'<span class="hz" style="font-size:16pt">'+' / '.join(ch)+'</span>',10);p.draw_line((39,y+66),(554,y+66),color=green,width=.7);p.draw_line((39,y+86),(554,y+86),color=green,width=.5)
 p=page(doc,lang,'Check after practising');box(p,(36,138,559,190),'<strong>IME</strong><br/><span class="hz">'+' · '.join(v[3] for v in ime)+'</span>',11)
 for i,v in enumerate(prompts):
  y=209+i*91;box(p,(39,y,559,y+83),f'{i+1}. <span class="hz" style="font-size:16pt">'+v['hanzi']+'</span><br/><span class="py">'+v['pinyin']+'</span><br/>'+E(v['meaning']['en']),9)
 for i,p in enumerate(doc):
  p.draw_line((36,800),(559,800),color=green,width=.6);box(p,(36,807,500,831),'Chinese OS · searchable visual edition · 04.11.2026',7);p.insert_text((505,819),f'{i+1} / {len(doc)}',fontname='helv',fontsize=7,color=g['forest'])
 path=Path('resources/lesson12')/('visual-'+edition+'-en.pdf');doc.set_metadata({'title':'Chinese OS · '+title+' · searchable edition','author':'Chinese OS','subject':'Embedded text fonts and vector illustrations; Hanzi and Pinyin handwriting'});doc.save(path,garbage=4,deflate=True);b=path.read_bytes();materials.append(dict(id='visual-'+edition+'-en',title=title,label='English',locale='en',filename=filename,path=str(path),pages=len(doc),bytes=len(b),sha256=hashlib.sha256(b).hexdigest()));print(edition,len(doc),len(b));doc.close()
Path('data/lesson12/supplements.json').write_text(json.dumps(materials,ensure_ascii=False,indent=2)+'\n')
