"""Builds src/fonts/hitoiki-kanji.woff2: Shippori Mincho Bold reduced to the few kanji the UI uses.

The full Japanese font weighs ~1.5 MB per weight; the app only needs a handful of characters (brand,
game seals, calendar), so they are cut out into one tiny file. Run again after adding a kanji to KANJI.
"""
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

KANJI = '一息角道冠管橋陽彩謎形組数済休続日月火水木金土今'
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'node_modules/@fontsource/shippori-mincho/files/shippori-mincho-japanese-700-normal.woff2'
OUT = ROOT / 'src/fonts/hitoiki-kanji.woff2'

font = TTFont(SRC)
cmap = font.getBestCmap()
missing = [c for c in KANJI if ord(c) not in cmap]
if missing:
    raise SystemExit(f'Not in the font: {"".join(missing)}')
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = []
sub = subset.Subsetter(opts)
sub.populate(text=KANJI)
sub.subset(font)
font.flavor = 'woff2'
OUT.parent.mkdir(exist_ok=True)
font.save(OUT)
print(f'{OUT.relative_to(ROOT)}: {OUT.stat().st_size} bytes, {len(KANJI)} kanji')
