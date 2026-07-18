# Devises

Convertisseur de devises **statique**, hors-ligne, configurable par l'URL. Aucun backend.

- Taux : [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) via jsDelivr (licence CC0, 200+ devises), avec bascule automatique sur le miroir Cloudflare Pages si jsDelivr est injoignable.
- PWA installable (icône plein écran), fonctionne hors-ligne grâce au cache des derniers taux.
- L'état est encodé dans le **hash** de l'URL : `#eur,usd,gbp`. La première devise est la **base** (celle dans laquelle on saisit), les suivantes sont affichées en dessous.

## Bookmarks

Chaque configuration = un marque-page, par exemple :

- `…/devises/#eur,usd`
- `…/devises/#eur,gbp,jpy`
- `…/devises/#usd,cad`

L'app met à jour le hash toute seule quand on ajoute/retire/change de devise — il suffit de re-bookmarker pour figer une nouvelle config.

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
