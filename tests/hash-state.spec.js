const { test, expect } = require("@playwright/test");
const { mockCurrencyApi } = require("./utils/api-mock");
const { rowByCode, pressKeys } = require("./utils/dom");

test.describe("État persistant dans le hash de l'URL", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrencyApi(page);
  });

  test("charge la configuration et l'ordre des devises depuis le hash au démarrage", async ({ page }) => {
    await page.goto("/#usd,eur,jpy");

    const rows = page.locator("#rows .row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toHaveClass(/base/);
    await expect(rows.nth(0).locator(".code")).toContainText("USD");
    await expect(rows.nth(1).locator(".code")).toContainText("EUR");
    await expect(rows.nth(2).locator(".code")).toContainText("JPY");
  });

  test("dédoublonne les devises répétées dans le hash", async ({ page }) => {
    await page.goto("/#eur,eur,usd");
    await expect(page.locator("#rows .row")).toHaveCount(2);
  });

  test("le hash est insensible à la casse et aux espaces superflus", async ({ page }) => {
    await page.goto("/#%20EUR%20,%20USD%20");
    await expect(rowByCode(page, "eur")).toHaveClass(/base/);
    await expect(page.locator("#rows .row")).toHaveCount(2);
  });

  test("accepte le + comme séparateur en plus de la virgule", async ({ page }) => {
    await page.goto("/#eur+usd+gbp");
    await expect(page.locator("#rows .row")).toHaveCount(3);
  });

  test("cliquer sur une ligne pour y saisir ne modifie pas le hash (seul « Gérer » change la base)", async ({ page }) => {
    await page.goto("/"); // #eur,usd,gbp
    await rowByCode(page, "usd").click();
    await expect(page).toHaveURL(/#eur,usd,gbp$/);
  });

  test("la saisie au clavier ne modifie pas le hash", async ({ page }) => {
    await page.goto("/#gbp,jpy");
    await pressKeys(page, ["1", "2", "3"]);
    await expect(page).toHaveURL(/#gbp,jpy$/);
  });

  test("un hash sans devise reconnue conserve la configuration par défaut", async ({ page }) => {
    await page.goto("/#"); // hash vide, rien en localStorage -> parseHash ne change rien
    await expect(page.locator("#rows .row")).toHaveCount(3);
    await expect(rowByCode(page, "eur")).toHaveClass(/base/);
  });

  test("un lancement sans hash (icône PWA installée) retombe sur la dernière sélection connue", async ({ page }) => {
    await page.goto("/#usd,jpy,gbp");
    await expect(page.locator("#rows .row")).toHaveCount(3);

    await page.goto("/"); // simule le start_url fixe (sans hash) de l'icône installée
    await expect(page.locator("#rows .row")).toHaveCount(3);
    await expect(rowByCode(page, "usd")).toHaveClass(/base/);
    await expect(page).toHaveURL(/#usd,jpy,gbp$/);
  });
});
