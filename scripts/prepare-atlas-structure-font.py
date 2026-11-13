#!/usr/bin/env python3
"""Subset pinned source fonts for exact rare/named Atlas shapes, not normal UI text.
Usage: python3 scripts/prepare-atlas-structure-font.py /path/BabelStoneHan.ttf /path/BabelStoneHanPUA.ttf
Requires fontTools. Inputs and license notices are recorded in the output manifest.
"""
import hashlib,json,sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'data/hanzi-structure.json').read_text())
review=json.loads((root/'data/structure-resolutions.json').read_text())
# Leave the current basic-Hanzi typography unchanged; provide rare characters,
# encoded strokes and exact unencoded parts that system fonts commonly lack.
required={ord(c) for c in data['reverseIndex'] if not 0x4E00<=ord(c)<=0x9FFF} | set(range(0x2FF0,0x3000))
manifest=[]
for source,name in zip(map(Path,sys.argv[1:]),['ChineseOSStructureShapes','ChineseOSNamedShapes']):
 font=TTFont(source);cmap=font.getBestCmap();is_pua='Named' in name
 points={p for p in required if (0xE000<=p<=0xF8FF)==is_pua}
 missing=points-set(cmap)
 if missing:raise ValueError('Missing source glyphs: '+','.join(hex(p) for p in sorted(missing)))
 version=font['name'].getDebugName(5);license_text=font['name'].getDebugName(13)
 digest=hashlib.sha256(source.read_bytes()).hexdigest()
 if is_pua and digest!=review['fontSourceSha256']:raise ValueError('Unpinned named-part font')
 copyright_text=font['name'].getDebugName(0)
 opts=subset.Options();opts.flavor='woff';opts.name_IDs=['*'];opts.name_legacy=True;opts.name_languages=['*']
 sub=subset.Subsetter(options=opts);sub.populate(unicodes=points);sub.subset(font)
 # Original Arphic license permits subsetting with a changed name.
 for record in font['name'].names:
  if record.nameID in (1,2,3,4,6,16,17):
   value='Regular' if record.nameID in (2,17) else name
   record.string=value.encode(record.getEncoding(),errors='replace')
 font.flavor='woff';out=root/'public/fonts'/f'{name}.woff';out.parent.mkdir(exist_ok=True);font.save(out)
 manifest.append({'file':'/fonts/'+out.name,'family':name,'sourceFile':source.name,'sourceSha256':digest,'sourceVersion':version,'glyphCodepoints':[f'U+{p:04X}' for p in sorted(points)],'sha256':hashlib.sha256(out.read_bytes()).hexdigest()})
 (root/'public/licenses'/f'{name}-LICENSE.txt').write_text((copyright_text or '')+'\n\n'+license_text+'\n\nSubset renamed '+name+'. Source: https://www.babelstone.co.uk/Fonts/'+('PUA' if is_pua else 'Han')+'.html\n')
(root/'public/fonts/atlas-structure-shapes.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps([{'family':m['family'],'glyphs':len(m['glyphCodepoints'])} for m in manifest]))
