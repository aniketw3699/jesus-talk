import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const failures = [];
const passes = [];

function check(condition, label, detail) {
  if (condition) passes.push(label);
  else failures.push(label + (detail ? " — " + detail : ""));
}

function makeStorage(initial) {
  const map = new Map(Object.entries(initial || {}).map(function(entry) {
    return [entry[0], String(entry[1])];
  }));
  return {
    getItem: function(key) { return map.has(key) ? map.get(key) : null; },
    setItem: function(key, value) { map.set(key, String(value)); },
    removeItem: function(key) { map.delete(key); },
    clear: function() { map.clear(); },
    dump: function() { return Object.fromEntries(map.entries()); }
  };
}

function loadIntoSandbox(paths, extras) {
  extras = extras || {};
  const localStorage = extras.localStorage || makeStorage();
  const sandbox = Object.assign({
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    RegExp: RegExp,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Array: Array,
    Object: Object,
    Map: Map,
    Set: Set,
    Promise: Promise,
    Uint8Array: Uint8Array,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    crypto: webcrypto,
    localStorage: localStorage,
    btoa: function(value) { return Buffer.from(value, "binary").toString("base64"); },
    atob: function(value) { return Buffer.from(value, "base64").toString("binary"); },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  }, extras);
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const path of paths) {
    vm.runInContext(fs.readFileSync(path, "utf8"), sandbox, { filename:path });
  }
  return { sandbox:sandbox, localStorage:localStorage };
}

async function testLocalPrayerEngine() {
  const loaded = loadIntoSandbox([
    "bible-manifest.js",
    "local-bible-engine.js",
    "local-knowledge.js",
    "local-scripture-data.js",
    "offline-core.js",
    "local-experiences.js"
  ]);
  const sandbox = loaded.sandbox;
  const localStorage = loaded.localStorage;
  const engine = sandbox.OneIntoOneOffline;
  const exp = sandbox.ONEINTOONE_EXPERIENCES;

  check(Boolean(engine), "Local Scripture engine loads");
  check(Boolean(exp), "Signature experience engine loads");

  const anxiety = engine.decideRoute(
    "I am anxious about losing my job and paying rent",
    "comfort",
    true
  );
  check(anxiety.route === "local", "Ordinary anxiety/work prayer routes locally");

  const prayerMode = engine.decideRoute(
    "Please help me pray about my family",
    "prayer",
    true
  );
  check(prayerMode.route === "local", "Written Prayer routes locally");

  const guidance = engine.decideRoute(
    "I need guidance about a difficult decision",
    "guidance",
    true
  );
  check(guidance.route === "local", "Life Guidance routes locally");

  const study = engine.decideRoute(
    "Explain Romans 8 in Greek and its historical context",
    "study",
    true
  );
  check(study.route === "cloud-deep" && study.cloudMode === "study", "Deep Scripture study routes to Ask Deeper cloud");

  const casualMemoryBefore = localStorage.getItem("oneintoone_local_memory_v1");
  const helloRoute = engine.decideRoute("Hello", "comfort", true);
  check(helloRoute.route === "local" && helloRoute.reason === "casual-conversation", "Greeting routes to natural local conversation");
  const helloExperience = engine.buildExperience("Hello", "comfort");
  check(helloExperience.analysis.topic === "conversation", "Greeting does not fall into generic prayer topic");
  check(!(helloExperience.reply || "").includes("Scripture anchors:"), "Greeting does not force Scripture anchors");
  const identityExperience = engine.buildExperience("Who are you?", "comfort");
  check(/Scripture-guided Christian companion/i.test(identityExperience.reply || ""), "Identity question gets direct conversational answer");

  const mary = engine.decideRoute("Who is Mother Mary?", "comfort", true);
  check(mary.route === "local-knowledge", "Basic Christian knowledge uses device knowledge before cloud");

  const commandments = engine.decideRoute("Tell me the Ten Commandments", "comfort", true);
  check(commandments.route === "local-knowledge", "Basic Bible knowledge uses device knowledge before cloud");

  const knowledge = sandbox.ONEINTOONE_LOCAL_KNOWLEDGE;
  const commandmentsAnswer = await knowledge.answer("Tell me the Ten Commandments");
  check(Boolean(commandmentsAnswer && /Exodus 20:1/.test(commandmentsAnswer.reply)), "Ten Commandments answer is available on device");
  const maryAnswer = await knowledge.answer("Who is Mother Mary?");
  check(Boolean(maryAnswer && /Acts 1:14/.test(maryAnswer.reply) && !/John 20:14/.test(maryAnswer.reply)), "Mary answer uses verified local references and avoids Mary Magdalene confusion");

  const insult = engine.decideRoute("Fuck you", "comfort", true);
  check(insult.route === "local" && insult.reason === "casual-conversation", "Hostile chat has a calm on-device fallback");

  const dying = engine.decideRoute("My mom is dying. Please help me.", "comfort", true);
  check(dying.route === "cloud-standard" && dying.cloudMode === "conversation", "Serious personal situation routes to nuanced standard conversation AI");

  const prayerStillLocal = engine.decideRoute("Please write a prayer for my mother", "comfort", true);
  check(prayerStillLocal.route === "local", "Explicit prayer request remains private local");

  const deepTheology = engine.decideRoute("Compare Catholic and Protestant interpretations of Mary", "comfort", true);
  check(deepTheology.route === "cloud-deep" && deepTheology.cloudMode === "study", "Comparative theology routes to Ask Deeper");
  const casualMemoryAfter = localStorage.getItem("oneintoone_local_memory_v1");
  check(casualMemoryAfter === casualMemoryBefore, "Casual conversation is not stored as spiritual memory");

  const offlineStudy = engine.decideRoute(
    "Explain Romans 8 in Greek and its historical context",
    "study",
    false
  );
  check(offlineStudy.route === "local", "Offline mode forces local fallback even for study");

  const safety = engine.buildExperience(
    "I want to kill myself tonight",
    "comfort"
  );
  check(Boolean(safety && safety.analysis && safety.analysis.safety === "selfHarm"), "Self-harm language is safety-intercepted");
  check(/immediate safety|emergency/i.test(safety.reply || ""), "Safety response prioritizes immediate help");

  const before = localStorage.getItem("oneintoone_local_memory_v1");
  engine.buildExperience(
    "My father died and I miss him every day",
    "comfort"
  );
  const after = localStorage.getItem("oneintoone_local_memory_v1") || "";
  check(after !== before, "Local structured memory updates after normal prayer");
  check(!after.toLowerCase().includes("father died"), "Structured local memory does not store raw prayer text");
  check(!after.toLowerCase().includes("miss him"), "Structured local memory excludes raw personal wording");

  const intercessory = exp.buildIntercessory(
    "Maria",
    "Physical Healing & Restoration",
    "surgery tomorrow",
    engine
  );
  check(/Maria/.test(intercessory.reply), "Pray for Someone generates named local prayer");
  check(/Scripture anchor:/i.test(intercessory.reply), "Pray for Someone includes Scripture anchor");

  const wordless = exp.getWordless("I do not know what to pray");
  check(Boolean(wordless.reply) && /prayer/i.test(wordless.reply), "I Don't Know What to Pray produces local prayer");

  const anxietyJourney = exp.getJourney("anxiety");
  check(Boolean(anxietyJourney && anxietyJourney.total === 7), "Anxiety journey has 7 local days");
  const day7 = exp.getJourneyDay("anxiety", 7);
  check(Boolean(day7 && day7.day === 7 && /Scripture anchor:/i.test(day7.reply)), "Journey day renders locally with Scripture");

  const forgiveness = exp.getJourney("forgiveness");
  check(Boolean(forgiveness && forgiveness.total === 14), "Forgiveness journey has 14 local days");
}

async function testBibleEngine() {
  const sampleJohn = [
    { chapterNumber:3, verseNumber:16, type:"paragraph text", value:"For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life." },
    { chapterNumber:3, verseNumber:17, type:"paragraph text", value:"For God didn't send his Son into the world to judge the world, but that the world should be saved through him." }
  ];

  const fakeFetch = async function(url) {
    return {
      ok: String(url).includes("john.json"),
      json: async function() { return sampleJohn; }
    };
  };

  const loaded = loadIntoSandbox(
    ["bible-manifest.js", "local-bible-engine.js"],
    { fetch:fakeFetch }
  );
  const bible = loaded.sandbox.ONEINTOONE_BIBLE;

  check(Boolean(bible), "Local Bible engine loads");
  check(bible.manifest.translation === "World English Bible", "Bible translation is WEB");
  check(bible.manifest.license === "Public Domain", "Bible manifest identifies public-domain license");

  const parsed = bible.parseReference("John 3:16");
  check(Boolean(parsed && parsed.book === "John" && parsed.chapter === 3 && parsed.startVerse === 16), "Direct Bible reference parses");

  const ref = await bible.getReference("John 3:16");
  check(Boolean(ref && /For God so loved the world/.test(ref.text)), "Bible reference resolves from local-style source data");

  const directSearch = await bible.search("John 3:16");
  check(Array.isArray(directSearch) && directSearch.length === 1, "Direct Scripture search resolves without generic search");

  const topicRefs = bible.manifest.topics.anxiety || [];
  check(topicRefs.includes("Philippians 4:6-7"), "Anxiety topic map contains expected Scripture");
}

async function testPrivateBackupCrypto() {
  const storage = makeStorage({
    "jesus_journal_sessions": JSON.stringify([{ sessionTime:"Today", turns:[{ user:"private journal text", bot:"local response" }] }]),
    "jesus_user_intentions":"private intention",
    "oneintoone_journey_anxiety_completed":"3",
    "jesus_active_feed_html":"TRANSIENT FEED SHOULD NOT BACK UP",
    "jesus_active_conversation_history":"RAW ACTIVE HISTORY SHOULD NOT BACK UP"
  });

  const loaded = loadIntoSandbox(["private-sync.js"], { localStorage:storage });
  const sync = loaded.sandbox.ONEINTOONE_PRIVATE_SYNC;
  check(Boolean(sync), "Encrypted backup engine loads");

  const snapshot = sync.buildSnapshot();
  const serialized = JSON.stringify(snapshot);
  check(serialized.includes("jesus_journal_sessions"), "Encrypted backup includes durable local journal");
  check(serialized.includes("jesus_user_intentions"), "Encrypted backup includes local intentions when user opts in");
  check(!serialized.includes("jesus_active_feed_html"), "Encrypted backup excludes transient feed HTML");
  check(!serialized.includes("jesus_active_conversation_history"), "Encrypted backup excludes transient active conversation");
  check(!serialized.toLowerCase().includes("confession"), "Encrypted backup has no Lay It Down confession field");

  const passphrase = "release-candidate-passphrase";
  const encrypted = await sync.encryptSnapshot(snapshot, passphrase);
  check(encrypted.algorithm === "AES-GCM", "Backup encrypts with AES-GCM");
  check(encrypted.kdf === "PBKDF2-SHA256", "Backup derives key with PBKDF2-SHA256");
  check(Boolean(encrypted.ciphertext) && !encrypted.ciphertext.includes("private journal text"), "Uploaded payload is ciphertext, not plaintext");

  const restored = await sync.decryptBackup(encrypted, passphrase);
  check(restored.data.jesus_user_intentions === "private intention", "Encrypted backup round-trip restores data");

  let wrongPassRejected = false;
  try {
    await sync.decryptBackup(encrypted, "wrong-passphrase-value");
  } catch (_) {
    wrongPassRejected = true;
  }
  check(wrongPassRejected, "Wrong backup passphrase is rejected");
}

function functionBody(index, name) {
  const token = "function " + name;
  const start = index.indexOf(token);
  if (start < 0) return "";
  const brace = index.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let i = brace; i < index.length; i += 1) {
    const ch = index[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === String.fromCharCode(96)) {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return index.slice(start, i + 1);
    }
  }
  return index.slice(start);
}

async function testIndexFlowContracts() {
  const index = fs.readFileSync("index.html", "utf8");

  const submit = functionBody(index, "handleUserSubmit");
  const journal = functionBody(index, "openJournalModal");
  const surrender = functionBody(index, "executeSacredSurrender");
  const intercessory = functionBody(index, "submitIntercessoryPrayer");
  const journey = functionBody(index, "startJourneyDay");
  const privateSync = functionBody(index, "openPrivateSyncModal");
  const googleAuth = functionBody(index, "proceedToGoogleAuth");
  const creditUi = functionBody(index, "updateCreditUI");
  const authDiscovery = functionBody(index, "updateAuthDiscoveryUI");
  const entitlementSync = functionBody(index, "syncAccountEntitlements");

  const routeIndex = submit.indexOf("decideRoute");
  const fetchIndex = submit.indexOf("fetch(");
  check(routeIndex >= 0 && fetchIndex >= 0 && routeIndex < fetchIndex, "Local routing occurs before cloud fetch");
  check(submit.includes("routeDecision.cloudMode"), "Frontend sends router-selected cloud mode to backend");
  check(submit.includes("!navigator.onLine"), "Submission flow has explicit offline local fallback");
  check(submit.includes('data.error === "FAIR_USE_EXHAUSTED"'), "Frontend handles Plus fair-use response");
  check(!journal.includes("!currentUser"), "Journal does not require sign-in");

  check(!surrender.includes("fetch("), "Lay It Down contains no network request");
  check(surrender.includes('confessionInput.value = ""'), "Lay It Down clears burden text");
  check(!surrender.includes('localStorage.setItem("confession'), "Lay It Down does not persist confession text");
  check(surrender.includes("surrender_safety_intercept"), "Lay It Down contains safety intercept");

  check(!intercessory.includes("fetch("), "Pray for Someone contains no network request");
  check(intercessory.includes("buildIntercessory"), "Pray for Someone uses local experience engine");

  check(!journey.includes("fetch("), "Journey day contains no network request");
  check(journey.includes("getJourneyDay"), "Journey uses curated local experience data");

  check(privateSync.includes("FEATURE_FLAGS.encryptedBackupEnabled"), "Encrypted backup is protected by launch feature gate");

  const popupIndex = googleAuth.indexOf("signInWithPopup");
  const closeIndex = googleAuth.indexOf("closePrivacyModal()");
  check(popupIndex >= 0 && closeIndex > popupIndex, "Privacy sign-in card closes only after Google auth attempt succeeds");
  check(googleAuth.includes("setAuthStatus"), "Google sign-in reports visible status instead of failing silently");
  check(googleAuth.includes("unauthorized-domain"), "Google sign-in explains preview-domain authorization failures");
  check(index.includes('id="authDiscoveryCard"'), "Signed-out users get a front-of-experience account discovery card");
  check(index.includes("Sign in for 5 Ask Deeper questions each day"), "Account discovery card communicates the free Ask Deeper allowance");
  check(index.includes("local prayer, Bible, journal and journeys still work without an account"), "Account discovery keeps no-account core use explicit");
  check(index.includes('id="creditBadge" onclick="handleCreditPillAction()" style="visibility:hidden;">✨ Ask Deeper</button>'), "Initial Ask Deeper quota badge is hidden until auth state is final");
  check(index.includes('id="authBtn" onclick="handleAuthAction()">Account</button>'), "Initial desktop account label is auth-neutral");
  check(creditUi.includes("!authHasResolved || (currentUser && !entitlementsHaveResolved)") && creditUi.includes('badge.style.visibility = "hidden"') && creditUi.includes('badge.style.visibility = "visible"'), "Credit badge waits for both auth and signed-in entitlement resolution");
  check(authDiscovery.includes("!authHasResolved") && authDiscovery.includes('card.style.display = "none"'), "Sign-in discovery card stays hidden until auth resolution");
  check(index.includes("let entitlementsHaveResolved = false;"), "Signed-in entitlement resolution has an explicit UI gate");
  check(entitlementSync.includes("entitlementsHaveResolved = true") && entitlementSync.includes("new Date().toISOString().slice(0, 10)") && entitlementSync.includes("data.lastResetDate === todayUtc"), "Signed-in free allowance resolves before the quota badge is revealed and resets to 5 on a new UTC day");
  check(entitlementSync.includes(": 5;"), "Stale signed-in credit values do not display across UTC-day rollover");
  check(index.includes(".plan-radio-circle { width: 20px; height: 20px; flex: 0 0 20px;"), "Plus plan radio selector cannot shrink into an oval");

  check(index.includes("Ask naturally — 1into1 chooses the response path automatically."), "UI explains automatic routing without exposing backend modes");
  check(!index.includes('id="modeComfort"') && !index.includes('id="modePrayer"') && !index.includes('id="modeGuidance"'), "Manual response-mode selector is removed");
  check(index.includes('/local-knowledge.js'), "Chat page loads the device knowledge engine");
  check(index.includes("nextTurnModeOverride"), "Explicit Ask Deeper shortcuts apply to one turn only");
  check(index.includes("SERVICE_DEGRADED") && index.includes("answerWithDeviceKnowledge"), "Cloud failure falls back to device knowledge/local response");
  check(index.includes("No account needed"), "UI promises no-account core use");
  check(index.includes("No app install required"), "UI promises no-install browser core use");
}


async function testDeviceAIFoundation() {
  const loaded = loadIntoSandbox([
    "device-ai-capability.js"
  ], {
    isSecureContext: true
  });

  const detector = loaded.sandbox.OneIntoOneDeviceAI;

  check(
    Boolean(detector && typeof detector.inspect === "function"),
    "Device AI capability detector loads"
  );

  const unsupported = await detector.inspect({
    secureContext: true,
    navigator: {
      deviceMemory: 8,
      hardwareConcurrency: 8
    }
  });

  check(
    unsupported.eligible === false &&
    unsupported.reason === "webgpu-unavailable",
    "Device AI rejects browsers without WebGPU"
  );

  const capable = await detector.inspect({
    secureContext: true,
    navigator: {
      deviceMemory: 8,
      hardwareConcurrency: 8,
      gpu: {
        requestAdapter: async function() {
          return {};
        }
      },
      storage: {
        estimate: async function() {
          return {
            quota: 2 * 1024 * 1024 * 1024,
            usage: 100 * 1024 * 1024
          };
        }
      }
    }
  });

  check(
    capable.eligible === true &&
    capable.tier === "strong",
    "Strong WebGPU device qualifies for future on-device AI"
  );

  check(
    capable.automaticModelDownload === false,
    "Device AI foundation forbids automatic model downloads"
  );

  const index = fs.readFileSync("index.html", "utf8");
  const serviceWorker = fs.readFileSync("service-worker.js", "utf8");

  check(
    index.includes('/device-ai-capability.js'),
    "Chat page loads device AI capability detector"
  );

  check(
    serviceWorker.includes('"/device-ai-capability.js"'),
    "Device AI capability detector is cached for offline use"
  );
}

async function main() {
  await testLocalPrayerEngine();
  await testBibleEngine();
  await testPrivateBackupCrypto();
  await testIndexFlowContracts();
  await testDeviceAIFoundation();

  console.log("Release flow QA");
  console.log("PASS:", passes.length);
  for (const item of passes) console.log("  OK", item);

  if (failures.length) {
    console.error("FAILED:", failures.length);
    for (const item of failures) console.error("  FAIL", item);
    process.exit(1);
  }

  console.log("PASS: automated RC product-flow QA completed successfully.");
}

await main();
