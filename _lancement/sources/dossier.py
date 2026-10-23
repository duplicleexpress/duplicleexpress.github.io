#!/usr/bin/env python3
"""Génère _lancement/dossier-lancement.html (partenaires, vidéos, concurrents).

Lancer depuis la racine du dépôt :  python3 _lancement/sources/dossier.py
"""
import os
import re
from html import escape

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "dossier-lancement.html")

PHONE = "06 07 88 72 81"
SITE = "duplicleexpress.github.io"

# ─── Partenaires (numéros trouvés sur des annuaires publics, à vérifier) ──────
PARTNERS = [
    ("🚛 Dépanneurs / remorqueurs", "Priorité n°1", "Ils reçoivent des appels « clé perdue » ou « voiture fermée » qu’ils ne savent pas régler. Vous, vous évitez le remorquage au client. Vous pouvez aussi leur renvoyer les voitures en vraie panne : c’est donnant-donnant.", [
        ("DepanOne", "Tout le 94", "06 62 21 00 36", "depanone.fr"),
        ("MD Dépannage 94", "Tout le 94", "07 68 15 80 87", "md-depannage.fr"),
        ("MMI Dépannage 94", "Créteil, Vitry, Ivry, Villejuif…", "07 56 95 95 01", "mmidepannage.com"),
        ("Eurauto", "Val-de-Marne", "06 62 03 31 97", "assistance-depannage.com"),
        ("Auto Diamant", "Val-de-Marne", "07 65 89 65 89", "auto-diamant.com"),
        ("Auto Dépannage 94", "Fresnes", "06 99 98 81 29", "PagesJaunes"),
        ("TSDA (Allo Remorquage)", "Val-de-Marne", "06 51 62 62 41", "alloremorquage.com"),
    ]),
    ("🔧 Garages indépendants", "Priorité n°2", "Leurs clients ont souvent une clé cassée, une télécommande morte ou une seule clé. La plupart des garages ne programment pas les clés : ils vous enverront ces clients.", [
        ("James Auto", "Créteil – 5 rue Jean Jaurès", "01 42 07 82 32", "Vroomly"),
        ("DL Auto Service", "Créteil – 10 rue des Bleuets", "01 71 56 45 79", "AlloGarage"),
        ("My Car Service", "Créteil – 7 bd Montaigut", "01 42 07 49 57", "PagesJaunes"),
        ("Automobile CDM", "Créteil – 22 rue E. Freyssinet", "01 49 80 08 85", "PagesJaunes"),
        ("Dibang Auto", "Créteil – 3 rue Jean Jaurès", "07 45 16 08 56", "Bottin"),
        ("Garage DA", "Vitry – 65 av. Jean Jaurès", "01 46 81 38 61", "PagesJaunes"),
        ("AB Garage", "Vitry – 145 quai Jules Guesde", "01 45 21 87 73", "PagesJaunes"),
        ("Garage Gabriel Péri", "Vitry – 102 rue Gabriel Péri", "01 46 82 21 31", "PagesJaunes"),
        ("Good Car’s", "Vitry – av. Ambroise Croizat", "06 06 69 94 18", "PagesJaunes"),
        ("SVR Automobiles", "Ivry – 13 rue G. Rostaing", "09 81 76 31 79", "PagesJaunes"),
        ("Champigny Service Auto", "Champigny – 26 rue de Verdun", "01 48 81 23 83", "AlloGarage"),
        ("Garage Manatego", "Champigny", "01 48 80 88 72", "AlloGarage"),
        ("Garage Automobile du Centre", "Champigny – 46 rue L. Talamoni", "01 45 16 96 19", "AlloGarage"),
        ("Garage du Parc", "Saint-Maur – 108 rue d’Alsace-Lorraine", "01 48 83 07 33", "site du garage"),
    ]),
    ("🚘 Vendeurs de voitures d’occasion", "Priorité n°2", "Ils vendent souvent des voitures avec une seule clé. Un double de clé est un bon argument de vente pour eux (et un client pour vous).", [
        ("JAT Auto", "Champigny – 256 bd de Stalingrad", "01 47 06 03 43", "Autocadre"),
        ("Vector Automobile", "Champigny – 44 av. de la République", "01 49 83 74 64", "Autocadre"),
        ("Garage Auto Occasion", "Champigny", "07 67 37 69 19", "site du garage"),
        ("Simplicicar Champigny", "Champigny – 429 rue Marcel Paul", "01 85 10 15 60", "La Centrale"),
        ("Voiture Occasion Créteil", "Créteil", "01 89 16 98 92", "site du garage"),
    ]),
    ("🚗 Loueurs de voitures", "Priorité n°3", "Leurs clients perdent des clés ou les enferment dans la voiture. Ils ont souvent besoin de doubles pour leur flotte.", [
        ("Distance Location", "Créteil – 30 rue de Valenton", "01 49 60 85 85", "site officiel"),
        ("Rent A Car Bonneuil-Créteil", "Bonneuil – 7 av. de Paris", "01 41 94 16 80", "rentacar.fr"),
        ("ADA Créteil", "Créteil – 25 av. P. Brossolette", "01 77 67 01 01", "Bottin"),
        ("Loca-Car 94", "Créteil", "01 58 42 37 15", "Bottin"),
        ("CarGo", "Créteil", "01 43 39 29 29", "Bottin"),
        ("Fly Car", "Val-de-Marne", "01 45 82 09 47", "annuaire"),
    ]),
    ("🛠️ Centres auto (Speedy, Midas, Feu Vert)", "Priorité n°3", "Ils ne font pas les clés. Laissez des cartes au comptoir : ils orientent les clients qui demandent.", [
        ("Speedy Champigny", "69 av. Roger Salengro", "01 55 97 07 07", "speedy.fr"),
        ("Midas Champigny", "145 rue Alexandre Fourny", "01 80 91 31 76", "AlloGarage"),
        ("Speedy Saint-Maur", "31 rue de la Varenne", "01 48 89 48 99", "speedy.fr"),
        ("Speedy Maisons-Alfort", "36 av. du Gal Leclerc", "01 71 85 60 41", "speedy.fr"),
        ("Feu Vert Vitry", "5 rue Eugène Hénaff", "01 55 53 19 78", "feuvert.fr"),
    ]),
    ("🎓 Auto-écoles", "Bonus", "Une auto-école a plusieurs voitures et ne peut pas se permettre d’en immobiliser une : clés de secours, pertes de clés.", [
        ("CFAC Créteil", "13 av. du Mal de Lattre de Tassigny", "01 70 13 52 61", "site officiel"),
        ("CFAC Champigny", "42 rue Louis Talamoni", "09 82 66 61 79", "site officiel"),
        ("Permis Accéléré", "Champigny – 149 av. R. Salengro", "06 32 13 92 14", "PagesJaunes"),
        ("Inri’s Créteil", "Créteil", "01 48 99 20 00", "Bottin"),
        ("Auto-École Gold Driving", "Créteil", "01 80 91 90 39", "Bottin"),
    ]),
]

# ─── Vidéos courtes ───────────────────────────────────────────────────────────
VIDEOS = [
    ("Avant l’ouverture", "« Je lance mon entreprise de serrurier auto : jour 1 »",
     "Face caméra, 20 s. « Je m’appelle [prénom], j’ai [âge] ans, et je lance Dupli’Clé Express : serrurier automobile à domicile dans le Val-de-Marne. Je vais tout filmer : le matériel, la formation, les premiers clients. Abonne-toi pour suivre. »",
     "Je lance mon entreprise 🔑🚗 Épisode 1"),
    ("Avant l’ouverture", "« Combien coûte le matériel d’un serrurier auto ? »",
     "Montrez chaque outil (ou des photos si vous ne l’avez pas encore) avec son prix à l’écran. Les gens adorent les chiffres. Finir par : « Je vous montre le premier client bientôt. »",
     "Le vrai prix pour devenir serrurier auto 💸"),
    ("Avant l’ouverture", "« Le logo et la voiture de ma boîte »",
     "Montrez le logo, le site sur votre téléphone, puis (quand elle sera prête) la voiture floquée. « Qu’est-ce que vous en pensez ? Dites-moi en commentaire. » → ça crée des commentaires = plus de vues.",
     "Mon logo est prêt, vous validez ? 🔥"),
    ("Conseil", "« Clés enfermées dans la voiture : ne cassez pas la vitre ! »",
     "« Une vitre cassée = 150 à 400 € + voiture ouverte aux voleurs. Une ouverture pro sans casse = dès 84 €. Appelez un serrurier auto. » Texte à l’écran avec les deux prix côte à côte.",
     "NE CASSE PAS TA VITRE ❌🪟"),
    ("Conseil", "« Vous n’avez qu’une seule clé ? Regardez ça »",
     "« Si vous perdez votre seule clé, c’est la perte totale : plus cher, plus long. Avec un double fait à l’avance, vous êtes tranquille. Dès 114 € à domicile. »",
     "Une seule clé = danger ⚠️🔑"),
    ("Conseil", "« Concession ou serrurier auto : qui est le moins cher ? »",
     "Comparez à l’écran : concession (rendez-vous, remorquage, plusieurs jours) contre serrurier à domicile (sur place, le jour même). Sans citer de marque de concession.",
     "Concession vs serrurier auto 🤔"),
    ("Conseil", "« Votre télécommande ne marche plus ? 3 vérifications »",
     "1) La pile (montrer comment l’ouvrir). 2) Les boutons usés. 3) La clé désynchronisée → là il faut programmer. Utile, partageable, et ça donne envie de vous appeler pour le 3.",
     "Ta télécommande ne marche plus ? 🔋"),
    ("Conseil", "« Votre assurance peut payer votre clé perdue »",
     "« Avant de payer, regardez votre contrat d’assurance auto ou celui de votre carte bancaire : certains remboursent la perte ou le vol de clés. Gardez bien la facture. »",
     "Clé perdue ? Ton assurance peut payer 💡"),
    ("Intervention", "« Ouverture d’une voiture en [X] secondes, sans casse »",
     "Filmez une vraie ouverture (avec l’accord du client, plaque floutée). Chrono à l’écran. C’est LE format qui fait le plus de vues dans ce métier.",
     "Ouverture sans casse ⏱️🔓"),
    ("Intervention", "« Je fabrique un double de clé de A à Z »",
     "Clé vierge → taille → programmation → test d’ouverture et de démarrage. En accéléré, 30 s, musique tendance.",
     "De la clé vierge à la clé qui démarre 🔑✨"),
    ("Intervention", "« Perte totale de clés : on repart sans remorquage »",
     "Racontez l’histoire du client (sans le montrer s’il ne veut pas) : « Il avait perdu toutes ses clés à Créteil, la concession voulait remorquer. 1 h plus tard, il repartait. »",
     "Il a perdu TOUTES ses clés 😱"),
    ("Intervention", "« Réaction du client »",
     "À la fin d’une intervention, demandez au client de dire une phrase face caméra. Rien de plus crédible qu’un vrai client content.",
     "Client sauvé 🙌"),
]

# ─── Concurrents (prix d’appel publiés, octobre 2026) ─────────────────────────
COMPETITORS = [
    ("MyBootlid", "Île-de-France", "dès 69 €", "—", "dès 129 €", "mybootlid.com"),
    ("InterElec", "Île-de-France", "dès 80 € (déplacement inclus)", "—", "—", "interelec.fr"),
    ("Serrurier & Co", "Val-de-Marne", "—", "clé auto dès 90 € (déplacement 94 inclus)", "—", "serrurierandco.fr"),
    ("Clefauto", "Paris + petite couronne", "dès 109 €", "—", "dès 149 €", "clefauto.com"),
    ("Clé de Voiture Paris", "Paris / IDF", "—", "—", "dès 180 €", "cle-de-voiture-paris.fr"),
    ("Clé Voiture Perdue", "Paris / IDF", "—", "—", "≈ 250 €", "cle-voiture-perdue.com"),
    ("Depanneo", "France", "110 à 135 €", "transpondeur 150 à 350 €", "—", "depanneo.com"),
    ("Key Lost", "Val-de-Marne", "—", "double à domicile (prix non affiché)", "—", "key-lost.fr"),
]

MARKET = [
    ("Ouverture de voiture", "69 – 150 €", "84 €", "ok", "Dans le bas de la fourchette : bien placé."),
    ("Double de clé avec puce", "90 – 180 €", "114 €", "ok", "Bien placé, moins cher qu’une concession."),
    ("Double avec télécommande", "150 – 400 €", "159 €", "ok", "Très compétitif."),
    ("Programmation de clé", "100 – 250 €", "99 €", "ok", "Passé de 84 € à 99 € : toujours moins cher que le marché."),
    ("Perte totale de clés", "129 – 250 €", "200 €", "ok", "Dans la moyenne. 2 concurrents affichent 129–149 € : à surveiller."),
]

SOURCES = [
    ("MyBootlid – tarifs 2026", "https://mybootlid.com/blog/tarif-serrurier-automobile/"),
    ("InterElec – serrurier automobile", "https://interelec.fr/serrurier-automobile/"),
    ("Clefauto", "https://www.clefauto.com/"),
    ("Clé de Voiture Paris", "https://www.cle-de-voiture-paris.fr/"),
    ("Clé Voiture Perdue", "https://cle-voiture-perdue.com/"),
    ("Serrurier & Co – clé perdue", "https://serrurierandco.fr/blog/cle-voiture-perdue-que-faire/"),
    ("Depanneo – serrurier automobile", "https://www.depanneo.com/serrurier/automobile/"),
    ("OFIP – combien coûte un serrurier", "https://ofipserrurerie.fr/combien-coute-un-serrurier/"),
    ("Key Lost – Val-de-Marne", "https://www.key-lost.fr/"),
    ("DrKeyPro – prix clé voiture 2026", "https://www.drkeypro.com/guide/prix-cle-voiture-2026-tarifs-actualises"),
    ("PagesJaunes – garages et auto-écoles", "https://www.pagesjaunes.fr/annuaire/creteil-94/auto-ecoles"),
    ("Bottin – garages Créteil", "https://www.bottin.fr/annuaire/garage-automobile-a-creteil-94028.htm"),
    ("Bottin – location Créteil", "https://www.bottin.fr/annuaire/location-de-voiture-a-creteil-94028.htm"),
    ("AlloGarage – Champigny", "https://www.allogarage.fr/garages-par-ville/liste-garage-Champigny-sur-Marne-94500.html"),
    ("Speedy – Champigny", "https://centres-auto.speedy.fr/garage/champigny-94500/601"),
    ("Autocadre – JAT Auto", "https://www.autocadre.com/garage/602737"),
    ("DepanOne", "https://www.depanone.fr/"),
    ("MMI Dépannage 94", "https://www.mmidepannage.com/94"),
    ("Rent A Car Bonneuil", "https://www.rentacar.fr/agences/176-bonneuil-creteil"),
    ("CFAC Créteil", "https://cfac-autoecole.fr/index.php/cfac-creteil/"),
]


def tel(n):
    return "+33" + re.sub(r"\D", "", n)[1:]


def partners_html():
    out = []
    total = 0
    for title, prio, why, rows in PARTNERS:
        total += len(rows)
        items = "".join(
            f'<li><label><input type="checkbox"><span><b>{escape(n)}</b><small>{escape(where)} · <i>{escape(src)}</i></small></span></label>'
            f'<a class="call" href="tel:{tel(num)}">📞 {num}</a></li>' for n, where, num, src in rows)
        out.append(f'<div class="group"><h3>{title} <em>{prio}</em></h3><p class="why">{why}</p><ul class="plist">{items}</ul></div>')
    return total, "".join(out)


def videos_html():
    cards = []
    for i, (cat, title, script, caption) in enumerate(VIDEOS, 1):
        cards.append(f'<div class="vid"><div class="vh"><span class="num">{i}</span><span class="cat">{cat}</span></div>'
                     f'<h4>{escape(title)}</h4><p>{escape(script)}</p><div class="cap">Texte du post : <b>{escape(caption)}</b></div></div>')
    return "".join(cards)


def comp_html():
    rows = "".join(f"<tr><td><b>{n}</b><small>{z}</small></td><td>{o}</td><td>{d}</td><td>{p}</td></tr>"
                   for n, z, o, d, p, _ in COMPETITORS)
    market = "".join(f'<tr class="{c}"><td><b>{s}</b></td><td>{m}</td><td class="you">{y}</td><td>{note}</td></tr>'
                     for s, m, y, c, note in MARKET)
    return rows, market


total, partners = partners_html()
comp_rows, market_rows = comp_html()
sources = "".join(f'<li><a href="{u}">{escape(t)}</a></li>' for t, u in SOURCES)

HTML = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dossier de lancement – Dupli’Clé Express</title>
<style>
:root{{--bg:#0b0c0f;--card:#16181c;--line:#2a2d33;--txt:#f3f3f3;--mut:#b9bcc2;--y:#ffcb18;--r:#e0242d;--g:#25d366}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--txt);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}}
main{{max-width:760px;margin:auto;padding:0 16px 60px}}
header{{padding:28px 0 8px}}
h1{{font-size:28px;line-height:1.15;margin:6px 0 8px}}
h1 span,h2 span{{color:var(--y)}}
.tag{{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--y);font-weight:800}}
.mut{{color:var(--mut)}}
nav.toc{{display:grid;gap:8px;margin:18px 0 6px}}
nav.toc a{{display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:13px 14px;color:var(--txt);text-decoration:none;font-weight:700}}
nav.toc a b{{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--y);color:#111;flex:none}}
nav.toc small{{display:block;color:var(--mut);font-weight:500}}
section{{padding-top:34px}}
h2{{font-size:24px;margin:4px 0 10px;line-height:1.2}}
h3{{font-size:18px;margin:22px 0 4px}}
h3 em{{font-style:normal;font-size:12px;background:#ffcb1822;color:var(--y);border-radius:99px;padding:2px 9px;margin-left:6px;vertical-align:middle}}
.box{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:12px 0}}
.box.y{{border-color:#ffcb1880;background:#1c1a10}}
.box.r{{border-color:#e0242d80;background:#1f1214}}
.why{{color:var(--mut);margin:2px 0 8px;font-size:15px}}
.plist{{list-style:none;margin:0;padding:0}}
.plist li{{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}}
.plist label{{display:flex;gap:10px;align-items:flex-start;flex:1;min-width:0}}
.plist input{{width:20px;height:20px;margin-top:3px;accent-color:#ffcb18;flex:none}}
.plist input:checked+span{{opacity:.45;text-decoration:line-through}}
.plist b{{display:block}}
.plist small{{color:var(--mut);font-size:13px}}
.call{{flex:none;background:var(--r);color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:9px 11px;border-radius:9px;white-space:nowrap}}
blockquote{{margin:10px 0;padding:14px 16px;background:#101114;border-left:4px solid var(--y);border-radius:8px;font-size:15.5px}}
.copy{{display:inline-block;margin-top:8px;background:var(--y);color:#111;border:0;border-radius:8px;padding:8px 12px;font-weight:800;font-size:14px}}
ol.steps,ul.dots{{padding-left:22px}} ol.steps li,ul.dots li{{margin:6px 0}}
.vid{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:15px;margin:10px 0}}
.vh{{display:flex;gap:8px;align-items:center}}
.num{{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--y);color:#111;font-weight:900}}
.cat{{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--mut);font-weight:700}}
.vid h4{{margin:8px 0 4px;font-size:17px}}
.vid p{{margin:0;color:#ddd;font-size:15px}}
.cap{{margin-top:8px;font-size:14px;color:var(--mut)}}
.cap b{{color:var(--y)}}
.tw{{overflow-x:auto;margin:10px 0}}
table{{border-collapse:collapse;width:100%;font-size:14px;min-width:520px}}
th,td{{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{color:var(--y);font-size:12px;text-transform:uppercase;letter-spacing:.06em}}
td small{{display:block;color:var(--mut)}}
tr.low td.you{{color:#ff9f43;font-weight:900}}
tr.ok td.you{{color:var(--g);font-weight:900}}
.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:10px}}
@media(max-width:560px){{.grid2{{grid-template-columns:1fr}}}}
.src{{font-size:13px;color:var(--mut)}} .src a{{color:var(--mut)}}
footer{{margin-top:40px;color:var(--mut);font-size:13px;text-align:center}}
a{{color:var(--y)}}
</style></head><body><main>
<header>
<div class="tag">Dupli’Clé Express · Val-de-Marne</div>
<h1>Votre dossier de <span>lancement</span></h1>
<p class="mut">Tout ce qu’il faut pour avoir des clients dès l’ouverture. Les numéros sont cliquables : touchez 📞 pour appeler, cochez ✓ quand c’est fait (les coches restent sur ce téléphone tant que la page est ouverte).</p>
<nav class="toc">
<a href="#imprimer"><b>1</b><span>Flyer et cartes de visite<small>Les fichiers PDF prêts à imprimer</small></span></a>
<a href="#partenaires"><b>2</b><span>{total} partenaires à contacter<small>Avec les phrases à dire et les SMS</small></span></a>
<a href="#videos"><b>3</b><span>12 idées de vidéos TikTok / Insta<small>Avec le texte à dire</small></span></a>
<a href="#concurrents"><b>4</b><span>Vos prix face aux concurrents<small>Où vous vous situez</small></span></a>
<a href="#site"><b>5</b><span>Nouvelles pages sur le site<small>Pour sortir sur plus de recherches Google</small></span></a>
</nav>
</header>

<section id="imprimer">
<div class="tag">Point 1</div>
<h2>Flyer et <span>cartes de visite</span></h2>
<p>Trois fichiers PDF vous ont été envoyés avec ce dossier :</p>
<ul class="dots">
<li><b>flyer-A5-recto-verso.pdf</b> – recto : accroche + 4 services + numéro en gros ; verso : tous les tarifs + QR code vers le site.</li>
<li><b>carte-de-visite-85x55.pdf</b> – recto : logo ; verso : numéro, services, QR code qui lance l’appel.</li>
<li><b>cartes-de-visite-planche-A4.pdf</b> – 10 cartes par feuille A4 pour imprimer chez vous (page 1 = recto, page 2 = verso).</li>
</ul>
<div class="box y"><b>Où imprimer pas cher :</b> envoyez les PDF à un imprimeur en ligne (Vistaprint, Pixartprinting, Helloprint, Exaprint…). Choisissez « A5 recto-verso » pour le flyer et « carte de visite 85 × 55 mm recto-verso » pour les cartes. Comptez en général quelques dizaines d’euros pour 500 cartes ou 500 flyers – comparez sur 2 ou 3 sites.</div>
<div class="box r"><b>Important :</b> le flyer annonce « 24h/24 – 7j/7 » et « Appelez maintenant ». Imprimez-le <b>seulement quand vous êtes prêt à prendre des clients</b> (entreprise créée, outils en main). Les cartes de visite, elles, peuvent servir dès maintenant pour démarcher les partenaires.</div>
<p><b>Où les distribuer :</b></p>
<ul class="dots">
<li>Comptoirs des garages, centres auto, stations-service, laveries auto.</li>
<li>Parkings de gares RER (Créteil-Pompadour, Vitry, Champigny, Saint-Maur-Créteil) et de centres commerciaux (Créteil Soleil, Belle Épine).</li>
<li>Commerçants autour de chez vous (boulangerie, tabac) : demandez à laisser 10 cartes.</li>
<li>Évitez les pare-brises : c’est souvent interdit par arrêté municipal et ça agace les gens.</li>
</ul>
</section>

<section id="partenaires">
<div class="tag">Point 2</div>
<h2><span>{total} partenaires</span> dans le Val-de-Marne</h2>
<div class="box"><b>Le principe :</b> ces professionnels voient passer des gens bloqués avec leurs clés. Vous leur proposez de vous envoyer ces clients, contre une petite commission par client (on propose <b>10 €</b> ; c’est vous qui décidez). Un seul dépanneur partenaire peut vous envoyer plusieurs clients par semaine.</div>
<div class="box r">Les numéros viennent d’annuaires publics (PagesJaunes, Bottin, AlloGarage, sites des entreprises). Certains peuvent être anciens. <b>Vérifiez sur Google Maps</b> avant de vous déplacer.</div>

<h3>📞 Ce qu’il faut dire au téléphone</h3>
<blockquote id="script-call">« Bonjour, je m’appelle [prénom], je suis serrurier automobile à domicile dans le Val-de-Marne – Dupli’Clé Express. Je fais l’ouverture de voiture sans casse, les doubles de clés, la programmation et la perte totale de clés.<br><br>Il vous arrive d’avoir des clients avec un problème de clé que vous ne pouvez pas régler ? Je vous propose de me les envoyer : je vous reverse 10 € par client, et je vous renvoie les clients qui ont besoin de [dépannage / mécanique].<br><br>Je peux passer vous déposer des cartes cette semaine ? »</blockquote>

<h3>🚶 Si vous passez en personne (ça marche mieux)</h3>
<ol class="steps">
<li>Passez en milieu de matinée (10h–11h30) ou en début d’après-midi : jamais à l’ouverture ni à midi.</li>
<li>Demandez le patron ou le chef d’atelier. Présentez-vous en 20 secondes.</li>
<li>Laissez <b>10 cartes de visite</b> et demandez s’ils peuvent les mettre au comptoir.</li>
<li>Notez le prénom de la personne et son numéro direct.</li>
<li>Rappelez une semaine plus tard : « Bonjour [prénom], c’est [vous] de Dupli’Clé, je passais vous redonner des cartes. »</li>
</ol>

<h3>💬 SMS si personne ne répond</h3>
<blockquote id="script-sms">Bonjour, [prénom] de Dupli’Clé Express, serrurier automobile à domicile dans le 94 (ouverture de voiture, double et programmation de clé, perte totale de clés). Je cherche des partenaires : 10 € reversés pour chaque client envoyé. Mon site : {SITE} – {PHONE}. Bonne journée !</blockquote>

<h3>✉️ E-mail (loueurs, auto-écoles, concessions)</h3>
<blockquote id="script-mail"><b>Objet :</b> Serrurier automobile à domicile – partenariat Val-de-Marne<br><br>Bonjour,<br><br>Je suis [prénom], fondateur de Dupli’Clé Express, serrurier automobile à domicile dans le Val-de-Marne.<br><br>Je propose aux professionnels de l’automobile :<br>• l’ouverture de véhicules sans casse quand un client a enfermé ses clés ;<br>• les doubles de clés (avec puce ou télécommande) et la programmation, sur place ;<br>• la création de clé en cas de perte totale, sans remorquage.<br><br>Pour vos véhicules, je peux faire un tarif professionnel. Pour vos clients, je vous propose une commission de 10 € par client envoyé.<br><br>Je reste disponible pour passer vous présenter mon activité.<br><br>Bien cordialement,<br>[Prénom Nom]<br>Dupli’Clé Express – {PHONE}<br>{SITE}</blockquote>

<h3>🛡️ Si on vous dit…</h3>
<ul class="dots">
<li><b>« On a déjà quelqu’un »</b> → « Pas de souci. Gardez quand même ma carte pour les jours où il n’est pas disponible, la nuit ou le week-end. »</li>
<li><b>« Vous êtes nouveau ? »</b> → « Oui, je lance l’activité dans le 94, donc je suis très disponible et je soigne chaque client. »</li>
<li><b>« Combien vous prenez ? »</b> → Donnez vos prix de départ (ouverture dès 84 €, double dès 114 €) et précisez que le prix est toujours annoncé avant.</li>
<li><b>« On fait déjà les clés »</b> → Proposez-leur ce qu’ils ne font pas souvent : la perte totale de clés et l’ouverture sans casse.</li>
</ul>

<h3>📋 La liste</h3>
{partners}

<div class="box y"><b>Objectif conseillé :</b> 5 appels ou visites par jour. En 2 semaines, vous aurez contacté toute la liste. Commencez par les dépanneurs.</div>
</section>

<section id="videos">
<div class="tag">Point 3</div>
<h2>12 vidéos <span>TikTok / Instagram / Snapchat</span></h2>
<div class="box"><b>Pourquoi c’est puissant :</b> les vidéos de serruriers auto (ouverture en quelques secondes, clé fabriquée de A à Z) font souvent beaucoup de vues. C’est gratuit, et les gens du coin vous découvrent. <b>Les 3 premières peuvent être tournées dès maintenant</b>, avant l’ouverture : raconter le lancement de son entreprise attire beaucoup d’abonnés.</div>
<ul class="dots">
<li><b>Format :</b> vertical, 15 à 40 secondes, sous-titres à l’écran (beaucoup regardent sans le son).</li>
<li><b>Les 2 premières secondes</b> décident de tout : commencez par la phrase choc.</li>
<li><b>Rythme :</b> 3 vidéos par semaine. Publiez la même vidéo sur TikTok, Instagram Reels et Snapchat Spotlight.</li>
<li><b>Toujours à la fin :</b> « Dupli’Clé Express, serrurier auto dans le 94 – le numéro est dans ma bio. »</li>
<li><b>Hashtags :</b> #serrurierauto #cléauto #doubledeclé #valdemarne #94 #créteil #paris #voiture #astuceauto</li>
<li><b>Respect des clients :</b> floutez les plaques et demandez toujours l’accord avant de filmer quelqu’un.</li>
</ul>
{videos_html()}
</section>

<section id="concurrents">
<div class="tag">Point 4</div>
<h2>Vos prix face aux <span>concurrents</span></h2>
<p class="mut">Prix « à partir de » publiés sur les sites des concurrents (Île-de-France, octobre 2026). Ce sont des prix d’appel : le prix final est souvent plus élevé.</p>

<h3>Où vous vous situez</h3>
<div class="tw"><table><tr><th>Prestation</th><th>Marché</th><th>Vous</th><th>Avis</th></tr>{market_rows}</table></div>

<h3>Ce que disent les concurrents</h3>
<div class="tw"><table><tr><th>Concurrent</th><th>Ouverture</th><th>Double / clé</th><th>Perte totale</th></tr>{comp_rows}</table></div>

<h3>Ce qu’on en retient</h3>
<ul class="dots">
<li><b>Vos prix sont bons.</b> Vous êtes dans le bas ou le milieu du marché partout. Pas besoin de baisser.</li>
<li><b>Programmation :</b> passée de 84 € à <b>99 €</b> (site, flyer et dossier mis à jour). Vous restez moins cher que le marché (100–250 €).</li>
<li><b>La nuit et le week-end :</b> beaucoup de concurrents ajoutent +20 % à +100 % (moyenne autour de +30 %). Décidez votre règle <b>avant</b> d’ouvrir et annoncez-la clairement au téléphone – c’est un vrai argument de confiance.</li>
<li><b>Votre force face à eux :</b> des prix affichés clairement, le devis par SMS avec photo de la clé, et un vrai serrurier local du 94 (beaucoup de sites concurrents sont des plateformes qui revendent les appels).</li>
<li><b>Argument à utiliser :</b> certaines assurances auto et cartes bancaires remboursent la perte de clés. Dites-le aux clients : ça les rassure sur le prix. Donnez toujours une facture détaillée.</li>
<li><b>Concurrents directs dans le 94 :</b> Serrurier &amp; Co (dès 90 €, déplacement compris), Key Lost (double à domicile). Regardez leurs avis Google pour voir ce que les clients aiment et n’aiment pas.</li>
</ul>
</section>

<section id="site">
<div class="tag">Point 5</div>
<h2>Nouvelles pages <span>sur le site</span></h2>
<p>J’ai ajouté au site des pages qui répondent à ce que les gens tapent vraiment dans Google :</p>
<ul class="dots">
<li><a href="https://{SITE}/serrurier-automobile-val-de-marne/">Serrurier automobile Val-de-Marne (94)</a> – avec les villes : Créteil, Vitry, Champigny, Saint-Maur, Ivry, Maisons-Alfort…</li>
<li>Une page par grande marque : <a href="https://{SITE}/cle-voiture-renault/">Renault</a>, <a href="https://{SITE}/cle-voiture-peugeot/">Peugeot</a>, <a href="https://{SITE}/cle-voiture-citroen/">Citroën</a>, <a href="https://{SITE}/cle-voiture-dacia/">Dacia</a>, <a href="https://{SITE}/cle-voiture-volkswagen/">Volkswagen</a>, <a href="https://{SITE}/cle-voiture-toyota/">Toyota</a>.</li>
<li>Une nouvelle question dans la FAQ : « Mon assurance peut-elle rembourser ? »</li>
</ul>
<div class="box y"><b>À faire (2 min) :</b> dans Google Search Console, menu ☰ → <b>Sitemaps</b> → renvoyez <code>sitemap.xml</code> pour que Google découvre les nouvelles pages plus vite.</div>
</section>

<section>
<div class="tag">Pour la suite</div>
<h2>Votre plan des <span>prochaines semaines</span></h2>
<ol class="steps">
<li><b>Cette semaine :</b> appelez ou visitez les 7 dépanneurs. Tournez les vidéos 1 à 3.</li>
<li><b>Semaine prochaine :</b> les garages indépendants et les vendeurs d’occasion.</li>
<li><b>Dès que l’entreprise est créée :</b> envoyez-moi nom, SIRET et adresse (page Mentions légales), dites « on ouvre » (je remets le site en mode normal), imprimez les flyers, filmez la vidéo de validation Google Maps.</li>
<li><b>Après chaque client :</b> demandez un avis Google. C’est ce qui vous fera monter sur Google Maps.</li>
</ol>
</section>

<section>
<div class="tag">Sources</div>
<ul class="src">{sources}</ul>
</section>
<footer>Préparé pour Dupli’Clé Express · {PHONE}</footer>
</main></body></html>"""

with open(OUT, "w", encoding="utf-8") as f:
    f.write(HTML)
print("✓", OUT, "–", total, "partenaires")
