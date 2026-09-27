import assert from "node:assert/strict";
import previewWorker from "./device-preview-worker.mjs";

let proxiedRequest = null;

const env = {
  API_VERSION_ID:"candidate-version-123",
  API:{
    fetch:async function(request) {
      proxiedRequest = request;
      return new Response(JSON.stringify({ reply:"preview service binding works" }), {
        status:200,
        headers:{ "Content-Type":"application/json" }
      });
    }
  },
  ASSETS:{
    fetch:async function(request) {
      assert.equal(new URL(request.url).pathname, "/");
      return new Response("<html>preview</html>", {
        status:200,
        headers:{ "Content-Type":"text/html" }
      });
    }
  }
};

const apiRequest = new Request(
  "https://oneintoone-jesus-device-preview.aniketw3699.workers.dev/api-preview/chat",
  {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Origin":"https://oneintoone-jesus-device-preview.aniketw3699.workers.dev"
    },
    body:JSON.stringify({ message:"Explain black holes", mode:"conversation" })
  }
);

const apiResponse = await previewWorker.fetch(apiRequest, env);

assert.equal(apiResponse.status, 200);
assert.ok(proxiedRequest);
assert.equal(
  proxiedRequest.url,
  "https://oneintoone-internal.invalid/chat"
);
assert.equal(proxiedRequest.headers.get("origin"), null);
assert.equal(proxiedRequest.headers.get("referer"), null);
assert.equal(proxiedRequest.headers.get("content-type"), "application/json");
assert.equal(
  proxiedRequest.headers.get("cloudflare-workers-version-overrides"),
  'oneintoone-jesus-api="candidate-version-123"'
);

const assetResponse = await previewWorker.fetch(
  new Request("https://oneintoone-jesus-device-preview.aniketw3699.workers.dev/"),
  env
);

assert.equal(assetResponse.status, 200);
assert.match(await assetResponse.text(), /preview/);

const blocked = await previewWorker.fetch(
  new Request("https://oneintoone-jesus-device-preview.aniketw3699.workers.dev/api-preview/webhook", {
    method:"POST",
    body:"x"
  }),
  env
);
assert.equal(blocked.status, 404);

const unavailable = await previewWorker.fetch(
  new Request("https://oneintoone-jesus-device-preview.aniketw3699.workers.dev/api-preview/api/health"),
  { ASSETS:env.ASSETS }
);
assert.equal(unavailable.status, 503);

console.log("PASS: isolated preview API service-binding contract.");
