"""Vector diagrams shared by the expanded workbook and thematic editions."""
def add_visuals(doc,lang,d,C,E,page,box,f,pale,green):
 words={v['hanzi']:v for v in d['words']};tr=lambda *x:C(*x)[lang]
 p=page(doc,lang,tr('Build a location sentence','Construire une phrase de position','Предложение о местоположении','Konum cümlesini kur'))
 box(p,(36,135,559,190),tr('Keep the buildings fixed. Change which building you describe.','Les bâtiments ne bougent pas. Changez celui que vous décrivez.','Здания неподвижны. Меняйте объект описания.','Binalar sabit. Konumunu anlattığın binayı değiştir.'),11)
 for x,name in [(150,'书店'),(405,'银行')]:
  p.draw_rect(f.Rect(x-49,220,x+49,293),color=green,fill=pale,radius=.08);p.draw_polyline([(x-55,220),(x,185),(x+55,220)],color=(.4,.55,.43),width=2);box(p,(x-44,242,x+44,287),'<span class="hz">'+name+'</span>',16)
 p.draw_line((214,257),(340,257),color=(.4,.55,.43),width=2);box(p,(225,209,337,247),'<span class="hz">东 →</span>',14);box(p,(230,305,340,344),'<span class="hz">↑ 北</span>',12)
 for j,parts in enumerate([['银行','在','书店','东边'],['书店','在','银行','西边']]):
  y=370+j*154
  for i,hz in enumerate(parts):
   x=36+i*133;p.draw_rect(f.Rect(x,y,x+124,y+120),fill=pale,color=green,radius=.06)
   title=[tr('A: locate','A : situer','A: объект','A: konum'),'在',tr('B: reference','B : repère','B: ориентир','B: referans'),tr('Position','Position','Положение','Konum')][i]
   box(p,(x+6,y+8,x+118,y+32),E(title),8);box(p,(x+6,y+35,x+118,y+85),'<span class="hz">'+hz+'</span>',17);box(p,(x+6,y+85,x+118,y+111),'<span class="py">'+words[hz]['pinyin']+'</span>',9)
 box(p,(36,698,559,773),'<span class="hz">书店东边 = 书店的东边</span><br/>'+tr('Both mean east of the bookshop. 的 is often optional here.','Les deux signifient à l’est de la librairie. 的 est souvent facultatif.','Оба варианта: к востоку от книжного магазина. 的 часто можно опустить.','İkisi de kitapçının doğusunda demektir. 的 burada çoğu zaman kullanılmayabilir.'),11)
 p=page(doc,lang,tr('Twelve ways to travel','Douze façons de voyager','Двенадцать способов добраться','On iki ulaşım yolu'))
 names=['走路','骑自行车','骑电动车','坐公交车','坐地铁','坐出租车','开车','叫网约车','租车','坐火车','坐高铁','坐飞机']
 for i,hz in enumerate(names):
  x=36+(i%3)*177;y=136+(i//3)*160;p.draw_rect(f.Rect(x,y,x+169,y+151),fill=pale,color=green,radius=.06);cx=x+84;cy=y+32;stroke=(.39,.55,.46)
  if i==0:
   p.draw_circle((cx,cy-13),5,color=stroke,fill=stroke);p.draw_polyline([(cx,cy-7),(cx,cy+10),(cx-13,cy+24)],color=stroke,width=2);p.draw_line((cx,cy+10),(cx+13,cy+24),color=stroke,width=2);p.draw_polyline([(cx-13,cy+4),(cx,cy-2),(cx+13,cy+4)],color=stroke,width=2)
  elif i in [1,2]:
   for xx in [cx-23,cx+23]:p.draw_circle((xx,cy+12),12,color=stroke,width=1.5)
   p.draw_polyline([(cx-23,cy+12),(cx-8,cy-9),(cx+4,cy+12),(cx-23,cy+12),(cx+10,cy-8),(cx+23,cy+12)],color=stroke,width=1.5)
   if i==2:box(p,(cx-8,cy-26,cx+12,cy-6),'E',9)
  elif i==11:
   p.draw_polyline([(cx,cy-22),(cx+5,cy),(cx+31,cy+9),(cx+31,cy+15),(cx+5,cy+10),(cx+5,cy+23),(cx+14,cy+28),(cx-14,cy+28),(cx-5,cy+23),(cx-5,cy+10),(cx-31,cy+15),(cx-31,cy+9),(cx-5,cy),(cx,cy-22)],color=stroke,width=1.5)
  elif i in [5,6,7,8]:
   p.draw_polyline([(cx-35,cy+12),(cx-30,cy-2),(cx-19,cy-4),(cx-9,cy-18),(cx+14,cy-18),(cx+27,cy-4),(cx+35,cy+1),(cx+35,cy+14),(cx-35,cy+14),(cx-35,cy+12)],color=stroke,width=1.5)
   p.draw_polyline([(cx-14,cy-5),(cx-6,cy-14),(cx+10,cy-14),(cx+20,cy-5),(cx-14,cy-5)],color=stroke,width=1)
   for xx in [cx-22,cx+22]:p.draw_circle((xx,cy+15),6,color=stroke,fill=stroke)
   if i==5:p.draw_rect(f.Rect(cx-7,cy-24,cx+9,cy-19),color=stroke,fill=stroke)
   if i==6:p.draw_circle((cx+5,cy-9),3,color=stroke)
   if i==7:box(p,(cx-12,cy-39,cx+18,cy-21),'APP',7)
   if i==8:p.draw_circle((cx-27,cy-26),4,color=stroke);p.draw_line((cx-23,cy-26),(cx-10,cy-26),color=stroke,width=2);p.draw_line((cx-13,cy-26),(cx-13,cy-21),color=stroke,width=2)
  elif i in [4,9]:
   p.draw_rect(f.Rect(cx-23,cy-24,cx+23,cy+19),color=stroke,fill=(1,1,1),radius=.18,width=1.5)
   p.draw_rect(f.Rect(cx-16,cy-16,cx+16,cy+1),color=stroke,width=1.3)
   for xx in [cx-13,cx+13]:p.draw_circle((xx,cy+10),3,color=stroke,fill=stroke)
   p.draw_line((cx-13,cy+19),(cx-22,cy+30),color=stroke,width=1.4);p.draw_line((cx+13,cy+19),(cx+22,cy+30),color=stroke,width=1.4)
   if i==9:p.draw_line((cx,cy-24),(cx-7,cy-32),color=stroke,width=1.5);p.draw_line((cx-7,cy-32),(cx+7,cy-32),color=stroke,width=1.5)
  elif i==10:
   p.draw_polyline([(cx-37,cy-13),(cx+12,cy-13),(cx+30,cy-1),(cx+38,cy+13),(cx-37,cy+13),(cx-37,cy-13)],color=stroke,width=1.5)
   p.draw_polyline([(cx+12,cy-9),(cx+24,cy-1),(cx+8,cy-1),(cx+8,cy-9),(cx+12,cy-9)],color=stroke,width=1)
   for xx in [cx-25,cx-10]:p.draw_rect(f.Rect(xx,cy-7,xx+9,cy),color=stroke)
   p.draw_line((cx-40,cy+23),(cx+40,cy+23),color=stroke,width=1)
   p.draw_line((cx-45,cy-4),(cx-58,cy-4),color=stroke,width=1);p.draw_line((cx-45,cy+4),(cx-56,cy+4),color=stroke,width=1)
  else:
   p.draw_rect(f.Rect(cx-34,cy-21,cx+34,cy+17),color=stroke,fill=(1,1,1),radius=.1,width=1.5)
   for xx in [cx-21,cx+21]:p.draw_circle((xx,cy+18),5,color=stroke,fill=stroke)
   for xx in [cx-26,cx-9,cx+8]:p.draw_rect(f.Rect(xx,cy-14,xx+12,cy-2),color=stroke)
   p.draw_rect(f.Rect(cx+23,cy-14,cx+30,cy+13),color=stroke)
  v=words[hz];box(p,(x+8,y+65,x+161,y+100),'<span class="hz" style="font-size:17pt">'+hz+'</span>',10);box(p,(x+8,y+98,x+161,y+119),'<span class="py">'+v['pinyin']+'</span>',9);box(p,(x+8,y+117,x+161,y+150),E(v['meaning'][lang]),7.2)
 p=page(doc,lang,tr('Which verb matches the action?','Quel verbe pour quelle action ?','Какой глагол подходит?','Eyleme hangi fiil uyar?'))
 for i,(hz,example,translation) in enumerate([
  ('走','走路',tr('Walk on foot','Marcher à pied','Идти пешком','Yürümek')),
  ('骑','骑自行车 / 骑电动车',tr('Ride a bicycle / e-bike','Aller à vélo / vélo électrique','Ехать на велосипеде / электровелосипеде','Bisiklet / elektrikli bisiklet sürmek')),
  ('坐','坐地铁 / 坐出租车',tr('Travel as a passenger','Voyager comme passager','Ехать пассажиром','Yolcu olarak gitmek')),
  ('开','开车',tr('Drive the car yourself','Conduire soi-même','Самому водить машину','Arabayı kendin sürmek')),
  ('打 / 叫','打车 / 打的 / 叫网约车',tr('Hail / call a taxi or ride','Prendre / appeler un taxi ou VTC','Вызвать такси или машину','Taksi / araç çağırmak')),
  ('租','租车',tr('Rent a car; not the same as taking a taxi','Louer une voiture ; différent de prendre un taxi','Арендовать машину; не то же самое, что взять такси','Araba kiralamak; taksi çağırmakla aynı değil'))]):
  y=138+i*96;p.draw_rect(f.Rect(36,y,559,y+87),fill=pale,color=green,radius=.05);box(p,(47,y+10,143,y+72),'<span class="hz">'+hz+'</span>',16);box(p,(151,y+9,549,y+49),'<span class="hz" style="font-size:17pt">'+example+'</span>',10);box(p,(151,y+49,549,y+80),E(translation),9)
 box(p,(36,731,559,784),'<span class="hz">我想打车，不想租车。</span><br/><span class="py">Wǒ xiǎng dǎ chē, bù xiǎng zū chē.</span>',10)
