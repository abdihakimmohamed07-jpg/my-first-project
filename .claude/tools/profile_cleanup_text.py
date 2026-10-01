"""One-off: replace two draft passages in company_profile_updated.pdf (no design
source exists). Page 3: new 1.2 Corporate Identity intro (3 lines, fits on p. 3);
page 4: drop the old 2-line carry-over and move the rest of the page up;
page 7: new 3-line fleet note. Everything else is reused as region-filtered
original vector content (same technique as profile_add_mining_row.py).
Usage: profile_cleanup_text.py IN.pdf OUT.pdf"""
import io, sys, pikepdf
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 595.92, 842.88
F = '/usr/share/fonts/truetype/liberation/'
for n, f in (('LS', 'Regular'), ('LSB', 'Bold'), ('LSI', 'Italic')):
    pdfmetrics.registerFont(TTFont(n, F + 'LiberationSans-%s.ttf' % f))
INK = (0.1373, 0.1216, 0.1255)
X0, X1, SIZE, PITCH, ASC = 57.02, 539.22, 10.5, 16.5, 8.25  # body column, 10.5pt, pitch, baseline offset (measured)
y = lambda top: H - top

IDENTITY = [('LSB', 'Purpose, Direction & Values.'),
            ('LS', 'Octane Transport’s published purpose, direction and values describe its commitment to '
                   'dependable transportation, logistics and supply services, compliance-minded operations and '
                   'long-term client relationships.')]
FLEET = [('LSI', 'A detailed fleet schedule, including vehicle types and load capacities, is available on request '
                 'to support supplier registration, procurement due diligence and tender requirements. Vehicle '
                 'registration information is shared following a review of the request.')]

def paragraph(c, runs, top):
    """Justified paragraph (last line ragged), like the profile's body text."""
    words = [(f, w) for f, t in runs for w in t.split()]
    sw = lambda f, w: pdfmetrics.stringWidth(w, f, SIZE)
    space = sw('LS', ' ')
    lines, cur = [], []
    for wd in words:
        if cur and sum(sw(*x) for x in cur) + space * len(cur) + sw(*wd) > X1 - X0:
            lines.append(cur); cur = []
        cur.append(wd)
    lines.append(cur)
    c.setFillColorRGB(*INK)
    for i, ln in enumerate(lines):
        gap = space if i == len(lines) - 1 or len(ln) == 1 else (X1 - X0 - sum(sw(*x) for x in ln)) / (len(ln) - 1)
        x = X0
        for k, (f, w) in enumerate(ln):
            c.setFont(f, SIZE)
            c.drawString(x, y(top + ASC), w if k == len(ln) - 1 else w + ' ')  # real space glyph for text extraction
            x += sw(f, w) + gap
        top += PITCH
    return len(lines)

buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=(W, H))
n3 = paragraph(c, IDENTITY, 702.0); c.showPage()
c.showPage()
n7 = paragraph(c, FLEET, 753.0); c.showPage(); c.save()
assert n3 <= 4 and 702.0 + (n3 - 1) * PITCH + SIZE < 800, n3
assert 753.0 + (n7 - 1) * PITCH + SIZE < 800, n7

def mul(a, b):
    return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3], a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
            a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]]

def region_ops(ops, res, t0, t1, ctm=(1, 0, 0, 1, 0, 0)):
    """Keep painted content positioned in [t0,t1] (top-down); keep state/clip ops.
    Form XObjects are filtered recursively. Returns (ops, resources copy)."""
    inside = lambda m, x, yy: t0 <= H - (m[1]*x + m[3]*yy + m[5]) <= t1
    res = pikepdf.Dictionary(dict(res.items()))
    xobjs = pikepdf.Dictionary(dict(res.get('/XObject', pikepdf.Dictionary()).items())); res.XObject = xobjs
    out, ctm, stack, i = [], list(ctm), [], 0
    while i < len(ops):
        o, op = ops[i]; k = str(op)
        if k == 'q': stack.append(ctm)
        elif k == 'Q': ctm = stack.pop()
        elif k == 'cm': ctm = mul([float(v) for v in o], ctm)
        elif k == 're' and i + 1 < len(ops) and str(ops[i+1][1]) in ('f', 'f*'):
            x, yy, w, h = [float(v) for v in o]
            if not inside(ctm, x + w/2, yy + h/2): i += 2; continue
        elif k == 'Do':
            xo = xobjs[str(o[0])]
            if xo.get('/Subtype') == '/Form':
                m = [float(v) for v in xo.get('/Matrix', [1, 0, 0, 1, 0, 0])]
                fops, fres = region_ops(pikepdf.parse_content_stream(xo), xo.get('/Resources', res), t0, t1, mul(m, ctm))
                name = str(o[0]) + 'r'
                xobjs[name] = pdf.make_stream(pikepdf.unparse_content_stream(fops), Type=pikepdf.Name.XObject,
                    Subtype=pikepdf.Name.Form, BBox=xo.BBox, Matrix=xo.get('/Matrix', [1, 0, 0, 1, 0, 0]), Resources=fres)
                out.append(([pikepdf.Name(name)], op)); i += 1; continue
            if not inside(ctm, .5, .5): i += 1; continue
        elif k == 'BT':
            j = i
            while str(ops[j][1]) != 'ET': j += 1
            tms = [[float(v) for v in oo] for oo, oop in ops[i:j] if str(oop) == 'Tm']
            assert len(tms) <= 1, 'multi-line text block'
            if tms and not inside(ctm, tms[0][4], tms[0][5]): i = j + 1; continue
            out.extend(ops[i:j+1]); i = j + 1; continue
        out.append((o, op)); i += 1
    return out, res

pdf = pikepdf.open(SRC)
art = pikepdf.open(io.BytesIO(buf.getvalue()))

def rebuild(idx, artpage, pieces):
    page = pdf.pages[idx]; res0 = page.Resources; ops = pikepdf.parse_content_stream(page)
    a = pdf.copy_foreign(artpage.obj)
    res = pikepdf.Dictionary(XObject=pikepdf.Dictionary(), Font=a.Resources.get('/Font', pikepdf.Dictionary()))
    body = b'q\n' + a.Contents.read_bytes() + b'\nQ\n'
    for n, (t0, t1, d) in enumerate(pieces):
        name = '/K%d' % n
        fops, fres = region_ops(ops, res0, t0, t1)
        res.XObject[name] = pdf.make_stream(pikepdf.unparse_content_stream(fops),
            Type=pikepdf.Name.XObject, Subtype=pikepdf.Name.Form, BBox=[0, 0, W, H], Resources=fres)
        body += ('q 1 0 0 1 0 %.3f cm 0 %.3f %.3f %.3f re W n %s Do Q\n' % (-d, y(t1), W, t1 - t0, name)).encode()
    page.Contents = pdf.make_stream(body); page.Resources = res

rebuild(2, art.pages[0], [(0, 695.0, 0), (798.0, H, 0)])          # p3: drop old 2 lines (702, 718.5)
SHIFT = 120.7 - 73.5                                              # table header to top, as on p10
rebuild(3, art.pages[1], [(0, 70.0, 0), (110.0, 801.0, -SHIFT), (801.0, H, 0)])  # p4: drop 76.5/93.0
rebuild(6, art.pages[2], [(0, 745.0, 0), (798.0, H, 0)])          # p7: drop old fleet note
pdf.remove_unreferenced_resources()
pdf.save(OUT, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
print('ok', OUT, 'lines p3=%d p7=%d shift p4=%.1f' % (n3, n7, SHIFT))
