const { test, expect } = require("@playwright/test");
const { mockCurrencyApi } = require("./utils/api-mock");
const { rowByCode, amountOf, subOf, pressKeys, pressKey } = require("./utils/dom");
const { fmt, fmtBase, prettyExpr } = require("./utils/format");
const { MOCK_DATE, crossRates } = require("./fixtures/currency-data");

test.describe("Conversion entre devises", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrencyApi(page);
    await page.goto("/"); // eur (base + focus de saisie), usd, gbp
  });

  test("un simple nombre convertit les autres lignes en temps réel, sans =", async ({ page }) => {
    const eurRates = crossRates("eur");
    await pressKeys(page, ["1", "0"]);
    await expect(amountOf(page, "usd")).toHaveText(fmt(10 * eurRates.usd));
    await expect(amountOf(page, "gbp")).toHaveText(fmt(10 * eurRates.gbp));

    await pressKeys(page, ["0"]);
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * eurRates.usd));
    await expect(amountOf(page, "gbp")).toHaveText(fmt(100 * eurRates.gbp));
  });

  test("dès qu'une opération est entamée (+ - * /), les autres lignes se figent jusqu'à =", async ({ page }) => {
    const eurUsd = crossRates("eur").usd;
    await pressKeys(page, ["1", "0", "0"]);
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * eurUsd)); // live

    await pressKeys(page, ["+", "5", "0"]);
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * eurUsd)); // figé sur la valeur d'avant l'opérateur

    await pressKey(page, "eq");
    await expect(amountOf(page, "usd")).toHaveText(fmt(150 * eurUsd));
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

  test("un nombre négatif (signe -) convertit aussi en temps réel", async ({ page }) => {
    const eurUsd = crossRates("eur").usd;
    await pressKeys(page, ["-", "5"]);
    await expect(amountOf(page, "usd")).toHaveText(fmt(-5 * eurUsd));
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

  test("un micro-montant (ex. 1 VND en EUR) affiche des décimales significatives au lieu de 0", async ({ page }) => {
    // base = usd, pour que la devise ciblée (eur) ne soit pas la devise principale
    // et ne subisse donc pas son plafond à 2 décimales (voir tests fmtBase plus bas).
    await page.goto("/#usd,vnd,eur");
    const vndEur = crossRates("usd").eur / crossRates("usd").vnd; // très petit : eur est ~26000x plus fort que vnd
    await rowByCode(page, "vnd").click(); // focus -> vnd, sans montant saisi
    await pressKeys(page, ["1"]);
    await expect(amountOf(page, "eur")).toHaveText(fmt(vndEur));
    await expect(amountOf(page, "eur")).not.toHaveText("0");
  });

  test("le premier chiffre juste après un changement de ligne active remplace le montant reconverti", async ({ page }) => {
    await pressKeys(page, ["1", "0", "0"]);
    const eurUsd = crossRates("eur").usd;
    const converted = Math.round(100 * eurUsd * 1e6) / 1e6;

    await rowByCode(page, "usd").click();
    await expect(amountOf(page, "usd")).toHaveText(prettyExpr(String(converted)));

    await pressKeys(page, ["5"]);
    // Comme dans un champ resaisi : le premier chiffre remplace, il ne s'accole pas.
    await expect(amountOf(page, "usd")).toHaveText("5");
  });

  test("après le premier chiffre, les chiffres suivants s'accolent normalement", async ({ page }) => {
    await pressKeys(page, ["1", "0", "0"]);
    await rowByCode(page, "usd").click();
    await pressKeys(page, ["5"]);
    await pressKeys(page, ["3"]);
    await expect(amountOf(page, "usd")).toHaveText("53");
  });

  test("revenir sur une ligne déjà visitée réarme le remplacement au prochain chiffre", async ({ page }) => {
    await pressKeys(page, ["8", "8"]);
    await rowByCode(page, "usd").click();
    await rowByCode(page, "eur").click(); // retour sur eur : le focus est de nouveau "frais"

    await pressKeys(page, ["9"]);
    await expect(amountOf(page, "eur")).toHaveText("9");

    await pressKeys(page, ["5"]);
    await expect(amountOf(page, "eur")).toHaveText("95");
  });

  test("un opérateur juste après un changement de ligne active continue depuis le montant reconverti (ne l'efface pas)", async ({ page }) => {
    await pressKeys(page, ["8", "8"]);
    await rowByCode(page, "usd").click();
    await rowByCode(page, "eur").click();

    await pressKeys(page, ["+"]);
    await expect(amountOf(page, "eur")).not.toHaveText("0");
    await expect(amountOf(page, "eur")).toContainText("+");
  });

  test("la devise principale arrondit toujours au centime supérieur, jamais plus de 2 décimales", async ({ page }) => {
    const gbpEur = 1 / crossRates("eur").gbp;
    await rowByCode(page, "gbp").click();
    await pressKeys(page, ["7"]); // 7 GBP -> ~8,1519 EUR : l'arrondi classique donnerait 8,15
    const expected = fmtBase(7 * gbpEur);
    expect(expected).toBe("8,16"); // vérifie qu'on teste bien un cas où l'arrondi supérieur diffère de l'arrondi classique
    await expect(amountOf(page, "eur")).toHaveText(expected);
  });

  test("la devise principale plafonne à 2 décimales même pour un montant < 1", async ({ page }) => {
    const gbpEur = 1 / crossRates("eur").gbp;
    await rowByCode(page, "gbp").click();
    await pressKeys(page, [".", "5"]); // 0,5 GBP -> ~0,5823 EUR, fmt() normal irait à 3 décimales
    await expect(amountOf(page, "eur")).toHaveText(fmtBase(0.5 * gbpEur));
    await expect(amountOf(page, "eur")).toHaveText("0,59");
  });
});
