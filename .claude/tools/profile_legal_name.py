"""One-off: change the legal name in company_profile_updated.pdf from
"Octane Transport Limited" to "Octane Transport Zambia Limited" (no design
source exists). Page 3: the 1.1 Executive Statement paragraph is redrawn on its
original four baselines (the longer name fits by shortening "in the heart of the
Copperbelt Province" to "in the Copperbelt Province"). Page 4: the Legal /
Trading Name cell is redrawn. Old text is removed from the content streams (not
covered up), so text extraction and search see only the new name. Everything
else is reused as region-filtered original vector content (same technique as
profile_cleanup_text.py). The whole profile uses Liberation Sans, so the new
text is set in the same face, size and colour as the original.
Usage: profile_legal_name.py IN.pdf OUT.pdf"""
import io, sys, pikepdf
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 595.92, 842.88
pdfmetrics.registerFont(TTFont('LS', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
INK = (0.1373, 0.1216, 0.1255)
X0, X1 = 57.02, 539.22                       # p3 body column (measured)
BASE3 = [402.7, 419.2, 436.5, 453.0]         # p3 original baselines, top-down (measured)
EXEC = ('Octane Transport Zambia Limited is a privately owned Zambian transportation, logistics and general '
        'supply company headquartered in Ndola, in the Copperbelt Province. The company moves cargo and '
        'equipment for corporate, industrial and mining-sector clients across Zambia and the wider SADC '
        'region, consolidating supply, logistics and haulage capability under a single accountable operator.')
CELL = ('Octane Transport Zambia Limited', 178.3, 450.8, 9.0)  # p4 text, x, baseline (top-down), size

def justified(c, text, size, baselines):
    sw = lambda w: pdfmetrics.stringWidth(w, 'LS', size)
    space, lines, cur = sw(' '), [], []
    for wd in text.split():
        if cur and sum(map(sw, cur)) + space * len(cur) + sw(wd) > X1 - X0:
            lines.append(cur); cur = []
        cur.append(wd)
    lines.append(cur)
    assert len(lines) == len(baselines), len(lines)
    c.setFillColorRGB(*INK); c.setFont('LS', size)
    for i, ln in enumerate(lines):
        gap = space if i == len(lines) - 1 else (X1 - X0 - sum(map(sw, ln))) / (len(ln) - 1)
        x = X0
        for k, wd in enumerate(ln):
            c.drawString(x, H - baselines[i], wd if k == len(ln) - 1 else wd + ' ')  # real space for extraction
            x += sw(wd) + gap

buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=(W, H))
justified(c, EXEC, 10.5, BASE3); c.showPage()
c.setFillColorRGB(*INK); c.setFont('LS', CELL[3]); c.drawString(CELL[1], H - CELL[2], CELL[0]); c.showPage()
c.save()

def mul(a, b):
    return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3], a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
            a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]]

def region_ops(ops, res, t0, t1, tx, ctm=(1, 0, 0, 1, 0, 0)):
    """Keep text blocks whose origin is in [t0,t1] (top-down) and x in [tx0,tx1]; keep all
    graphics (the caller clips each piece to its band, so table borders and fills that
    straddle a band edge stay whole). Form XObjects are filtered recursively."""
    band = lambda m, x, yy: t0 <= H - (m[1]*x + m[3]*yy + m[5]) <= t1
    res = pikepdf.Dictionary(dict(res.items()))
    xobjs = pikepdf.Dictionary(dict(res.get('/XObject', pikepdf.Dictionary()).items())); res.XObject = xobjs
    out, ctm, stack, i = [], list(ctm), [], 0
    while i < len(ops):
        o, op = ops[i]; k = str(op)
        if k == 'q': stack.append(ctm)
        elif k == 'Q': ctm = stack.pop()
        elif k == 'cm': ctm = mul([float(v) for v in o], ctm)
        elif k == 'Do':
            xo = xobjs[str(o[0])]
            if xo.get('/Subtype') == '/Form':
                m = [float(v) for v in xo.get('/Matrix', [1, 0, 0, 1, 0, 0])]
                fops, fres = region_ops(pikepdf.parse_content_stream(xo), xo.get('/Resources', res), t0, t1, tx, mul(m, ctm))
                name = str(o[0]) + 'n'
                xobjs[name] = pdf.make_stream(pikepdf.unparse_content_stream(fops), Type=pikepdf.Name.XObject,
                    Subtype=pikepdf.Name.Form, BBox=xo.BBox, Matrix=xo.get('/Matrix', [1, 0, 0, 1, 0, 0]), Resources=fres)
                out.append(([pikepdf.Name(name)], op)); i += 1; continue
        elif k == 'BT':
            j = i
            while str(ops[j][1]) != 'ET': j += 1
            tms = [[float(v) for v in oo] for oo, oop in ops[i:j] if str(oop) == 'Tm']
            assert len(tms) <= 1, 'multi-line text block'
            if tms:
                m = mul(tms[0], ctm)
                if not (band(ctm, tms[0][4], tms[0][5]) and tx[0] <= m[4] <= tx[1]): i = j + 1; continue
            out.extend(ops[i:j+1]); i = j + 1; continue
        out.append((o, op)); i += 1
    return out, res

pdf = pikepdf.open(SRC)
art = pikepdf.open(io.BytesIO(buf.getvalue()))
ALL = (-1e9, 1e9)

def rebuild(idx, artpage, pieces):
    page = pdf.pages[idx]; res0 = page.Resources; ops = pikepdf.parse_content_stream(page)
    a = pdf.copy_foreign(artpage.obj)
    res = pikepdf.Dictionary(XObject=pikepdf.Dictionary(), Font=a.Resources.get('/Font', pikepdf.Dictionary()))
    body = b''
    for n, (t0, t1, tx) in enumerate(pieces):
        name = '/L%d' % n
        fops, fres = region_ops(ops, res0, t0, t1, tx)
        res.XObject[name] = pdf.make_stream(pikepdf.unparse_content_stream(fops),
            Type=pikepdf.Name.XObject, Subtype=pikepdf.Name.Form, BBox=[0, 0, W, H], Resources=fres)
        body += ('q 0 %.3f %.3f %.3f re W n %s Do Q\n' % (H - t1, W, t1 - t0, name)).encode()
    body += b'q\n' + a.Contents.read_bytes() + b'\nQ\n'
    page.Contents = pdf.make_stream(body); page.Resources = res

rebuild(2, art.pages[0], [(0, 392.0, ALL), (462.0, H, ALL)])                    # p3: drop old 4 lines
rebuild(3, art.pages[1], [(0, 438.0, ALL), (438.0, 456.0, (0, 172.0)), (456.0, H, ALL)])  # p4: drop old cell text
pdf.remove_unreferenced_resources()
pdf.docinfo['/Title'] = 'Octane Transport Zambia Limited - Company Profile'
pdf.docinfo['/Author'] = 'Octane Transport Zambia Limited'
pdf.save(OUT, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
print('ok', OUT)
