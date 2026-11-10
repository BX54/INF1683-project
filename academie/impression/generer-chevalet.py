import sys, segno
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
D = sys.argv[1]
for n, f in [('PF', 'Playfair.ttf'), ('PFI', 'PlayfairIt.ttf'), ('MR', 'Manrope.ttf'), ('MRSB', 'ManropeSB.ttf')]:
    pdfmetrics.registerFont(TTFont(n, f'{D}/{f}'))
NOIR, CHARBON, OR, ORC, IVOIRE = (HexColor(x) for x in ('#0b0b0b', '#161412', '#c9a24b', '#e6c77a', '#f3ede2'))
URL = 'https://restaurantlacademiegatineau.com/#menu'
q = segno.make(URL, error='h')
mat = [list(r) for r in q.matrix]

def spaced(c, txt, x, y, font, size, track, color, center=True):
    c.setFont(font, size); c.setFillColor(color)
    w = sum(pdfmetrics.stringWidth(ch, font, size) for ch in txt) + track * (len(txt) - 1)
    cx = x - w / 2 if center else x
    for ch in txt:
        c.drawString(cx, y, ch); cx += pdfmetrics.stringWidth(ch, font, size) + track

def panneau(c, ox, oy, W, H):
    c.setFillColor(NOIR); c.rect(ox, oy, W, H, fill=1, stroke=0)
    c.setStrokeColor(OR); c.setLineWidth(0.6); m = 6 * mm
    c.rect(ox + m, oy + m, W - 2 * m, H - 2 * m, fill=0, stroke=1)
    c.setLineWidth(0.3); c.rect(ox + m + 1.6 * mm, oy + m + 1.6 * mm, W - 2 * m - 3.2 * mm, H - 2 * m - 3.2 * mm, fill=0, stroke=1)
    cx = ox + W / 2; y = oy + H - 24 * mm
    spaced(c, "L'ACADÉMIE", cx, y, 'PF', 22, 4.2, IVOIRE)
    spaced(c, 'RESTAURANT · APPORTEZ VOTRE VIN', cx, y - 6.5 * mm, 'MRSB', 6.2, 1.6, OR)
    c.setFont('PFI', 19); c.setFillColor(ORC); c.drawCentredString(cx, y - 19 * mm, 'Notre menu')
    # QR sur fond ivoire
    s = 52 * mm; qx = cx - s / 2; qy = y - 26 * mm - s
    c.setFillColor(IVOIRE); c.roundRect(qx - 4 * mm, qy - 4 * mm, s + 8 * mm, s + 8 * mm, 2.5 * mm, fill=1, stroke=0)
    n = len(mat); cell = s / n; c.setFillColor(NOIR)
    for r, row in enumerate(mat):
        for col, v in enumerate(row):
            if v: c.rect(qx + col * cell, qy + s - (r + 1) * cell, cell + 0.05, cell + 0.05, fill=1, stroke=0)
    ty = qy - 13 * mm
    spaced(c, 'SCANNEZ POUR VOIR LE MENU', cx, ty, 'MRSB', 7.6, 1.8, IVOIRE)
    c.setFont('MR', 7.2); c.setFillColor(HexColor('#b9b2a6'))
    c.drawCentredString(cx, ty - 6 * mm, 'Ouvrez l’appareil photo de votre téléphone')
    c.drawCentredString(cx, ty - 10 * mm, 'et visez le code.')
    c.setStrokeColor(OR); c.setLineWidth(0.4); c.line(cx - 10 * mm, ty - 16 * mm, cx + 10 * mm, ty - 16 * mm)
    c.setFont('MR', 6.6); c.setFillColor(OR); c.drawCentredString(cx, ty - 22 * mm, 'restaurantlacademiegatineau.com')

# 1) Carte simple 10 × 15 cm (pour présentoir / porte-menu)
W, H = 100 * mm, 150 * mm
c = canvas.Canvas(f'{D}/chevalet-qr-10x15.pdf', pagesize=(W, H)); c.setTitle("L'Académie — QR du menu")
panneau(c, 0, 0, W, H); c.showPage(); c.save()
# 2) Chevalet à plier (deux faces) sur une feuille Lettre : couper, plier au trait
from reportlab.lib.pagesizes import letter
LW, LH = letter
c = canvas.Canvas(f'{D}/chevalet-qr-a-plier-lettre.pdf', pagesize=letter); c.setTitle("L'Académie — chevalet QR à plier")
k = 0.86  # chaque face : 86 × 129 mm (les deux faces tiennent sur une feuille Lettre)
w, h = W * k, H * k
ox = (LW - w) / 2; base = (LH - 2 * h) / 2
c.saveState(); c.translate(ox, base); c.scale(k, k); panneau(c, 0, 0, W, H); c.restoreState()                       # face avant (en bas)
c.saveState(); c.translate(ox + w, base + 2 * h); c.rotate(180); c.scale(k, k); panneau(c, 0, 0, W, H); c.restoreState()  # face arrière
c.setDash(3, 3); c.setStrokeColor(HexColor('#888888')); c.setLineWidth(0.5)
c.line(ox - 8 * mm, base + h, ox + w + 8 * mm, base + h)
c.setDash()
c.setFont('MR', 7); c.setFillColor(HexColor('#666666'))
c.drawCentredString(LW / 2, base - 6 * mm, 'Couper le long du cadre noir, plier sur le pointillé : le chevalet tient debout, le QR visible des deux côtés.')
c.showPage(); c.save()
print('ok')
