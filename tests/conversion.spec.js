const { test, expect } = require("@playwright/test");
const { mockCurrencyApi } = require("./utils/api-mock");
const { rowByCode, amountOf, subOf, pressKeys, pressKey } = require("./utils/dom");
const { fmt, prettyExpr } = require("./utils/format");
const { MOCK_DATE, crossRates } = require("./fixtures/currency-data");

test.describe("Conversion entre devises", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrencyApi(page);
    await page.goto("/"); // eur (base + focus de saisie), usd, gbp
  });

  test("les conversions ne se mettent à jour qu'à la validation par =", async ({ page }) => {
    const eurRates = crossRates("eur");
    await pressKeys(page, ["1", "0", "0"]);
    // Tant que = n'a pas été pressé, les autres lignes restent sur leur dernière valeur confirmée (0).
    await expect(amountOf(page, "usd")).toHaveText("0");
    await expect(amountOf(page, "gbp")).toHaveText("0");

    await pressKey(page, "eq");
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * eurRates.usd));
    await expect(amountOf(page, "gbp")).toHaveText(fmt(100 * eurRates.gbp));
  });

  test("après =, retaper un nouveau calcul ne recalcule pas tant qu'on n'a pas revalidé", async ({ page }) => {
    const eurUsd = crossRates("eur").usd;
    await pressKeys(page, ["1", "0", "0", "eq"]);
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * eurUsd));

    await pressKeys(page, ["+", "5", "0"]);
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * eurUsd)); // toujours figé

    await pressKey(page, "eq");
    await expect(amountOf(page, "usd")).toHaveText(fmt(150 * eurUsd));
  });

  test("affiche le taux de référence sous chaque devise convertie", async ({ page }) => {
    const eurUsd = crossRates("eur").usd;
    await expect(subOf(page, "usd")).toHaveText(`1 EUR = ${fmt(eurUsd)}`);
  });

  test("n'affiche pas de taux de référence pour la ligne active", async ({ page }) => {
    await expect(subOf(page, "eur")).toHaveCount(0);
  });

  test("affiche — quand aucun taux n'est disponible pour une devise", async ({ page }) => {
    // "xau" est présent dans les noms mais volontairement absent des taux mockés.
    await page.goto("/#eur,usd,xau");
    await pressKeys(page, ["5", "0", "eq"]);
    await expect(amountOf(page, "xau")).toHaveText("—");
    await expect(subOf(page, "xau")).toHaveCount(0);
  });

  test("un clic sur une ligne change le focus de saisie sans toucher à la base ni à l'ordre", async ({ page }) => {
    await pressKeys(page, ["1", "0", "0", "eq"]);
    const eurUsd = crossRates("eur").usd;
    const converted = Math.round(100 * eurUsd * 1e6) / 1e6;

    await rowByCode(page, "usd").click();

    // La base reste EUR (tag + style), seul le focus de saisie a changé.
    await expect(rowByCode(page, "eur")).toHaveClass(/base/);
    await expect(rowByCode(page, "eur").locator(".tag")).toHaveText("BASE");
    await expect(rowByCode(page, "usd")).not.toHaveClass(/base/);
    await expect(rowByCode(page, "usd")).toHaveClass(/active/);

    // L'ordre des lignes et le hash restent inchangés (pas de reorder au clic).
    const rows = page.locator("#rows .row");
    await expect(rows.nth(0).locator(".code")).toContainText("EUR");
    await expect(rows.nth(1).locator(".code")).toContainText("USD");
    await expect(page).toHaveURL(/#eur,usd,gbp$/);

    // La ligne USD affiche désormais la saisie (convertie), EUR devient une conversion figée.
    await expect(amountOf(page, "usd")).toHaveText(prettyExpr(String(converted)));
  });

  test("après un changement de focus, la ligne désormais inactive montre une conversion cohérente (aller-retour)", async ({ page }) => {
    await pressKeys(page, ["1", "0", "0", "eq"]);
    await rowByCode(page, "usd").click(); // focus -> usd, valeur reconvertie automatiquement

    await expect(amountOf(page, "eur")).toHaveText(fmt(100));
  });

  test("changer de focus sans montant saisi affiche 0", async ({ page }) => {
    await rowByCode(page, "gbp").click();
    await expect(rowByCode(page, "gbp")).toHaveClass(/active/);
    await expect(amountOf(page, "gbp")).toHaveText("0");
  });

  test("cliquer sur la ligne déjà active ne fait rien", async ({ page }) => {
    await pressKeys(page, ["4", "2"]);
    await rowByCode(page, "eur").click(); // déjà active
    await expect(amountOf(page, "eur")).toHaveText("42");
    await expect(page).toHaveURL(/#eur,usd,gbp$/);
  });

  test("affiche la date de mise à jour renvoyée par l'API mockée", async ({ page }) => {
    await expect(page.locator("#updated")).toContainText(MOCK_DATE);
  });
});
