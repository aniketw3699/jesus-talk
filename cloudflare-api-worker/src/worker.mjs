
const FIREBASE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const FREE_DAILY_CREDITS = 5;
const GUEST_DAILY_CREDITS = 1;

const MODE_INSTRUCTIONS = Object.freeze({
  comfort: "Offer gentle Scripture-grounded comfort. Do not impersonate Jesus or claim divine authority. Help the user bring the concern to God with calm, practical language.",
  study: "This is Ask Deeper mode. Focus on biblical context, literary setting, theology, and interpretation. Distinguish the biblical text from interpretation and note meaningful differences among major Christian traditions when relevant.",
  prayer: "Write a personal prayer addressed to God or Jesus that the seeker can pray aloud. The assistant must never speak as God or Jesus.",
  guidance: "Offer practical discernment and Scripture-grounded next steps for daily decisions, work, relationships, or habits. Avoid presenting personal advice as a divine command."
});

const SYSTEM_PROMPT_LINES = [
  "You are the 1into1 Scripture Companion: a Christian prayer and Bible-study assistant.",
  "",
  "IDENTITY & BOUNDARIES:",
  "- You are NOT Jesus Christ, God, the Holy Spirit, a prophet, clergy, or a divine authority.",
  "- Never claim to be Jesus or to speak on Jesus' behalf.",
  "- Never say that God personally told you a specific outcome or command for this user.",
  "- Help the seeker pray to Jesus/God, understand Scripture, reflect, and make thoughtful next steps.",
  "- Be warm and pastoral without using language that falsely implies divine identity.",
  "",
  "RESPONSE MODE:",
  "{{MODE}}",
  "",
  "SCRIPTURE & THEOLOGY:",
  "1. Ground biblical claims in identifiable Scripture references.",
  "2. Never invent a Bible reference or fabricate a quotation.",
  "3. Prefer accurate references and concise paraphrase when exact wording is uncertain.",
  "4. When a theological question has meaningful denominational differences, briefly identify the major interpretations rather than pretending there is only one uncontested Christian view.",
  "5. Do not replace medical, legal, financial, mental-health, safeguarding, or emergency professionals with spiritual advice.",
  "",
  "RESPONSE QUALITY:",
  "1. Address the seeker's actual question directly rather than forcing every answer into the same devotional template.",
  "2. For prayer requests, provide a complete prayer addressed to God/Jesus.",
  "3. For study questions, explain context and interpretation clearly, then offer a short reflection or practical takeaway when useful.",
  "4. For guidance questions, separate Scripture-grounded principles from your practical suggestions.",
  "5. Keep answers complete and avoid unfinished sentences.",
  "6. Continue numbered/multi-step requests from the conversation history rather than restarting.",
  "",
  "SHARE CARD:",
  "After the main response, append a [CARD]...[/CARD] block containing a concise 30-45 word Scripture-grounded blessing suitable for sharing. Do not put private identifying details in the card unless the user explicitly asked to pray for a named loved one.",
  "",
  "PSYCHE:",
  "At the very end, after the [CARD] block, output on its own line:",
  "PSYCHE: <5-8 words summarizing the user's current emotional direction>",
  "",
  "Seeker Information:",
  "- Name: {{NAME}}",
  "- Previous State: {{PSYCHE}}",
  "- Core Intentions: {{INTENTIONS}}"
];

const DEGRADED_REPLY = "Ask Deeper is temporarily unavailable. Your local prayer tools, Bible, journeys, journal, and Lay It Down still work on this device.";
const GUEST_AUTH_REQUIRED_REPLY = "You have used today's guest Ask Deeper question. Sign in for 5 free Ask Deeper questions per day. Your local prayer tools, Bible, journeys, and Lay It Down remain available without using cloud AI.";
const PAYWALL_EXHAUSTED_REPLY = "You have used today's 5 free Ask Deeper questions. They renew tomorrow. Your unlimited local prayer tools, Bible, journeys, and Lay It Down remain available.";
const PLUS_FAIR_USE_REPLY = "You have reached today's Ask Deeper fair-use limit. It resets automatically tomorrow. Unlimited local prayer, Bible, journeys, journal, and Lay It Down remain available.";

const CRISIS_PATTERNS = [
  /\bkill(?:ing)?\s+my\s?self\b/i,
  /\b(?:take|end|destroy)\s+(?:my\s+own\s+life|my\s+life|it\s+all)\b/i,
  /\b(hang|slit|shoot|overdose|poison|drown)\s+my\s?self\b/i,
  /\bself[- ]?harm(?:ing)?\b/i,
  /\bcut(?:ting)?\s+my\s?self\b/i,
  /\bhurt(?:ing)?\s+my\s?self\b/i,
  /\bunalive\s+my\s?self\b/i,
  /\b(suicide|suicidal|suicidality)\b/i,
  /\b(?:want|wanna|wish)\s+to\s+(?:die|be\s+dead|disappear|not\s+wake\s+up)\b/i,
  /\bdon'?t\s+want\s+to\s+(?:live|wake\s+up|exist|be\s+alive|be\s+here|go\s+on)\b/i,
  /\bcan'?t\s+go\s+on(?:\s+anymore)?\b/i,
  /\bbetter\s+off\s+(?:dead|without\s+me|gone)\b/i,
  /\bno\s+(?:reason|point|will|purpose)\s+(?:to\s+live|in\s+living|to\s+go\s+on|to\s+stay\s+alive|to\s+keep\s+going)\b/i,
  /\bnot\s+worth\s+living\b/i,
  /\bready\s+to\s+(?:die|give\s+up\s+on\s+everything|end\s+it\s+all)\b/i
];

const CRISIS_RESPONSE = [
  "I hear the deep pain and heaviness in what you shared. Your safety matters more than continuing this conversation right now.",
  "",
  "Please connect immediately with trained human support:",
  "• US & Canada: call or text 988",
  "• United Kingdom: call 111 or Samaritans at 116 123",
  "• Australia: call Lifeline at 13 11 14",
  "• Worldwide: visit https://findahelpline.com for local crisis support",
  "",
  "If you may act on these thoughts or are in immediate danger, call your local emergency number or go to the nearest emergency department. If possible, stay with another person and tell them clearly that you need immediate support."
].join("\n");

const BIBLE_CHAPTER_LIMITS = Object.freeze({
  genesis:50, exodus:40, leviticus:27, numbers:36, deuteronomy:34,
  joshua:24, judges:21, ruth:4, "1 samuel":31, "2 samuel":24,
  "1 kings":22, "2 kings":25, "1 chronicles":29, "2 chronicles":36,
  ezra:10, nehemiah:13, esther:10, job:42, psalms:150, psalm:150,
  proverbs:31, ecclesiastes:12, "song of solomon":8, "song of songs":8,
  isaiah:66, jeremiah:52, lamentations:5, ezekiel:48, daniel:12,
  hosea:14, joel:3, amos:9, obadiah:1, jonah:4, micah:7,
  nahum:3, habakkuk:3, zephaniah:3, haggai:2, zechariah:14, malachi:4,
  matthew:28, mark:16, luke:24, john:21, acts:28, romans:16,
  "1 corinthians":16, "2 corinthians":13, galatians:6, ephesians:6,
  philippians:4, colossians:4, "1 thessalonians":5, "2 thessalonians":3,
  "1 timothy":6, "2 timothy":4, titus:3, philemon:1, hebrews:13,
  james:5, "1 peter":5, "2 peter":3, "1 john":5, "2 john":1, "3 john":1,
  jude:1, revelation:22, revelations:22
});

let firebaseJwksCache = { expiresAt: 0, keys: [] };
let googleAccessTokenCache = { expiresAt: 0, token: "" };

function allowedOrigins(env) {
  return new Set(
    String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .map(function (item) { return item.trim(); })
      .filter(Boolean)
  );
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  });
  if (origin && allowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return headers;
}

function jsonResponse(request, env, value, status, extraHeaders) {
  const headers = corsHeaders(request, env);
  Object.entries(extraHeaders || {}).forEach(function (entry) {
    headers.set(entry[0], entry[1]);
  });
  return new Response(JSON.stringify(value), { status: status || 200, headers: headers });
}

function optionsResponse(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!origin || !allowedOrigins(env).has(origin)) {
    return new Response(null, { status: 403, headers: corsHeaders(request, env) });
  }
  const headers = corsHeaders(request, env);
  headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Signature");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(null, { status: 204, headers: headers });
}

function base64UrlDecode(input) {
  let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  normalized += "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, function (char) { return char.charCodeAt(0); });
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  bytes.forEach(function (byte) { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeText(text) {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

function decodeJwtPart(part) {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(part)));
}

async function getFirebaseJwks() {
  const now = Date.now();
  if (firebaseJwksCache.keys.length && firebaseJwksCache.expiresAt > now + 30000) {
    return firebaseJwksCache.keys;
  }
  const response = await fetch(FIREBASE_JWKS_URL);
  if (!response.ok) throw new Error("Firebase JWKS returned " + response.status);
  const body = await response.json();
  const maxAgeMatch = (response.headers.get("cache-control") || "").match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  firebaseJwksCache = {
    keys: Array.isArray(body.keys) ? body.keys : [],
    expiresAt: now + maxAgeSeconds * 1000
  };
  return firebaseJwksCache.keys;
}

async function verifyFirebaseIdToken(token, projectId) {
  if (!token || !projectId) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header;
  let payload;
  try {
    header = decodeJwtPart(parts[0]);
    payload = decodeJwtPart(parts[1]);
  } catch (_) {
    return null;
  }

  if (header.alg !== "RS256" || !header.kid) return null;
  const keys = await getFirebaseJwks();
  const jwk = keys.find(function (key) { return key.kid === header.kid; });
  if (!jwk) return null;

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signingInput = new TextEncoder().encode(parts[0] + "." + parts[1]);
  const signature = base64UrlDecode(parts[2]);
  const signatureOk = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature,
    signingInput
  );
  if (!signatureOk) return null;

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || Number(payload.exp) <= now) return null;
  if (!payload.iat || Number(payload.iat) > now + 300) return null;
  if (payload.auth_time && Number(payload.auth_time) > now + 300) return null;
  if (payload.aud !== projectId) return null;
  if (payload.iss !== "https://securetoken.google.com/" + projectId) return null;
  if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 128) return null;

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : ""
  };
}

async function getVerifiedUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    return await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
  } catch (error) {
    console.warn("Firebase token verification failed:", error && error.message ? error.message : error);
    return null;
  }
}

function pemToPkcs8(pem) {
  const body = String(pem || "")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!body) throw new Error("Service-account private key is missing");
  const binary = atob(body);
  return Uint8Array.from(binary, function (char) { return char.charCodeAt(0); });
}

async function serviceAccountAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (googleAccessTokenCache.token && googleAccessTokenCache.expiresAt > now + 120) {
    return googleAccessTokenCache.token;
  }

  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Firebase service account is incomplete");
  }

  const header = base64UrlEncodeText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncodeText(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const signingInput = header + "." + payload;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  const assertion = signingInput + "." + base64UrlEncodeBytes(new Uint8Array(signature));

  const form = new URLSearchParams();
  form.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  form.set("assertion", assertion);

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  if (!response.ok) throw new Error("Google OAuth token request returned " + response.status);
  const tokenData = await response.json();
  if (!tokenData.access_token) throw new Error("Google OAuth response had no access token");

  googleAccessTokenCache = {
    token: tokenData.access_token,
    expiresAt: now + Number(tokenData.expires_in || 3600)
  };
  return googleAccessTokenCache.token;
}

function firestoreBase(env) {
  return "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(env.FIREBASE_PROJECT_ID) +
    "/databases/(default)/documents";
}

function fsValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  return { stringValue: String(value) };
}

function parseFsValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  return null;
}

function parseFsDocument(doc) {
  const result = {};
  Object.entries((doc && doc.fields) || {}).forEach(function (entry) {
    result[entry[0]] = parseFsValue(entry[1]);
  });
  result.__updateTime = doc && doc.updateTime ? doc.updateTime : "";
  return result;
}

async function firestoreRequest(env, url, init) {
  const accessToken = await serviceAccountAccessToken(env);
  const options = Object.assign({}, init || {});
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", "Bearer " + accessToken);
  if (options.body) headers.set("Content-Type", "application/json");
  options.headers = headers;
  return fetch(url, options);
}

function encodedDocPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function getFirestoreDoc(env, path) {
  const response = await firestoreRequest(env, firestoreBase(env) + "/" + encodedDocPath(path));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Firestore GET " + path + " returned " + response.status);
  return parseFsDocument(await response.json());
}

async function patchFirestoreDoc(env, path, fields) {
  const masks = Object.keys(fields)
    .map(function (field) { return "updateMask.fieldPaths=" + encodeURIComponent(field); })
    .join("&");
  const url = firestoreBase(env) + "/" + encodedDocPath(path) + (masks ? "?" + masks : "");
  const typedFields = {};
  Object.entries(fields).forEach(function (entry) {
    typedFields[entry[0]] = fsValue(entry[1]);
  });

  const response = await firestoreRequest(env, url, {
    method: "PATCH",
    body: JSON.stringify({ fields: typedFields })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Firestore PATCH " + path + " returned " + response.status + ": " + detail.slice(0, 240));
  }
  return parseFsDocument(await response.json());
}

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

function plusLimit(env) {
  const parsed = Number.parseInt(env.PLUS_DAILY_FAIR_USE_LIMIT || "100", 10);
  return Math.max(20, Number.isFinite(parsed) ? parsed : 100);
}

async function guestKey(request, env) {
  const forwarded = request.headers.get("X-Forwarded-For") || "";
  const ip = request.headers.get("CF-Connecting-IP") || forwarded.split(",")[0].trim() || "unknown";
  const material = utcDay() + ":" + String(env.GUEST_HASH_SALT || "prelaunch") + ":" + ip;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return utcDay() + "_" + base64UrlEncodeBytes(new Uint8Array(digest)).slice(0, 32);
}

async function resolveEntitlement(user, request, env) {
  const today = utcDay();

  if (user && user.uid) {
    const doc = await getFirestoreDoc(env, "users/" + user.uid);
    const data = doc || {};

    if (data.isSubscribed === true) {
      const used = data.plusUsageDate === today ? Number(data.plusUsageCount || 0) : 0;
      if (used >= plusLimit(env)) {
        return { allowed:false, remaining:0, tier:"subscribed", reason:"plus_fair_use_exhausted", current:data };
      }
      return { allowed:true, remaining:plusLimit(env) - used, tier:"subscribed", current:data };
    }

    if (data.passExpiresAt) {
      const expiry = Date.parse(data.passExpiresAt);
      if (Number.isFinite(expiry) && expiry > Date.now()) {
        return { allowed:true, remaining:9999, tier:"pass", current:data };
      }
    }

    const credits = data.lastResetDate === today ? Number(data.credits ?? FREE_DAILY_CREDITS) : FREE_DAILY_CREDITS;
    if (credits <= 0) {
      return { allowed:false, remaining:0, tier:"free", reason:"quota_exhausted", current:data };
    }
    return {
      allowed:true,
      remaining:credits,
      tier:"free",
      current:data,
      needsReset:data.lastResetDate !== today,
      isNew:!doc
    };
  }

  const key = await guestKey(request, env);
  const doc = await getFirestoreDoc(env, "guest_usage/" + key);
  const used = Number(doc && doc.count ? doc.count : 0);
  if (used >= GUEST_DAILY_CREDITS) {
    return { allowed:false, remaining:0, tier:"guest", reason:"guest_quota_exhausted", guestKey:key };
  }
  return { allowed:true, remaining:0, tier:"guest", guestKey:key };
}

async function consumeEntitlement(user, decision, env) {
  const now = new Date().toISOString();
  const today = utcDay();

  if (decision.tier === "guest") {
    const current = await getFirestoreDoc(env, "guest_usage/" + decision.guestKey);
    await patchFirestoreDoc(env, "guest_usage/" + decision.guestKey, {
      count:Number(current && current.count ? current.count : 0) + 1,
      date:today,
      updatedAt:now
    });
    return;
  }

  if (!user || !user.uid || decision.tier === "pass") return;

  if (decision.tier === "subscribed") {
    const previous = decision.current && decision.current.plusUsageDate === today
      ? Number(decision.current.plusUsageCount || 0)
      : 0;
    await patchFirestoreDoc(env, "users/" + user.uid, {
      plusUsageDate:today,
      plusUsageCount:previous + 1,
      lastActive:now
    });
    return;
  }

  if (decision.tier === "free") {
    const previousCredits = decision.current && decision.current.lastResetDate === today
      ? Number(decision.current.credits ?? FREE_DAILY_CREDITS)
      : FREE_DAILY_CREDITS;
    await patchFirestoreDoc(env, "users/" + user.uid, {
      email:user.email || "",
      credits:Math.max(0, previousCredits - 1),
      isSubscribed:Boolean(decision.current && decision.current.isSubscribed),
      lastResetDate:today,
      createdAt:decision.current && decision.current.createdAt ? decision.current.createdAt : now,
      lastActive:now
    });
  }
}

function sanitizeInput(value, maxLength) {
  return String(value || "")
    .trim()
    .slice(0, maxLength || 1500)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function sanitizeMetadata(value, maxLength, fallback) {
  const cleaned = String(value || "")
    .replace(/[^a-zA-Z0-9\s\-_.',]/g, "")
    .trim()
    .slice(0, maxLength || 80);
  return cleaned || fallback || "beloved";
}

function hasCrisisTrigger(text) {
  return CRISIS_PATTERNS.some(function (pattern) { return pattern.test(text); });
}

function selectedMode(mode) {
  const candidate = String(mode || "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(MODE_INSTRUCTIONS, candidate) ? candidate : "comfort";
}

function buildMessages(payload) {
  const mode = selectedMode(payload.mode);
  const name = sanitizeMetadata(payload.userName, 30, "beloved");
  const psyche = sanitizeMetadata(payload.userPsyche, 80, "A soul seeking peace");
  const intentions = sanitizeMetadata(payload.userIntentions, 100, "Seeking peace");
  const system = SYSTEM_PROMPT_LINES.join("\n")
    .replace("{{MODE}}", MODE_INSTRUCTIONS[mode])
    .replace("{{NAME}}", name)
    .replace("{{PSYCHE}}", psyche)
    .replace("{{INTENTIONS}}", intentions);

  const messages = [{ role:"system", content:system }];
  const history = Array.isArray(payload.history) ? payload.history.slice(-6) : [];
  history.forEach(function (turn) {
    const content = sanitizeInput(turn && turn.content, 800);
    if (!content) return;
    messages.push({ role:turn && turn.role === "user" ? "user" : "assistant", content:content });
  });
  messages.push({ role:"user", content:sanitizeInput(payload.message, 1500) });
  return { messages:messages, mode:mode, psyche:psyche };
}

function modelCandidates(env) {
  return String(env.AI_MODELS || "openai/gpt-oss-20b,openai/gpt-oss-120b")
    .split(",")
    .map(function (model) { return model.trim(); })
    .filter(Boolean);
}

async function groqComplete(messages, env) {
  const apiKey = env.AI_API_KEY || env.GROQ_API_KEY;
  if (!apiKey) throw new Error("AI API key is missing");

  let lastError = null;
  for (const model of modelCandidates(env)) {
    try {
      const response = await fetch(GROQ_CHAT_URL, {
        method:"POST",
        headers:{
          "Authorization":"Bearer " + apiKey,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          model:model,
          messages:messages,
          temperature:0.7,
          max_tokens:4096,
          stream:false
        })
      });
      if (!response.ok) {
        lastError = new Error("Groq " + model + " returned " + response.status);
        continue;
      }
      const body = await response.json();
      const content = body && body.choices && body.choices[0] && body.choices[0].message
        ? body.choices[0].message.content
        : "";
      if (typeof content === "string" && content.trim()) return content.trim();
      lastError = new Error("Groq " + model + " returned no content");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No configured AI model returned a response");
}

function verseRefExists(reference) {
  const match = String(reference || "").trim().match(/^(.*?)\s+(\d+):(\d+(?:-\d+)?)$/);
  if (!match) return false;
  const book = match[1].replace(/\s+/g, " ").trim().toLowerCase();
  const chapter = Number(match[2]);
  const maxChapter = BIBLE_CHAPTER_LIMITS[book];
  return Boolean(maxChapter && chapter >= 1 && chapter <= maxChapter);
}

function stripInvalidCitations(text) {
  return String(text || "")
    .replace(
      /\(\s*(Song\s+of\s+(?:Solomon|Songs)|(?:[1-3]\s+)?[A-Za-z]+)\s+(\d+):(\d+(?:-\d+)?)\s*\)/gi,
      function (full, book, chapter, verse) {
        return verseRefExists(book + " " + chapter + ":" + verse) ? full : "";
      }
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanCloudReply(rawReply, fallbackPsyche) {
  let text = String(rawReply || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .trim();

  text = stripInvalidCitations(text);

  const psycheMatch = text.match(/^\s*PSYCHE\s*:\s*(.+)$/im);
  const updatedPsyche = psycheMatch
    ? sanitizeMetadata(psycheMatch[1], 80, fallbackPsyche)
    : fallbackPsyche;

  const cardMatch = text.match(/\[CARD\]([\s\S]*?)\[\/CARD\]/i);
  let cardText = cardMatch ? cardMatch[1].trim() : "";
  if (!cardText) {
    const verse = text.match(/“([^”]+)”\s*\(([^)]+)\)/);
    cardText = verse
      ? "“" + verse[1].trim() + "” (" + verse[2].trim() + ")\n\nMay His peace, purpose, and strength guide your steps today."
      : "May the peace of Christ rule in your heart and renew your strength today. (Colossians 3:15)";
  }

  const reply = text
    .replace(/\[CARD\][\s\S]*?(?:\[\/CARD\]|$)/gi, "")
    .replace(/^\s*PSYCHE\s*:.*$/gim, "")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { reply:reply, cardText:cardText, updatedPsyche:updatedPsyche };
}

function denialPayload(decision, psyche) {
  if (decision.reason === "guest_quota_exhausted") {
    return { error:"AUTH_REQUIRED", reply:GUEST_AUTH_REQUIRED_REPLY, cardText:"", updatedPsyche:psyche };
  }
  if (decision.reason === "plus_fair_use_exhausted") {
    return { error:"FAIR_USE_EXHAUSTED", reply:PLUS_FAIR_USE_REPLY, cardText:"", updatedPsyche:psyche };
  }
  return { error:"PAYWALL_EXHAUSTED", reply:PAYWALL_EXHAUSTED_REPLY, cardText:"", updatedPsyche:psyche };
}

async function handleChat(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return jsonResponse(request, env, { detail:"Invalid JSON body." }, 400);
  }

  const message = sanitizeInput(payload && payload.message, 1500);
  if (!message) return jsonResponse(request, env, { detail:"Message cannot be empty." }, 400);

  const mode = selectedMode(payload && payload.mode);
  if (mode !== "study") {
    return jsonResponse(request, env, {
      error:"LOCAL_ROUTE_REQUIRED",
      degraded:true,
      reply:"This mode belongs to the private local experience on your device."
    }, 400);
  }

  if (hasCrisisTrigger(message)) {
    return jsonResponse(request, env, {
      reply:CRISIS_RESPONSE,
      cardText:"",
      updatedPsyche:"Seeking immediate human support",
      isCrisis:true
    });
  }

  const fallbackPsyche = sanitizeMetadata(payload && payload.userPsyche, 80, "A soul seeking peace");
  let user;
  let decision;
  try {
    user = await getVerifiedUser(request, env);
    decision = await resolveEntitlement(user, request, env);
  } catch (error) {
    console.error("Entitlement lookup failed:", error && error.message ? error.message : error);
    return jsonResponse(request, env, {
      error:"SERVICE_DEGRADED",
      degraded:true,
      reply:DEGRADED_REPLY,
      cardText:"",
      updatedPsyche:fallbackPsyche
    });
  }

  if (!decision.allowed) {
    return jsonResponse(request, env, denialPayload(decision, fallbackPsyche));
  }

  const built = buildMessages(Object.assign({}, payload, { message:message, mode:mode }));
  let rawReply;
  try {
    rawReply = await groqComplete(built.messages, env);
  } catch (error) {
    console.error("Ask Deeper provider failed:", error && error.message ? error.message : error);
    return jsonResponse(request, env, {
      error:"SERVICE_DEGRADED",
      degraded:true,
      reply:DEGRADED_REPLY,
      cardText:"",
      updatedPsyche:built.psyche
    });
  }

  try {
    await consumeEntitlement(user, decision, env);
  } catch (error) {
    console.error("Quota consumption failed:", error && error.message ? error.message : error);
    return jsonResponse(request, env, {
      error:"SERVICE_DEGRADED",
      degraded:true,
      reply:DEGRADED_REPLY,
      cardText:"",
      updatedPsyche:built.psyche
    });
  }

  const cleaned = cleanCloudReply(rawReply, built.psyche);
  const remainingCredits = decision.tier === "free"
    ? Math.max(0, Number(decision.remaining || 0) - 1)
    : Number(decision.remaining || 0);

  return jsonResponse(request, env, {
    reply:cleaned.reply,
    cardText:cleaned.cardText,
    updatedPsyche:cleaned.updatedPsyche,
    remainingCredits:remainingCredits,
    mode:mode
  });
}

async function entitlementPayload(request, env) {
  const user = await getVerifiedUser(request, env);
  if (!user || !user.uid) {
    return { authenticated:false, isSubscribed:false, credits:0, remainingAskDeeper:0, tier:"guest" };
  }
  const decision = await resolveEntitlement(user, request, env);
  return {
    authenticated:true,
    uid:user.uid,
    email:user.email || "",
    isSubscribed:decision.tier === "subscribed" || decision.tier === "pass",
    credits:decision.tier === "free" ? Number(decision.remaining || 0) : 0,
    remainingAskDeeper:Number(decision.remaining || 0),
    tier:decision.tier
  };
}

async function verifyLemonSignature(rawBody, signatureHex, secret) {
  if (!rawBody || !signatureHex || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name:"HMAC", hash:"SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody))
  );
  const actualHex = Array.from(signature, function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
  if (actualHex.length !== signatureHex.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actualHex.length; index += 1) {
    mismatch |= actualHex.charCodeAt(index) ^ signatureHex.charCodeAt(index);
  }
  return mismatch === 0;
}

async function handleLemonWebhook(request, env) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature") || "";
  if (!(await verifyLemonSignature(rawBody, signature, env.LEMON_WEBHOOK_SECRET))) {
    return jsonResponse(request, env, { detail:"Invalid signature." }, 400);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (_) {
    return jsonResponse(request, env, { detail:"Invalid payload format." }, 400);
  }

  const eventName = String(payload && payload.meta && payload.meta.event_name || "unknown");
  const customData = payload && payload.meta && payload.meta.custom_data ? payload.meta.custom_data : {};
  const userId = String(customData.user_id || "");
  const attrs = payload && payload.data && payload.data.attributes ? payload.data.attributes : {};
  const status = String(attrs.status || "").toLowerCase();

  if (!userId || !/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
    return jsonResponse(request, env, { status:"ignored", event:eventName });
  }

  const now = new Date();
  if (eventName === "order_created") {
    await patchFirestoreDoc(env, "users/" + userId, {
      passExpiresAt:new Date(now.getTime() + 7 * 86400000).toISOString(),
      lastPlanUpdate:now.toISOString()
    });
    return jsonResponse(request, env, { status:"success", event:eventName });
  }

  if (eventName === "order_refunded") {
    await patchFirestoreDoc(env, "users/" + userId, {
      passExpiresAt:null,
      isSubscribed:false,
      lastPlanUpdate:now.toISOString()
    });
    return jsonResponse(request, env, { status:"success", event:eventName });
  }

  const activeEvents = new Set([
    "subscription_created",
    "subscription_payment_success",
    "subscription_resumed",
    "subscription_unpaused"
  ]);
  const inactiveEvents = new Set([
    "subscription_cancelled",
    "subscription_expired",
    "subscription_paused",
    "subscription_payment_failed",
    "subscription_payment_refunded"
  ]);

  let shouldActivate = null;
  if (eventName === "subscription_updated") {
    shouldActivate = status === "active" || status === "on_trial";
  } else if (activeEvents.has(eventName)) {
    shouldActivate = true;
  } else if (inactiveEvents.has(eventName)) {
    shouldActivate = false;
  }

  if (shouldActivate !== null) {
    await patchFirestoreDoc(env, "users/" + userId, {
      isSubscribed:shouldActivate,
      lastPlanUpdate:now.toISOString()
    });
  }

  return jsonResponse(request, env, { status:"success", event:eventName });
}

function health(env) {
  return {
    status:"active",
    service:"1into1 with Jesus Cloudflare API",
    version:"5.0.0",
    cloud_provider:"groq-fetch",
    cloud_configured:Boolean(env.AI_API_KEY || env.GROQ_API_KEY),
    db_connected:Boolean(env.FIREBASE_SERVICE_ACCOUNT && env.FIREBASE_PROJECT_ID)
  };
}

function readiness(env) {
  const checks = {
    database:Boolean(env.FIREBASE_SERVICE_ACCOUNT && env.FIREBASE_PROJECT_ID),
    cloud_ai:Boolean(env.AI_API_KEY || env.GROQ_API_KEY),
    lemon_webhook_secret:Boolean(env.LEMON_WEBHOOK_SECRET),
    guest_hash_salt:Boolean(env.GUEST_HASH_SALT),
    production_www_origin:allowedOrigins(env).has("https://www.1into1.com"),
    production_apex_origin:allowedOrigins(env).has("https://1into1.com"),
    cloudflare_preview_origin:allowedOrigins(env).has("https://oneintoone-jesus.aniketw3699.workers.dev")
  };
  return {
    status:Object.values(checks).every(Boolean) ? "ready" : "degraded",
    checks:checks,
    cloud_provider:"groq-fetch",
    service:"1into1 with Jesus Cloudflare API",
    version:"5.0.0"
  };
}

export const __test = {
  sanitizeInput:sanitizeInput,
  sanitizeMetadata:sanitizeMetadata,
  selectedMode:selectedMode,
  buildMessages:buildMessages,
  verseRefExists:verseRefExists,
  stripInvalidCitations:stripInvalidCitations,
  cleanCloudReply:cleanCloudReply,
  verifyLemonSignature:verifyLemonSignature,
  parseFsDocument:parseFsDocument,
  fsValue:fsValue
};

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") return optionsResponse(request, env);

      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (request.method === "GET" && ["/", "/health", "/api", "/api/health"].includes(path)) {
        return jsonResponse(request, env, health(env));
      }

      if (request.method === "GET" && ["/readiness", "/api/readiness"].includes(path)) {
        return jsonResponse(request, env, readiness(env));
      }

      if (request.method === "POST" && ["/chat", "/api/chat"].includes(path)) {
        return await handleChat(request, env);
      }

      if (request.method === "GET" && ["/entitlement", "/api/entitlement"].includes(path)) {
        try {
          return jsonResponse(request, env, await entitlementPayload(request, env));
        } catch (error) {
          console.error("Entitlement endpoint failed:", error && error.message ? error.message : error);
          return jsonResponse(request, env, { detail:"Entitlement service unavailable." }, 503);
        }
      }

      if (
        request.method === "POST" &&
        ["/webhook/lemon", "/webhook/lemonsqueezy", "/api/webhook/lemon", "/api/webhook/lemonsqueezy"].includes(path)
      ) {
        return await handleLemonWebhook(request, env);
      }

      return jsonResponse(request, env, { detail:"Not found." }, 404);
    } catch (error) {
      console.error("Unhandled Worker error:", error && error.stack ? error.stack : error);
      return jsonResponse(request, env, {
        detail:"Cloud service temporarily unavailable.",
        localCoreAvailable:true
      }, 503);
    }
  }
};
