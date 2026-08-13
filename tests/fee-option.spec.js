const { test, expect } = require("@playwright/test");
const { mockCurrencyApi } = require("./utils/api-mock");
const { rowByCode, amountOf, subOf, pressKeys } = require("./utils/dom");
const { fmt } = require("./utils/format");
const { DEFAULT_FEE_PCT, crossRates, effRate, feeLabel } = require("./fixtures/currency-data");

/** Règle le taux de frais depuis le panneau « Gérer » et referme. */
async function setFee(page, value) {
  await page.locator("#manageBtn").click();
  await page.locator("#feeInput").fill(String(value));
  await page.locator("#doneBtn").click();
}

test.describe("Taux de frais configurable", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrencyApi(page);
  });

  test("le panneau affiche le taux courant, 2 % par défaut", async ({ page }) => {
    await page.goto("/");
    await page.locator("#manageBtn").click();
    await expect(page.locator("#feeInput")).toHaveValue(String(DEFAULT_FEE_PCT));
  });

  test("changer le taux met les conversions à jour en direct, panneau encore ouvert", async ({ page }) => {
    await page.goto("/");
    await rowByCode(page, "eur").click(); // saisie depuis la base
    await pressKeys(page, ["1", "0", "0"]);

    await page.locator("#manageBtn").click();
    await page.locator("#feeInput").fill("10");

    const raw = crossRates("eur").usd;
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * raw * 0.9));
    await expect(subOf(page, "usd")).toContainText(`· frais ${feeLabel(10)}`);
  });

  test("un taux non standard part dans le hash, pour voyager avec le bookmark", async ({ page }) => {
    await page.goto("/");
    await setFee(page, 3.5);
    await expect(page).toHaveURL(/#eur,usd,gbp,3\.5%$/);
  });

  test("le taux par défaut n'encombre pas le hash", async ({ page }) => {
    await page.goto("/");
    await setFee(page, 5);
    await expect(page).toHaveURL(/#eur,usd,gbp,5%$/);

    await setFee(page, DEFAULT_FEE_PCT);
    await expect(page).toHaveURL(/#eur,usd,gbp$/);
  });

  test("un hash porteur d'un taux l'applique au chargement", async ({ page }) => {
    await page.goto("/#eur,usd,gbp,5%");
    await rowByCode(page, "eur").click();
    await pressKeys(page, ["1", "0", "0"]);

    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * effRate("eur", "eur", "usd", 5)));
    await expect(subOf(page, "usd")).toContainText(`· frais ${feeLabel(5)}`);

    await page.locator("#manageBtn").click();
    await expect(page.locator("#feeInput")).toHaveValue("5");
  });

  test("le jeton de frais est reconnu où qu'il soit dans le hash", async ({ page }) => {
    await page.goto("/#eur,4%,usd,gbp");
    await expect(page.locator("#rows .row")).toHaveCount(3); // le jeton n'est pas pris pour une devise
    await expect(page.locator("#rows .row .code")).toHaveText([/^EUR/, /^USD/, /^GBP/]);
    await page.locator("#manageBtn").click();
    await expect(page.locator("#feeInput")).toHaveValue("4");
  });

  test("0 % rend les taux bruts et retire la mention des frais", async ({ page }) => {
    await page.goto("/#eur,usd,gbp,0%");
    await rowByCode(page, "eur").click();
    await pressKeys(page, ["1", "0", "0"]);

    const raw = crossRates("eur").usd;
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * raw));
    await expect(subOf(page, "usd")).toHaveText(`1 EUR = ${fmt(raw)}`);
    await expect(subOf(page, "usd")).not.toContainText("frais");
  });

  test("le taux est borné à 0-100 %", async ({ page }) => {
    await page.goto("/");
    await setFee(page, 250);
    await expect(page).toHaveURL(/#eur,usd,gbp,100%$/);

    await setFee(page, -5);
    await expect(page).toHaveURL(/#eur,usd,gbp,0%$/);
  });

  test("un champ vidé retombe sur le taux par défaut", async ({ page }) => {
    await page.goto("/#eur,usd,gbp,7%");
    await page.locator("#manageBtn").click();
    await page.locator("#feeInput").fill("");
    await page.locator("#doneBtn").click();

    await expect(page.locator("#feeInput")).toHaveValue(String(DEFAULT_FEE_PCT));
    await expect(page).toHaveURL(/#eur,usd,gbp$/);
  });

  test("un lancement sans hash (icône PWA) retrouve le dernier taux réglé", async ({ page }) => {
    await page.goto("/#eur,usd,gbp,4%");
    await expect(page).toHaveURL(/#eur,usd,gbp,4%$/);

    await page.goto("/"); // start_url fixe de l'icône installée
    await expect(page).toHaveURL(/#eur,usd,gbp,4%$/);
    await rowByCode(page, "eur").click();
    await pressKeys(page, ["1", "0", "0"]);
    await expect(amountOf(page, "usd")).toHaveText(fmt(100 * effRate("eur", "eur", "usd", 4)));
  });

  test("un hash explicite sans jeton de frais vaut « taux par défaut », pas « dernier réglage »", async ({ page }) => {
    await page.goto("/#eur,usd,gbp,9%");
    await expect(page).toHaveURL(/#eur,usd,gbp,9%$/);

    // Un bookmark doit être autosuffisant : celui-ci dit 2 % en ne disant rien.
    await page.goto("/#eur,usd,gbp");
    await expect(page).toHaveURL(/#eur,usd,gbp$/);
    await page.locator("#manageBtn").click();
    await expect(page.locator("#feeInput")).toHaveValue(String(DEFAULT_FEE_PCT));
  });
});
