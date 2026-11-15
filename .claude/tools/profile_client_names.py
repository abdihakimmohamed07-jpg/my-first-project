"""One-off: correct two client names in the 4.2 Client Portfolio table of
company_profile_updated.pdf (no design source exists): "World Co. Logistics" ->
"Worldco Shipping" and "Logistra Africa" -> "Logistar", to match the clients'
own logos (Abdi, 15 Nov 2026). The two old text blocks on page 14 are removed
from the content stream (not covered up), so search and copy-paste see only
the new names; the new names are drawn in Liberation Sans 9pt in the original
ink colour at the original cell position. Nothing else on the page changes.
Usage: profile_client_names.py IN.pdf OUT.pdf"""
import io, sys, pikepdf
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 595.92, 842.88
PAGE = 13                                   # page 14, zero-based
INK = (0.1373, 0.1216, 0.1255)              # rg in effect for the cell text (measured)
X, SIZE = 67.6875, 9.0                      # cell text x and size (measured: 90.25 / 12 at 0.75 scale)
CELLS = {                                   # old text -> (new text, baseline from top, measured)
    'World Co. Logistics': ('Worldco Shipping', 295.50),
    'Logistra Africa': ('Logistar', 324.75),
}
pdfmetrics.registerFont(TTFont('LS', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
dec = lambda b: ''.join(chr(c + 29) for c in bytes(b) if c)   # subset font: glyph id = char - 29

buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=(W, H))
c.setFillColorRGB(*INK); c.setFont('LS', SIZE)
for new, base in CELLS.values():
    c.drawString(X, H - base, new)
c.showPage(); c.save()

pdf = pikepdf.open(SRC)
page = pdf.pages[PAGE]
ops = pikepdf.parse_content_stream(page)
out, found, i = [], [], 0
while i < len(ops):
    if str(ops[i][1]) == 'BT':
        j = i
        while str(ops[j][1]) != 'ET': j += 1
        txt = ''.join(dec(o[0]) for o, op in ops[i:j + 1] if str(op) == 'Tj')
        if txt in CELLS:
            found.append(txt); i = j + 1; continue
    out.append(ops[i]); i += 1
assert sorted(found) == sorted(CELLS), found

artpdf = pikepdf.open(io.BytesIO(buf.getvalue()))
art = pdf.copy_foreign(artpdf.pages[0].obj)
fonts = page.Resources.Font
for k, v in art.Resources.Font.items():
    assert k not in fonts, k
    fonts[k] = v
page.Contents = pdf.make_stream(b'q\n' + pikepdf.unparse_content_stream(out) + b'\nQ\nq\n' + art.Contents.read_bytes() + b'\nQ\n')
pdf.save(OUT, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
print('ok', OUT, found)
