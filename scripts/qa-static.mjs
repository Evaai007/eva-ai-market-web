import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
    console.log("PASS", name);
  } catch (error) {
    checks.push({ name, ok: false, error: error.message });
    console.error("FAIL", name, "-", error.message);
  }
}

const pages = [
  "index.html", "products.html", "product.html", "categories.html",
  "login.html", "signup.html", "dashboard.html", "orders.html",
  "profile.html", "checkout.html", "cart.html", "deposit.html",
  "deposit-history.html", "favorites.html", "forgot-password.html",
  "my-products.html", "notifications.html", "order-success.html",
  "reset-password.html", "support.html", "api-docs.html", "api-keys.html",
  "admin.html", "eva-ops-93k7m2.html"
];

check("All expected mobile/customer/admin page files exist", () => {
  const missing = pages.filter((file) => !exists(file));
  assert.deepEqual(missing, [], "Missing: " + missing.join(", "));
});

check("Each page has a valid basic HTML shell and one shared design stylesheet", () => {
  for (const file of pages) {
    const html = read(file);
    assert.match(html, /<html\b/i, file + ": missing <html>");
    assert.match(html, /<\/head\s*>/i, file + ": missing </head>");
    assert.match(html, /<\/body\s*>/i, file + ": missing </body>");
    const links = html.match(/href=["']\/eva-chinese-market\.css\?v=20261013-cn\d+["']/g) || [];
    assert.equal(links.length, 1, file + ": expected one shared design stylesheet link, got " + links.length);
  }
});

check("Shared stylesheet has balanced blocks and mobile/tablet/desktop breakpoints", () => {
  const css = read("eva-chinese-market.css");
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, "unbalanced CSS braces");
  assert.match(css, /@media\s*\(max-width:\s*430px\)/i, "missing mobile breakpoint");
  assert.match(css, /@media\s*\(min-width:\s*768px\)/i, "missing desktop/tablet breakpoint");
  assert.match(css, /@media\s*\(min-width:\s*1024px\)/i, "missing wide desktop breakpoint");
  assert.match(css, /env\(safe-area-inset-bottom\)/i, "missing mobile safe-area support");
});

check("Inline JavaScript blocks parse without syntax errors", () => {
  const errors = [];
  for (const file of pages) {
    const html = read(file);
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = match[1] || "";
      const source = match[2] || "";
      if (/\bsrc\s*=/i.test(attrs) || !source.trim()) continue;
      const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      if (type && type !== "text/javascript" && type !== "application/javascript") continue;
      try {
        new vm.Script(source, { filename: file });
      } catch (error) {
        errors.push(file + ": " + error.message);
      }
    }
  }
  assert.deepEqual(errors, [], errors.join("\n"));
});

check("Existing Worker and product/config APIs remain wired", () => {
  const worker = read("worker.js");
  assert.match(worker, /["']\/api\/store["']/);
  assert.match(worker, /["']\/api\/config["']/);
  assert.match(worker, /["']\/api\/health["']/);
  assert.match(worker, /["']\/api\/keys\/create["']/);
  assert.match(worker, /["']\/api\/keys\/reset["']/);
  const store = read("api/store.js");
  assert.match(store, /purchase_store_product/);
  assert.match(store, /sanitizeStoreProduct/);
});

check("API Key page uses an authenticated existing endpoint", () => {
  const page = read("api-keys.html");
  const handler = read("api/keys/create.js");
  assert.match(page, /\/api\/config/);
  assert.match(page, /\/api\/keys\/create/);
  assert.equal(page.includes("'authorization':'Bearer '+session.access_token"), true);
  assert.match(read("worker.js"), /keysCreate/);
  assert.match(handler, /requireUser/);
  assert.match(handler, /issue_customer_api_key/);
  assert.match(handler, /warning:.*will not be shown again/i);
});

check("Customer profile links to API key management", () => {
  assert.match(read("profile.html"), /href=["']\/api-keys\.html["']/);
});

check("Authentication pages keep the existing Supabase auth flow", () => {
  assert.match(read("login.html"), /\/auth\.js/);
  assert.match(read("signup.html"), /supabase-js/);
  const auth = read("auth.js");
  assert.match(auth, /\/api\/config/);
  assert.match(auth, /signInWithPassword/);
  assert.match(read("signup.html"), /auth\.signUp/);
});

check("Catalog/product/checkout keep existing data and navigation wiring", () => {
  assert.match(read("index.html"), /fetch\(['"]\/api\/store['"]/);
  assert.match(read("products.html"), /eva-mobile-flow\.js/);
  assert.match(read("product.html"), /eva-mobile-flow\.js/);
  assert.match(read("checkout.html"), /\/api\/store|purchase_store_product|checkout/i);
  assert.match(read("cart.html"), /\/checkout\.html/);
});

check("Static QA harness uses only Node built-in modules", () => {
  const script = read("scripts/qa-static.mjs");
  const imports = [...script.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1]);
  assert.ok(imports.length > 0, "expected test harness imports");
  assert.deepEqual(imports.filter((name) => !name.startsWith("node:")), [], "unexpected external dependency");
});

const failed = checks.filter((item) => !item.ok);
console.log("\nStatic QA result: " + (checks.length - failed.length) + "/" + checks.length + " checks passed.");
if (failed.length) process.exitCode = 1;
