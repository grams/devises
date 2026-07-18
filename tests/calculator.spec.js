const { test, expect } = require("@playwright/test");
const { mockCurrencyApi } = require("./utils/api-mock");
const { amountOf, pressKey, pressKeys } = require("./utils/dom");
const { prettyExpr } = require("./utils/format");

test.describe("Calculatrice", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrencyApi(page);
    await page.goto("/"); // base par défaut : EUR
  });

  test("la saisie de chiffres met à jour l'affichage de la base", async ({ page }) => {
    await pressKeys(page, ["1", "2", "3"]);
    await expect(amountOf(page, "eur")).toHaveText("123");
  });

  test("calcule une addition avec la touche =", async ({ page }) => {
    await pressKeys(page, ["1", "2", "+", "8", "eq"]);
    await expect(amountOf(page, "eur")).toHaveText("20");
  });

  test("calcule une division avec la touche =", async ({ page }) => {
    await pressKeys(page, ["9", "0", "/", "3", "eq"]);
    await expect(amountOf(page, "eur")).toHaveText("30");
  });

  test("une division par zéro ne plante pas et retombe sur 0", async ({ page }) => {
    await pressKeys(page, ["5", "/", "0", "eq"]);
    await expect(amountOf(page, "eur")).toHaveText("0");
  });

  test("affiche les opérateurs avec leur symbole mathématique avant validation", async ({ page }) => {
    await pressKeys(page, ["1", "2", "*", "8"]);
    await expect(amountOf(page, "eur")).toHaveText("12×8");
  });

  test("un opérateur consécutif remplace le précédent au lieu de s'accumuler", async ({ page }) => {
    await pressKeys(page, ["5", "+", "*"]);
    await expect(amountOf(page, "eur")).toHaveText("5×");
  });

  test("un opérateur ne peut pas démarrer une expression, sauf le signe moins", async ({ page }) => {
    await pressKey(page, "+");
    await expect(amountOf(page, "eur")).toHaveText("0");

    await pressKey(page, "*");
    await expect(amountOf(page, "eur")).toHaveText("0");

    await pressKey(page, "-");
    await expect(amountOf(page, "eur")).toHaveText("−");

    await pressKey(page, "5");
    await expect(amountOf(page, "eur")).toHaveText("−5");
  });

  test("effacer un caractère avec ⌫", async ({ page }) => {
    await pressKeys(page, ["1", "2", "3"]);
    await pressKey(page, "back");
    await expect(amountOf(page, "eur")).toHaveText("12");
  });

  test("tout effacer avec C", async ({ page }) => {
    await pressKeys(page, ["1", "2", "3", "+", "4"]);
    await pressKey(page, "C");
    await expect(amountOf(page, "eur")).toHaveText("0");
  });

  test("la touche virgule insère un séparateur décimal affiché avec une virgule", async ({ page }) => {
    await pressKeys(page, ["1", ".", "5"]);
    await expect(amountOf(page, "eur")).toHaveText("1,5");
  });

  test("un seul séparateur décimal est autorisé par nombre", async ({ page }) => {
    await pressKeys(page, ["1", ".", ".", "5"]);
    await expect(amountOf(page, "eur")).toHaveText("1,5");
  });

  test("presser la virgule sur une expression vide préfixe un 0", async ({ page }) => {
    await pressKeys(page, [".", "5"]);
    await expect(amountOf(page, "eur")).toHaveText("0,5");
  });

  test("le clavier physique fonctionne (chiffres, opérateurs, Enter, Backspace, Escape)", async ({ page }) => {
    await page.keyboard.press("7");
    await page.keyboard.press("+");
    await page.keyboard.press("8");
    await page.keyboard.press("Enter");
    await expect(amountOf(page, "eur")).toHaveText("15");

    await page.keyboard.press("Backspace");
    await expect(amountOf(page, "eur")).toHaveText("1");

    await page.keyboard.press("Escape");
    await expect(amountOf(page, "eur")).toHaveText("0");
  });

  test("le résultat d'un calcul reste éditable pour un calcul suivant", async ({ page }) => {
    await pressKeys(page, ["1", "0", "+", "5", "eq"]);
    await expect(amountOf(page, "eur")).toHaveText("15");
    await pressKeys(page, ["+", "5", "eq"]);
    await expect(amountOf(page, "eur")).toHaveText("20");
  });

  test("groupe les milliers dès la saisie, à la française", async ({ page }) => {
    await pressKeys(page, ["1", "2", "3", "4", "5"]);
    await expect(amountOf(page, "eur")).toHaveText(prettyExpr("12345"));
  });

  test("groupe les milliers d'un nombre avec décimale", async ({ page }) => {
    await pressKeys(page, ["1", "2", "3", "4", "5", ".", "6"]);
    await expect(amountOf(page, "eur")).toHaveText(prettyExpr("12345.6"));
  });

  test("groupe chaque opérande de part et d'autre d'un opérateur", async ({ page }) => {
    await pressKeys(page, ["1", "2", "3", "4", "5", "+", "6", "7", "8", "9"]);
    await expect(amountOf(page, "eur")).toHaveText(prettyExpr("12345+6789"));
  });

  test("la touche % divise le dernier nombre saisi par 100", async ({ page }) => {
    await pressKeys(page, ["5", "0", "%"]);
    await expect(amountOf(page, "eur")).toHaveText("0,5");
  });

  test("la touche % ne s'applique qu'au dernier opérande d'une expression", async ({ page }) => {
    await pressKeys(page, ["2", "0", "0", "+", "1", "0", "%"]);
    await expect(amountOf(page, "eur")).toHaveText("200+0,1");
  });

  test("la touche % est sans effet sur une expression vide ou un opérateur en attente", async ({ page }) => {
    await pressKey(page, "%");
    await expect(amountOf(page, "eur")).toHaveText("0");

    await pressKeys(page, ["5", "+"]);
    await pressKey(page, "%");
    await expect(amountOf(page, "eur")).toHaveText("5+");
  });

  test("la touche 000 ajoute trois zéros d'un coup", async ({ page }) => {
    await pressKeys(page, ["1", "000"]);
    await expect(amountOf(page, "eur")).toHaveText(prettyExpr("1000"));
  });

  test("la touche 000 sur une expression vide n'affiche pas de zéro superflu", async ({ page }) => {
    await pressKey(page, "000");
    await expect(amountOf(page, "eur")).toHaveText("0");
  });

  test("le clavier physique gère aussi la touche %", async ({ page }) => {
    await page.keyboard.press("5");
    await page.keyboard.press("0");
    await page.keyboard.press("%");
    await expect(amountOf(page, "eur")).toHaveText("0,5");
  });
});
