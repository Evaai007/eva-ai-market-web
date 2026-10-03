import store from "./api/store.js";
import config from "./api/config.js";
import health from "./api/health.js";
import aiPlayground from "./api/ai-playground.js";
import favorites from "./api/favorites.js";
import notifications from "./api/notifications.js";
import support from "./api/support.js";
import keysCreate from "./api/keys/create.js";
import keysReset from "./api/keys/reset.js";
import adminApprove from "./api/admin/approve.js";
import adminStore from "./api/admin/store.js";
import adminSupport from "./api/admin/support.js";
import adminTrialCredit from "./api/admin/trial-credit.js";
import claude from "./api/v1/claude.js";
import gemini from "./api/v1/gemini.js";
import openai from "./api/v1/openai.js";

const ROUTES = new Map([
  ["/api/store", store],
  ["/api/config", config],
  ["/api/health", health],
  ["/api/ai-playground", aiPlayground],
  ["/api/favorites", favorites],
  ["/api/notifications", notifications],
  ["/api/support", support],
  ["/api/keys/create", keysCreate],
  ["/api/keys/reset", keysReset],
  ["/api/admin/approve", adminApprove],
  ["/api/admin/store", adminStore],
  ["/api/admin/support", adminSupport],
  ["/api/admin/trial-credit", adminTrialCredit],
  ["/api/v1/claude", claude],
  ["/api/v1/gemini", gemini],
  ["/api/v1/openai", openai]
]);

class VercelResponseAdapter {
  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.body = null;
    this.finished = false;
  }

  status(code) {
    this.statusCode = Number(code) || 200;
    return this;
  }

  setHeader(name, value) {
    const key = String(name);
    if (key.toLowerCase() === "set-cookie") {
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) this.headers.append(key, String(item));
      return this;
    }
    this.headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }

  getHeader(name) {
    return this.headers.get(String(name));
  }

  json(body) {
    this.headers.set("content-type", "application/json; charset=utf-8");
    this.body = JSON.stringify(body);
    this.finished = true;
    return this.toResponse();
  }

  send(body) {
    this.body = typeof body === "string" || body instanceof ArrayBuffer || body instanceof Uint8Array
      ? body
      : JSON.stringify(body);
    if (typeof body !== "string" && !this.headers.has("content-type")) {
      this.headers.set("content-type", "application/json; charset=utf-8");
    }
    this.finished = true;
    return this.toResponse();
  }

  end(body = "") {
    this.body = body;
    this.finished = true;
    return this.toResponse();
  }

  toResponse() {
    return new Response(this.body, {
      status: this.statusCode,
      headers: this.headers
    });
  }
}

function headersToObject(headers) {
  const result = {};
  for (const [key, value] of headers.entries()) result[key.toLowerCase()] = value;
  return result;
}

async function parseBody(request) {
  if (["GET", "HEAD"].includes(request.method)) return undefined;
  const contentType = request.headers.get("content-type") || "";
  const text = await request.text();
  if (!text) return undefined;
  if (contentType.toLowerCase().includes("application/json")) {
    return JSON.parse(text);
  }
  return text;
}

async function toVercelRequest(request, url) {
  let body;
  try {
    body = await parseBody(request);
  } catch {
    return { error: new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    }) };
  }

  const query = {};
  for (const [key, value] of url.searchParams.entries()) query[key] = value;

  const remoteAddress =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  return {
    value: {
      method: request.method,
      url: request.url,
      headers: headersToObject(request.headers),
      query,
      body,
      socket: { remoteAddress }
    }
  };
}

async function runHandler(handler, request) {
  const url = new URL(request.url);
  const adapted = await toVercelRequest(request, url);
  if (adapted.error) return adapted.error;

  const res = new VercelResponseAdapter();

  try {
    const result = await handler(adapted.value, res);
    if (result instanceof Response) return result;
    return res.toResponse();
  } catch (error) {
    console.error("EVA API handler failed:", error);
    if (res.finished) return res.toResponse();
    return new Response(JSON.stringify({
      error: "Internal server error."
    }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
}

async function serveAsset(env, request, pathname) {
  if (!env.ASSETS) {
    return new Response("Static asset binding is not configured.", { status: 500 });
  }
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  return env.ASSETS.fetch(new Request(assetUrl, request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let pathname = url.pathname.replace(/\\/+$/, "") || "/";

    // Preserve the existing Vercel rewrites without changing frontend code.
    if (pathname === "/v1/messages") {
      url.pathname = "/api/v1/claude";
      url.searchParams.set("compat", "anthropic");
      return runHandler(claude, new Request(url, request));
    }

    if (pathname === "/v1/models") {
      return serveAsset(env, request, "/models.json");
    }

    if (pathname === "/api/admin/stats") {
      url.pathname = "/api/admin/store";
      url.searchParams.set("view", "stats");
      return runHandler(adminStore, new Request(url, request));
    }

    if (pathname === "/api/public-activity") {
      url.pathname = "/api/health";
      url.searchParams.set("view", "activity");
      return runHandler(health, new Request(url, request));
    }

    const handler = ROUTES.get(pathname);
    if (handler) return runHandler(handler, new Request(url, request));

    return env.ASSETS.fetch(request);
  }
};
