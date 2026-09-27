import assert from "node:assert/strict";
import worker, { __test } from "./src/worker.mjs";

assert.equal(__test.sanitizeInput("  hello\u0000 world  ", 20), "hello world");
assert.equal(__test.sanitizeMetadata("<script>Ani</script>", 30, "x"), "scriptAniscript");
assert.equal(__test.selectedMode("STUDY"), "study");
assert.equal(__test.selectedMode("conversation"), "conversation");
assert.equal(__test.selectedMode("bridge"), "comfort");
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

const conversational = __test.buildMessages({
  message: "Who is Mother Mary?",
  mode: "conversation",
  userName: "beloved",
  userPsyche: "curious",
  userIntentions: "faith"
});
assert.equal(conversational.mode, "conversation");
assert.match(conversational.messages[0].content, /MODEL-FIRST UNDERSTANDING/i);
assert.match(conversational.messages[0].content, /user may bring ANY subject/i);
assert.match(conversational.messages[0].content, /ANSWER-WORLD.*Jesus and the Bible/i);
assert.match(conversational.messages[0].content, /rude, insulting, profane, or angry/i);
assert.match(conversational.messages[0].content, /Ordinary adult questions about sex/i);
assert.match(conversational.messages[0].content, /Do not force headings such as Reflection or Scripture Anchors/i);
assert.match(conversational.messages[0].content, /named traditional prayer/i);
assert.match(conversational.messages[0].content, /does not have a physical body or personal sex\/relationship life/i);
assert.match(conversational.messages[0].content, /Keep simple questions concise and natural/i);
assert.match(conversational.messages[0].content, /Every normal cloud answer must contain one directly relevant Scripture anchor/i);
assert.match(conversational.messages[0].content, /Never improvise the wording of a named traditional prayer/i);


const deepChristian = __test.buildMessages({
  message: "Compare Catholic and Orthodox views of salvation using Scripture, church history, and major objections.",
  mode: "study",
  userName: "beloved",
  userPsyche: "focused",
  userIntentions: "faith"
});
assert.match(deepChristian.messages[0].content, /deep Bible study, theology/i);

const businessConversation = __test.buildMessages({
  message: "i want to earn money tell me business ideas",
  mode: "conversation",
  userName: "beloved",
  userPsyche: "hopeful",
  userIntentions: "work"
});
assert.equal(businessConversation.mode, "conversation");
assert.match(businessConversation.messages[0].content, /if asked for business ideas, do not list businesses/i);
assert.match(businessConversation.messages[0].content, /work, money, stewardship, honesty, service, greed, contentment, and provision/i);

const icuConversation = __test.buildMessages({
  message: "my mother is in ICU please save her",
  mode: "conversation",
  userName: "beloved",
  userPsyche: "afraid",
  userIntentions: "prayer"
});
assert.match(icuConversation.messages[0].content, /personal suffering, sickness, ICU/i);
assert.match(icuConversation.messages[0].content, /respond to the HUMAN situation directly with compassion and biblical wisdom/i);

const greetingConversation = __test.buildMessages({
  message: "whats up",
  mode: "conversation",
  userName: "beloved",
  userPsyche: "calm",
  userIntentions: "conversation"
});
assert.match(greetingConversation.messages[0].content, /ordinary greetings such as hello or what's up, respond naturally and warmly/i);

const universalMedicalDecision = __test.buildMessages({
  message: "I am pregnant. Should I have an abortion?",
  mode: "conversation",
  userName: "beloved",
  userPsyche: "uncertain",
  userIntentions: "seeking guidance"
});
assert.match(universalMedicalDecision.messages[0].content, /pregnancy, medical treatment/i);
assert.match(universalMedicalDecision.messages[0].content, /Christian moral\/spiritual guidance/i);

assert.deepEqual(
  __test.modelCandidates({ AI_MODELS:"openai/gpt-oss-20b,openai/gpt-oss-120b" }, "standard"),
  ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]
);
assert.equal(
  __test.modelCandidates({ AI_MODELS:"openai/gpt-oss-20b,openai/gpt-oss-120b" }, "deep")[0],
  "openai/gpt-oss-120b"
);

assert.equal(
  __test.modelCandidates({ AI_MODELS:"openai/gpt-oss-20b,openai/gpt-oss-120b" }, "standard-high")[0],
  "openai/gpt-oss-120b"
);

assert.equal(__test.standardQualityTier("did jesus was virgin?"), "standard-high");
assert.equal(__test.standardQualityTier("my mother is in hospital please help"), "standard-high");
assert.equal(__test.standardQualityTier("my mother is in ICU please save her"), "standard-high");
assert.equal(__test.standardQualityTier("Explain black holes simply"), "standard");


assert.equal(
  __test.needsStandardQualityUpgrade(
    "i want to have sex",
    "It sounds like you're wrestling with a deeply personal question.\n\n**Reflection**\nHere is a very long sermon-like response ".repeat(12)
  ),
  true
);

assert.equal(
  __test.needsStandardQualityUpgrade(
    "do u have sex?",
    "I’m sorry, but I can’t help with that."
  ),
  true
);

assert.equal(
  __test.needsStandardQualityUpgrade(
    "What does fear mean for a Christian?",
    "Fear can make us feel alone, but Scripture turns us toward God's presence. [VERSE]\n\nThis passage matters because it points the fearful person toward trust in God rather than panic.\nPSYCHE: Seeking courage in God\nANCHOR: Psalm 56:3"
  ),
  false
);

assert.equal(
  __test.needsStandardQualityUpgrade(
    "whats up",
    "I'm here with you."
  ),
  true
);

const upgradedMessages = __test.buildQualityUpgradeMessages(conversational.messages);
assert.match(upgradedMessages[0].content, /STANDARD QUALITY ESCALATION/);
assert.match(upgradedMessages[0].content, /under about 180 words/);

const ungroundedQuoteProblems = __test.findGroundingViolations(
  'Jesus says, “This invented wording is definitely not verified source text.” (Matthew 24:36)',
  'When will the world end?',
  null
);
assert.ok(ungroundedQuoteProblems.some((item) => /Unverified Scripture quotation/.test(item)));



const psalm23Rows = [
  { type:"header", value:"A Psalm by David." },
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
assert.equal(psalmGrounding.sourceHeader, "A Psalm by David.");
assert.equal(psalmGrounding.targetVerseText, "Yahweh is my shepherd: I shall lack nothing.");
assert.match(psalmGrounding.contextText, /World English Bible \(WEB\)/);
assert.match(psalmGrounding.contextText, /verified chapter has verses 1-6/);
assert.match(psalmGrounding.contextText, /Source heading: A Psalm by David\./);
assert.match(psalmGrounding.contextText, /1\. Yahweh is my shepherd: I shall lack nothing\./);

const anchorRef = __test.extractAnchorReference("A response.\nPSYCHE: Calm\nANCHOR: Psalm 23:1");
assert.equal(anchorRef.book, "psalm");
assert.equal(anchorRef.chapter, 23);
assert.equal(anchorRef.startVerse, 1);

const injectedVerse = __test.injectVerifiedVerse(
  "God's care is personal.\n\n[VERSE]\n\nThis verse shows why trust belongs at the center.\nPSYCHE: Growing in trust\nANCHOR: Psalm 23:1",
  psalmGrounding
);
assert.match(injectedVerse, /“Yahweh is my shepherd: I shall lack nothing\.” \(Psalm 23:1\)/);
assert.doesNotMatch(injectedVerse, /\[VERSE\]/i);
assert.doesNotMatch(injectedVerse, /ANCHOR:/i);


const badPsalmDraft = [
  "Psalm 23 is a Davidic psalm, and David chose this picture because he had been a shepherd.",
  "Verse 1 says, “The Lord is my shepherd; I shall not want.”",
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
assert.ok(psalmViolations.some((item) => /Quoted wording does not match the verified WEB source exactly/.test(item)));
assert.ok(psalmViolations.some((item) => /Authorship\/authorial-intent overclaim/.test(item)));
assert.equal(
  __test.quoteMatchesGrounding("Yahweh is my shepherd: I shall lack nothing.", psalmGrounding),
  true
);
assert.equal(
  __test.quoteMatchesGrounding("The Lord is my shepherd; I shall not want.", psalmGrounding),
  false
);
assert.equal(__test.hasAuthorshipOverclaim("Traditionally attributed to David, Psalm 23 presents God as shepherd.", psalmGrounding), false);
assert.equal(__test.hasAuthorshipOverclaim("David chose this picture because he had been a shepherd.", psalmGrounding), true);

const repairedPsalm = __test.repairRemainingGroundingIssues(
  "Psalm 23 is a Davidic psalm. Verse 1 says, “The Lord is my shepherd; I shall not want.”",
  psalmGrounding
);
assert.match(repairedPsalm, /The WEB heading for this psalm reads, “A Psalm by David\.”/);
assert.match(repairedPsalm, /“Yahweh is my shepherd: I shall lack nothing\.”/);
assert.doesNotMatch(repairedPsalm, /I shall not want/);
assert.doesNotMatch(repairedPsalm, /Davidic psalm/);

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
assert.match(correctedMessages.at(-1).content, /quotation marks must match the supplied WEB wording exactly/);
assert.match(correctedMessages.at(-1).content, /use the supplied source heading as an attribution/);
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
  "A response.\n\n[CARD]A blessing.[/CARD]\nPSYCHE: Growing in peace\nANCHOR: Psalm 23:1",
  "Seeking peace"
);
assert.equal(cleaned.reply, "A response.");
assert.equal(cleaned.cardText, "A blessing.");
assert.equal(cleaned.updatedPsyche, "Growing in peace");

const spacedCard = __test.cleanCloudReply(
  "A concise Christian bridge answer.\n\n[ CARD ]\nA blessing that must not leak.\n[/ CARD ]\nPSYCHE: Curious about faith",
  "Seeking wisdom"
);
assert.equal(spacedCard.reply, "A concise Christian bridge answer.");
assert.equal(spacedCard.cardText, "A blessing that must not leak.");
assert.doesNotMatch(spacedCard.reply, /\[\s*\/?\s*CARD\s*\]/i);


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
assert.equal(
  await __test.verifyConfiguredLemonSignature(raw, sigHex, { LEMON_WEBHOOK_SECRET:"wrong", LEMON_TEST_WEBHOOK_SECRET:secret }),
  true
);
assert.equal(
  await __test.verifyConfiguredLemonSignature(raw, sigHex, { LEMON_WEBHOOK_SECRET:"wrong" }),
  false
);

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
    "https://www.1into1.com,https://1into1.com,https://oneintoone-jesus.aniketw3699.workers.dev,https://oneintoone-jesus-device-preview.aniketw3699.workers.dev,https://oneintoone-jesus-final-preview.aniketw3699.workers.dev"
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

const devicePreviewPreflight = await worker.fetch(
  new Request("https://worker.test/chat", {
    method: "OPTIONS",
    headers: {
      Origin: "https://oneintoone-jesus-device-preview.aniketw3699.workers.dev",
      "Access-Control-Request-Method": "POST"
    }
  }),
  env
);
assert.equal(devicePreviewPreflight.status, 204);
assert.equal(
  devicePreviewPreflight.headers.get("access-control-allow-origin"),
  "https://oneintoone-jesus-device-preview.aniketw3699.workers.dev"
);

const finalPreviewPreflight = await worker.fetch(
  new Request("https://worker.test/chat", {
    method: "OPTIONS",
    headers: {
      Origin: "https://oneintoone-jesus-final-preview.aniketw3699.workers.dev",
      "Access-Control-Request-Method": "POST"
    }
  }),
  env
);
assert.equal(finalPreviewPreflight.status, 204);
assert.equal(
  finalPreviewPreflight.headers.get("access-control-allow-origin"),
  "https://oneintoone-jesus-final-preview.aniketw3699.workers.dev"
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

const standardConversation = await worker.fetch(
  new Request("https://worker.test/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Who is Mother Mary?", mode: "conversation" })
  }),
  env
);
assert.equal(standardConversation.status, 200);
const standardBody = await standardConversation.json();
assert.notEqual(standardBody.error, "LOCAL_ROUTE_REQUIRED");
assert.equal(standardBody.error, "SERVICE_DEGRADED");

const notFound = await worker.fetch(new Request("https://worker.test/nope"), env);
assert.equal(notFound.status, 404);

console.log("PASS: Cloudflare API Worker unit/contract tests.");
