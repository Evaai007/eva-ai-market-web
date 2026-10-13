const ALLOWED_GET_PATHS = new Set([
  "/api/store",
  "/api/config",
  "/api/health"
]);

const UPSTREAM_ORIGIN = "https://aicloudmarket.shop";

function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-eva-preview": "read-only"
    }
  });
}

/**
 * Preview-only read-through to public, read-only API routes.
 * Intentionally blocks all state-changing requests so QA cannot create
 * orders, deposits, favorites, API keys, wallet entries, or payment actions.
 */
export async function onRequest(context) {
  const { request } = context;
  const incoming = new URL(request.url);
  const pathname = incoming.pathname;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonError(405, "Preview is read-only; state-changing API requests are disabled.");
  }

  if (!ALLOWED_GET_PATHS.has(pathname)) {
    return jsonError(404, "This API route is not enabled in the read-only preview.");
  }

  const upstreamUrl = new URL(pathname + incoming.search, UPSTREAM_ORIGIN);
  let upstream;

  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        accept: request.headers.get("accept") || "application/json",
        "cache-control": "no-cache"
      },
      redirect: "manual"
    });
  } catch {
    return jsonError(502, "Read-only production API could not be reached from Preview.");
  }

  const headers = new Headers();
  for (const name of ["content-type", "cache-control", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("cache-control", "no-store");
  headers.set("x-eva-preview", "read-only");

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers
  });
}
