#!/usr/bin/env python3
"""Génère toutes les pages du site Dupli'Clé Express.

Modifiez les informations ci-dessous (téléphone, WhatsApp, tarifs...) puis lancez :
    python3 tools/build.py
"""
import json
import os
from datetime import date
from html import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─── À REMPLIR ────────────────────────────────────────────────────────────────
PHONE = "+33607887281"           # numéro au format international, sans espaces
PHONE_DISPLAY = "06 07 88 72 81"  # numéro tel qu'affiché sur le site
WHATSAPP = ""                    # numéro WhatsApp sans le + (ex. "33607887281") ; vide = boutons SMS
GA_ID = ""                       # ID Google Analytics 4 (ex. "G-XXXXXXX"), optionnel
OPENING_SOON = True              # True = mode « Ouverture prochainement » ; False = activité ouverte
# ──────────────────────────────────────────────────────────────────────────────

SITE = "https://duplicleexpress.github.io"
NAME = "Dupli’Clé Express"
REGION = "Île-de-France"

SERVICES = [
    {
        "slug": "ouverture-voiture", "img": "ouverture", "price": 84,
        "card": "Ouverture de véhicule",
        "h1": "Ouverture de voiture <em>sans dommage</em>",
        "title": "Ouverture de voiture clés enfermées – Île-de-France 24/7 | Dupli’Clé Express",
        "desc": "Clés enfermées dans la voiture ? Ouverture de véhicule à domicile en Île-de-France, 24h/24, dès 84 €. Devis confirmé avant intervention. Appelez maintenant.",
        "short": "Clés enfermées dans la voiture ? On vient vous ouvrir.",
        "intro": "Clés oubliées sur le siège, coffre refermé avec les clés dedans, serrure bloquée : nous nous déplaçons là où se trouve votre véhicule, dans toute l’Île-de-France, pour l’ouvrir avec des outils professionnels adaptés.",
        "body": [
            ("Une ouverture rapide et propre", "Après vérification de votre identité et de votre droit d’accès au véhicule, nous évaluons la situation et choisissons la méthode la plus adaptée à votre modèle. L’objectif est toujours une ouverture sans casse : pas de vitre brisée, pas de serrure forcée. Nous ne pouvons pas le garantir dans 100 % des cas, mais c’est notre méthode de travail."),
            ("Pourquoi ne pas casser une vitre ?", "Une vitre latérale cassée coûte souvent bien plus cher qu’une ouverture professionnelle, sans compter le nettoyage, l’immobilisation du véhicule et le risque de vol. Un appel suffit pour savoir si nous pouvons intervenir sur votre voiture."),
        ],
        "steps": ["Échange au téléphone sur votre situation et votre véhicule", "Vérification des justificatifs (pièce d’identité, carte grise)", "Ouverture avec une méthode adaptée", "Contrôle final des accès avec vous"],
        "faq": [
            ("Mes clés sont enfermées dans le coffre, pouvez-vous l’ouvrir ?", "Dans la plupart des cas, oui : l’ouverture de l’habitacle permet ensuite d’accéder au coffre. La faisabilité dépend du modèle et vous est confirmée au téléphone."),
            ("Quels documents dois-je présenter ?", "Une pièce d’identité et un justificatif de propriété ou d’usage du véhicule (carte grise, contrat de location…). Si vos papiers sont dans la voiture, nous les vérifions juste après l’ouverture."),
        ],
    },
    {
        "slug": "double-cle-voiture", "img": "double", "price": 114,
        "card": "Double de clé automobile",
        "h1": "Double de clé de voiture <em>à domicile</em>",
        "title": "Double de clé voiture à domicile – Île-de-France | Dupli’Clé Express",
        "desc": "Faites faire un double de clé de voiture (puce, télécommande) à domicile en Île-de-France, dès 114 €. Moins d’attente qu’en concession. 15 € de remise sur la 2e clé.",
        "short": "Une clé de secours avant d’en avoir besoin.",
        "intro": "Vous n’avez qu’une seule clé ? Le jour où vous la perdez, la facture et l’immobilisation sont bien plus lourdes. Nous réalisons votre double de clé (simple, avec puce ou avec télécommande) directement chez vous ou sur votre lieu de travail.",
        "body": [
            ("Comment ça se passe ?", "À partir de votre clé fonctionnelle, nous vérifions la compatibilité et préparons un double adapté à votre véhicule. Selon le modèle, la nouvelle clé est ensuite programmée pour démarrer la voiture et, le cas échéant, commander l’ouverture à distance."),
            ("Remise sur la deuxième clé", "Si vous commandez une deuxième clé lors de la même intervention, nous appliquons une remise de 15 € sur cette deuxième clé. Pratique pour équiper toute la famille."),
        ],
        "notice": "<b>Remise deuxième clé :</b> 15 € de réduction sur la deuxième clé réalisée lors de la même intervention.",
        "prices": [("Double de clé avec puce", 114), ("Double avec télécommande", 159)],
        "steps": ["Identification du modèle et de la clé existante", "Préparation du double compatible", "Programmation si nécessaire", "Essais et remise des clés"],
        "faq": [
            ("Faut-il aller en concession pour un double de clé ?", "Non. Pour de nombreux modèles, nous réalisons le double sur place, sans rendez-vous en concession ni immobilisation du véhicule. La compatibilité de votre modèle vous est confirmée avant intervention."),
            ("Le double aura-t-il la télécommande ?", "Oui, si vous choisissez un double avec télécommande et que votre véhicule le permet. Nous testons l’ouverture à distance et le démarrage avec vous."),
        ],
    },
    {
        "slug": "programmation-cle-voiture", "img": "programmation", "price": 84,
        "card": "Programmation de clé",
        "h1": "Programmation de clé <em>et télécommande</em>",
        "title": "Programmation de clé de voiture et télécommande – Île-de-France | Dupli’Clé Express",
        "desc": "Clé qui ne démarre plus la voiture, télécommande désynchronisée ? Programmation de clé auto à domicile en Île-de-France dès 84 €. Devis avant intervention.",
        "short": "Votre clé ne démarre plus ou la télécommande ne répond plus ?",
        "intro": "Une clé neuve, une télécommande qui ne répond plus, un antidémarrage qui refuse votre clé : la programmation permet d’associer électroniquement la clé à votre véhicule. Nous intervenons sur place avec le matériel de diagnostic adapté.",
        "body": [
            ("Notre intervention", "Nous vérifions la compatibilité de la clé et du véhicule, puis réalisons l’association électronique lorsque le modèle le permet. Nous contrôlons ensuite le démarrage et, si applicable, les fonctions de la télécommande."),
            ("Bon à savoir", "Certaines marques et générations de véhicules exigent une procédure ou un équipement spécifique. Donnez-nous la marque, le modèle et l’année : nous vous disons tout de suite si c’est faisable et à quel prix."),
        ],
        "steps": ["Vérification de compatibilité", "Préparation de la clé", "Association électronique au véhicule", "Tests de démarrage et de télécommande"],
        "faq": [
            ("Pouvez-vous programmer une clé achetée sur Internet ?", "C’est parfois possible, selon la qualité et la compatibilité de la clé. Envoyez-nous une photo de la clé et les références du véhicule pour vérifier avant de vous déplacer."),
            ("Combien de temps dure une programmation ?", "Cela dépend du véhicule. Nous vous donnons une estimation au téléphone une fois le modèle connu."),
        ],
    },
    {
        "slug": "perte-totale-cle-voiture", "img": "perte", "price": 200,
        "card": "Perte totale de clés",
        "h1": "Perte totale de clés : <em>on recrée votre clé</em>",
        "title": "Perte totale de clés de voiture – Nouvelle clé sur place | Dupli’Clé Express",
        "desc": "Vous avez perdu toutes les clés de votre voiture ? Création d’une nouvelle clé sans modèle, à domicile en Île-de-France, dès 200 €. Évitez le remorquage en concession.",
        "short": "Plus aucune clé ? On crée une nouvelle clé sur place.",
        "intro": "Clés perdues, volées ou tombées dans une bouche d’égout : sans aucune clé, la concession impose souvent remorquage et plusieurs jours d’attente. Nous étudions la création d’une nouvelle clé directement là où se trouve votre voiture.",
        "body": [
            ("Comment créer une clé sans modèle ?", "Après vérification des documents du véhicule et de votre droit à demander l’intervention, nous étudions la solution possible pour votre modèle : préparation d’une nouvelle clé puis programmation sur le véhicule. La faisabilité et le prix sont confirmés avant toute intervention."),
            ("Et l’ancienne clé perdue ?", "Lorsque le véhicule le permet, l’ancienne clé peut être retirée de la mémoire du véhicule pour qu’elle ne puisse plus le démarrer. Demandez-le-nous au moment du devis."),
        ],
        "steps": ["Contrôle des justificatifs et du modèle", "Étude de la solution possible", "Création et programmation de la nouvelle clé", "Essais et remise de la clé"],
        "faq": [
            ("Faut-il remorquer la voiture ?", "Non : nous venons sur place. C’est justement l’intérêt d’un serrurier automobile mobile par rapport à la concession."),
            ("Quels documents sont nécessaires ?", "Pièce d’identité et carte grise (ou document prouvant votre droit d’usage du véhicule). Aucune clé n’est créée sans ces vérifications."),
        ],
    },
    {
        "slug": "assistance-demarrage", "img": "demarrage", "price": 64,
        "card": "Assistance au démarrage",
        "h1": "Batterie à plat ? <em>On vous redémarre</em>",
        "title": "Assistance démarrage batterie à plat – Île-de-France 24/7 | Dupli’Clé Express",
        "desc": "Voiture qui ne démarre plus, batterie déchargée ? Assistance au démarrage sur place en Île-de-France, 24h/24, dès 64 €. Appelez-nous.",
        "short": "Batterie à plat ? Nous intervenons sur place.",
        "intro": "Phares oubliés, grand froid, voiture restée longtemps sans rouler : votre batterie est à plat et vous êtes bloqué. Nous venons sur place avec un booster professionnel pour vous permettre de repartir.",
        "body": [
            ("Notre intervention", "Nous vérifions les signes d’une batterie déchargée et l’état général du démarrage. Lorsque la situation le permet, nous réalisons l’assistance au démarrage avec un équipement adapté, puis nous vous indiquons si un contrôle ou un remplacement de batterie est conseillé."),
            ("Et si la batterie est morte ?", "Si la batterie ne tient plus la charge, nous pouvons vous proposer son remplacement par un modèle compatible avec votre véhicule."),
        ],
        "steps": ["Évaluation du problème de démarrage", "Contrôles préalables de sécurité", "Assistance au démarrage si adaptée", "Conseils sur l’état de la batterie"],
        "faq": [
            ("Combien de temps dois-je rouler après le démarrage ?", "Il est généralement conseillé de rouler un moment pour recharger la batterie. Nous vous donnons des conseils adaptés sur place."),
        ],
    },
    {
        "slug": "remplacement-batterie", "img": "batterie", "price": 149,
        "card": "Remplacement de batterie",
        "h1": "Remplacement de batterie <em>à domicile</em>",
        "title": "Remplacement de batterie voiture à domicile – Île-de-France | Dupli’Clé Express",
        "desc": "Batterie de voiture HS ? Remplacement à domicile en Île-de-France par une batterie compatible avec votre véhicule, dès 149 €. Devis confirmé avant intervention.",
        "short": "Une batterie neuve et adaptée, posée chez vous.",
        "intro": "Votre batterie ne tient plus la charge ? Plutôt que de chercher un garage, nous venons poser une batterie neuve adaptée à votre véhicule, chez vous ou sur votre lieu de travail.",
        "body": [
            ("Notre intervention", "Nous identifions les caractéristiques de batterie nécessaires à votre voiture puis confirmons le devis. Nous procédons au remplacement en respectant les précautions adaptées au véhicule, puis vérifions le démarrage et, lorsque nécessaire et possible, les opérations électroniques associées."),
        ],
        "steps": ["Identification de la batterie compatible", "Confirmation du devis", "Dépose et pose de la nouvelle batterie", "Contrôle du démarrage et des fonctions utiles"],
        "faq": [
            ("Le prix comprend-il la batterie ?", "Le tarif « à partir de » correspond aux cas les plus simples. Le prix exact, batterie comprise, dépend de votre véhicule et vous est confirmé avant intervention."),
        ],
    },
]

PRICE_ROWS = [
    ("Ouverture de véhicule", 84, "ouverture-voiture"),
    ("Double de clé avec puce", 114, "double-cle-voiture"),
    ("Double avec télécommande", 159, "double-cle-voiture"),
    ("Programmation de clé", 84, "programmation-cle-voiture"),
    ("Perte totale de clés", 200, "perte-totale-cle-voiture"),
    ("Assistance au démarrage", 64, "assistance-demarrage"),
    ("Remplacement de batterie", 149, "remplacement-batterie"),
]

ZONES = [("75", "Paris"), ("77", "Seine-et-Marne"), ("78", "Yvelines"), ("91", "Essonne"),
         ("92", "Hauts-de-Seine"), ("93", "Seine-Saint-Denis"), ("94", "Val-de-Marne"), ("95", "Val-d’Oise")]

BRANDS = ["Renault", "Peugeot", "Citroën", "Dacia", "Volkswagen", "Toyota", "Ford", "Opel", "Fiat",
          "Nissan", "Kia", "Hyundai", "Seat", "Skoda", "Audi", "BMW", "Mercedes", "Mini", "Suzuki", "DS"]

HOME_FAQ = [
    ("Intervenez-vous vraiment 24h/24 et 7j/7 ?", "Oui, vous pouvez nous appeler à toute heure. Le délai d’arrivée dépend de votre position et de notre disponibilité : il vous est annoncé au téléphone avant toute intervention."),
    ("Dans quelles villes intervenez-vous ?", "Dans toute l’Île-de-France : Paris (75), Seine-et-Marne (77), Yvelines (78), Essonne (91), Hauts-de-Seine (92), Seine-Saint-Denis (93), Val-de-Marne (94) et Val-d’Oise (95)."),
    ("Combien coûte une intervention ?", "Nos tarifs de départ sont affichés sur cette page. Le prix final dépend de votre véhicule et de la situation ; il vous est toujours confirmé avant que nous commencions. Pas de surprise sur la facture."),
    ("Quels documents dois-je fournir ?", "Une pièce d’identité et la carte grise (ou un document prouvant votre droit d’usage du véhicule). Nous n’ouvrons et ne créons aucune clé sans ces vérifications."),
    ("Est-ce moins cher qu’en concession ?", "Souvent, oui : pas de remorquage, pas d’immobilisation de plusieurs jours, et nous venons à vous. Demandez un devis pour comparer."),
    ("Quelles marques de voitures prenez-vous en charge ?", "Nous intervenons sur la plupart des marques courantes (Renault, Peugeot, Citroën, Volkswagen, Toyota…). La faisabilité dépend du modèle et de l’année : elle vous est confirmée au téléphone."),
    ("Mon assurance peut-elle rembourser une clé perdue ?", "C’est possible : certains contrats d’assurance auto ou certaines cartes bancaires remboursent tout ou partie des frais en cas de perte ou de vol de clés. Vérifiez votre contrat ; nous vous remettons une facture détaillée pour votre demande de remboursement."),
    ("Comment obtenir un devis rapidement ?", "Appelez-nous, ou remplissez le formulaire de devis : il ouvre un SMS avec votre demande déjà rédigée. Nous nous efforçons de répondre sous 30 minutes."),
]

if OPENING_SOON:
    HOME_FAQ = [("Êtes-vous déjà ouverts ?", "Pas encore : Dupli’Clé Express ouvre prochainement en Île-de-France. Vous pouvez déjà nous appeler pour demander un prix ou être prévenu de l’ouverture.")] + [f for f in HOME_FAQ if "24h/24" not in f[0]]
SOON = ('<div class="soon"><b>🚧 Ouverture prochainement.</b> Nous ne réalisons pas encore d’interventions. '
        'Appelez-nous pour demander un prix ou être prévenu de l’ouverture.</div>') if OPENING_SOON else ""
EYEBROW_WHEN = "Ouverture prochainement" if OPENING_SOON else "24h/24 – 7j/7"
PULSE = "" if OPENING_SOON else "pulse"

# ─── Icônes ───────────────────────────────────────────────────────────────────
ICON_PHONE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z"/></svg>'
ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>'
ICON_SMS = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM8 11H6V9h2v2Zm5 0h-2V9h2v2Zm5 0h-2V9h2v2Z"/></svg>'

MSG_NAME = "WhatsApp" if WHATSAPP else "SMS"
if not WHATSAPP:
    ICON_WA = ICON_SMS
GREETING = "Bonjour%20Dupli%E2%80%99Cl%C3%A9%20Express%2C%20j%E2%80%99ai%20besoin%20d%E2%80%99un%20serrurier%20automobile."
WA_LINK = f"https://wa.me/{WHATSAPP}?text={GREETING}" if WHATSAPP else f"sms:{PHONE}?&body={GREETING}"
NEW_TAB = ' target="_blank" rel="noopener"' if WHATSAPP else ""


def btn_call(extra=""):
    return f'<a class="btn btn-call {extra}" href="tel:{PHONE}">{ICON_PHONE}Appeler {PHONE_DISPLAY}</a>'


def btn_wa(label=None):
    label = label or f"Devis par {MSG_NAME}"
    return f'<a class="btn btn-wa" href="{WA_LINK}"{NEW_TAB}>{ICON_WA}{label}</a>'


def business_schema():
    return {
        "@context": "https://schema.org",
        "@type": ["Locksmith", "AutomotiveBusiness"],
        "@id": SITE + "/#business",
        "name": NAME,
        "description": "Serrurier automobile à domicile en Île-de-France" + ("" if OPENING_SOON else ", 24h/24") + " : ouverture de véhicule, double et programmation de clé, perte totale de clés, assistance au démarrage et remplacement de batterie.",
        "url": SITE + "/",
        "logo": SITE + "/images/icon-512.png",
        "image": SITE + "/images/og.jpg",
        "telephone": PHONE,
        "priceRange": "€€",
        "areaServed": [{"@type": "AdministrativeArea", "name": REGION}] +
                      [{"@type": "AdministrativeArea", "name": f"{n} ({c})"} for c, n in ZONES],
        "hasOfferCatalog": {
            "@type": "OfferCatalog", "name": "Prestations de serrurerie automobile",
            "itemListElement": [{
                "@type": "Offer",
                "itemOffered": {"@type": "Service", "name": label, "url": f"{SITE}/{slug}/"},
                "priceSpecification": {"@type": "PriceSpecification", "minPrice": p, "priceCurrency": "EUR"},
            } for label, p, slug in PRICE_ROWS]},
    }


def faq_schema(faq):
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + '</script>'


def head(title, desc, path, extra_ld=""):
    if OPENING_SOON:
        title = title.replace(" 24/7", "")
        desc = "Ouverture prochainement. " + desc.replace(", 24h/24 :", " :").replace("24h/24, ", "").replace(", 24h/24", "")
    ga = ""
    if GA_ID:
        ga = (f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>'
              f"<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','{GA_ID}');</script>")
    url = SITE + path
    return f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="{escape(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#090a0c">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="{NAME}">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/images/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/images/icon-32.png">
<link rel="apple-touch-icon" href="/images/icon-180.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" as="image" href="/images/logo-header.webp">
<link rel="stylesheet" href="/css/style.css">
{ga}
{ld(business_schema())}
{extra_ld}
<script>window.DCE={{wa:"{WHATSAPP}",tel:"{PHONE}"}}</script>
<script src="/js/main.js" defer></script>
</head>
<body>
'''


def header():
    return f'''<div class="topbar">{"🚧 Ouverture prochainement en Île-de-France — Infos et prix :" if OPENING_SOON else "🚨 Urgence 24h/24 en Île-de-France —"} <a href="tel:{PHONE}">{PHONE_DISPLAY}</a></div>
<header class="site"><div class="container head">
<a class="logo" href="/" aria-label="{NAME} — accueil"><img src="/images/logo-header.webp" alt="{NAME} — serrurier automobile à domicile 24/7" width="540" height="315"></a>
<nav aria-label="Menu principal"><a href="/#services">Services</a><a href="/#tarifs">Tarifs</a><a href="/#zones">Zones</a><a href="/#faq">FAQ</a><a href="/#devis">Devis</a></nav>
<a class="head-call" href="tel:{PHONE}"><small>{"Infos & prix" if OPENING_SOON else "Appel 24/7"}</small><span>{PHONE_DISPLAY}</span></a>
</div></header>
'''


def cta_band():
    return f'''<section class="cta-band"><div class="container">
{'<div><h2>Une question ? Un prix ? Appelez-nous.</h2><p>Ouverture prochainement en Île-de-France.</p></div>' if OPENING_SOON else '<div><h2>Bloqué ? Clé perdue ? Appelez maintenant.</h2><p>Devis confirmé au téléphone, avant tout déplacement.</p></div>'}
{btn_call()}
</div></section>
'''


def footer():
    brand_links = "".join(f'<li><a href="/{b["slug"]}/">Clé {b["brand"]}</a></li>' for b in BRAND_PAGES)
    svc_links = "".join(f'<li><a href="/{s["slug"]}/">{s["card"]}</a></li>' for s in SERVICES)
    zones = "".join(f"<li>{n} ({c})</li>" for c, n in ZONES[:4])
    zones2 = "".join(f"<li>{n} ({c})</li>" for c, n in ZONES[4:])
    return f'''<footer class="site"><div class="container">
<div class="cols">
<div><h3>{NAME}</h3><p>Serrurier automobile à domicile en Île-de-France, {"ouverture prochainement" if OPENING_SOON else "disponible 24h/24 et 7j/7"}. Ouverture de véhicule, doubles et programmation de clés, perte totale de clés, batterie.</p>
<p><a href="tel:{PHONE}"><b style="color:var(--yellow)">📞 {PHONE_DISPLAY}</b></a></p>
<div class="social"><span>Snapchat · bientôt</span><span>Instagram · bientôt</span><span>TikTok · bientôt</span><span>Facebook · bientôt</span></div></div>
<div><h3>Nos services</h3><ul>{svc_links}</ul></div>
<div><h3>Zones d’intervention</h3><ul><li><a href="/serrurier-automobile-val-de-marne/">Val-de-Marne (94) →</a></li>{zones}{zones2}</ul><h3 style="margin-top:18px">Marques</h3><ul>{brand_links}</ul></div>
</div>
<div class="legal">© {date.today().year} {NAME} · Serrurier automobile · {REGION}</div>
</div></footer>
<div class="callbar"><a class="c" href="tel:{PHONE}">{ICON_PHONE}Appeler</a><a class="w" href="{WA_LINK}"{NEW_TAB}>{ICON_WA}{MSG_NAME}</a></div>
</body>
</html>
'''


def faq_html(faq):
    return "".join(f"<details><summary>{escape(q)}</summary><p>{escape(a)}</p></details>" for q, a in faq)


def devis_section():
    sms_item = "" if not WHATSAPP else f'<li><a href="sms:{PHONE}"><span class="i" style="background:var(--yellow);color:#111">{ICON_SMS}</span><span>SMS<small>Si vous ne pouvez pas appeler</small></span></a></li>'
    opts = "".join(f"<option>{label}</option>" for label, _, _ in PRICE_ROWS) + "<option>Autre / je ne sais pas</option>"
    return f'''<section class="block alt" id="devis"><div class="container quote">
<div>
<div class="tag">Devis gratuit</div>
<h2>Votre devis <em>en quelques minutes</em></h2>
<p class="lead">Indiquez votre véhicule et votre situation : le formulaire ouvre {MSG_NAME} avec votre demande déjà rédigée. Nous nous efforçons de vous répondre sous 30 minutes. Pour une urgence, appelez directement.</p>
<ul class="contact-list">
<li><a href="tel:{PHONE}"><span class="i" style="background:var(--red);color:#fff">{ICON_PHONE}</span><span>{PHONE_DISPLAY}<small>{"Infos et demandes de prix" if OPENING_SOON else "Appel 24h/24 – le plus rapide"}</small></span></a></li>
<li><a href="{WA_LINK}"{NEW_TAB}><span class="i" style="background:var(--green);color:#06210f">{ICON_WA}</span><span>{MSG_NAME}<small>Envoyez une photo de votre clé</small></span></a></li>
{sms_item}
</ul>
</div>
<form class="devis" id="devis-form">
<label class="full">Prestation<select name="service" required>{opts}</select></label>
<label>Marque<input name="marque" required placeholder="Ex. Peugeot" autocomplete="off"></label>
<label>Modèle<input name="modele" required placeholder="Ex. 208" autocomplete="off"></label>
<label>Année<input name="annee" inputmode="numeric" placeholder="Ex. 2018" maxlength="4"></label>
<label>Ville ou code postal<input name="ville" required placeholder="Ex. 93200"></label>
<label class="full">Urgence<select name="urgence"><option>Oui, je suis bloqué maintenant</option><option>Aujourd’hui</option><option>Dans les prochains jours</option><option>Simple demande de prix</option></select></label>
<label class="full">Précisions (facultatif)<textarea name="message" rows="3" placeholder="Ex. clés enfermées dans le coffre, une seule clé restante…"></textarea></label>
<label class="full">Votre prénom (facultatif)<input name="nom" autocomplete="given-name"></label>
<button class="btn btn-wa full" type="submit">{ICON_WA}Recevoir mon devis par {MSG_NAME}</button>
<p class="small full" style="margin:0">Gratuit et sans engagement. Le prix est confirmé avant toute intervention.</p>
</form>
</div></section>
'''


def home():
    cards = "".join(f'''<a class="card" href="/{s["slug"]}/"><img src="/images/{s["img"]}.webp" alt="{s["card"]}" loading="lazy" width="360" height="320"><div class="copy"><h3>{s["card"]}</h3><p>{s["short"]}</p><div class="from"><span>Voir le détail →</span>dès {s["price"]} €</div></div></a>''' for s in SERVICES)
    prices = "".join(f'<a href="/{slug}/"><span>{label}</span><b>À partir de {p} €</b></a>' for label, p, slug in PRICE_ROWS)
    zones = "".join(f"<li><b>{c}</b> {n}</li>" for c, n in ZONES)
    linked = {b["brand"]: b["slug"] for b in BRAND_PAGES}
    brands = "".join(f'<li><a href="/{linked[b]}/">{b} →</a></li>' if b in linked else f"<li>{b}</li>" for b in BRANDS)
    title = "Serrurier automobile 24/7 Île-de-France – Clé voiture, ouverture | Dupli’Clé Express"
    desc = "Serrurier automobile à domicile en Île-de-France, 24h/24 : ouverture de voiture dès 84 €, double de clé, programmation, perte totale de clés, batterie. Devis confirmé avant intervention."
    return head(title, desc, "/", ld(faq_schema(HOME_FAQ))) + header() + f'''<main>
<section class="hero" style="--img:url('/images/hero.webp')"><div class="container">
<div class="eyebrow">Serrurier automobile · Île-de-France · {EYEBROW_WHEN}</div>
<h1>Clé perdue ou voiture fermée&nbsp;?<br><em>On vient à vous.</em></h1>
<p class="sub">Ouverture de véhicule, double et programmation de clé, perte totale de clés, batterie : nous intervenons directement là où se trouve votre voiture, partout en Île-de-France.</p>
{SOON}<div class="btn-row">{btn_call(PULSE)}{btn_wa(f"Devis gratuit par {MSG_NAME}")}</div>
<ul class="checks"><li>Intervention à domicile</li><li>{"Bientôt 24h/24 – 7j/7" if OPENING_SOON else "24h/24 – 7j/7"}</li><li>Prix confirmé avant intervention</li><li>Pas de remorquage</li></ul>
<div class="price-badge">Ouverture de voiture dès 84 € · Double de clé dès 114 €</div>
</div></section>

<section class="trust" aria-label="Nos engagements"><div class="container">
<div><span class="ico">🚐</span><span><b>On se déplace</b>Domicile, travail, parking</span></div>
<div><span class="ico">🕐</span><span><b>{"Bientôt 24h/24 – 7j/7" if OPENING_SOON else "24h/24 – 7j/7"}</b>Nuits, week-ends, jours fériés</span></div>
<div><span class="ico">💶</span><span><b>Prix annoncé</b>Confirmé avant de commencer</span></div>
<div><span class="ico">🔑</span><span><b>Sans casse</b>Outils professionnels adaptés</span></div>
</div></section>

<section class="block" id="services"><div class="container">
<div class="tag">Nos interventions</div>
<h2>Tous vos problèmes de clé <em>réglés sur place</em></h2>
<p class="lead">Pas besoin de remorquer la voiture ni d’attendre un rendez-vous en concession : nous venons à vous avec le matériel nécessaire.</p>
<div class="grid">{cards}</div>
</div></section>

<section class="block alt"><div class="container">
<div class="tag">Simple et rapide</div>
<h2>Comment ça marche ?</h2>
<div class="steps3">
<div><h3>Vous nous appelez</h3><p>Décrivez votre situation, votre véhicule (marque, modèle, année) et l’endroit où il se trouve.</p></div>
<div><h3>On confirme le prix</h3><p>Vous connaissez la faisabilité et le tarif avant tout déplacement. Aucune mauvaise surprise.</p></div>
<div><h3>On intervient</h3><p>Nous venons sur place, réalisons l’intervention et testons tout avec vous avant de partir.</p></div>
</div>
</div></section>

<section class="block" id="tarifs"><div class="container">
<div class="tag">Tarifs transparents</div>
<h2>Nos tarifs</h2>
<p class="lead">Tarifs de départ indicatifs. Le prix final dépend de votre véhicule et vous est toujours confirmé avant l’intervention.</p>
<div class="prices">{prices}</div>
<p class="small" style="margin-top:14px">🎁 15 € de remise sur la deuxième clé réalisée lors de la même intervention.</p>
</div></section>

{cta_band()}

<section class="block" id="zones"><div class="container two">
<div>
<div class="tag">Zones d’intervention</div>
<h2>Partout en <em>Île-de-France</em></h2>
<p class="lead">Paris et toute la petite et grande couronne. Le délai d’arrivée vous est annoncé au téléphone selon votre position.</p>
<ul class="chips">{zones}</ul>
</div>
<div>
<div class="tag">Marques</div>
<h2>Toutes les <em>grandes marques</em></h2>
<p class="lead">Nous intervenons sur la plupart des véhicules du marché. Donnez-nous le modèle et l’année : la faisabilité est confirmée immédiatement.</p>
<ul class="chips">{brands}</ul>
</div>
</div></section>

<section class="block alt faq" id="faq"><div class="container">
<div class="tag">Questions fréquentes</div>
<h2>Vos questions, nos réponses</h2>
{faq_html(HOME_FAQ)}
</div></section>

{devis_section()}
</main>
''' + footer()


def service_page(s):
    path = f"/{s['slug']}/"
    plain_h1 = s["h1"].replace("<em>", "").replace("</em>", "")
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": s["card"], "item": SITE + path}]}
    service = {"@context": "https://schema.org", "@type": "Service", "name": s["card"],
               "serviceType": s["card"], "provider": {"@id": SITE + "/#business"},
               "areaServed": {"@type": "AdministrativeArea", "name": REGION},
               "offers": {"@type": "Offer", "priceCurrency": "EUR", "price": s["price"],
                          "priceSpecification": {"@type": "PriceSpecification", "minPrice": s["price"], "priceCurrency": "EUR"}}}
    body = "".join(f"<h2>{h}</h2><p>{p}</p>" for h, p in s["body"])
    notice = f'<div class="notice">{s["notice"]}</div>' if s.get("notice") else ""
    steps = "".join(f"<li>{x}</li>" for x in s["steps"])
    price_lines = "".join(f'<div class="small">{l} : <b style="color:var(--yellow)">dès {p} €</b></div>' for l, p in s.get("prices", []))
    others = "".join(f'''<a class="card" href="/{o["slug"]}/"><img src="/images/{o["img"]}.webp" alt="{o["card"]}" loading="lazy" width="360" height="320"><div class="copy"><h3>{o["card"]}</h3><p>{o["short"]}</p><div class="from"><span>Voir →</span>dès {o["price"]} €</div></div></a>''' for o in [x for x in SERVICES if x is not s][:3])
    return head(s["title"], s["desc"], path, ld(crumbs) + ld(service) + ld(faq_schema(s["faq"]))) + header() + f'''<main>
<section class="hero" style="--img:url('/images/{s["img"]}.webp')"><div class="container">
<div class="eyebrow">Serrurier automobile · Île-de-France · {EYEBROW_WHEN}</div>
<h1>{s["h1"]}</h1>
<p class="sub">{s["intro"]}</p>
{SOON}<div class="btn-row">{btn_call(PULSE)}{btn_wa()}</div>
<div class="price-badge">À partir de {s["price"]} € · prix confirmé avant intervention</div>
</div></section>
<div class="container crumbs"><a href="/">Accueil</a> › {s["card"]}</div>
<section class="block"><div class="container svc">
<article>
{body}
{notice}
<div class="notice">La faisabilité et le prix sont confirmés avant toute intervention.</div>
<h2>Les étapes de l’intervention</h2>
<ol class="steps">{steps}</ol>
<h2>Questions fréquentes</h2>
<div class="faq">{faq_html(s["faq"])}</div>
</article>
<aside>
<div class="tag">{s["card"]}</div>
<div class="price">À partir de {s["price"]} €</div>
{price_lines}
<p class="small">Prix final selon votre véhicule, confirmé au téléphone avant tout déplacement.</p>
{btn_call()}
{btn_wa()}
<a class="btn btn-ghost" href="/#devis">Formulaire de devis</a>
</aside>
</div></section>
{cta_band()}
<section class="block alt"><div class="container">
<div class="tag">Autres services</div>
<h2>Nous pouvons aussi vous aider pour…</h2>
<div class="grid">{others}</div>
</div></section>
</main>
''' + footer()


def page_404():
    return head("Page introuvable | Dupli’Clé Express", "Cette page n’existe pas.", "/404.html").replace(
        '<link rel="canonical"', '<meta name="robots" content="noindex"><link rel="canonical"') + header() + f'''<main>
<section class="block"><div class="container" style="text-align:center">
<h1>Page introuvable</h1><p class="lead" style="margin:auto">Cette page n’existe pas ou a été déplacée. Besoin d’un serrurier automobile ?</p>
<div class="btn-row" style="justify-content:center">{btn_call()}<a class="btn btn-yellow" href="/">Retour à l’accueil</a></div>
</div></section></main>
''' + footer()


# ─── Pages locales et pages marques (référencement Google) ───────────────────
TOWNS_94 = ["Créteil", "Vitry-sur-Seine", "Champigny-sur-Marne", "Saint-Maur-des-Fossés", "Ivry-sur-Seine",
            "Maisons-Alfort", "Villejuif", "Fontenay-sous-Bois", "Vincennes", "Alfortville", "Choisy-le-Roi",
            "Nogent-sur-Marne", "Thiais", "Orly", "Villeneuve-Saint-Georges", "Cachan", "L’Haÿ-les-Roses",
            "Charenton-le-Pont", "Le Kremlin-Bicêtre", "Bonneuil-sur-Marne", "Joinville-le-Pont", "Fresnes",
            "Chevilly-Larue", "Rungis", "Sucy-en-Brie", "Boissy-Saint-Léger", "Le Perreux-sur-Marne",
            "Villiers-sur-Marne", "Chennevières-sur-Marne", "Saint-Maurice"]


def svc_list_html():
    return "<ul class=\"steps\">" + "".join(
        f'<li><span><a href="/{s["slug"]}/" style="color:#fff">{s["card"]}</a> — <b style="color:var(--yellow)">dès {s["price"]} €</b></span></li>'
        for s in SERVICES) + "</ul>"


BRAND_PAGES = [
    {"brand": "Renault", "models": "Clio, Mégane, Captur, Scénic, Kangoo, Twingo, Kadjar, Austral",
     "keys": "Selon l’année, une Renault peut avoir une clé classique avec télécommande ou une <b>carte Renault</b> (carte mains libres) à la place de la clé. Les deux se refont et se programment, mais la carte demande un matériel spécifique : donnez-nous le modèle et l’année au téléphone pour un prix exact.",
     "tip": "Une carte Renault qui n’est plus reconnue (« carte non détectée ») ne veut pas toujours dire qu’elle est perdue : c’est parfois la pile ou un défaut de lecteur. Nous vérifions avant de proposer une nouvelle carte."},
    {"brand": "Peugeot", "models": "208, 308, 2008, 3008, 5008, Partner, Rifter, Expert",
     "keys": "La plupart des Peugeot récentes utilisent une <b>clé à lame pliante avec télécommande</b>, et les versions les plus récentes peuvent avoir une clé mains libres. Nous préparons le double puis le programmons sur le véhicule, selon le modèle et l’année.",
     "tip": "Si la télécommande de votre Peugeot ne répond plus mais que la clé démarre la voiture, commencez par changer la pile : c’est souvent suffisant."},
    {"brand": "Citroën", "models": "C3, C4, C5 Aircross, Berlingo, C3 Aircross, Jumpy, C1",
     "keys": "Les Citroën récentes partagent souvent la même technologie de clé que les Peugeot (même groupe automobile) : <b>clé pliante avec télécommande</b> ou clé mains libres selon la version. Nous refaisons et programmons la clé sur place quand le modèle le permet.",
     "tip": "Pour un Berlingo ou un Jumpy utilisé pour le travail, un double de clé évite d’immobiliser le véhicule le jour où la seule clé est perdue."},
    {"brand": "Dacia", "models": "Sandero, Duster, Logan, Jogger, Spring, Lodgy, Dokker",
     "keys": "Les Dacia utilisent le plus souvent une <b>clé avec télécommande</b>, plus simple que sur d’autres marques : le double est en général parmi les moins chers. La faisabilité dépend du modèle et de l’année.",
     "tip": "Beaucoup de Sandero et de Duster d’occasion sont vendues avec une seule clé : faire un double tout de suite coûte bien moins cher qu’une perte totale."},
    {"brand": "Volkswagen", "models": "Polo, Golf, T-Roc, Tiguan, Passat, Touran, Caddy, Transporter",
     "keys": "Volkswagen utilise souvent une <b>clé pliante avec télécommande</b>, et certaines versions ont l’accès sans clé (Keyless). La programmation des modèles récents peut demander une procédure spécifique : nous vous confirmons la faisabilité avant de nous déplacer.",
     "tip": "Sur certains modèles récents, la programmation d’une clé est plus complexe : donnez-nous l’année exacte (sur la carte grise) pour un devis fiable."},
    {"brand": "Toyota", "models": "Yaris, Corolla, C-HR, RAV4, Aygo, Auris, Prius",
     "keys": "Beaucoup de Toyota, notamment les hybrides, utilisent une <b>clé intelligente</b> (Smart Entry : on ouvre et on démarre sans sortir la clé de la poche). Les modèles plus anciens ont une clé classique à télécommande. Nous vous confirmons la faisabilité selon le modèle et l’année.",
     "tip": "Une clé intelligente qui n’est plus détectée a souvent une pile faible. Votre manuel indique en général comment démarrer quand même en approchant la clé du bouton de démarrage."},
]
for b in BRAND_PAGES:
    b["slug"] = "cle-voiture-" + b["brand"].lower().replace("ë", "e").replace("ö", "o")


def landing_page(slug, title, desc, h1, intro, img, price, body, faq, label):
    path = f"/{slug}/"
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": label, "item": SITE + path}]}
    others = "".join(f'<a class="card" href="/{o["slug"]}/"><img src="/images/{o["img"]}.webp" alt="{o["card"]}" loading="lazy" width="360" height="320"><div class="copy"><h3>{o["card"]}</h3><p>{o["short"]}</p><div class="from"><span>Voir →</span>dès {o["price"]} €</div></div></a>' for o in SERVICES[:3])
    return head(title, desc, path, ld(crumbs) + ld(faq_schema(faq))) + header() + f'''<main>
<section class="hero" style="--img:url('/images/{img}.webp')"><div class="container">
<div class="eyebrow">Serrurier automobile · Île-de-France · {EYEBROW_WHEN}</div>
<h1>{h1}</h1>
<p class="sub">{intro}</p>
{SOON}<div class="btn-row">{btn_call(PULSE)}{btn_wa()}</div>
<div class="price-badge">À partir de {price} € · prix confirmé avant intervention</div>
</div></section>
<div class="container crumbs"><a href="/">Accueil</a> › {label}</div>
<section class="block"><div class="container svc">
<article>
{body}
<h2>Questions fréquentes</h2>
<div class="faq">{faq_html(faq)}</div>
</article>
<aside>
<div class="tag">{label}</div>
<div class="price">À partir de {price} €</div>
<p class="small">Prix final selon votre véhicule, confirmé au téléphone avant tout déplacement.</p>
{btn_call()}
{btn_wa()}
<a class="btn btn-ghost" href="/#devis">Formulaire de devis</a>
</aside>
</div></section>
{cta_band()}
<section class="block alt"><div class="container">
<div class="tag">Nos services</div>
<h2>Nous pouvons aussi vous aider pour…</h2>
<div class="grid">{others}</div>
</div></section>
</main>
''' + footer()


def page_94():
    towns = "".join(f"<li>{t}</li>" for t in TOWNS_94)
    body = f'''<h2>Un serrurier auto qui vient à vous dans tout le 94</h2>
<p>Dupli’Clé Express est un serrurier automobile basé dans le Val-de-Marne. Nous nous déplaçons là où se trouve votre voiture : devant chez vous, sur le parking de votre travail, d’une gare RER ou d’un centre commercial (Créteil Soleil, Belle Épine…). Pas de remorquage, pas de rendez-vous en concession.</p>
<h2>Nos prestations dans le Val-de-Marne</h2>
{svc_list_html()}
<h2>Villes desservies</h2>
<p>Nous intervenons dans toutes les communes du Val-de-Marne, notamment :</p>
<ul class="chips">{towns}</ul>
<div class="notice">Le délai d’arrivée dépend de votre position : il vous est annoncé au téléphone, avec le prix, avant tout déplacement.</div>
<h2>Comment ça se passe ?</h2>
<ol class="steps"><li>Vous appelez et indiquez votre véhicule (marque, modèle, année) et votre adresse</li><li>Nous confirmons la faisabilité et le prix</li><li>Nous venons sur place et réalisons l’intervention</li><li>Nous testons tout avec vous avant de partir</li></ol>'''
    faq = [("Intervenez-vous à Créteil, Vitry et Champigny ?", "Oui, ainsi que dans toutes les communes du Val-de-Marne : Saint-Maur, Ivry, Maisons-Alfort, Villejuif, Fontenay-sous-Bois, Vincennes, Alfortville, Choisy-le-Roi…"),
           ("Le déplacement est-il compris ?", "Le prix vous est annoncé au téléphone avant tout déplacement, selon votre adresse et votre véhicule. Aucune surprise à l’arrivée."),
           ("Pouvez-vous intervenir sur un parking ?", "Oui : parking de résidence, de supermarché, de gare ou de travail, du moment que le véhicule est accessible.")]
    return landing_page("serrurier-automobile-val-de-marne",
                        "Serrurier automobile Val-de-Marne (94) – Créteil, Vitry, Champigny | Dupli’Clé Express",
                        "Serrurier automobile à domicile dans le Val-de-Marne (94) : Créteil, Vitry, Champigny, Saint-Maur, Ivry… Ouverture de voiture dès 84 €, double de clé dès 114 €. Prix confirmé avant intervention.",
                        "Serrurier automobile <em>Val-de-Marne (94)</em>",
                        "Ouverture de voiture, double et programmation de clé, perte totale de clés : nous venons à vous à Créteil, Vitry, Champigny, Saint-Maur, Ivry et dans tout le 94.",
                        "hero", 84, body, faq, "Val-de-Marne (94)")


def brand_page(b):
    B = b["brand"]
    body = f'''<h2>Clé de {B} perdue, cassée ou à doubler ?</h2>
<p>Nous intervenons sur la plupart des modèles {B} : <b>{b["models"]}</b>. Double de clé, programmation, ouverture sans casse ou création de clé après une perte totale : nous venons à vous, sans remorquage.</p>
<h2>Quel type de clé pour votre {B} ?</h2>
<p>{b["keys"]}</p>
<div class="notice"><b>Conseil :</b> {b["tip"]}</div>
<h2>Nos prestations pour {B}</h2>
{svc_list_html()}
<h2>Ce qu’il faut nous donner au téléphone</h2>
<ol class="steps"><li>Le modèle exact (ex. {b["models"].split(", ")[0]})</li><li>L’année (indiquée sur la carte grise)</li><li>Votre situation : double, clé perdue, clé cassée, télécommande…</li><li>L’adresse où se trouve la voiture</li></ol>'''
    faq = [(f"Faut-il aller chez {B} pour refaire une clé ?", f"Non. Pour de nombreux modèles {B}, nous réalisons le double ou la nouvelle clé sur place, souvent plus rapidement et pour moins cher qu’en concession. La faisabilité est confirmée avant intervention."),
           (f"Combien coûte un double de clé {B} ?", "À partir de 114 € pour une clé avec puce et 159 € avec télécommande. Le prix exact dépend du modèle et de l’année : il vous est donné au téléphone avant tout déplacement."),
           (f"J’ai perdu toutes les clés de ma {B}, que faire ?", "Appelez-nous : nous étudions la création d’une nouvelle clé sur place, sans remorquage, après vérification de la carte grise et de votre identité.")]
    return landing_page(b["slug"],
                        f"Clé voiture {B} : double, programmation, perte – à domicile | Dupli’Clé Express",
                        f"Double de clé {B}, programmation, clé perdue ou ouverture sans casse ({b['models'].split(', ')[0]}, {b['models'].split(', ')[1]}…) à domicile en Île-de-France. Dès 114 €, prix confirmé avant intervention.",
                        f"Clé de voiture <em>{B}</em> à domicile",
                        f"Double, programmation, perte totale ou ouverture : nous intervenons sur votre {B} directement là où elle se trouve, en Île-de-France.",
                        "double", 114, body, faq, f"Clé {B}")


def write(rel, content):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    write("index.html", home())
    for s in SERVICES:
        write(f"{s['slug']}/index.html", service_page(s))
    write("serrurier-automobile-val-de-marne/index.html", page_94())
    for b in BRAND_PAGES:
        write(f"{b['slug']}/index.html", brand_page(b))
    write("404.html", page_404())
    today = date.today().isoformat()
    urls = ["/"] + [f"/{s['slug']}/" for s in SERVICES] + ["/serrurier-automobile-val-de-marne/"] + [f"/{b['slug']}/" for b in BRAND_PAGES]
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          "".join(f"  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod><priority>{'1.0' if u == '/' else '0.8'}</priority></url>\n" for u in urls) +
          "</urlset>\n")
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    write("site.webmanifest", json.dumps({
        "name": NAME, "short_name": "Dupli’Clé", "start_url": "/", "display": "standalone",
        "background_color": "#090a0c", "theme_color": "#090a0c",
        "icons": [{"src": "/images/icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "/images/icon-512.png", "sizes": "512x512", "type": "image/png"}]}, ensure_ascii=False, indent=2))
    if "600000000" in PHONE:  # numéro d’exemple
        print("⚠️  ATTENTION : le numéro de téléphone est encore le numéro d'exemple. Modifiez PHONE en haut de tools/build.py.")
    print("Site généré :", len(urls), "pages")


if __name__ == "__main__":
    main()
