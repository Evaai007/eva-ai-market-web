const { test, expect } = require("@playwright/test");

const publicPages = [
  "/",
  "/products.html",
  "/categories.html",
  "/cart.html",
  "/login.html",
  "/signup.html",
];

test.describe("EVA AI MARKET real Chromium QA", () => {
  test("public pages load without console errors or failed document requests", async ({ page }) => {
    const consoleErrors = [];
    const failedRequests = [];

    page.on("console", msg => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("requestfailed", req => {
      if (req.resourceType() === "document" || req.resourceType() === "script" || req.resourceType() === "stylesheet") {
        failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || "failed"}`);
      }
    });

    for (const path of publicPages) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await page.screenshot({ path: `test-results/public-${path === "/" ? "home" : path.slice(1).replaceAll("/", "-")}.png`, fullPage: true });
    }

    expect(consoleErrors, "Unexpected browser console errors").toEqual([]);
    expect(failedRequests, "Failed critical resources").toEqual([]);
  });

  test("public API endpoints respond", async ({ request }) => {
    const store = await request.get("/api/store");
    expect(store.status(), "GET /api/store").toBeLessThan(500);

    const config = await request.get("/api/config");
    expect(config.status(), "GET /api/config").toBeLessThan(500);
  });

  test("customer auth flow and dashboard are testable when QA credentials are configured", async ({ page }) => {
    test.skip(!process.env.EVA_QA_EMAIL || !process.env.EVA_QA_PASSWORD, "Set EVA_QA_EMAIL/EVA_QA_PASSWORD GitHub secrets for authenticated A-Z flow.");

    await page.goto("/login.html", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill(process.env.EVA_QA_EMAIL);
    await page.locator('input[type="password"]').fill(process.env.EVA_QA_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/dashboard|profile|index|home/);
    await page.screenshot({ path: "test-results/customer-after-login.png", fullPage: true });

    for (const path of ["/dashboard.html", "/orders.html", "/deposit.html", "/cart.html"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await page.screenshot({ path: `test-results/customer-${path.slice(1)}.png`, fullPage: true });
    }
  });
});
