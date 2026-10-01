"""One-off (PR #24): insert a Mining row (2nd) into 'Selected Industries Served' (pages 9-10) of
company_profile_updated.pdf. Existing rows are reused as region-filtered,
translated vector copies of the original pages; only the Mining row and credit are new."""
import io, sys, pikepdf
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit, ImageReader
from PIL import Image

SRC, IMG, OUT = sys.argv[1], sys.argv[2], sys.argv[3]  # pre-PR-24 PDF, industry-mining.webp, output
W, H = 595.92, 842.88
F = '/usr/share/fonts/truetype/liberation/'
pdfmetrics.registerFont(TTFont('LS', F + 'LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LSB', F + 'LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LSI', F + 'LiberationSans-Italic.ttf'))
INK = (0.1373, 0.1216, 0.1255); PINK = (0.9843, 0.9451, 0.9373); GREY = (0.8667,) * 3
CALLOUT = (0.2902, 0.2078, 0.1882); RED = (0.6784, 0.1725, 0.1333)
y = lambda top: H - top  # top-down -> PDF coords

DESC = ("Transport and supply support for the mining sector, including the movement of machinery, "
        "equipment, spare parts and general supplies. Contact us to discuss your load, route and "
        "delivery requirements. Current fleet and compliance documentation is available on request.")
SRC_URL = 'https://www.flickr.com/photos/97803271@N00/3622997168'
LIC_URL = 'https://creativecommons.org/licenses/by/2.0/'

# ---- new artwork (backgrounds + Mining row), drawn under the reused rows ----
buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=(W, H)); links = []
def fill(rgb, x0, t, x1, b): c.setFillColorRGB(*rgb); c.rect(x0, y(b), x1 - x0, b - t, stroke=0, fill=1)

# page 9: Mining row at 282.0-432.0, pink (row 2); F&B moves to 586.5-736.5 and becomes pink (row 4)
T = 282.0
fill(PINK, 57.7, T, 538.5, 432.0)
for x0 in (57.0, 214.5, 538.5): fill(GREY, x0, T, x0 + 0.7, 432.0)
im = Image.open(IMG).convert('RGB'); jb = io.BytesIO(); im.save(jb, 'JPEG', quality=90); jb.seek(0)
ih = 137.2 * im.height / im.width
c.saveState(); clip = c.beginPath(); clip.roundRect(67.5, y(T + 18.8 + ih), 137.2, ih, 2.25)
c.clipPath(clip, stroke=0, fill=0)   # match the existing photos' rounded corners
c.drawImage(ImageReader(jb), 67.5, y(T + 18.8 + ih), 137.2, ih); c.restoreState()
c.setFillColorRGB(*INK); c.setFont('LSB', 9); c.drawString(67.7, y(T + 18.8 + ih + 14.0 + 8.1), 'Mining')
c.setFont('LS', 9); top = T + 10.2
for line in simpleSplit(DESC, 'LS', 9, 303):
    c.drawString(225.3, y(top + 8.1), line); top += 14.25
# credit (italic, smaller), with visible URLs so it also works in print
top += 6
credit = [
    [('Photo: “One truck again” by Phil Scoville, ', None)],
    [(SRC_URL.replace('https://www.', ''), SRC_URL)],
    [('Licensed under CC BY 2.0 (', None), (LIC_URL.replace('https://', '').rstrip('/'), LIC_URL), ('). ', None)],
    [('Cropped. Illustrative only.', None)],
]
c.setFont('LSI', 7.5)
for parts in credit:
    x = 225.3
    for txt, url in parts:
        w = pdfmetrics.stringWidth(txt, 'LSI', 7.5)
        c.setFillColorRGB(*(RED if url else CALLOUT)); c.drawString(x, y(top + 6.8), txt)
        if url:
            c.setStrokeColorRGB(*RED); c.setLineWidth(0.4); c.line(x, y(top + 7.8), x + w, y(top + 7.8))
            links.append((0, url, (x, y(top + 9), x + w, y(top))))
        x += w
    top += 10.5
assert top < 428, 'Mining text overflows its row: %s' % top
fill(PINK, 57.7, 586.5, 538.5, 736.5)
fill(GREY, 57.0, 736.5, 539.2, 737.3)   # new table bottom border on page 9
c.showPage()
# page 10: Plastics (white, row 5) at 100.5-252.8; Logistics becomes pink (row 6) at 252.8-405.7
fill(PINK, 57.7, 252.8, 538.5, 405.7)
c.showPage(); c.save()

pdf = pikepdf.open(SRC)
art = pikepdf.open(io.BytesIO(buf.getvalue()))
p9, p10 = pdf.pages[8], pdf.pages[9]
RES = {9: p9.Resources, 10: p10.Resources}  # originals, before the pages are rebuilt

# Eng and Plastics were the pink rows on p9; they become white rows 3 and 5.
ops = pikepdf.parse_content_stream(p9)
pinks = [i for i, (o, op) in enumerate(ops) if str(op) == 'rg' and [round(float(v), 4) for v in o] == list(PINK)]
assert len(pinks) == 1, pinks
ops[pinks[0]] = ([1, 1, 1], pikepdf.Operator('rg'))

def mul(a, b):  # PDF matrix product a x b
    return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3], a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
            a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]]

def region_ops(ops, t0, t1):
    """Keep only the painted content whose position lies in [t0,t1] (top-down).
    Graphics-state and clipping ops are kept; filled rects, images and text
    blocks outside the region are dropped, so no hidden text is carried along."""
    inside = lambda m, x, yy: t0 <= H - (m[1]*x + m[3]*yy + m[5]) <= t1
    out, ctm, stack, i = [], [1, 0, 0, 1, 0, 0], [], 0
    while i < len(ops):
        o, op = ops[i]; k = str(op)
        if k == 'q': stack.append(ctm)
        elif k == 'Q': ctm = stack.pop()
        elif k == 'cm': ctm = mul([float(v) for v in o], ctm)
        elif k == 're' and i + 1 < len(ops) and str(ops[i+1][1]) in ('f', 'f*'):
            x, yy, w, h = [float(v) for v in o]
            if not inside(ctm, x + w/2, yy + h/2): i += 2; continue
        elif k == 'Do':
            if not inside(ctm, .5, .5): i += 1; continue
        elif k == 'BT':
            j = i
            while str(ops[j][1]) != 'ET': j += 1
            tm = next(([float(v) for v in oo] for oo, oop in ops[i:j] if str(oop) == 'Tm'), None)
            if tm and not inside(ctm, tm[4], tm[5]): i = j + 1; continue
            out.extend(ops[i:j+1]); i = j + 1; continue
        out.append((o, op)); i += 1
    return out

def form(src, ops, t0, t1):
    return pdf.make_stream(pikepdf.unparse_content_stream(region_ops(ops, t0, t1)), Type=pikepdf.Name.XObject,
                           Subtype=pikepdf.Name.Form, BBox=[0, 0, W, H], Resources=pikepdf.Dictionary(dict(RES[src].items())))  # own copy: resources get pruned per form

ops10 = pikepdf.parse_content_stream(p10)
forms = {}
def piece(src, t0, t1, d):
    """Draw original region [t0,t1] (top-down) of page src (9 or 10) shifted down by d."""
    name = '/P%d' % len(forms)
    forms[name] = form(src, ops if src == 9 else ops10, t0, t1)
    return ('q 1 0 0 1 0 %.3f cm 0 %.3f %.3f %.3f re W n %s Do Q\n' % (-d, y(t1), W, t1 - t0, name)).encode()

def build(page, artpage, pieces):
    a = pdf.copy_foreign(artpage.obj)
    res = pikepdf.Dictionary(XObject=pikepdf.Dictionary(), Font=a.Resources.get('/Font', pikepdf.Dictionary()))
    for k, v in a.Resources.get('/XObject', {}).items(): res.XObject[k] = v
    for k, v in forms.items():
        if k.encode() in b''.join(pieces): res.XObject[k] = v
    art_c = a.Contents.read_bytes() if isinstance(a.Contents, pikepdf.Stream) else b''.join(s.read_bytes() for s in a.Contents)
    page.Contents = pdf.make_stream(b'q\n' + art_c + b'\nQ\n' + b''.join(pieces))
    page.Resources = res

build(p9, art.pages[0], [
    piece(9, 0, 282.0, 0),            # header bars, logo, title, table head, Agribusiness
    piece(9, 281.2, 436.5, 150.0),    # Engineering  -> row 3
    piece(9, 435.7, 586.5, 150.0),    # Food & Bev   -> row 4
    piece(9, 790.0, H, 0),            # footer bar
])
build(p10, art.pages[1], [
    piece(10, 0, 101.2, 0),           # header bars, logo, table head
    piece(9, 585.7, 738.0, -485.2),   # Plastics     -> row 5
    piece(10, 100.5, 255.0, 151.5),   # Logistics    -> row 6
    piece(10, 256.0, 400.0, 151.5),   # Copperbelt Positioning callout
    piece(10, 790.0, H, 0),           # footer bar
])

for pi, url, rect in links:
    annot = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.Annot, Subtype=pikepdf.Name.Link,
        Rect=list(rect), Border=[0, 0, 0], A=pikepdf.Dictionary(S=pikepdf.Name.URI, URI=pikepdf.String(url))))
    pg = (p9, p10)[pi]
    if '/Annots' not in pg: pg.Annots = pdf.make_indirect(pikepdf.Array())
    pg.Annots.append(annot)
pdf.remove_unreferenced_resources()
pdf.save(OUT, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
print('ok', OUT)
