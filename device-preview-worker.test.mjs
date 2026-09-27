import assert from "node:assert/strict";
import previewWorker from "./device-preview-worker.mjs";

const originalFetch = globalThis.fetch;
let proxiedRequest = null;

globalThis.fetch = async function(request) {
  proxiedRequest = request;
  return new Response(JSON.stringify({ reply:"preview proxy works" }), {
    status:200,
    headers:{ "Content-Type":"application/json" }
  });
};

try {
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

  const apiResponse = await previewWorker.fetch(apiRequest, {
    ASSETS:{
      fetch:async function() {
        throw new Error("assets must not handle API proxy request");
      }
    }
  });

  assert.equal(apiResponse.status, 200);
  assert.ok(proxiedRequest);
  assert.equal(
    proxiedRequest.url,
    "https://oneintoone-jesus-api.aniketw3699.workers.dev/chat"
  );
  assert.equal(proxiedRequest.headers.get("origin"), null);
  assert.equal(proxiedRequest.headers.get("referer"), null);
  assert.equal(proxiedRequest.headers.get("content-type"), "application/json");

  const assetResponse = await previewWorker.fetch(
    new Request("https://oneintoone-jesus-device-preview.aniketw3699.workers.dev/"),
    {
      ASSETS:{
        fetch:async function(request) {
          assert.equal(new URL(request.url).pathname, "/");
          return new Response("<html>preview</html>", {
            status:200,
            headers:{ "Content-Type":"text/html" }
          });
        }
      }
    }
  );

  assert.equal(assetResponse.status, 200);
  assert.match(await assetResponse.text(), /preview/);

  const blocked = await previewWorker.fetch(
    new Request("https://oneintoone-jesus-device-preview.aniketw3699.workers.dev/api-preview/webhook", {
      method:"POST",
      body:"x"
    }),
    { ASSETS:{ fetch:async function(){ throw new Error("unexpected asset fetch"); } } }
  );
  assert.equal(blocked.status, 404);

  console.log("PASS: isolated preview API proxy contract.");
} finally {
  globalThis.fetch = originalFetch;
}
