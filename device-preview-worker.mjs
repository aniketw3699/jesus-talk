const API_BASE = "https://oneintoone-jesus-api.aniketw3699.workers.dev";

const ALLOWED_API_PATHS = new Set([
  "/chat",
  "/api/chat",
  "/entitlement",
  "/api/entitlement",
  "/api/health",
  "/api/readiness"
]);

async function proxyApi(request) {
  const incoming = new URL(request.url);
  const upstreamPath = incoming.pathname.replace(/^\/api-preview/, "") || "/";

  if (!ALLOWED_API_PATHS.has(upstreamPath)) {
    return new Response("Preview API route not allowed.", { status:404 });
  }

  const upstream = new URL(API_BASE + upstreamPath);
  upstream.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");

  const init = {
    method:request.method,
    headers:headers,
    redirect:"manual"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const response = await fetch(new Request(upstream.toString(), init));
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("access-control-allow-origin");
  responseHeaders.delete("access-control-allow-credentials");
  responseHeaders.set("Cache-Control", "no-store");

  return new Response(response.body, {
    status:response.status,
    statusText:response.statusText,
    headers:responseHeaders
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api-preview" || url.pathname.startsWith("/api-preview/")) {
      return proxyApi(request);
    }

    return env.ASSETS.fetch(request);
  }
};
