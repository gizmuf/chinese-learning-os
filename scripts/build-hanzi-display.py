"""Bundle passive stroke outlines as a Unicode font; writing/assessment data stays separate.

Uses the already licensed local Hanzi Writer outlines, never a visual guess.
Run after preparing character assets. fontTools is an authoring dependency only.
"""
import hashlib,json
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.svgLib.path import parse_path
ROOT=Path(__file__).resolve().parents[1]
def build():
 data={p.stem:json.loads(p.read_text()) for p in sorted((ROOT/'public/characters').glob('*.json')) if len(p.stem)==1}
 data={ch:d for ch,d in data.items() if d.get('strokes') and all(isinstance(s,str) and s.strip() for s in d['strokes'])}
 order=['.notdef']+['uni'+format(ord(ch),'X') for ch in data]
 font=FontBuilder(1024,isTTF=True);font.setupGlyphOrder(order)
 font.setupCharacterMap({ord(ch):'uni'+format(ord(ch),'X') for ch in data})
 glyphs={'.notdef':TTGlyphPen(None).glyph()}
 for ch,d in data.items():
  pen=TTGlyphPen(None);curves=Cu2QuPen(pen,0.4,reverse_direction=False)
  for outline in d['strokes']:parse_path(outline,curves)
  glyphs['uni'+format(ord(ch),'X')]=pen.glyph()
 font.setupGlyf(glyphs)
 font.setupHorizontalMetrics({name:(1024,getattr(glyphs[name],'xMin',0)) for name in order})
 font.setupHorizontalHeader(ascent=900,descent=-124)
 font.setupNameTable({'familyName':'Chinese OS Stroke','styleName':'Regular','uniqueFontIdentifier':'ChineseOSStroke-1','fullName':'Chinese OS Stroke Regular','psName':'ChineseOSStroke-Regular','version':'Version 1.000','licenseDescription':'Derived from Hanzi Writer Data / Make Me a Hanzi. See /licenses/hanzi-writer-data-ARPHICPL.TXT and /licenses/makemeahanzi-COPYING.txt.'})
 font.setupOS2(sTypoAscender=900,sTypoDescender=-124,usWinAscent=1024,usWinDescent=256)
 font.setupPost();font.setupMaxp();font.font.recalcTimestamp=False
 font.font['head'].created=font.font['head'].modified=2082844800
 font.font.flavor='woff';out=ROOT/'public/fonts/ChineseOSStroke.woff';font.save(out)
 manifest={'source':'Local Hanzi Writer stroke outlines, converted for passive text display','glyphCount':len(data),'characters':''.join(data),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'outlineSources':{ch:hashlib.sha256(json.dumps(d['strokes'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest() for ch,d in data.items()},'licenses':['/licenses/hanzi-writer-data-ARPHICPL.TXT','/licenses/makemeahanzi-COPYING.txt']}
 (ROOT/'public/fonts/hanzi-display.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print('Stroke font:',len(data),'characters,',out.stat().st_size,'bytes')
if __name__=='__main__':build()
