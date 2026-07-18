const { test, expect } = require("@playwright/test");
const { mockCurrencyApi } = require("./utils/api-mock");
const { rowByCode, amountOf } = require("./utils/dom");
const { MOCK_DATE } = require("./fixtures/currency-data");

test.describe("Chargement général de l'app", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrencyApi(page);
  });

  test("affiche le titre et la marque de l'app", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Devises");
    await expect(page.locator(".brand")).toHaveText("Devises");
  });

  test("affiche les 3 devises par défaut avec EUR en base, à 0", async ({ page }) => {
    await page.goto("/");
    const rows = page.locator("#rows .row");
    await expect(rows).toHaveCount(3);

    await expect(rowByCode(page, "eur")).toHaveClass(/base/);
    await expect(rowByCode(page, "eur")).toHaveClass(/active/); // focus de saisie par défaut = base
    await expect(amountOf(page, "eur")).toHaveText("0");
    await expect(rowByCode(page, "eur").locator(".tag")).toHaveText("BASE");

    await expect(rows.nth(1).locator(".code")).toContainText("USD");
    await expect(rows.nth(2).locator(".code")).toContainText("GBP");
  });

  test("affiche le nom complet de chaque devise", async ({ page }) => {
    await page.goto("/");
    await expect(rowByCode(page, "eur").locator(".name")).toHaveText("Euro");
    await expect(rowByCode(page, "usd").locator(".name")).toHaveText("US Dollar");
  });

  test("affiche une image de drapeau (et non un émoji texte) pour les devises connues", async ({ page }) => {
    await page.goto("/");
    const img = rowByCode(page, "eur").locator(".flag img");
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute("src", "https://flagcdn.com/eu.svg");
  });

  test("expose le nouveau layout de clavier (AC, ⌫, %, 000...)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('#pad button[data-k="C"]')).toHaveText("AC");
    await expect(page.locator('#pad button[data-k="back"]')).toHaveText("⌫");
    await expect(page.locator('#pad button[data-k="%"]')).toHaveText("%");
    await expect(page.locator('#pad button[data-k="/"]')).toHaveText("÷");
    await expect(page.locator('#pad button[data-k="000"]')).toHaveText("000");
    await expect(page.locator('#pad button[data-k="eq"]')).toHaveText("=");
    await expect(page.locator("#pad button")).toHaveCount(20);
  });

  test("affiche un badge textuel pour une devise sans correspondance de drapeau", async ({ page }) => {
    // "xau" (or, once par once) n'a pas d'entrée dans la table ISO -> pays/drapeau,
    // l'app doit alors replier sur un badge avec les 2 premières lettres du code.
    await page.goto("/#eur,xau");
    const xauRow = rowByCode(page, "xau");
    await expect(xauRow.locator(".badge")).toHaveText("XA");
    await expect(xauRow.locator(".flag")).toHaveCount(0);
  });

  test("affiche la date de mise à jour renvoyée par l'API", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#updated")).toContainText(MOCK_DATE);
    await expect(page.locator("#updated")).not.toContainText("hors-ligne");
  });
});
