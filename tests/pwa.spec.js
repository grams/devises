const { test, expect } = require("@playwright/test");
const { mockCurrencyApi } = require("./utils/api-mock");

test.describe("PWA (manifest, meta tags, service worker)", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrencyApi(page);
  });

  test("expose un manifest valide, cohérent et dont les icônes sont accessibles", async ({ page, request, baseURL }) => {
    await page.goto("/");

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toBe("manifest.json");

    const res = await request.get(new URL(manifestHref, baseURL).toString());
    expect(res.ok()).toBeTruthy();

    const manifest = await res.json();
    expect(manifest.name).toBe("Devises");
    expect(manifest.short_name).toBe("Devises");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe(".");
    expect(manifest.scope).toBe(".");
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    for (const icon of manifest.icons) {
      const iconRes = await request.get(new URL(icon.src, baseURL).toString());
      expect(iconRes.ok(), `icône introuvable: ${icon.src}`).toBeTruthy();
    }
  });

  test("déclare les meta tags essentiels à l'installation PWA", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Devises");
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /width=device-width/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0F1A1E");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "icons/icon-192.png");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("enregistre un service worker qui prend le contrôle de la page", async ({ page }) => {
    await page.goto("/");

    const scriptURL = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.active && reg.active.scriptURL;
    });
    expect(scriptURL).toContain("sw.js");
  });

  test("le service worker met en cache l'app shell pour un usage hors-ligne", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);

    const cachedUrls = await page.evaluate(async () => {
      const keys = await caches.keys();
      const urls = [];
      for (const key of keys) {
        const cache = await caches.open(key);
        const reqs = await cache.keys();
        urls.push(...reqs.map((r) => r.url));
      }
      return urls;
    });

    expect(cachedUrls.some((u) => u.endsWith("/index.html"))).toBeTruthy();
    expect(cachedUrls.some((u) => u.endsWith("manifest.json"))).toBeTruthy();
    expect(cachedUrls.some((u) => u.endsWith("icon-192.png"))).toBeTruthy();
  });
});
