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
assert.match(built.messages[0].content, /World English Bible \(WEB\)/);
assert.match(built.messages[0].content, /Do not make Hebrew, Greek, or Aramaic lexical claims unless the user explicitly asks/);

const psalm23Rows = [
  { chapterNumber:23, verseNumber:1, value:"Yahweh is my shepherd: I shall lack nothing. " },
  { chapterNumber:23, verseNumber:2, value:"He makes me lie down in green pastures. " },
  { chapterNumber:23, verseNumber:3, value:"He restores my soul. " },
  { chapterNumber:23, verseNumber:4, value:"Even though I walk through the valley of the shadow of death, I will fear no evil. " },
  { chapterNumber:23, verseNumber:5, value:"You prepare a table before me in the presence of my enemies. " },
  { chapterNumber:23, verseNumber:6, value:"Surely goodness and loving kindness shall follow me all the days of my life. " }
];

const psalmRef = __test.extractBibleReferences("What does Psalm 23:1 mean in its biblical context?")[0];
assert.equal(psalmRef.book, "psalm");
assert.equal(psalmRef.chapter, 23);
assert.equal(psalmRef.startVerse, 1);
assert.equal(__test.referenceExistsInRows(psalmRef, psalm23Rows), true);

const impossiblePsalmRef = __test.extractBibleReferences("Psalm 23:9-10")[0];
assert.equal(__test.referenceExistsInRows(impossiblePsalmRef, psalm23Rows), false);

const psalmGrounding = __test.groundingFromRows(psalmRef, psalm23Rows);
assert.equal(psalmGrounding.maxVerse, 6);
assert.match(psalmGrounding.contextText, /World English Bible \(WEB\)/);
assert.match(psalmGrounding.contextText, /verified chapter has verses 1-6/);
assert.match(psalmGrounding.contextText, /1\. Yahweh is my shepherd: I shall lack nothing\./);

const badPsalmDraft = [
  "Psalm 23 culminates in God’s presence in v. 9-10.",
  "The Hebrew word yeh means to lack.",
  "The shepherd image also appears in Isaiah 53:5."
].join("\n");
const psalmViolations = __test.findGroundingViolations(
  badPsalmDraft,
  "What does Psalm 23:1 mean in its biblical context?",
  psalmGrounding
);
assert.ok(psalmViolations.some((item) => /Impossible shorthand verse reference/.test(item)));
assert.ok(psalmViolations.some((item) => /Unrequested original-language claim/.test(item)));
assert.ok(psalmViolations.some((item) => /Unrequested cross-reference: Isaiah 53:5/.test(item)));

const crossRefAllowed = __test.findGroundingViolations(
  "Compare Psalm 23:1 with Isaiah 40:11.",
  "What cross-references help explain Psalm 23:1?",
  psalmGrounding
);
assert.equal(crossRefAllowed.some((item) => /Unrequested cross-reference/.test(item)), false);

const mockWebFetch = async () => ({ ok:true, json:async () => psalm23Rows });
assert.deepEqual(
  await __test.invalidWebReferences("Psalm 23:1 is valid; Psalm 23:9-10 is not.", mockWebFetch),
  ["Psalm 23:9-10"]
);

const correctedMessages = __test.buildCorrectionMessages(
  built.messages,
  badPsalmDraft,
  psalmViolations,
  psalmGrounding
);
assert.equal(correctedMessages.at(-2).role, "assistant");
assert.match(correctedMessages.at(-1).content, /VALIDATION PROBLEMS/);
assert.ok(correctedMessages.some((message) => message.role === "user" && message.content === "Explain John 3:16"));

assert.equal(__test.verseRefExists("John 3:16"), true);
assert.equal(__test.verseRefExists("John 99:1"), false);
assert.equal(
  __test.stripInvalidCitations("Keep this (John 3:16), remove that (John 99:1)."),
  "Keep this (John 3:16), remove that ."
);
assert.equal(
  __test.stripKnownInvalidReferences("Psalm 23:1 is valid; Psalm 23:9-10 is not.", ["Psalm 23:9-10"]),
  "Psalm 23:1 is valid; is not."
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
