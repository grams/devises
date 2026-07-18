const { test, expect } = require("@playwright/test");
const { mockCurrencyApi } = require("./utils/api-mock");
const { rowByCode } = require("./utils/dom");

test.describe("Panneau « Gérer les devises »", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrencyApi(page);
    await page.goto("/"); // eur (base), usd, gbp
  });

  test("s'ouvre via le bouton dédié et se ferme via « Terminé »", async ({ page }) => {
    await expect(page.locator("#sheet")).not.toHaveClass(/open/);

    await page.locator("#manageBtn").click();
    await expect(page.locator("#sheet")).toHaveClass(/open/);
    await expect(page.locator("#sheetBg")).toHaveClass(/open/);

    await page.locator("#doneBtn").click();
    await expect(page.locator("#sheet")).not.toHaveClass(/open/);
    await expect(page.locator("#sheetBg")).not.toHaveClass(/open/);
  });

  test("se ferme au clic sur l'arrière-plan", async ({ page }) => {
    await page.locator("#manageBtn").click();
    await page.locator("#sheetBg").click({ position: { x: 5, y: 5 } });
    await expect(page.locator("#sheet")).not.toHaveClass(/open/);
  });

  test("liste les devises actuelles, la base étant marquée et non modifiable", async ({ page }) => {
    await page.locator("#manageBtn").click();

    const pills = page.locator("#picked .pill");
    await expect(pills).toHaveCount(3);

    const basePill = pills.filter({ hasText: "EUR" });
    await expect(basePill.locator(".isbase")).toHaveText("BASE");
    await expect(basePill.locator("button.setbase")).toHaveCount(0);
    await expect(basePill.locator("button.rm")).toHaveCount(0);

    const otherPill = pills.filter({ hasText: "USD" });
    await expect(otherPill.locator("button.setbase")).toHaveCount(1);
    await expect(otherPill.locator("button.rm")).toHaveCount(1);
  });

  test("recherche une devise par code ou par nom", async ({ page }) => {
    await page.locator("#manageBtn").click();

    await page.locator("#search").fill("yen");
    await expect(page.locator("#results .result")).toHaveCount(1);
    await expect(page.locator("#results .result .rc")).toHaveText("JPY");

    await page.locator("#search").fill("chf");
    await expect(page.locator("#results .result")).toHaveCount(1);
    await expect(page.locator("#results .result .rc")).toHaveText("CHF");
  });

  test("affiche un message quand la recherche ne trouve rien", async ({ page }) => {
    await page.locator("#manageBtn").click();
    await page.locator("#search").fill("zzzzz-inexistant");
    await expect(page.locator("#results")).toContainText("Aucune devise trouvée");
  });

  test("une devise déjà ajoutée n'apparaît plus dans les résultats de recherche", async ({ page }) => {
    await page.locator("#manageBtn").click();
    await page.locator("#search").fill("euro");
    await expect(page.locator("#results")).toContainText("Aucune devise trouvée");
  });

  test("ajoute une devise depuis les résultats de recherche", async ({ page }) => {
    await page.locator("#manageBtn").click();
    await page.locator("#search").fill("jpy");
    await page.locator("#results .result").first().click();

    await expect(page.locator("#picked .pill")).toHaveCount(4);
    await expect(page.locator("#picked")).toContainText("JPY");
    await expect(page.locator("#search")).toHaveValue("");

    await page.locator("#doneBtn").click();
    await expect(rowByCode(page, "jpy")).toBeVisible();
  });

  test("retire une devise existante", async ({ page }) => {
    await page.locator("#manageBtn").click();
    await page.locator("#picked .pill").filter({ hasText: "GBP" }).locator("button.rm").click();

    await expect(page.locator("#picked .pill")).toHaveCount(2);
    await expect(page.locator("#picked")).not.toContainText("GBP");

    await page.locator("#doneBtn").click();
    await expect(rowByCode(page, "gbp")).toHaveCount(0);
    await expect(page.locator("#rows .row")).toHaveCount(2);
  });

  test("change la devise de base depuis le panneau", async ({ page }) => {
    await page.locator("#manageBtn").click();
    const usdPill = page.locator("#picked .pill").filter({ hasText: "USD" });
    await usdPill.locator("button.setbase").click();
    await expect(usdPill.locator(".isbase")).toHaveText("BASE");

    await page.locator("#doneBtn").click();
    await expect(rowByCode(page, "usd")).toHaveClass(/base/);
    await expect(page).toHaveURL(/#usd,eur,gbp$/);
  });
});
