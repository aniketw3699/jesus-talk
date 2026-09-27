const ALLOWED_API_PATHS = new Set([
  "/chat",
  "/api/chat",
  "/entitlement",
  "/api/entitlement",
  "/api/health",
  "/api/readiness"
]);

async function proxyApi(request, env) {
  const incoming = new URL(request.url);
  const upstreamPath = incoming.pathname.replace(/^\/api-preview/, "") || "/";

  if (!ALLOWED_API_PATHS.has(upstreamPath)) {
    return new Response("Preview API route not allowed.", { status:404 });
  }

  if (!env.API || typeof env.API.fetch !== "function") {
    return new Response(
      JSON.stringify({ detail:"Preview API service binding unavailable." }),
      {
        status:503,
        headers:{ "Content-Type":"application/json; charset=utf-8" }
      }
    );
  }

  const upstream = new URL("https://oneintoone-internal.invalid" + upstreamPath);
  upstream.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("content-length");

  const init = {
    method:request.method,
    headers:headers,
    redirect:"manual"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const response = await env.API.fetch(new Request(upstream.toString(), init));
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
      return proxyApi(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
