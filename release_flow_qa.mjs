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
  check(
    anxiety.route === "cloud-standard" && anxiety.reason === "model-first-conversation",
    "Open-ended anxiety/work conversation uses Christian reasoning"
  );

  const prayerMode = engine.decideRoute(
    "Please help me pray about my family",
    "prayer",
    true
  );
  check(
    prayerMode.route === "cloud-standard" && prayerMode.reason === "model-first-conversation",
    "Written Prayer reaches model-first pastoral reasoning"
  );

  const guidance = engine.decideRoute(
    "I need guidance about a difficult decision",
    "guidance",
    true
  );
  check(
    guidance.route === "cloud-standard" && guidance.reason === "model-first-conversation",
    "Life guidance uses Christian reasoning instead of a canned topic template"
  );

  const study = engine.decideRoute(
    "Explain Romans 8 in Greek and its historical context",
    "study",
    true
  );
  check(study.route === "cloud-deep" && study.cloudMode === "study", "Deep Scripture study routes to Ask Deeper cloud");

  const casualMemoryBefore = localStorage.getItem("oneintoone_local_memory_v1");
  const helloRoute = engine.decideRoute("Hello", "comfort", true);
  check(
    helloRoute.route === "cloud-standard" && helloRoute.reason === "model-first-conversation",
    "Greeting reaches model-first conversation instead of a scope or canned local reply"
  );
  const helloExperience = engine.buildExperience("Hello", "comfort");
  check(helloExperience.analysis.topic === "conversation", "Greeting does not fall into generic prayer topic");
  check(!(helloExperience.reply || "").includes("Scripture anchors:"), "Greeting does not force Scripture anchors");
  const identityExperience = engine.buildExperience("Who are you?", "comfort");
  check(/Christian digital companion/i.test(identityExperience.reply || ""), "Identity question gets direct non-technical product answer");

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
  check(
    insult.route === "cloud-standard" && insult.reason === "model-first-conversation",
    "Hostile chat reaches the model, whose prompt requires a calm Christian response"
  );

  const dying = engine.decideRoute("My mom is dying. Please help me.", "comfort", true);
  check(dying.route === "cloud-standard" && dying.cloudMode === "conversation", "Serious personal situation routes to nuanced standard conversation AI");

  const prayerStillLocal = engine.decideRoute("Please write a prayer for my mother", "comfort", true);
  check(
    prayerStillLocal.route === "cloud-standard" && prayerStillLocal.reason === "model-first-conversation",
    "Explicit prayer request reaches semantic personalized prayer generation"
  );

  const namedPrayerLookup = engine.decideRoute("tell me the st micheals prayer", "comfort", true);
  check(
    namedPrayerLookup.route === "local-knowledge",
    "Named Saint Michael prayer uses curated local knowledge"
  );
  const stMichaelAnswer = await knowledge.answer("tell me the st micheals prayer");
  check(
    Boolean(stMichaelAnswer && /Saint Michael, the Archangel, defend us in battle/i.test(stMichaelAnswer.reply) && /Seeking the ruin of souls\. Amen\./i.test(stMichaelAnswer.reply)),
    "Saint Michael prayer is available directly on device"
  );

  const worldEndRoute = engine.decideRoute("when will the world endf", "comfort", true);
  check(worldEndRoute.route === "local-knowledge", "World-end date question uses curated Christian knowledge");
  const worldEndAnswer = await knowledge.answer("when will the world endf");
  check(
    Boolean(worldEndAnswer && /does not give a date/i.test(worldEndAnswer.reply) && /Matthew 24:36/.test(worldEndAnswer.reply)),
    "World-end answer is concise and avoids invented Scripture quotation"
  );

  const jesusVirginRoute = engine.decideRoute("did jesus was virgin?", "comfort", true);
  check(jesusVirginRoute.route === "local-knowledge", "Ambiguous Jesus virgin question uses curated answer");
  const jesusVirginAnswer = await knowledge.answer("did jesus was virgin?");
  check(
    Boolean(jesusVirginAnswer && /If you mean whether Jesus himself had sex or was married/i.test(jesusVirginAnswer.reply) && /If you mean whether Jesus was born of a virgin/i.test(jesusVirginAnswer.reply)),
    "Jesus virgin answer handles both meanings instead of guessing"
  );


  const jesusDeathRoute = engine.decideRoute("When was Jesus died?", "comfort", true);
  check(jesusDeathRoute.route === "local-knowledge", "Jesus crucifixion date uses curated Christian history");
  const jesusDeathAnswer = await knowledge.answer("When was Jesus died?");
  check(
    Boolean(jesusDeathAnswer && /AD 30 and AD 33/i.test(jesusDeathAnswer.reply) && !/first week of.*Nisan/i.test(jesusDeathAnswer.reply)),
    "Jesus death answer keeps historical uncertainty and avoids the incorrect first-week-of-Nisan claim"
  );

  const explicitSex = engine.decideRoute("I'm a girl I want to get fucked", "comfort", true);
  check(
    explicitSex.route === "cloud-standard" && explicitSex.reason === "model-first-conversation",
    "Explicit adult sexual wording remains a valid standard conversation topic"
  );

  const bodyQuestion = engine.decideRoute("Do u have sex?", "comfort", true);
  check(
    bodyQuestion.route === "cloud-standard" && bodyQuestion.reason === "model-first-conversation",
    "Personal-body question routes to ordinary conversation rather than refusal"
  );
  const worldScience = engine.decideRoute("Explain how black holes work", "comfort", true);
  check(
    worldScience.route === "cloud-standard" &&
    worldScience.cloudMode === "conversation" &&
    worldScience.reason === "model-first-conversation",
    "Standalone science reaches the model, which is responsible for answering only through Jesus/Scripture"
  );

  const detailedPregnancyDecision = engine.decideRoute(
    "Give me an in-depth detailed analysis of abortion options, compare the trade-offs and scenarios because I am pregnant.",
    "comfort",
    true
  );
  check(
    detailedPregnancyDecision.route === "cloud-standard",
    "High-stakes pregnancy question is never automatically paywalled behind Ask Deeper"
  );

  const emergencyQuestion = engine.decideRoute(
    "Give me a detailed analysis of severe chest pain and compare what it could mean.",
    "comfort",
    true
  );
  check(
    emergencyQuestion.route === "cloud-standard",
    "Medical emergency wording stays standard instead of triggering paid depth"
  );

  const pregnancyDecision = engine.decideRoute(
    "I am pregnant. Should I have an abortion?",
    "comfort",
    true
  );
  check(
    pregnancyDecision.route === "cloud-standard" && pregnancyDecision.reason === "model-first-conversation",
    "Pregnancy decision is routed to real reasoning instead of canned local guidance"
  );

  const shoppingQuestion = engine.decideRoute(
    "Which laptop should I buy for video editing?",
    "comfort",
    true
  );
  check(
    shoppingQuestion.route === "cloud-standard" &&
    shoppingQuestion.cloudMode === "conversation" &&
    shoppingQuestion.reason === "model-first-conversation",
    "Shopping/technology reaches semantic reasoning while the system prompt controls the Bible-only answer"
  );

  const offlineWorldQuestion = engine.decideRoute(
    "Explain quantum computing",
    "comfort",
    false
  );
  check(
    offlineWorldQuestion.route === "device-general" &&
    offlineWorldQuestion.cloudMode === "conversation" &&
    offlineWorldQuestion.reason === "model-first-conversation",
    "Offline questions reach the prepared device model with the same Bible-only semantic prompt"
  );


  const deepTheology = engine.decideRoute("Compare Catholic and Protestant interpretations of Mary", "comfort", true);
  check(deepTheology.route === "cloud-deep" && deepTheology.cloudMode === "study", "Comparative theology routes to Ask Deeper");
  const deepStrategy = engine.decideRoute(
    "Give me an in-depth strategic analysis comparing three ways to leave my job, start a business, evaluate the trade-offs, risks and scenarios, and build a 90-day roadmap.",
    "comfort",
    true
  );
  check(
    deepStrategy.route === "cloud-deep" &&
    deepStrategy.cloudMode === "study",
    "Complex requests can use Ask Deeper, while its system prompt still constrains the answer to Bible/Jesus"
  );

  const premiumScore = engine.premiumDepthScore(
    "Compare Catholic, Orthodox, and Protestant views of salvation using biblical evidence, church history, major objections, Greek terminology, and arguments for and against each view."
  );
  check(premiumScore >= 5, "Multi-layered theology prompt receives a premium depth score");

  const premiumRoute = engine.decideRoute(
    "Compare Catholic, Orthodox, and Protestant views of salvation using biblical evidence, church history, major objections, Greek terminology, and arguments for and against each view.",
    "comfort",
    true
  );
  check(
    premiumRoute.route === "cloud-deep" && premiumRoute.reason === "deep-question",
    "Clearly multi-layered prompt reliably triggers Ask Deeper popup path"
  );


  const normalScience = engine.decideRoute("Explain black holes simply", "comfort", true);
  check(
    normalScience.route === "cloud-standard" &&
    normalScience.reason === "model-first-conversation",
    "Simple science reaches model-first reasoning rather than a keyword firewall"
  );

  const politicsBridge = engine.decideRoute("who is elon musk and what trump has to do about it", "comfort", true);
  check(
    politicsBridge.route === "cloud-standard" &&
    politicsBridge.reason === "model-first-conversation",
    "Public-figure/political prompt reaches semantic reasoning rather than a keyword firewall"
  );

  const mathBridge = engine.decideRoute("calculate 20 divide by 4", "comfort", true);
  check(
    mathBridge.route === "cloud-standard" &&
    mathBridge.reason === "model-first-conversation",
    "Standalone calculation reaches semantic reasoning rather than a keyword firewall"
  );

  const religionBridge = engine.decideRoute("what your view on bhagwan ram?", "comfort", true);
  check(
    religionBridge.route === "cloud-standard" &&
    religionBridge.reason === "model-first-conversation",
    "Other-religion prompt reaches semantic reasoning under the Christian system prompt"
  );

  const businessIdeas = engine.decideRoute("i want to earn money tell me business ideas", "comfort", true);
  check(
    businessIdeas.route === "cloud-standard" &&
    businessIdeas.reason === "model-first-conversation",
    "Business-idea request reaches semantic model reasoning"
  );
  const icuHelp = engine.decideRoute("my mother is in ICU please save her", "comfort", true);
  check(
    icuHelp.route === "cloud-standard" &&
    icuHelp.reason === "model-first-conversation",
    "ICU/family desperation reaches semantic pastoral reasoning instead of a scope rejection"
  );

  const whatsUp = engine.decideRoute("whats up", "comfort", true);
  check(
    whatsUp.route === "cloud-standard" &&
    whatsUp.reason === "model-first-conversation",
    "Casual greeting reaches natural model conversation instead of a scope rejection"
  );

  const businessIdeasDeep = engine.decideRoute(
    "Give me a detailed research-level list of ten business ideas and a 90-day plan",
    "study",
    true
  );
  check(
    businessIdeasDeep.route === "cloud-deep" &&
    businessIdeasDeep.cloudMode === "study",
    "Ask Deeper receives complex input while the model prompt keeps the output Bible/Jesus-only"
  );

  const christianComparison = engine.decideRoute("What does Christianity say about worshipping other gods?", "comfort", true);
  check(
    christianComparison.route === "cloud-standard" &&
    christianComparison.cloudMode === "conversation" &&
    christianComparison.reason === "model-first-conversation",
    "Explicit Christian comparative question remains directly in Christian conversation"
  );

  const casualMemoryAfter = localStorage.getItem("oneintoone_local_memory_v1");
  check(casualMemoryAfter === casualMemoryBefore, "Casual conversation is not stored as spiritual memory");

  const offlineStudy = engine.decideRoute(
    "Explain Romans 8 in Greek and its historical context",
    "study",
    false
  );
  check(offlineStudy.route === "device-general", "Offline deep questions route to device reasoning instead of a generic local template");

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
  const deviceAISetup = functionBody(index, "enablePrivateDeviceAI");
  const deviceAIAnswer = functionBody(index, "answerWithPreparedDeviceAI");

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

  check(index.includes("Bring Any Question · Through Jesus & Scripture"), "Universal ask-anything product tagline is present");
  check(!index.includes("Scripture Guidance & Daily Prayer Sanctuary"), "Legacy prayer-only tagline cannot overwrite the universal product identity");
  check(index.includes("Ask naturally — 1into1 chooses the response path automatically."), "UI explains automatic routing without exposing backend modes");
  check(!index.includes('id="modeComfort"') && !index.includes('id="modePrayer"') && !index.includes('id="modeGuidance"'), "Manual response-mode selector is removed");
  check(index.includes('/local-knowledge.js'), "Chat page loads the device knowledge engine");
  check(index.includes('id="deviceAiSetup"') && index.includes('enablePrivateDeviceAI()'), "Eligible devices have explicit private mode setup control");
  check(deviceAISetup.includes("userInitiated:true"), "Private Mode model preparation requires explicit setup action");
  check(deviceAIAnswer.includes("getStatus()") && deviceAIAnswer.includes("status.ready"), "Conversation uses device LLM only after it is ready");
  check(submit.includes("routeDecision.route === 'device-general'") && submit.includes("answerWithPreparedDeviceAI"), "Offline Christian-scope questions can use prepared device model");
  check(submit.includes('data.error === "SERVICE_DEGRADED"') && submit.includes("answerWithPreparedDeviceAI"), "Cloud failure tries Christian-scoped device model before narrower fallbacks");
  check(submit.includes("do not want to replace it with a generic prayer response"), "Cloud failure is never disguised as canned prayer guidance");
  check(!deviceAIAnswer.includes("prepare("), "Conversation routing never triggers a model download");
  check(index.includes('id="askDeeperChoiceModal"') && index.includes("requestAskDeeperChoice"), "Automatic higher-depth routing uses an in-product Ask Deeper choice");
  check(submit.includes("openPlansModal()") && submit.includes("jesus_guest_interaction_used"), "Exhausted free Ask Deeper usage leads to sign-in or Plus conversion");
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


async function testDeviceAIEngineFoundation() {
  const loaded = loadIntoSandbox([
    "device-ai-capability.js",
    "device-ai-engine.js"
  ], {
    isSecureContext: true,
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
            quota: 4 * 1024 * 1024 * 1024,
            usage: 256 * 1024 * 1024
          };
        }
      }
    }
  });

  const localAI = loaded.sandbox.OneIntoOneDeviceAIEngine;

  check(
    Boolean(localAI && typeof localAI.prepare === "function"),
    "On-device LLM engine foundation loads"
  );

  check(
    localAI.modelId === "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    "On-device LLM uses pinned low-resource model"
  );

  check(
    localAI.runtimeUrl === "https://esm.run/@mlc-ai/web-llm@0.2.85",
    "WebLLM runtime version is pinned"
  );

  const profile = localAI.getModelProfile();

  check(
    profile.hostedByOwner === false &&
    profile.inferenceLocation === "user-device" &&
    profile.automaticDownload === false,
    "On-device model profile preserves zero-owner-spend architecture"
  );

  check(
    localAI.getStatus().state === "idle",
    "On-device model does not load automatically"
  );

  const blocked = await localAI.prepare({
    userInitiated: false
  });

  check(
    blocked.blocked === true &&
    blocked.reason === "explicit-user-action-required",
    "On-device model download requires explicit user action"
  );

  check(
    localAI.getStatus().state === "idle",
    "Blocked model preparation performs no initialization"
  );

  const beforeReady = await localAI.chat([
    { role: "user", content: "Please pray with me" }
  ]);

  check(
    beforeReady.ok === false &&
    beforeReady.reason === "device-ai-not-ready",
    "On-device generation cannot run before readiness"
  );

  let createCalls = 0;
  let workerCalls = 0;

  const prepared = await localAI.prepare({
    userInitiated: true,
    workerFactory: function() {
      workerCalls += 1;
      return {
        terminate: function() {}
      };
    },
    runtimeLoader: async function() {
      return {
        CreateWebWorkerMLCEngine: async function(worker, modelId, config) {
          createCalls += 1;
          if (config && typeof config.initProgressCallback === "function") {
            config.initProgressCallback({
              progress: 0.5,
              text: "Loading test model"
            });
          }
          return {
            chat: {
              completions: {
                create: async function(request) {
                  return {
                    choices: [{
                      message: {
                        content: request.messages.length
                          ? "A private device response."
                          : ""
                      }
                    }]
                  };
                }
              }
            },
            unload: async function() {}
          };
        }
      };
    }
  });

  check(
    prepared.ready === true &&
    createCalls === 1 &&
    workerCalls === 1,
    "Eligible device can prepare WebLLM in a dedicated worker"
  );

  const generated = await localAI.chat([
    { role: "user", content: "I need encouragement today" }
  ]);

  check(
    generated.ok === true &&
    generated.source === "device-llm" &&
    generated.text === "A private device response.",
    "Prepared on-device LLM can generate a local response"
  );

  const unloaded = await localAI.unload();

  check(
    unloaded.state === "idle" && unloaded.ready === false,
    "On-device LLM can unload and release its session"
  );

  const lowStorageLoaded = loadIntoSandbox([
    "device-ai-capability.js",
    "device-ai-engine.js"
  ], {
    isSecureContext: true,
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
            usage: 1024 * 1024 * 1024
          };
        }
      }
    }
  });

  const lowStorage = await lowStorageLoaded.sandbox.OneIntoOneDeviceAIEngine.prepare({
    userInitiated: true,
    runtimeLoader: async function() {
      throw new Error("runtime-must-not-load");
    }
  });

  check(
    lowStorage.blocked === true &&
    lowStorage.reason === "insufficient-device-storage",
    "On-device model refuses setup when known free storage is too low"
  );

  const index = fs.readFileSync("index.html", "utf8");
  const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
  const workerSource = fs.readFileSync("device-ai-worker.js", "utf8");

  check(
    index.includes('/device-ai-engine.js'),
    "Chat page loads on-device LLM engine foundation"
  );

  check(
    serviceWorker.includes('"/device-ai-engine.js"') &&
    serviceWorker.includes('"/device-ai-worker.js"'),
    "On-device LLM scripts are cached in the app shell"
  );

  check(
    workerSource.includes("WebWorkerMLCEngineHandler") &&
    workerSource.includes("@mlc-ai/web-llm@0.2.85"),
    "Dedicated device AI worker pins the WebLLM runtime"
  );
}

async function main() {
  await testLocalPrayerEngine();
  await testBibleEngine();
  await testPrivateBackupCrypto();
  await testIndexFlowContracts();
  await testDeviceAIFoundation();
  await testDeviceAIEngineFoundation();

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
