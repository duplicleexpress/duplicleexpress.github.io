#!/usr/bin/env python3
"""Génère le flyer A5 et les cartes de visite (PDF prêts à imprimer).

Lancer depuis la racine du dépôt :  python3 _lancement/sources/imprimables.py
Nécessite Playwright + Chromium (déjà présents dans l'environnement Claude).
"""
import base64
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, "_lancement", "imprimer")

PHONE = "06 07 88 72 81"
SITE = "duplicleexpress.github.io"


def b64(path, mime):
    with open(path, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()


def qr(name, color="#000"):
    svg = open(os.path.join(HERE, f"{name}.svg")).read()
    svg = re.sub(r"<\?xml[^>]*>", "", svg)
    svg = re.sub(r'width="[^"]*" height="[^"]*"', 'width="100%" height="100%"', svg, count=1)
    return svg.replace("<path ", f'<path fill="{color}" ')


LOGO = b64(os.path.join(ROOT, "images", "logo.webp"), "image/webp")
HERO = b64(os.path.join(ROOT, "images", "hero.webp"), "image/webp")
IMG = {k: b64(os.path.join(ROOT, "images", f"{k}.webp"), "image/webp")
       for k in ["ouverture", "double", "programmation", "perte"]}

BASE_CSS = """
@font-face{font-family:Inter;src:local('Inter')}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,'DejaVu Sans',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.y{color:#ffcb18}
"""

PHONE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z"/></svg>'

# ─── Flyer A5 recto / verso ───────────────────────────────────────────────────
FLYER = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>{BASE_CSS}
@page{{size:148mm 210mm;margin:0}}
.page{{width:148mm;height:210mm;overflow:hidden;position:relative;background:#090a0c;color:#fff;page-break-after:always}}
.recto .bg{{position:absolute;inset:0;background:url('{HERO}') center/cover;filter:blur(2px) brightness(.35)}}
.recto .in{{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;padding:8mm 9mm 7mm;text-align:center}}
.logo{{width:96mm;height:60mm;object-fit:cover;object-position:center 45%}}
h1{{font-size:27pt;line-height:1.05;letter-spacing:-.03em;font-weight:900;margin-top:2mm}}
.sub{{font-size:11.5pt;color:#e9e9e9;margin-top:3mm;line-height:1.35}}
.list{{margin-top:6mm;display:grid;grid-template-columns:1fr 1fr;gap:2.4mm;width:100%}}
.list div{{background:#ffffff14;border:.3mm solid #ffcb1866;border-radius:2.5mm;padding:3.6mm 3.4mm;text-align:left;font-size:11pt;font-weight:700}}
.list b{{display:block;color:#ffcb18;font-size:13pt;font-weight:900}}
.call{{margin-top:auto;width:100%;background:#e0242d;border-radius:4mm;padding:4mm 3mm;display:flex;align-items:center;justify-content:center;gap:3mm}}
.call svg{{width:10mm;height:10mm}}
.call .n{{font-size:29pt;font-weight:900;letter-spacing:.01em;line-height:1}}
.call small{{display:block;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.12em}}
.foot{{margin-top:3.5mm;font-size:9pt;color:#ddd;display:flex;gap:4mm;justify-content:center;flex-wrap:wrap}}
.foot span::before{{content:"✓ ";color:#ffcb18;font-weight:900}}
.verso{{background:#0d0e11}}
.verso .in{{padding:9mm;height:100%;display:flex;flex-direction:column}}
.verso h2{{font-size:20pt;font-weight:900;letter-spacing:-.02em}}
.verso .tag{{font-size:8.5pt;letter-spacing:.18em;text-transform:uppercase;color:#ffcb18;font-weight:900}}
table{{width:100%;border-collapse:collapse;margin-top:4mm;font-size:11pt}}
td{{padding:2.6mm 1mm;border-bottom:.3mm solid #2c2f35}}
td:last-child{{text-align:right;color:#ffcb18;font-weight:900;white-space:nowrap}}
.note{{font-size:8.6pt;color:#aeb1b5;margin-top:2.5mm}}
.steps{{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:6mm}}
.steps div{{background:#17191d;border-radius:3mm;padding:3mm;font-size:8.8pt;color:#ccc}}
.steps b{{display:block;color:#fff;font-size:10pt;margin-bottom:1mm}}
.steps i{{font-style:normal;display:inline-grid;place-items:center;width:6mm;height:6mm;border-radius:50%;background:#ffcb18;color:#111;font-weight:900;margin-bottom:1.5mm}}
.bottom{{margin-top:auto;display:flex;gap:5mm;align-items:center;background:#ffcb18;color:#111;border-radius:4mm;padding:4mm}}
.qr{{width:27mm;height:27mm;background:#fff;padding:1.5mm;border-radius:2mm;flex:none}}
.bottom .t{{font-size:9.5pt;font-weight:700}}
.bottom .n{{font-size:21pt;font-weight:900;line-height:1.1}}
</style></head><body>
<section class="page recto"><div class="bg"></div><div class="in">
<img class="logo" src="{LOGO}">
<h1>Clé perdue ?<br>Voiture fermée ?<br><span class="y">On vient à vous.</span></h1>
<p class="sub">Serrurier automobile à domicile · Île-de-France<br><b class="y">24h/24 – 7j/7</b></p>
<div class="list">
<div><b>dès 84 €</b>Ouverture de voiture</div>
<div><b>dès 114 €</b>Double de clé</div>
<div><b>dès 84 €</b>Programmation de clé</div>
<div><b>dès 200 €</b>Perte totale de clés</div>
</div>
<div class="call">{PHONE_SVG}<div><small>Appelez maintenant</small><div class="n">{PHONE}</div></div></div>
<div class="foot"><span>Sans casse</span><span>Sans remorquage</span><span>Prix annoncé avant</span></div>
</div></section>
<section class="page verso"><div class="in">
<div class="tag">Tarifs transparents</div>
<h2>Nos prestations</h2>
<table>
<tr><td>Ouverture de véhicule</td><td>dès 84 €</td></tr>
<tr><td>Double de clé avec puce</td><td>dès 114 €</td></tr>
<tr><td>Double avec télécommande</td><td>dès 159 €</td></tr>
<tr><td>Programmation de clé</td><td>dès 84 €</td></tr>
<tr><td>Perte totale de clés</td><td>dès 200 €</td></tr>
<tr><td>Assistance au démarrage</td><td>dès 64 €</td></tr>
<tr><td>Remplacement de batterie</td><td>dès 149 €</td></tr>
</table>
<p class="note">Prix final selon votre véhicule, toujours confirmé au téléphone avant l’intervention. 15 € de remise sur la 2ᵉ clé.</p>
<div class="steps">
<div><i>1</i><b>Vous appelez</b>Marque, modèle, année et adresse.</div>
<div><i>2</i><b>Prix confirmé</b>Avant tout déplacement.</div>
<div><i>3</i><b>On intervient</b>Chez vous, au travail, au parking.</div>
</div>
<div class="bottom"><div class="qr">{qr("qr-site")}</div>
<div><div class="t">Paris · 77 · 78 · 91 · 92 · 93 · 94 · 95</div><div class="n">{PHONE}</div><div class="t">{SITE}</div></div></div>
</div></section>
</body></html>"""

# ─── Carte de visite 85 × 55 mm ───────────────────────────────────────────────
CARD_RECTO = f"""<div class="card r"><img src="{LOGO}"></div>"""
CARD_VERSO = f"""<div class="card v"><div class="l">
<div class="tag">Serrurier automobile</div>
<div class="n">{PHONE}</div>
<ul><li>Ouverture de voiture</li><li>Double &amp; programmation de clé</li><li>Perte totale de clés</li><li>Batterie · démarrage</li></ul>
<div class="s">{SITE}</div>
<div class="h">À domicile · Île-de-France · 24h/24</div>
</div><div class="q">{qr("qr-tel")}<span>Scannez pour appeler</span></div></div>"""

CARD_CSS = """
.card{width:85mm;height:55mm;overflow:hidden;background:#090a0c;color:#fff;position:relative}
.card.r{display:grid;place-items:center}
.card.r img{width:85mm;height:56.7mm;object-fit:cover}
.card.v{display:flex;gap:3mm;padding:4.5mm 4.5mm 4mm 5mm;border-top:1.2mm solid #ffcb18}
.card .l{flex:1;display:flex;flex-direction:column}
.card .tag{font-size:6.3pt;letter-spacing:.16em;text-transform:uppercase;color:#ffcb18;font-weight:900}
.card .n{font-size:17.5pt;font-weight:900;line-height:1.15;margin:1mm 0 1.6mm;white-space:nowrap}
.card ul{list-style:none;font-size:7.1pt;color:#ddd;line-height:1.5}
.card li::before{content:"› ";color:#ffcb18;font-weight:900}
.card .s{margin-top:auto;font-size:7pt;font-weight:700;color:#ffcb18}
.card .h{font-size:6.3pt;color:#aaa}
.card .q{width:22mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:1mm}
.card .q svg{background:#fff;padding:1mm;border-radius:1.5mm;width:22mm;height:22mm}
.card .q span{font-size:5.6pt;color:#bbb;text-align:center}
"""

CARDS_SINGLE = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>{BASE_CSS}{CARD_CSS}
@page{{size:85mm 55mm;margin:0}} .card{{page-break-after:always}}</style></head><body>
{CARD_RECTO}{CARD_VERSO}</body></html>"""

# Planche A4 de 10 cartes (2 × 5) avec traits de coupe, recto puis verso
def sheet(card, mirror=False):
    cells = "".join(f"<div class='cell'>{card}</div>" for _ in range(10))
    return f"<section class='sheet{' m' if mirror else ''}'>{cells}</section>"


CARDS_SHEET = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>{BASE_CSS}{CARD_CSS}
@page{{size:210mm 297mm;margin:0}}
.sheet{{width:210mm;height:297mm;display:grid;grid-template-columns:85mm 85mm;grid-auto-rows:55mm;justify-content:center;align-content:center;gap:0;page-break-after:always}}
.cell{{outline:.1mm dashed #999}}
</style></head><body>{sheet(CARD_RECTO)}{sheet(CARD_VERSO)}</body></html>"""

JS = r"""
const { chromium } = require('playwright');
(async () => {
  const [,, html, pdf, png, w, h] = process.argv;
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage();
  await p.goto('file://' + html); await p.waitForTimeout(400);
  await p.pdf({path: pdf, preferCSSPageSize: true, printBackground: true});
  if (png !== '-') {
    await p.setViewportSize({width: +w, height: +h});
    await p.screenshot({path: png, fullPage: true});
  }
  await b.close();
})();
"""


def render(name, html, png_size=None):
    src = os.path.join(HERE, f"_{name}.html")
    with open(src, "w") as f:
        f.write(html)
    js = os.path.join(HERE, "_render.js")
    with open(js, "w") as f:
        f.write(JS)
    pdf = os.path.join(OUT, f"{name}.pdf")
    png = os.path.join(OUT, f"{name}-apercu.png") if png_size else "-"
    w, h = png_size or (0, 0)
    env = dict(os.environ, NODE_PATH=os.environ.get("NODE_PATH", ""))
    subprocess.run(["node", js, src, pdf, png, str(w), str(h)], check=True, env=env)
    os.remove(src)
    os.remove(js)
    print("✓", pdf)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    render("flyer-A5-recto-verso", FLYER, (560, 794))
    render("carte-de-visite-85x55", CARDS_SINGLE, (322, 208))
    render("cartes-de-visite-planche-A4", CARDS_SHEET)
