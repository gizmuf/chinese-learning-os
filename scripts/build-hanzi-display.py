"""Bundle passive stroke outlines as a Unicode font; writing/assessment data stays separate.

Uses the already licensed local Hanzi Writer outlines, never a visual guess.
Run after preparing character assets. fontTools is an authoring dependency only.
"""
import argparse
import gzip
import hashlib
import json
import textwrap
from io import BytesIO
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / 'public/fonts'
LICENSES = ['/licenses/hanzi-writer-data-ARPHICPL.TXT', '/licenses/makemeahanzi-COPYING.txt']


def build_font(characters=None, *, versioned=False, official_part=False):
    source = ROOT / 'public/characters'
    paths = sorted(source.glob('*.json')) if characters is None else [source / (ch + '.json') for ch in sorted(characters)]
    data = {path.stem: json.loads(path.read_text()) for path in paths if len(path.stem) == 1}
    data = {ch: entry for ch, entry in data.items()
            if entry.get('strokes') and all(isinstance(outline, str) and outline.strip() for outline in entry['strokes'])}
    if characters is not None and set(data) != characters:
        raise ValueError('Missing trusted stroke outline for a requested glyph')

    names = {ch: f'uni{ord(ch):X}' for ch in data}
    order = ['.notdef', *names.values()]
    font = FontBuilder(1024, isTTF=True)
    font.setupGlyphOrder(order)
    font.setupCharacterMap({ord(ch): name for ch, name in names.items()})
    glyphs = {'.notdef': TTGlyphPen(None).glyph()}
    for ch, entry in data.items():
        pen = TTGlyphPen(None)
        curves = Cu2QuPen(pen, 0.4, reverse_direction=False)
        for outline in entry['strokes']:
            parse_path(outline, curves)
        glyphs[names[ch]] = pen.glyph()
    font.setupGlyf(glyphs)
    font.setupHorizontalMetrics({name: (1024, getattr(glyphs[name], 'xMin', 0)) for name in order})
    font.setupHorizontalHeader(ascent=900, descent=-124)
    font.setupNameTable({
        'familyName': 'Chinese OS Stroke',
        'styleName': 'Regular',
        'uniqueFontIdentifier': 'ChineseOSStroke-HSK-1' if official_part else 'ChineseOSStroke-1',
        'fullName': 'Chinese OS Stroke HSK Regular' if official_part else 'Chinese OS Stroke Regular',
        'psName': 'ChineseOSStroke-HSK-Regular' if official_part else 'ChineseOSStroke-Regular',
        'version': 'Version 1.000',
        'licenseDescription': 'Derived from Hanzi Writer Data / Make Me a Hanzi. See /licenses/hanzi-writer-data-ARPHICPL.TXT and /licenses/makemeahanzi-COPYING.txt.',
    })
    font.setupOS2(sTypoAscender=900, sTypoDescender=-124, usWinAscent=1024, usWinDescent=256)
    font.setupPost()
    font.setupMaxp()
    font.font.recalcTimestamp = False
    font.font['head'].created = font.font['head'].modified = 2082844800
    font.font.flavor = 'woff'
    buffer = BytesIO()
    font.save(buffer)
    payload = buffer.getvalue()
    digest = hashlib.sha256(payload).hexdigest()

    # Published font paths are immutable. Leave the legacy paths for old clients.
    suffix = '-' + digest[:12] if versioned else ''
    stem = 'ChineseOSStroke-HSK' if official_part else 'ChineseOSStroke'
    inventory = 'hanzi-display-hsk' if official_part else 'hanzi-display'
    filename = stem + suffix + '.woff'
    (FONTS / filename).write_bytes(payload)
    manifest = {
        'source': 'Local Hanzi Writer stroke outlines, converted for passive text display',
        'glyphCount': len(data),
        'characters': ''.join(data),
        'sha256': digest,
        'outlineSources': {ch: hashlib.sha256(json.dumps(entry['strokes'], ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
                           for ch, entry in data.items()},
        'licenses': LICENSES,
    }
    manifest_json = json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) if versioned else json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
    (FONTS / (inventory + suffix + '.json')).write_text(manifest_json)
    print(filename + ':', len(data), 'characters,', len(payload), 'bytes')
    return filename


def unicode_ranges(characters):
    runs = []
    for point in sorted(map(ord, characters)):
        if runs and point == runs[-1][1] + 1:
            runs[-1][1] = point
        else:
            runs.append([point, point])
    return ', '.join(f'U+{start:X}' if start == end else f'U+{start:X}-{end:X}' for start, end in runs)


def font_face(filename, characters):
    ranges = textwrap.fill(unicode_ranges(characters), width=104, subsequent_indent='    ')
    return f"""@font-face {{
  font-family: 'Chinese OS Stroke';
  src: url('/fonts/{filename}') format('woff');
  font-display: swap;
  font-weight: 100 900;
  unicode-range: {ranges};
}}
"""


def build_release_fonts():
    legacy = json.loads((FONTS / 'hanzi-display.json').read_text())
    supplement = json.loads((ROOT / 'data/hanzi-stroke-supplement.json').read_text())
    core = set(legacy['characters'] + ''.join(supplement.values()))
    with gzip.open(ROOT / 'public/dictionary/hsk-levels-2025.json.gz', 'rt') as source:
        official = set(''.join(json.load(source)['characters'].values()))
    remaining = official - core
    core_font = build_font(core, versioned=True)
    official_font = build_font(remaining, versioned=True, official_part=True)
    style_path = ROOT / 'app/hanzi-style.css'
    style = style_path.read_text()
    begin = '/* Generated by scripts/build-hanzi-display.py --extend-supplement. */\n'
    end = '/* End generated stroke faces. */\n'
    if not style.startswith(begin) or end not in style:
        raise ValueError('Generated stroke-face markers are missing from hanzi-style.css')
    remaining_styles = style.split(end, 1)[1]
    style_path.write_text(begin + font_face(core_font, core) + font_face(official_font, remaining) + end + remaining_styles)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--extend-supplement', action='store_true',
                        help='Build the versioned core and official HSK supplemental faces')
    if parser.parse_args().extend_supplement:
        build_release_fonts()
    else:
        build_font()
