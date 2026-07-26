const { test, expect } = require("@playwright/test");
const { mockCurrencyApi } = require("./utils/api-mock");
const { rowByCode, activeRow, activeAmount, amountOf, pressKeys } = require("./utils/dom");
const { fmtBase } = require("./utils/format");
const { effRate } = require("./fixtures/currency-data");

// Le seuil d'inactivité de l'app (IDLE_MS dans index.html).
const IDLE_MS = 3 * 60 * 1000;

/** Rejoue un retour sur l'app (retour d'onglet / de fenêtre), sans changer
 * l'horloge : c'est à l'appelant d'avoir avancé le temps s'il veut simuler
 * une vraie absence. */
async function resume(page) {
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
}

test.describe("Ligne de saisie par défaut", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrencyApi(page);
  });

  test("à l'ouverture, la saisie se pose sur la première devise non principale", async ({ page }) => {
    await page.goto("/"); // #eur,usd,gbp
    await expect(rowByCode(page, "eur")).toHaveClass(/base/);
    await expect(rowByCode(page, "usd")).toHaveClass(/active/);
    await expect(rowByCode(page, "eur")).not.toHaveClass(/active/);
    await expect(activeRow(page)).toHaveCount(1);
  });

  test("c'est bien la 2e ligne de l'écran, quel que soit le hash", async ({ page }) => {
    await page.goto("/#usd,jpy,gbp");
    await expect(page.locator("#rows .row").nth(1)).toHaveClass(/active/);
    await expect(rowByCode(page, "jpy")).toHaveClass(/active/);
  });

  test("la saisie va bien sur cette ligne, pas sur la devise principale", async ({ page }) => {
    await page.goto("/");
    await pressKeys(page, ["2", "5"]);
    await expect(amountOf(page, "usd")).toHaveText("25");
    // eur devient une conversion : frais inclus (c'est la devise principale)
    // et arrondie au centime supérieur.
    await expect(amountOf(page, "eur")).toHaveText(fmtBase(25 * effRate("eur", "usd", "eur")));
  });

  test("une liste réduite à la seule devise principale garde la saisie sur elle", async ({ page }) => {
    await page.goto("/#eur");
    await expect(rowByCode(page, "eur")).toHaveClass(/active/);
    await pressKeys(page, ["7"]);
    await expect(activeAmount(page)).toHaveText("7");
  });

  test("changer de hash repose la saisie sur la 2e ligne", async ({ page }) => {
    await page.goto("/");
    await rowByCode(page, "gbp").click();
    await expect(rowByCode(page, "gbp")).toHaveClass(/active/);

    await page.evaluate(() => { location.hash = "#eur,jpy,chf"; });
    await expect(rowByCode(page, "jpy")).toHaveClass(/active/);
  });
});

test.describe("Reprise après une longue absence", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await mockCurrencyApi(page);
  });

  test("après plus de 3 minutes sans action, revenir repose la saisie sur la 2e ligne", async ({ page }) => {
    await page.goto("/");
    await rowByCode(page, "gbp").click();
    await pressKeys(page, ["4", "2"]);
    await expect(rowByCode(page, "gbp")).toHaveClass(/active/);

    await page.clock.fastForward(IDLE_MS + 1000);
    await resume(page);

    await expect(rowByCode(page, "usd")).toHaveClass(/active/);
  });

  test("la reprise réarme le remplacement : le premier chiffre écrase le montant reconverti", async ({ page }) => {
    await page.goto("/");
    await pressKeys(page, ["4", "2"]); // saisie sur usd (2e ligne)
    await expect(activeAmount(page)).toHaveText("42");

    await page.clock.fastForward(IDLE_MS + 1000);
    await resume(page);

    // Même ligne qu'avant : le montant reste affiché, mais la saisie repart de zéro.
    await expect(rowByCode(page, "usd")).toHaveClass(/active/);
    await expect(activeAmount(page)).toHaveText("42");
    await pressKeys(page, ["9"]);
    await expect(activeAmount(page)).toHaveText("9");
  });

  test("un aller-retour rapide ne touche à rien (ni ligne, ni calcul en cours)", async ({ page }) => {
    await page.goto("/");
    await rowByCode(page, "gbp").click();
    await pressKeys(page, ["1", "2", "+", "3"]);

    await page.clock.fastForward(60 * 1000); // bien en deçà des 3 minutes
    await resume(page);

    await expect(rowByCode(page, "gbp")).toHaveClass(/active/);
    await expect(activeAmount(page)).toHaveText("12+3");
  });

  test("le compteur d'inactivité repart à chaque action de l'utilisateur", async ({ page }) => {
    await page.goto("/");
    await rowByCode(page, "gbp").click();

    // Deux minutes, une frappe, deux minutes : plus de 3 min au total mais
    // jamais 3 min d'affilée sans rien faire.
    await page.clock.fastForward(2 * 60 * 1000);
    await pressKeys(page, ["8"]);
    await page.clock.fastForward(2 * 60 * 1000);
    await resume(page);

    await expect(rowByCode(page, "gbp")).toHaveClass(/active/);
    await expect(activeAmount(page)).toHaveText("8");
  });
});
