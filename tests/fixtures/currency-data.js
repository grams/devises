"use strict";

// Date figée utilisée par les réponses mockées, pour bien distinguer
// les données de test des vrais taux du jour.
const MOCK_DATE = "2024-01-01";

// Noms de devises, servent à peupler la recherche du panneau "Gérer".
// "xau" n'a volontairement pas de taux dans USD_RATES : il sert au test
// du cas "aucun taux disponible".
const NAMES = {
  eur: "Euro",
  usd: "US Dollar",
  gbp: "British Pound Sterling",
  jpy: "Japanese Yen",
  chf: "Swiss Franc",
  cad: "Canadian Dollar",
  aud: "Australian Dollar",
  cny: "Chinese Yuan",
  inr: "Indian Rupee",
  brl: "Brazilian Real",
  mxn: "Mexican Peso",
  sek: "Swedish Krona",
  nok: "Norwegian Krone",
  nzd: "New Zealand Dollar",
  zar: "South African Rand",
  xau: "Gold Ounce",
  vnd: "Vietnamese Dong",
};

// Taux "réels" (fictifs) exprimés par rapport à 1 USD.
const USD_RATES = {
  usd: 1,
  eur: 0.92,
  gbp: 0.79,
  jpy: 157.5,
  chf: 0.9,
  cad: 1.36,
  aud: 1.52,
  cny: 7.25,
  inr: 83.4,
  brl: 5.4,
  mxn: 18.2,
  sek: 10.5,
  nok: 10.9,
  nzd: 1.68,
  zar: 18.6,
  vnd: 24000, // volontairement très éloigné des autres taux : sert à tester le formatage des micro-montants
};

function round(n) {
  return Math.round(n * 1e6) / 1e6;
}

// Calcule la table de taux pour une devise de base donnée, comme le ferait
// la véritable API (`/currencies/{base}.json` -> `{ [base]: { autres devises } }`).
function crossRates(base) {
  const baseRate = USD_RATES[base];
  if (!baseRate) return {};
  const out = {};
  for (const [code, rate] of Object.entries(USD_RATES)) {
    out[code] = round(rate / baseRate);
  }
  return out;
}

// Frais de conversion appliqués par l'app (voir FEE dans index.html).
const FEE = 0.02;
const FEE_LABEL = "2 %";

// Reproduit crossRate() de index.html : l'app ne connaît que la table servie
// pour `base`, et dérive tout le reste de celle-ci ; les frais s'appliquent
// dès que la devise principale est d'un côté de la conversion.
function effRate(base, from, to) {
  if (from === to) return 1;
  const table = crossRates(base);
  const rf = from === base ? 1 : table[from];
  const rt = to === base ? 1 : table[to];
  if (rf == null || rt == null) return null;
  const raw = rt / rf;
  if (from === base) return raw * (1 - FEE);
  if (to === base) return raw * (1 + FEE);
  return raw;
}

module.exports = { MOCK_DATE, NAMES, USD_RATES, FEE, FEE_LABEL, crossRates, effRate };
