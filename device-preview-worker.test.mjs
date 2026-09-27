import assert from "node:assert/strict";
import previewWorker from "./device-preview-worker.mjs";

let assetRequest = null;
const env = {
  ASSETS:{
    fetch:async function(request) {
      assetRequest = request;
      return new Response("<html>preview</html>", {
        status:200,
        headers:{ "Content-Type":"text/html" }
      });
    }
  }
};

const response = await previewWorker.fetch(
  new Request("https://oneintoone-jesus-device-preview.aniketw3699.workers.dev/"),
  env
);

assert.equal(response.status, 200);
assert.ok(assetRequest);
assert.equal(new URL(assetRequest.url).pathname, "/");
assert.match(await response.text(), /preview/);

console.log("PASS: isolated preview frontend serves only its static bundle.");
