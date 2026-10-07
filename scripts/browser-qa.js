const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");

const baseURL = process.env.BASE_URL;
const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CF_API_TOKEN;

if (!baseURL) throw new Error("BASE_URL is required");
if (!accountId || !apiToken) throw new Error("CF_ACCOUNT_ID and CF_API_TOKEN are required");

const ws = `wss://api.cloudflare.com/client/v4/accounts/${accountId}/browser-run/devtools/browser?keep_alive=600000`;

async function main() {
  const browser = await chromium.connectOverCDP(ws, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();

  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("requestfailed", req => {
    if (["document", "script", "stylesheet", "xhr", "fetch"].includes(req.resourceType())) {
      failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || "failed"}`);
    }
  });

  const pages = ["/", "/products.html", "/categories.html", "/cart.html", "/login.html", "/signup.html"];
  const results = [];

  for (const path of pages) {
    const url = new URL(path, baseURL).href;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    assert.ok(response, `No response for ${url}`);
    assert.ok(response.status() < 500, `${url} returned HTTP ${response.status()}`);
    await page.locator("body").waitFor({ state: "visible", timeout: 10000 });
    await page.screenshot({ path: `test-results/${path === "/" ? "home" : path.slice(1).replaceAll("/", "-")}.png`, fullPage: true });
    results.push({ path, status: response.status(), title: await page.title() });
  }

  for (const path of ["/api/store", "/api/config"]) {
    const response = await page.request.get(new URL(path, baseURL).href);
    assert.ok(response.status() < 500, `${path} returned HTTP ${response.status()}`);
    results.push({ path, status: response.status() });
  }

  // Authenticated customer flow is enabled only when dedicated QA credentials exist.
  if (process.env.EVA_QA_EMAIL && process.env.EVA_QA_PASSWORD) {
    await page.goto(new URL("/login.html", baseURL).href, { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill(process.env.EVA_QA_EMAIL);
    await page.locator('input[type="password"]').fill(process.env.EVA_QA_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/customer-after-login.png", fullPage: true });

    for (const path of ["/dashboard.html", "/orders.html", "/deposit.html", "/cart.html"]) {
      await page.goto(new URL(path, baseURL).href, { waitUntil: "domcontentloaded" });
      await page.locator("body").waitFor({ state: "visible", timeout: 10000 });
      await page.screenshot({ path: `test-results/customer-${path.slice(1)}.png`, fullPage: true });
    }
  }

  console.log(JSON.stringify({
    baseURL,
    pages: results,
    consoleErrors,
    failedRequests,
    authenticatedFlow: Boolean(process.env.EVA_QA_EMAIL && process.env.EVA_QA_PASSWORD),
  }, null, 2));

  // Fail the gate on real browser errors, but do not turn an optional missing QA account into a failure.
  assert.deepEqual(consoleErrors, [], "Browser console errors detected");
  assert.deepEqual(failedRequests, [], "Critical network failures detected");

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
