# Devises

Convertisseur de devises **statique**, hors-ligne, configurable par l'URL. Aucun backend.

- Taux : [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) via jsDelivr (licence CC0, 200+ devises), avec bascule automatique sur le miroir Cloudflare Pages si jsDelivr est injoignable.
- PWA installable (icône plein écran), fonctionne hors-ligne grâce au cache des derniers taux.
- L'état est encodé dans le **hash** de l'URL : `#eur,usd,gbp`. La première devise est la **base** (la devise principale), les suivantes sont affichées en dessous, dans l'ordre. Un taux de frais non standard s'y ajoute en jeton suffixé de `%` : `#eur,usd,gbp,3.5%`.

## Bookmarks

Chaque configuration = un marque-page, par exemple :

- `…/devises/#eur,usd`
- `…/devises/#eur,gbp,jpy`
- `…/devises/#usd,cad`
- `…/devises/#eur,vnd,thb,1.5%` — même sélection, frais à 1,5 %

L'app met à jour le hash toute seule quand on ajoute, retire, réordonne ou change de devise, et quand on change le taux de frais — il suffit de re-bookmarker pour figer une nouvelle config.

Dans « Gérer les devises », les flèches **▲ ▼** réordonnent les devises non principales. La base garde toujours la 1re place : c'est le contrat du hash (première devise = base), et « Base » sur une autre ligne l'y amène.

## Ligne de saisie

À l'ouverture, la saisie se pose sur la **première devise non principale** — la 2e ligne de l'écran — parce qu'on part presque toujours d'un prix lu en devise étrangère pour savoir ce qu'il coûte. Un clic sur une autre ligne déplace la saisie ; ni la base ni l'ordre ne changent (ça, c'est « Gérer »).

Revenir sur l'app après **plus de 3 minutes** sans rien toucher repose la saisie sur cette même 2e ligne, comme une nouvelle recherche de prix. En deçà du seuil, un aller-retour rapide (aller lire un message, revenir) ne casse pas le calcul en cours. Le montant affiché reste visible dans les deux cas : c'est le premier chiffre tapé qui le remplace.

## Frais de conversion

Un forfait — **2 %** par défaut — s'applique à toute conversion qui touche la **devise principale** (la première du hash), toujours dans le sens défavorable :

- devise principale → devise étrangère : on reçoit 2 % de moins ;
- devise étrangère → devise principale : la dépense coûte 2 % de plus.

Un aller-retour ne retombe donc pas sur le montant de départ — c'est voulu, comme avec une vraie carte. Les paires qui n'impliquent pas la devise principale (ex. `usd → gbp` quand la base est `eur`) restent au taux brut. Le taux affiché sous chaque ligne est le **taux effectif**, frais inclus, signalé par la mention « frais 2 % ».

Le taux se règle dans « Gérer les devises » (0 à 100 %, `0` désactive les frais et la mention). Il voyage dans le hash dès qu'il diffère du défaut — `#eur,usd,gbp,3.5%` — et le jeton est omis à 2 % pour garder les URLs courtes. Le séparateur décimal y est le **point**, la virgule séparant déjà les devises. Un bookmark est autosuffisant : sans jeton, il vaut 2 %, jamais « le dernier taux réglé ». Le lancement par l'icône PWA (sans hash) reprend, lui, la dernière config connue — devises et taux.

## Déploiement sur GitHub Pages

Depuis ce dossier :

```bash
git init
git add .
git commit -m "Convertisseur de devises PWA"
git branch -M main
git remote add origin https://github.com/<ton-pseudo>/devises.git
git push -u origin main
```

Puis dans le repo : **Settings → Pages → Build and deployment → Deploy from a branch → Branch: `main` / `(root)` → Save**.

L'URL sera : `https://<ton-pseudo>.github.io/devises/`

> Les chemins sont **relatifs** (`sw.js`, `manifest.json`, `start_url: "."`), donc l'app fonctionne bien dans le sous-dossier `/devises/`. Ne les passe pas en absolus (`/sw.js`) sinon la PWA casse.

## Domaine perso (optionnel)

Pour un domaine personnalisé, ajoute un CNAME `<sous-domaine> → <ton-pseudo>.github.io` chez ton registrar, renseigne le domaine dans **Settings → Pages → Custom domain**, et coche *Enforce HTTPS*. GitHub gère le certificat.

## Structure

```
devises/
├── index.html      app + logique (calculatrice, conversion, gestion des devises)
├── manifest.json   PWA
├── sw.js           service worker (offline)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

Taux indicatifs, mis à jour quotidiennement (source CC0). À ne pas utiliser pour des transactions au centime près.

## Licence

Code sous licence [MIT](LICENSE) — libre d'utilisation, de modification et de partage. Les taux de change proviennent de [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) sous licence CC0.
