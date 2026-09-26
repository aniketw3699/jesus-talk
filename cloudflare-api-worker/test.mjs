import assert from "node:assert/strict";
import worker, { __test } from "./src/worker.mjs";

assert.equal(__test.sanitizeInput("  hello\u0000 world  ", 20), "hello world");
assert.equal(__test.sanitizeMetadata("<script>Ani</script>", 30, "x"), "scriptAniscript");
assert.equal(__test.selectedMode("STUDY"), "study");
assert.equal(__test.selectedMode("unknown"), "comfort");

const built = __test.buildMessages({
  message: "Explain John 3:16",
  mode: "study",
  userName: "Aniket",
  userPsyche: "curious",
  userIntentions: "Bible study",
  history: [{ role: "user", content: "Earlier question" }]
});
assert.equal(built.mode, "study");
assert.equal(built.messages.at(-1).content, "Explain John 3:16");
assert.match(built.messages[0].content, /NOT Jesus Christ/);

assert.equal(__test.verseRefExists("John 3:16"), true);
assert.equal(__test.verseRefExists("John 99:1"), false);
assert.equal(
  __test.stripInvalidCitations("Keep this (John 3:16), remove that (John 99:1)."),
  "Keep this (John 3:16), remove that ."
);

const cleaned = __test.cleanCloudReply(
  "A response.\n\n[CARD]A blessing.[/CARD]\nPSYCHE: Growing in peace",
  "Seeking peace"
);
assert.equal(cleaned.reply, "A response.");
assert.equal(cleaned.cardText, "A blessing.");
assert.equal(cleaned.updatedPsyche, "Growing in peace");

const secret = "test-secret";
const raw = '{"hello":"world"}';
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"]
);
const sigBytes = new Uint8Array(
  await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))
);
const sigHex = Array.from(sigBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
assert.equal(await __test.verifyLemonSignature(raw, sigHex, secret), true);
assert.equal(await __test.verifyLemonSignature(raw, sigHex.slice(2), secret), false);

const parsed = __test.parseFsDocument({
  fields: {
    credits: { integerValue: "4" },
    isSubscribed: { booleanValue: true },
    email: { stringValue: "a@example.com" }
  }
});
assert.equal(parsed.credits, 4);
assert.equal(parsed.isSubscribed, true);
assert.equal(parsed.email, "a@example.com");

const env = {
  FIREBASE_PROJECT_ID: "jesus-chat-bd89f",
  PLUS_DAILY_FAIR_USE_LIMIT: "100",
  ALLOWED_ORIGINS:
    "https://www.1into1.com,https://1into1.com,https://oneintoone-jesus.aniketw3699.workers.dev"
};

const healthResponse = await worker.fetch(new Request("https://worker.test/api/health"), env);
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json();
assert.equal(health.status, "active");
assert.equal(health.cloud_configured, false);
assert.equal(health.db_connected, false);

const readinessResponse = await worker.fetch(new Request("https://worker.test/api/readiness"), env);
assert.equal(readinessResponse.status, 200);
const readiness = await readinessResponse.json();
assert.equal(readiness.status, "degraded");
assert.equal(readiness.checks.production_www_origin, true);
assert.equal(readiness.checks.cloudflare_preview_origin, true);

const preflight = await worker.fetch(
  new Request("https://worker.test/chat", {
    method: "OPTIONS",
    headers: {
      Origin: "https://oneintoone-jesus.aniketw3699.workers.dev",
      "Access-Control-Request-Method": "POST"
    }
  }),
  env
);
assert.equal(preflight.status, 204);
assert.equal(
  preflight.headers.get("access-control-allow-origin"),
  "https://oneintoone-jesus.aniketw3699.workers.dev"
);

const deniedPreflight = await worker.fetch(
  new Request("https://worker.test/chat", {
    method: "OPTIONS",
    headers: { Origin: "https://evil.example" }
  }),
  env
);
assert.equal(deniedPreflight.status, 403);

const localRoute = await worker.fetch(
  new Request("https://worker.test/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Please pray for me", mode: "comfort" })
  }),
  env
);
assert.equal(localRoute.status, 400);
const localBody = await localRoute.json();
assert.equal(localBody.error, "LOCAL_ROUTE_REQUIRED");

const notFound = await worker.fetch(new Request("https://worker.test/nope"), env);
assert.equal(notFound.status, 404);

console.log("PASS: Cloudflare API Worker unit/contract tests.");
