"use strict";

const { MOCK_DATE, NAMES, crossRates } = require("../fixtures/currency-data");

// Les deux sources de l'app (jsDelivr et pages.dev) exposent toutes les deux
// un chemin contenant "/v1/", donc un seul pattern de route suffit à
// intercepter les deux, quel que soit l'hôte choisi par l'app.
const RATES_GLOB = "**/v1/**";
const FLAG_GLOB = "**/flagcdn.com/**";
const PLACEHOLDER_FLAG_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#ccc"/></svg>';

/** Répond aux requêtes d'images de drapeaux (flagcdn.com) par un SVG factice,
 * pour garder les tests hermétiques et déterministes (pas de vrai réseau). */
async function mockFlags(page) {
  await page.route(FLAG_GLOB, (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: PLACEHOLDER_FLAG_SVG })
  );
}

/**
 * Intercepte les appels réseau vers l'API de taux de change et répond avec
 * des données figées et déterministes (voir tests/fixtures/currency-data.js).
 */
async function mockCurrencyApi(page, opts = {}) {
  const date = opts.date || MOCK_DATE;
  const names = opts.names || NAMES;

  await mockFlags(page);
  await page.route(RATES_GLOB, async (route) => {
    const url = route.request().url();

    if (/\/currencies\.(min\.)?json(?:\?.*)?$/.test(url)) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(names) });
      return;
    }

    const m = url.match(/\/currencies\/([a-z0-9]+)\.(?:min\.)?json(?:\?.*)?$/);
    if (m) {
      const base = m[1];
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ date, [base]: crossRates(base) }),
      });
      return;
    }

    await route.continue();
  });
}

/** Simule une absence totale de réseau vers l'API de taux (mode hors-ligne). */
async function abortCurrencyApi(page) {
  await mockFlags(page);
  await page.route(RATES_GLOB, (route) => route.abort("internetdisconnected"));
}

module.exports = { mockCurrencyApi, abortCurrencyApi, mockFlags, RATES_GLOB, FLAG_GLOB };
