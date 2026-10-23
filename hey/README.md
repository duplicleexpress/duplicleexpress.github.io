# HEY — assistant personnel en appel vidéo

HEY est une application iPhone (et bientôt Android) qui permet de parler à une intelligence artificielle comme on appelle un ami en FaceTime : on parle, on montre le problème avec la caméra, et HEY répond à voix haute en guidant étape par étape.

---

## 1. Ce qui est construit (version MVP)

| Fonction | État |
|---|---|
| Écran d'accueil (HEY, « Besoin d'aide ? Je suis là. », grand bouton animé, 3 modes) | ✅ |
| Appel vidéo plein écran : micro, caméra, retourner, haut-parleur, raccrocher | ✅ |
| HEY reçoit des images de la caméra synchronisées avec votre parole | ✅ |
| Conversation vocale naturelle en français (sans écrire) | ✅ |
| Couper la parole à HEY en parlant ou en touchant l'écran | ✅ |
| Réponses vocales qui commencent dès la première phrase | ✅ |
| Chat écrit | ✅ |
| Historique : titres et résumés automatiques, reprise, suppression | ✅ |
| Mémoire personnalisée (désactivée par défaut, visible et effaçable) | ✅ |
| Comptes utilisateurs (e-mail + mot de passe) | ✅ |
| Mode clair / sombre / automatique, français / anglais | ✅ |
| RGPD : export des données, suppression du compte, aucune vidéo ni audio stocké | ✅ |
| Limites de consommation quotidiennes par utilisateur | ✅ |

### Comment HEY « voit »
L'IA utilisée (Claude, d'Anthropic) analyse des **images**, pas un flux vidéo continu. HEY prend donc une photo de la caméra **à la fin de chacune de vos phrases** (et une deuxième au début si vous parlez longtemps). Chaque message indique à l'IA si une image est jointe ou non : elle ne peut pas prétendre voir quelque chose qu'elle n'a pas reçu. Les images ne sont jamais enregistrées.

### Architecture

```
iPhone (app HEY)                    Serveur HEY (Node.js)              Services
─────────────────                   ─────────────────────              ────────
Micro → texte (reconnaissance       ─► vérifie le compte          ─► Supabase (comptes,
vocale d'Apple, sur l'appareil)        applique les limites            historique, mémoire)
Caméra → photo à chaque phrase      ─► envoie texte + images      ─► Claude (IA)
Voix de HEY (synthèse iOS)       ◄──── renvoie la réponse en flux
```

- **La clé de l'IA reste sur le serveur.** L'application ne contient aucune clé secrète.
- `mobile/` : application React Native + Expo + TypeScript
- `server/` : serveur Node.js + TypeScript (Fastify)
- `supabase/` : schéma de la base de données (avec sécurité par utilisateur)

---

## 2. Ce dont vous aurez besoin

| Quoi | Pourquoi | Coût |
|---|---|---|
| Un ordinateur (Mac, Windows ou Linux) | Lancer les commandes de build une fois | — |
| Compte **Anthropic** (console.anthropic.com) | L'intelligence artificielle | Paiement à l'usage |
| Compte **Supabase** (supabase.com) | Comptes et historique | Gratuit pour commencer |
| Compte **Render** (render.com) | Héberger le serveur HEY | Gratuit pour tester |
| Compte **Expo** (expo.dev) | Construire l'application iPhone dans le cloud | Gratuit |
| **Apple Developer Program** | Installer l'app sur votre iPhone | 99 €/an |

> **Pourquoi pas Expo Go ?** L'appli gratuite « Expo Go » ne contient pas la reconnaissance vocale. Dans Expo Go, seuls l'accueil, le chat écrit et l'historique fonctionnent. Pour la voix et l'appel vidéo, il faut la « version de développement » (étape 6), qui nécessite le compte Apple Developer.

---

## 3. Étape 1 — Base de données (Supabase) · 10 min

1. Sur [supabase.com](https://supabase.com), créez un projet (région : Europe, par ex. Paris ou Francfort).
2. Menu **SQL Editor** → **New query** → collez tout le contenu du fichier `supabase/migrations/20261023000000_init.sql` → **Run**. Vous devez voir « Success ».
3. Menu **Authentication → Sign In / Providers → Email** : laissez « Email » activé. Pour tester plus vite, vous pouvez désactiver **Confirm email** (sinon, chaque nouveau compte doit cliquer sur un lien reçu par e-mail).
4. Menu **Project Settings → API** : notez
   - **Project URL** (ex. `https://abcd.supabase.co`)
   - la clé **anon public** (publique, pour l'app)
   - la clé **service_role** (⚠️ secrète, uniquement pour le serveur)

## 4. Étape 2 — Clé de l'IA (Anthropic) · 5 min

1. Sur [console.anthropic.com](https://console.anthropic.com), créez un compte et ajoutez un moyen de paiement (**Billing**).
2. **API Keys** → **Create Key** → copiez la clé (elle commence par `sk-ant-`). Ne la partagez jamais.
3. Conseil : dans **Limits**, fixez une limite de dépense mensuelle.

## 5. Étape 3 — Serveur HEY (Render) · 10 min

1. Sur [render.com](https://render.com), connectez votre compte GitHub.
2. **New → Web Service** → choisissez ce dépôt GitHub et la branche `claude/hey-app`.
3. Réglages :
   - **Root Directory** : `hey/server`
   - **Runtime** : Node
   - **Build Command** : `npm install --include=dev && npm run build`
   - **Start Command** : `npm start`
4. **Environment Variables** (ajoutez-les une par une) :

   | Nom | Valeur |
   |---|---|
   | `NODE_ENV` | `production` |
   | `ANTHROPIC_API_KEY` | votre clé `sk-ant-…` |
   | `SUPABASE_URL` | Project URL de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé service_role de Supabase |
   | `DAILY_MESSAGE_LIMIT` | `200` (messages par personne et par jour) |
   | `DAILY_IMAGE_LIMIT` | `400` (images par personne et par jour) |

5. **Create Web Service**. Après quelques minutes, Render affiche une adresse comme `https://hey-server.onrender.com`.
6. Vérification : ouvrez `https://VOTRE-ADRESSE/health` dans un navigateur. Vous devez voir `{"ok":true,...}`.

> Sur l'offre gratuite de Render, le serveur s'endort après 15 min d'inactivité : le premier message peut alors prendre ~1 minute. Passez à l'offre payante pour un usage réel.

## 6. Étape 4 — Application sur votre iPhone · 30 min

Sur votre ordinateur, installez [Node.js](https://nodejs.org) (version LTS), puis dans un terminal :

```bash
git clone https://github.com/duplicleexpress/duplicleexpress.github.io.git
cd duplicleexpress.github.io
git checkout claude/hey-app
cd hey/mobile
npm install
```

Créez la configuration de l'app : copiez `.env.example` en `.env` et remplissez :

```
EXPO_PUBLIC_API_URL=https://hey-server.onrender.com
EXPO_PUBLIC_SUPABASE_URL=https://abcd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=la-clé-anon-public
```

Puis construisez la version de développement (dans le cloud d'Expo, pas besoin de Xcode) :

```bash
npx eas-cli@latest login                 # votre compte Expo
npx eas-cli@latest device:create         # enregistre votre iPhone (suivez le QR code)
npx eas-cli@latest build --profile development --platform ios
```

- La commande vous demande de vous connecter à votre compte Apple Developer : acceptez, Expo gère les certificats.
- À la fin (~15 min), un QR code s'affiche : scannez-le avec l'iPhone pour installer HEY.
- Sur l'iPhone : **Réglages → Confidentialité et sécurité → Mode développeur** → activer (l'iPhone redémarre).

Lancez ensuite l'application :

```bash
npx expo start --dev-client
```

Ouvrez HEY sur l'iPhone ; il se connecte à votre ordinateur (même Wi-Fi). Si cela ne marche pas : `npx expo start --dev-client --tunnel`.

## 7. Tester

1. Créez un compte dans l'app (e-mail + mot de passe).
2. Appuyez sur **Appeler HEY**, acceptez caméra, micro et reconnaissance vocale.
3. Dites : « Hey, regarde, mon robinet fuit » en montrant un robinet.
4. Essayez de couper la parole à HEY pendant qu'il répond.
5. Raccrochez, puis ouvrez **Historique** : la conversation a un titre, vous pouvez la reprendre.

**Astuce voix :** pour une voix plus naturelle, sur l'iPhone : **Réglages → Accessibilité → Contenu énoncé → Voix → Français** et téléchargez une voix « Premium » ou « Améliorée ». HEY la choisira automatiquement.

**Si HEY se coupe tout seul** (le micro entend le haut-parleur) : baissez le volume, utilisez des écouteurs, ou désactivez « Interrompre HEY en parlant » dans les Paramètres.

---

## 8. Pour les développeurs

```bash
# Serveur
cd server
npm install
cp .env.example .env    # puis remplir
npm run dev             # http://localhost:8787
npm test                # 16 tests (API, interruption, sécurité, RGPD)
npm run typecheck

# Application
cd mobile
npm install
npm test                # logique vocale (fin de phrase, anti-écho, flux)
npm run typecheck
npm run lint
```

Mode local sans Supabase : `ALLOW_DEV_AUTH=true` dans `server/.env` (données en mémoire, jeton `dev-<nom>` ; refusé en production).

### API du serveur
| Méthode | Chemin | Rôle |
|---|---|---|
| POST | `/v1/chat` | Message (texte + images) → réponse en flux (Server-Sent Events) |
| GET | `/v1/conversations` | Historique |
| GET / DELETE | `/v1/conversations/:id` | Reprendre / supprimer |
| GET | `/v1/me` | Profil, réglages, consommation du jour |
| PUT | `/v1/me/settings` | Mémoire activée, langue |
| GET / DELETE | `/v1/me/memories[/:id]` | Voir / effacer la mémoire |
| GET | `/v1/me/export` | Export RGPD |
| DELETE | `/v1/me` | Suppression du compte et des données |

### Fichiers clés
- `mobile/src/hooks/use-voice-session.ts` — le cœur de l'appel (écoute, fin de phrase, envoi, voix, interruption)
- `mobile/src/components/call-screen.tsx` — l'écran d'appel façon FaceTime
- `server/src/prompts.ts` — la personnalité et les règles de HEY (honnêteté sur ce qu'il voit, sécurité)
- `server/src/app.ts` — l'API, les limites, le streaming

### Confidentialité (RGPD)
- Audio et vidéo : jamais enregistrés. La voix est transcrite sur l'iPhone quand c'est possible.
- Images : envoyées à l'IA pour la réponse en cours, jamais stockées (seul leur nombre est noté).
- Texte des conversations : stocké dans Supabase pour l'historique ; supprimable à tout moment.
- Mémoire : désactivée par défaut, chaque souvenir est visible et effaçable.
- Avant une publication sur l'App Store : rédiger une politique de confidentialité, signer les accords de traitement (DPA) d'Anthropic et Supabase, et choisir la région Europe pour Supabase.

### Prochaines étapes possibles
- Voix plus naturelle (synthèse vocale neuronale côté serveur)
- Envoi d'une photo dans le chat écrit
- Publication TestFlight puis App Store (`eas build --profile production` puis `eas submit`)
- Version Android (le code est déjà compatible, à tester)
