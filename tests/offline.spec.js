const { test, expect } = require("@playwright/test");
const { abortCurrencyApi } = require("./utils/api-mock");
const { amountOf, subOf, pressKeys } = require("./utils/dom");
const { fmt } = require("./utils/format");
const { MOCK_DATE, crossRates } = require("./fixtures/currency-data");

// Le service worker de l'app (stratégie "réseau d'abord" pour les taux) tourne
// dans un contexte séparé et pourrait court-circuiter nos mocks page.route().
// On le désactive ici pour garder la simulation réseau fiable ; son propre
// comportement est couvert par tests/pwa.spec.js.
test.use({ serviceWorkers: "block" });

// Pré-remplit le cache localStorage lu par loadCache() (voir index.html),
// avant tout script de la page. On teste ainsi directement "l'app lit et
// utilise un cache existant hors-ligne", sans dépendre du timing réel d'une
// écriture localStorage juste avant un reload navigateur (source de flakiness
// connue, notamment sous Firefox).
async function seedRatesCache(page, base, rates, date) {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: `rates:${base}`, value: JSON.stringify({ rates, date, at: Date.now() }) }
  );
}

// Simule un instantané "dernière version connue" pour une AUTRE base que celle
// demandée (voir LAST_KEY/loadCache dans index.html), sans cache dédié pour la
// base courante.
async function seedLastKnownGood(page, base, rates, date) {
  await page.addInitScript(
    ({ value }) => window.localStorage.setItem("ratesLast", value),
    { value: JSON.stringify({ base, rates, date, at: Date.now() }) }
  );
}

test.describe("Comportement hors-ligne", () => {
  test("utilise le cache local quand le réseau est indisponible", async ({ page }) => {
    const eurRates = crossRates("eur");
    await seedRatesCache(page, "eur", eurRates, MOCK_DATE);
    await abortCurrencyApi(page);

    await page.goto("/");

    await expect(page.locator("#updated")).toContainText("hors-ligne");
    await expect(page.locator("#updated")).toContainText(MOCK_DATE);
    await expect(subOf(page, "usd")).toHaveText(`1 EUR = ${fmt(eurRates.usd)}`);
  });

  test("reste utilisable (calculatrice) en mode hors-ligne avec cache", async ({ page }) => {
    const eurRates = crossRates("eur");
    await seedRatesCache(page, "eur", eurRates, MOCK_DATE);
    await abortCurrencyApi(page);

    await page.goto("/");
    await expect(page.locator("#updated")).toContainText("hors-ligne");

    await pressKeys(page, ["1", "0", "0", "eq"]);
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * eurRates.usd));
  });

  test("retombe sur le dernier instantané connu même pour une base jamais fetchée directement", async ({ page }) => {
    // Un instantané existe pour USD, mais pas de cache dédié pour EUR (la base
    // demandée) : l'app doit dériver les taux EUR par calcul croisé plutôt que
    // d'afficher "pas de taux".
    const usdRates = crossRates("usd");
    await seedLastKnownGood(page, "usd", usdRates, MOCK_DATE);
    await abortCurrencyApi(page);

    await page.goto("/");

    await expect(page.locator("#updated")).toContainText("hors-ligne");
    const derivedEurUsd = crossRates("eur").usd; // attendu, calculé indépendamment via le pivot USD
    await expect(subOf(page, "usd")).toHaveText(`1 EUR = ${fmt(derivedEurUsd)}`);
  });

  test("affiche un message clair quand aucun taux n'est en cache et le réseau est indisponible", async ({ page }) => {
    // Pas de seedRatesCache ici : localStorage vide, donc aucun cache disponible.
    await abortCurrencyApi(page);
    await page.goto("/");

    await expect(page.locator("#updated")).toContainText("pas de taux");
    await expect(amountOf(page, "usd")).toHaveText("—");
  });
});
