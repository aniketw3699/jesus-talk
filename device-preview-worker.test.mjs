import assert from "node:assert/strict";
import previewWorker from "./device-preview-worker.mjs";

const files = {
  "/":"<html><p id=\"userGreeting\">Bring Any Question · Through Jesus & Scripture</p></html>",
  "/local-knowledge.js":'version:"1.3.0"; id:"st-michael-prayer"; id:"world-end-date"; id:"jesus-virgin-celibate";',
  "/offline-core.js":'version:"2.6.0";',
  "/launch-config.js":'backendApiUrl: "https://universal-preview-oneintoone-jesus-api.aniketw3699.workers.dev"'
};

let assetRequest = null;
const env = {
  ASSETS:{
    fetch:async function(request) {
      assetRequest = request;
      const pathname = new URL(request.url).pathname;
      const body = files[pathname];
      if (body === undefined) return new Response("missing", {status:404});
      return new Response(body, {
        status:200,
        headers:{ "Content-Type":"text/plain", "Cache-Control":"public, max-age=3600" }
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
assert.match(response.headers.get("cache-control") || "", /no-store/);
assert.equal(response.headers.get("x-1into1-preview"), "fresh-final-preview");

const checkResponse = await previewWorker.fetch(
  new Request("https://oneintoone-jesus-final-preview.aniketw3699.workers.dev/__preview-check"),
  env
);
assert.equal(checkResponse.status, 200);
const check = await checkResponse.json();
assert.equal(check.ok, true);
assert.equal(check.marker, "1into1-final-preview-v2");
assert.equal(check.checks.universalTagline, true);
assert.equal(check.checks.christianKnowledge, true);
assert.equal(check.checks.router, true);
assert.equal(check.checks.candidateApi, true);
assert.equal(
  check.apiTarget,
  "https://universal-preview-oneintoone-jesus-api.aniketw3699.workers.dev"
);

const brokenEnv = {
  ASSETS:{
    fetch:async function(request) {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/") {
        return new Response("<p>Scripture Guidance & Daily Prayer Sanctuary</p>", {status:200});
      }
      const body = files[pathname];
      return body === undefined
        ? new Response("missing", {status:404})
        : new Response(body, {status:200});
    }
  }
};
const broken = await previewWorker.fetch(
  new Request("https://oneintoone-jesus-final-preview.aniketw3699.workers.dev/__preview-check"),
  brokenEnv
);
assert.equal(broken.status, 503);
assert.equal((await broken.json()).checks.universalTagline, false);

console.log("PASS: final preview self-check validates exact live assets and candidate API target.");
