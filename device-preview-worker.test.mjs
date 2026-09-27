import assert from "node:assert/strict";
import previewWorker from "./device-preview-worker.mjs";

let assetRequest = null;
const env = {
  ASSETS:{
    fetch:async function(request) {
      assetRequest = request;
      return new Response("<html>preview</html>", {
        status:200,
        headers:{ "Content-Type":"text/html", "Cache-Control":"public, max-age=3600" }
      });
    }
  }
};

const response = await previewWorker.fetch(
  new Request("https://oneintoone-jesus-final-preview.aniketw3699.workers.dev/"),
  env
);

assert.equal(response.status, 200);
assert.ok(assetRequest);
assert.equal(new URL(assetRequest.url).pathname, "/");
assert.match(await response.text(), /preview/);
assert.match(response.headers.get("cache-control") || "", /no-store/);
assert.equal(response.headers.get("x-1into1-preview"), "fresh-final-preview");

console.log("PASS: final isolated preview serves fresh no-cache assets only.");
