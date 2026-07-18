"use strict";

/** Ligne de devise (#rows .row) correspondant à un code (ex: "eur"). */
function rowByCode(page, code) {
  return page.locator("#rows .row").filter({
    has: page.locator(".code", { hasText: new RegExp(`^${code.toUpperCase()}\\b`) }),
  });
}

function amountOf(page, code) {
  return rowByCode(page, code).locator(".amount");
}

function subOf(page, code) {
  return rowByCode(page, code).locator(".sub");
}

/** Clique un bouton du pavé numérique par sa valeur `data-k` (ex: "7", "+", "eq", "back", "C"). */
async function pressKey(page, dataK) {
  await page.locator(`#pad button[data-k="${dataK}"]`).click();
}

async function pressKeys(page, dataKs) {
  for (const k of dataKs) await pressKey(page, k);
}

module.exports = { rowByCode, amountOf, subOf, pressKey, pressKeys };
