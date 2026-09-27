async function assetText(env, requestUrl, path) {
  const url = new URL(path, requestUrl);
  const response = await env.ASSETS.fetch(new Request(url.toString(), { method:"GET" }));
  if (!response.ok) {
    return { ok:false, status:response.status, text:"" };
  }
  return { ok:true, status:response.status, text:await response.text() };
}

async function buildPreviewCheck(request, env) {
  const [index, knowledge, router, launch] = await Promise.all([
    assetText(env, request.url, "/"),
    assetText(env, request.url, "/local-knowledge.js"),
    assetText(env, request.url, "/offline-core.js"),
    assetText(env, request.url, "/launch-config.js")
  ]);

  const apiMatch = launch.text.match(/backendApiUrl:\s*"([^"]+)"/);
  const apiTarget = apiMatch ? apiMatch[1] : "";

  const checks = {
    indexLoaded:index.ok,
    universalTagline:
      index.text.includes("Bring Any Question · Through Jesus & Scripture") &&
      !index.text.includes("Scripture Guidance & Daily Prayer Sanctuary"),
    christianKnowledge:
      knowledge.ok &&
      knowledge.text.includes('version:"1.3.0"') &&
      knowledge.text.includes('id:"st-michael-prayer"') &&
      knowledge.text.includes('id:"world-end-date"') &&
      knowledge.text.includes('id:"jesus-virgin-celibate"'),
    router:
      router.ok &&
      router.text.includes('version:"2.6.0"'),
    candidateApi:
      launch.ok &&
      apiTarget.includes("universal-preview-oneintoone-jesus-api.aniketw3699.workers.dev") &&
      !apiTarget.includes("https://oneintoone-jesus-api.aniketw3699.workers.dev")
  };

  const ok = Object.values(checks).every(Boolean);

  return new Response(JSON.stringify({
    ok,
    marker:"1into1-final-preview-v2",
    checks,
    apiTarget,
    statuses:{
      index:index.status,
      knowledge:knowledge.status,
      router:router.status,
      launch:launch.status
    }
  }), {
    status:ok ? 200 : 503,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store, no-cache, must-revalidate, max-age=0",
      "X-1into1-Preview":"fresh-final-preview"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/__preview-check") {
      return buildPreviewCheck(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    headers.set("X-1into1-Preview", "fresh-final-preview");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
