"""Build complete, searchable A4 transcript study guides from the app dataset."""
import argparse
import collections
import hashlib
import html
import json
import re
import shutil
import unicodedata
import zipfile
from pathlib import Path

import pymupdf as fitz
from fontTools import subset
from fontTools.ttLib import TTFont

parser = argparse.ArgumentParser()
parser.add_argument('--content', default='data/video-self-introduction/content.json')
parser.add_argument('--cjk-font', default='/Users/gizmuf/Dev/Xcode/Chinese OS/outputs/lesson05/SourceHanSerifSC-Regular.otf')
parser.add_argument('--output', default='public/video-self-introduction/materials')
parser.add_argument('--qa-dir', default='/Users/gizmuf/Dev/Xcode/Chinese OS/outputs/video-self-introduction')
parser.add_argument('--source-transcript', default='/Users/gizmuf/Downloads/corrected_full_transcript.txt')
args = parser.parse_args()
content_path = Path(args.content)
data = json.loads(content_path.read_text())
out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
qa = Path(args.qa_dir); qa.mkdir(parents=True, exist_ok=True)
font = TTFont(args.cjk_font)
options = subset.Options(); options.retain_gids = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=json.dumps(data, ensure_ascii=False))
subsetter.subset(font)
font_path = qa / 'video-study-serif-subset.otf'; font.save(str(font_path))
archive = fitz.Archive(str(qa)); archive.add(str(Path('public/fonts').resolve()))
CSS = """@font-face{font-family:CJK;src:url('video-study-serif-subset.otf')}
@font-face{font-family:Latin;src:url('NotoSans-Regular.ttf')}
body{font-family:Latin,CJK;font-size:10pt;color:#20334b;line-height:1.45}
p{margin:0 0 5pt}.hanzi{font-family:CJK;font-size:19pt;line-height:1.4}
.pinyin{color:#286765;font-size:10pt}.meta{font-size:8pt;color:#6a7a8c}
.note{font-size:9pt;color:#6a583f}.heading{font-size:13pt;color:#286765}
"""
LABEL = {
 'en': dict(guide='Video study & practice guide', full='Complete transcript', grammar='Grammar workshop', quiz='Check your understanding', answers='Answer key', writing='Character writing practice', start='Listen, read, recall, write', steps='1. Listen to one section.  2. Read the Chinese and pinyin aloud.  3. Cover the translation and recall the meaning.  4. Try the questions, then check the answers.', source='Source and editorial note', complete='Every transcript segment is included below in source order within its theme.', practice='Trace the pale model, then write the character in the empty cells. Return to the transcript to read it in a complete expression.', choice='Choose the matching Chinese line.', count='transcript segments', contents='Study route', continuation='continued'),
 'fr': dict(guide='Guide vidéo : étude et pratique',full='Transcription complète',grammar='Atelier de grammaire',quiz='Vérifier sa compréhension',answers='Corrigé',writing='Pratique des caractères',start='Écouter, lire, se rappeler, écrire',steps='1. Écouter une section.  2. Lire le chinois et le pinyin à voix haute.  3. Cacher la traduction et retrouver le sens.  4. Répondre aux questions puis consulter le corrigé.',source='Source et note éditoriale',complete='Tous les segments de la transcription figurent ci-dessous, dans leur ordre au sein de chaque thème.',practice='Repasser sur le modèle pâle, puis écrire dans les cases vides. Revenir à la transcription pour lire le caractère dans une expression complète.',choice='Choisir la phrase chinoise correspondante.',count='segments de transcription',contents='Parcours d’étude',continuation='suite'),
 'ru': dict(guide='Видео: учебное пособие и практика',full='Полная расшифровка',grammar='Грамматика',quiz='Проверка понимания',answers='Ответы',writing='Практика письма',start='Слушайте, читайте, вспоминайте, пишите',steps='1. Прослушайте один раздел.  2. Прочитайте китайский текст и пиньинь вслух.  3. Закройте перевод и вспомните значение.  4. Выполните задания и проверьте ответы.',source='Источник и редакторское примечание',complete='Ниже приведены все фрагменты расшифровки в исходном порядке внутри каждой темы.',practice='Обведите светлый образец, затем напишите иероглиф в пустых клетках. Вернитесь к расшифровке и прочитайте его в целом выражении.',choice='Выберите подходящую китайскую фразу.',count='фрагментов расшифровки',contents='План занятий',continuation='продолжение'),
 'tr': dict(guide='Video çalışma ve uygulama kılavuzu',full='Tam metin',grammar='Dil bilgisi atölyesi',quiz='Anladığınızı kontrol edin',answers='Yanıt anahtarı',writing='Karakter yazma alıştırması',start='Dinleyin, okuyun, hatırlayın, yazın',steps='1. Bir bölümü dinleyin.  2. Çinceyi ve pinyini sesli okuyun.  3. Çeviriyi kapatıp anlamı hatırlayın.  4. Soruları yanıtlayın, sonra cevapları kontrol edin.',source='Kaynak ve editör notu',complete='Metnin tüm bölümleri aşağıda, her tema içinde kaynak sırasıyla verilmiştir.',practice='Soluk örneğin üzerinden geçin, ardından boş kutulara yazın. Karakteri tam bir ifade içinde okumak için metne dönün.',choice='Eşleşen Çince cümleyi seçin.',count='metin bölümü',contents='Çalışma planı',continuation='devamı')}

def esc(value): return html.escape(str(value))
def local(value, lang): return value[lang] if isinstance(value, dict) else value
def block(page, rect, text):
    spare, scale = page.insert_htmlbox(fitz.Rect(rect), text, css=CSS, archive=archive, scale_low=1)
    if spare < 0 or scale < 1:
        raise ValueError('Overflow: ' + re.sub('<[^>]+>', '', text)[:120])
    return rect[3] - rect[1] - spare

def row_html(row, lang, number=None):
    prefix = (str(number) + ' / ') if number is not None else ''
    text = '<p class="meta">' + esc(prefix + str(row.get('time', '')) + ' · ' + row['id']) + '</p>'
    text += '<p class="hanzi">' + esc(row['hanzi']) + '</p><p class="pinyin">' + esc(row['pinyin']) + '</p>'
    text += '<p>' + esc(row['meaning'][lang]) + '</p>'
    if row.get('note'): text += '<p class="note">' + esc(local(row['note'], lang)) + '</p>'
    return text

class Guide:
    def __init__(self, lang):
        self.lang = lang; self.lab = LABEL[lang]; self.doc = fitz.open(); self.page = None
        self.title = ''; self.y = 0; self.row_pages = {}; self.toc=[]
    def new(self, title):
        self.title = title; self.page = self.doc.new_page(width=595.276, height=841.89)
        if not self.toc or self.toc[-1][1]!=title: self.toc.append([1,title,len(self.doc)])
        block(self.page, (40, 25, 555, 47), '<span class="meta">CHINESE OS / VIDEO STUDY / ' + self.lang.upper() + '</span>')
        block(self.page, (40, 54, 555, 96), '<span class="heading">' + esc(title) + '</span>')
        self.page.draw_line((40, 103), (555, 103), color=(.16,.4,.4), width=1.2); self.y = 119
    def add(self, text, after=12, row_id=None):
        probe = fitz.open(); p = probe.new_page(width=595.276,height=841.89)
        height = block(p, (40, 0, 555, 650), text) + 3; probe.close()
        if height > 650: raise ValueError('Block too tall')
        if self.y + height > 782: self.new(self.title)
        block(self.page, (40, self.y, 555, self.y + height), text)
        if row_id: self.row_pages[row_id] = len(self.doc)
        self.y += height + after
    def finish(self, path):
        for i, p in enumerate(self.doc):
            p.draw_line((40, 800), (555, 800), color=(.75,.81,.82), width=.5)
            block(p, (40, 808, 555, 832), '<span class="meta">Chinese OS · ' + esc(self.lab['guide']) + ' · ' + str(i+1) + ' / ' + str(len(self.doc)) + '</span>')
        self.doc.set_metadata({'title': local(data['title'],self.lang)+' - '+self.lab['guide'], 'author':'Chinese OS', 'subject':'Complete transcript, pinyin, translation, grammar and practice'})
        self.doc.set_toc(self.toc)
        self.doc.subset_fonts(); self.doc.save(path,garbage=4,deflate=True); self.doc.close()

lookup = {r['id']: r for r in data['segments']}
assert len(lookup) == len(data['segments']), 'Duplicate segment IDs'
assert all(r['hanzi'] and r['pinyin'] and all(r['meaning'].get(l) for l in LABEL) for r in lookup.values())
assert all(r['sectionId'] in {s['id'] for s in data['sections']} for r in lookup.values())
source_path = Path(args.source_transcript)
if source_path.exists():
    source_rows = re.findall(r'^\[([^\]]+)\]\s*(.*)$',source_path.read_text(),re.M)
    source_phrases = [phrase.split('[SOURCE GAP:')[0].strip() for time,phrase in source_rows]
    normalize = lambda value: re.sub(r'\s+','',value)
    assert normalize(''.join(source_phrases))==normalize(''.join(r['hanzi'] for r in data['segments'])), 'Source transcript wording/order differs'
    flagged = [r for r in data['segments'] if '我知道你是一名喜欢意大利面' in r['hanzi']]
    assert flagged and all(r.get('note') for r in flagged), 'Incomplete source span must retain a visible note'
manifest = {'contentSha256':hashlib.sha256(content_path.read_bytes()).hexdigest(),'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'segments':len(lookup),'documents':[]}
if source_path.exists():
    manifest['transcriptSha256']=hashlib.sha256(source_path.read_bytes()).hexdigest()
    manifest['verifiedSourceSpans']=len(source_rows)
for lang, lab in LABEL.items():
    guide = Guide(lang); guide.new(local(data['title'],lang))
    guide.add('<p class="hanzi">自我介绍</p><p class="pinyin">zìwǒ jièshào</p><p class="heading">'+esc(lab['start'])+'</p><p>'+esc(lab['steps'])+'</p>')
    guide.add('<p class="heading">'+esc(lab['source'])+'</p><p>'+esc(data['source']['title'])+'</p><p class="meta">'+esc(data['source']['url'])+'</p><p>'+esc(local(data['source']['note'],lang))+'</p><p>'+str(len(lookup))+' '+esc(lab['count'])+'. '+esc(lab['complete'])+'</p>')
    guide.add('<p class="heading">'+esc(lab['contents'])+'</p>'+''.join('<p>'+str(i+1)+'. '+esc(local(s['title'],lang))+'</p>' for i,s in enumerate(data['sections'])))
    for section in data['sections']:
        guide.new(local(section['title'],lang))
        guide.add('<p>'+esc(local(section['summary'],lang))+'</p><p class="meta">'+esc(lab['full'])+'</p>')
        for row in data['segments']:
            if row['sectionId']==section['id']: guide.add(row_html(row,lang), row_id=row['id'])
    guide.new(lab['grammar'])
    for grammar in data.get('grammar',[]):
        introduction='<p class="heading">'+esc(local(grammar['title'],lang))+'</p><p class="hanzi">'+esc(grammar['pattern'])+'</p><p>'+esc(local(grammar['explanation'],lang))+'</p>'
        examples=grammar['examples']
        guide.add(introduction+(row_html(lookup[examples[0]],lang) if examples else ''),after=15)
        for ident in examples[1:]: guide.add(row_html(lookup[ident],lang),after=15)
    guide.new(lab['quiz']); guide.add('<p>'+esc(lab['choice'])+'</p>')
    for n, quiz in enumerate(data.get('quizzes',[]),1):
        guide.add('<p class="heading">'+str(n)+'. '+esc(local(quiz['prompt'],lang))+'</p>'+''.join('<p class="hanzi">'+chr(65+i)+'. '+esc(lookup[ident]['hanzi'])+'</p>' for i,ident in enumerate(quiz['choices'])))
    guide.new(lab['answers'])
    for n, quiz in enumerate(data.get('quizzes',[]),1):
        choice = chr(65+quiz['choices'].index(quiz['answer']))
        guide.add(row_html(lookup[quiz['answer']],lang,str(n)+' '+choice))
    # Frequent core characters are copied directly from the source, with no invented wording.
    chars = collections.Counter(re.findall('[\u3400-\u9fff]', ''.join(r['hanzi'] for r in data['segments'])))
    preferred = [c for c in '我你他她叫名字是中国人学汉语喜欢家有在的不很' if c in chars]
    selected = (preferred + [c for c,_ in chars.most_common() if c not in preferred])[:24]
    for start in range(0,len(selected),8):
        guide.new(lab['writing']); guide.add('<p>'+esc(lab['practice'])+'</p>')
        for ch in selected[start:start+8]:
            y=guide.y
            for col in range(8):
                x=40+col*64; rect=fitz.Rect(x,y,x+57,y+57)
                guide.page.draw_rect(rect,color=(.56,.68,.69),width=.6)
                guide.page.draw_line((x+28.5,y),(x+28.5,y+57),color=(.82,.87,.87),width=.4)
                guide.page.draw_line((x,y+28.5),(x+57,y+28.5),color=(.82,.87,.87),width=.4)
                if col<3:
                    color='#20334b' if col==0 else '#cbd4d8'
                    block(guide.page,(x+2,y+1,x+55,y+55),'<p style="font-family:CJK;font-size:32pt;text-align:center;color:'+color+'">'+ch+'</p>')
            guide.y += 69
    path=out/f'guide-{lang}.pdf'; guide.finish(path)
    check=fitz.open(path)
    norm=lambda text: re.sub(r'\s+','',unicodedata.normalize('NFKC',text))
    text=norm(''.join(p.get_text() for p in check))
    for row in data['segments']:
        assert norm(row['hanzi']) in text, ('Missing Hanzi',lang,row['id'])
        assert norm(row['pinyin']) in text, ('Missing pinyin',lang,row['id'])
        assert norm(row['meaning'][lang]) in text, ('Missing translation',lang,row['id'])
    render_dir=qa/lang; render_dir.mkdir(exist_ok=True)
    for i,p in enumerate(check): p.get_pixmap(matrix=fitz.Matrix(.8,.8),alpha=False).save(render_dir/f'page-{i+1:03}.png')
    # Compact visual inventory includes every page in groups of 16.
    for start in range(0,len(check),16):
        contact_doc=fitz.open();contact=contact_doc.new_page(width=1040,height=1480)
        contact.draw_rect(contact.rect,fill=(.87,.9,.91),color=None)
        for i in range(start,min(start+16,len(check))):
            x=10+(i-start)%4*260;y=10+(i-start)//4*370
            contact.insert_image(fitz.Rect(x,y,x+244,y+342),filename=str(render_dir/f'page-{i+1:03}.png'))
            contact.insert_text((x,y+356),str(i+1),fontsize=11,color=(.12,.2,.29))
        contact.get_pixmap(alpha=False).save(render_dir/f'contact-{start//16+1:02}.png');contact_doc.close()
    manifest['documents'].append({'file':path.name,'language':lang,'pages':len(check),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'verifiedSegments':len(lookup),'segmentPages':guide.row_pages})
    check.close();shutil.copy2(path,qa/path.name)
    print(lang,manifest['documents'][-1]['pages'],'pages; all segments verified',flush=True)
manifest_path=out/'manifest.json';manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
shutil.copy2(manifest_path,qa/'manifest.json')
with zipfile.ZipFile(out/'video-study-guides-all-languages.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(out.glob('*.pdf')): z.write(p,p.name)
    z.write(manifest_path,manifest_path.name)
shutil.copy2(out/'video-study-guides-all-languages.zip',qa/'video-study-guides-all-languages.zip')
