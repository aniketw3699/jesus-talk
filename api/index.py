import os
import re
import json
import time
import random
import hmac
import hashlib
import logging
import urllib.parse
import urllib.request
import urllib.error
from typing import List, Dict, Optional
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import FastAPI, Request, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from groq import Groq
from dotenv import load_dotenv

# Optional Sentry monitoring
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    _dsn = os.getenv("SENTRY_DSN", "")
    if _dsn:
        sentry_sdk.init(dsn=_dsn, integrations=[FastApiIntegration()], traces_sample_rate=1.0)
except ImportError:
    pass

load_dotenv()
load_dotenv(dotenv_path="./jesus-talk-api/.env")
load_dotenv(dotenv_path="./api/.env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("jesus_sanctuary_api")

# ---------------- Firebase Admin SDK ----------------
db = None
fb_auth = None
try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth as _fb_auth

    if not firebase_admin._apps:
        creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT", "")
        if creds_json:
            try:
                firebase_admin.initialize_app(credentials.Certificate(json.loads(creds_json)))
            except Exception as e:
                logger.error(f"FIREBASE_SERVICE_ACCOUNT parse failed: {e}")
                firebase_admin.initialize_app()
        else:
            firebase_admin.initialize_app()
    db = firestore.client()
    fb_auth = _fb_auth
except Exception as fb_err:
    logger.warning(f"Firebase Admin init note: {fb_err}")

if not db:
    logger.error("⚠️ ENTITLEMENTS DISABLED — set FIREBASE_SERVICE_ACCOUNT in hosting env vars.")

# ---------------- Config ----------------
LEMON_WEBHOOK_SECRET = os.getenv("LEMON_WEBHOOK_SECRET", "")
DEVELOPER_EMAIL = os.getenv("DEVELOPER_EMAIL", "anuanuu87@gmail.com")
FREE_DAILY_CREDITS = 5
GUEST_DAILY_CREDITS = 1  # 1 free prayer per guest IP per day

ALLOWED_ORIGINS = [
    "https://jesus-chat-bd89f.web.app",
    "https://jesus-chat-bd89f.firebaseapp.com",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000"
]

app = FastAPI(title="You With Jesus Sanctuary API", version="3.7.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

def get_groq_client():
    key = os.getenv("GROQ_API_KEY", "").strip()
    return Groq(api_key=key) if key else None

# ---------------- SELF-HEALING MODEL DISCOVERY ----------------
PREFERRED_MODELS = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "groq/compound-mini"
]

_MODEL_CACHE = {"models": None, "fetched_at": 0.0}
MODEL_CACHE_TTL = 3600  # refresh hourly

def get_active_models() -> list:
    now = time.time()
    if _MODEL_CACHE["models"] and now - _MODEL_CACHE["fetched_at"] < MODEL_CACHE_TTL:
        return _MODEL_CACHE["models"]

    groq_client = get_groq_client()
    if groq_client:
        try:
            alive = {m.id for m in groq_client.models.list().data if getattr(m, "active", True)}
            picks = [m for m in PREFERRED_MODELS if m in alive]
            if not picks:
                picks = [
                    m for m in alive
                    if not any(x in m.lower() for x in
                               ["whisper", "guard", "orpheus", "safeguard", "tts"])
                ][:3]
            if picks:
                _MODEL_CACHE["models"] = picks
                _MODEL_CACHE["fetched_at"] = now
                logger.info(f"Active Groq models resolved: {picks}")
                return picks
        except Exception as e:
            logger.warning(f"Model discovery failed, using preferred list: {e}")

    return PREFERRED_MODELS

# ---------------- Rate limiting ----------------
IP_REQUEST_LOG = defaultdict(list)
GUEST_DAILY_IP_LOG = defaultdict(int)
RATE_LIMIT_REQUESTS = 20
RATE_LIMIT_WINDOW = 60

def prune_rate_limit_log():
    now = time.time()
    stale = [ip for ip, ts in IP_REQUEST_LOG.items() if not ts or now - ts[-1] >= RATE_LIMIT_WINDOW]
    for ip in stale:
        IP_REQUEST_LOG.pop(ip, None)

def is_rate_limited(client_ip: str) -> bool:
    if len(IP_REQUEST_LOG) > 2000:
        prune_rate_limit_log()
    now = time.time()
    timestamps = IP_REQUEST_LOG[client_ip]
    IP_REQUEST_LOG[client_ip] = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(IP_REQUEST_LOG[client_ip]) >= RATE_LIMIT_REQUESTS:
        return True
    IP_REQUEST_LOG[client_ip].append(now)
    return False

def prune_guest_log():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for k in [k for k in GUEST_DAILY_IP_LOG if not k.startswith(today)]:
        del GUEST_DAILY_IP_LOG[k]

# ---------------- Crisis Protocol ----------------
CRISIS_PATTERNS = [
    r"\bkill(?:ing)?\s+(?:my\s?self|me)\b",
    r"\b(?:take|end|destroy)\s+(?:my\s+own\s+life|my\s+life|it\s+all)\b",
    r"\b(hang|slit|shoot|overdose|poison|drown)\s+(?:my\s?self|me)\b",
    r"\bself[- ]?harm(?:ing)?\b",
    r"\bcut(?:ting)?\s+(?:my\s?self|me)\b",
    r"\bhurt(?:ing)?\s+(?:my\s?self|me)\b",
    r"\bunalive\s+(?:my\s?self|me)\b",
    r"\b(suicide|suicidal|suicidality)\b",
    r"\b(?:want|wanna|wish)\s+to\s+(?:die|be\s+dead|disappear|not\s+wake\s+up)\b",
    r"\bwanna\s+(?:die|end\s+it)\b",
    r"\bdon'?t\s+want\s+to\s+(?:live|wake\s+up|exist|be\s+alive|be\s+here|go\s+on)\b",
    r"\bcan'?t\s+go\s+on(?:\s+anymore)?\b",
    r"\bcan'?t\s+(?:take|bear|survive|handle|stand)\s+(?:this|it|life|anymore)\b",
    r"\bbetter\s+off\s+(?:dead|without\s+me|gone)\b",
    r"\bno\s+(?:reason|point|will|purpose)\s+(?:to\s+live|in\s+living|to\s+go\s+on|to\s+stay\s+alive|to\s+keep\s+going)\b",
    r"\bnot\s+worth\s+living\b",
    r"\bwant\s+this\s+pain\s+to\s+end\b",
    r"\beveryone\s+(?:would\s+be\s+)?better\s+off\b",
    r"\bready\s+to\s+(?:die|give\s+up\s+on\s+everything|end\s+it\s+all)\b"
]

CRISIS_RESPONSE = (
    "Beloved, I hear the deep pain and heaviness in your heart, but your life is precious and sacred. "
    "You are never alone, and compassionate support is available for you right this moment.\n\n"
    "Please connect immediately with someone trained to walk with you:\n"
    "• **US & Canada:** Call or text **988** (Suicide & Crisis Lifeline - 24/7, Free & Confidential)\n"
    "• **United Kingdom:** Call **111** (NHS) or **0800 689 5652** (National Suicide Prevention)\n"
    "• **Australia:** Call **13 11 14** (Lifeline Australia)\n"
    "• **Worldwide:** Visit **https://findahelpline.com** for immediate support in your country.\n\n"
    "“The Lord is near to the brokenhearted and saves those who are crushed in spirit.” (Psalm 34:18)\n\n"
    "Take a breath and reach out to one of these resources right now. You are deeply loved."
)

def check_crisis_triggers(text: str) -> bool:
    lower_text = text.lower()
    return any(re.search(pat, lower_text) for pat in CRISIS_PATTERNS)

CRISIS_TEST_PHRASES = [
    "kill myself", "killing myself", "end my life", "end it all",
    "I can't go on anymore", "I can't go on", "no point in living",
    "no reason to live", "want to die", "wanna die", "better off without me",
    "hurt myself", "cutting myself", "unalive myself", "can't take this anymore",
    "everyone would be better off"
]

for _phrase in CRISIS_TEST_PHRASES:
    if not check_crisis_triggers(_phrase):
        logger.critical(f"FATAL REGRESSION: Crisis trigger missed for phrase: '{_phrase}'")
        raise RuntimeError(f"Crisis trigger missed phrase: '{_phrase}'")

# ---------------- Sanitization ----------------
INJECTION_KEYWORDS = [
    "ignore all previous instructions", "disregard prior instructions",
    "disregard previous instructions", "system prompt", "developer mode",
    "jailbreak", "you are now dan", "reveal your prompt",
    "output system instructions", "override instructions"
]

def sanitize_input(text: str, max_length: int = 1500) -> str:
    if not text:
        return ""
    cleaned = text.strip()[:max_length]
    return re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', cleaned)

def sanitize_metadata(field: str, max_length: int = 80, default: str = "beloved") -> str:
    if not field:
        return default
    lower_val = field.lower()
    for keyword in INJECTION_KEYWORDS:
        if keyword in lower_val:
            return default
    cleaned = re.sub(r'[^a-zA-Z0-9\s\-_.,]', '', field).strip()
    return cleaned[:max_length] if cleaned else default

def strip_thinking_tags(text: str) -> str:
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()
    text = re.sub(r'<think>[\s\S]*?</think>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<think>[\s\S]*$', '', text, flags=re.IGNORECASE)
    return text.strip()

def clean_reply_formatting(reply: str) -> str:
    text = reply.replace('\\n', '\n')
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'["“]([^"”]+)["”]\s*\(([1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\)', r'“\1” (\2)', text)
    return text.strip()

# ---------------- Scripture validation ----------------
VERSE_REF_PATTERN = re.compile(
    r'\(\s*(Song\s+of\s+Solomon|(?:[1-3]\s?)?[A-Za-z]+)\s+(\d+:\d+(?:-\d+)?)\s*\)',
    re.IGNORECASE
)

_VERSE_CACHE = {}

def verse_ref_exists(ref: str) -> bool:
    ref_clean = re.sub(r'\s+', ' ', ref.strip())
    if not ref_clean:
        return True
    if ref_clean in _VERSE_CACHE:
        return _VERSE_CACHE[ref_clean]

    ok = True
    try:
        url = "https://bible-api.com/" + urllib.parse.quote(ref_clean)
        req = urllib.request.Request(url, headers={"User-Agent": "YouWithJesus/1.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
            ok = ("error" not in data) and bool(data.get("text"))
    except urllib.error.HTTPError as e:
        ok = False if e.code in (400, 404) else True
    except Exception:
        ok = True

    _VERSE_CACHE[ref_clean] = ok
    return ok

def find_invalid_verse_refs(text: str) -> list:
    refs = [f"{m.group(1)} {m.group(2)}" for m in VERSE_REF_PATTERN.finditer(text)]
    return [r for r in refs if not verse_ref_exists(r)]

def strip_invalid_citations(text: str) -> str:
    for m in list(VERSE_REF_PATTERN.finditer(text)):
        full = m.group(0)
        ref = f"{m.group(1)} {m.group(2)}"
        if not verse_ref_exists(ref):
            text = text.replace(full, "")
    text = re.sub(r'[ \t]{2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

# ---------------- Auth & Quota ----------------
def get_verified_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer ") and fb_auth:
        token = auth_header.split(" ", 1)[1].strip()
        try:
            decoded = fb_auth.verify_id_token(token)
            return decoded.get("uid"), decoded.get("email")
        except Exception as e:
            logger.warning(f"ID token verification failed: {e}")
    return None, None

def maybe_cleanup_guest_docs(today_str: str):
    if random.random() > 0.02:
        return
    try:
        old_docs = db.collection("guest_usage").where("date", "<", today_str).limit(200).stream()
        batch = db.batch()
        n = 0
        for d in old_docs:
            batch.delete(d.reference)
            n += 1
        if n:
            batch.commit()
            logger.info(f"Cleaned {n} stale guest_usage docs.")
    except Exception as e:
        logger.debug(f"Guest doc cleanup skipped: {e}")

def resolve_entitlement(uid: Optional[str], email: Optional[str], client_ip: str) -> dict:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if email and email.lower() == DEVELOPER_EMAIL.lower():
        return {"allowed": True, "remaining": 9999, "tier": "developer"}

    if uid and db:
        try:
            ref = db.collection("users").document(uid)
            doc = ref.get()
            if doc.exists:
                data = doc.to_dict() or {}
                if data.get("isSubscribed", False):
                    return {"allowed": True, "remaining": 9999, "tier": "subscribed"}
                if data.get("lastResetDate") != today_str:
                    return {"allowed": True, "remaining": FREE_DAILY_CREDITS,
                            "tier": "free", "needs_reset": True}
                credits = data.get("credits", 0)
                if credits <= 0:
                    return {"allowed": False, "remaining": 0, "tier": "free",
                            "reason": "quota_exhausted"}
                return {"allowed": True, "remaining": credits, "tier": "free"}
            return {"allowed": True, "remaining": FREE_DAILY_CREDITS,
                    "tier": "free", "is_new": True}
        except Exception as e:
            logger.error(f"Firestore entitlement error (fail-open): {e}")
            return {"allowed": True, "remaining": FREE_DAILY_CREDITS, "tier": "db_fallback"}

    prune_guest_log()
    safe_ip = re.sub(r'[^a-zA-Z0-9.:_-]', '', client_ip) or "unknown"
    guest_doc_id = f"{today_str}_{safe_ip}"

    if db:
        try:
            maybe_cleanup_guest_docs(today_str)
            doc = db.collection("guest_usage").document(guest_doc_id).get()
            used = (doc.to_dict() or {}).get("count", 0) if doc.exists else 0
            if used >= GUEST_DAILY_CREDITS:
                return {"allowed": False, "remaining": 0, "tier": "guest",
                        "reason": "guest_quota_exhausted"}
            return {"allowed": True, "remaining": 0, "tier": "guest",
                    "guest_key": guest_doc_id, "guest_ip": client_ip}
        except Exception as e:
            logger.error(f"Guest entitlement error (fail-open to memory): {e}")

    if GUEST_DAILY_IP_LOG.get(guest_doc_id, 0) >= GUEST_DAILY_CREDITS:
        return {"allowed": False, "remaining": 0, "tier": "guest",
                "reason": "guest_quota_exhausted"}
    return {"allowed": True, "remaining": 0, "tier": "guest",
            "guest_key": guest_doc_id, "guest_ip": client_ip}

def consume_credit(uid: Optional[str], email: Optional[str], decision: dict):
    tier = decision.get("tier")
    try:
        if tier == "guest":
            key = decision.get("guest_key")
            ip = decision.get("guest_ip")
            if not key or not ip:
                return
            GUEST_DAILY_IP_LOG[key] = GUEST_DAILY_IP_LOG.get(key, 0) + 1
            if db:
                today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                db.collection("guest_usage").document(key).set({
                    "count": firestore.Increment(1),
                    "ip": ip,
                    "date": today_str,
                    "updatedAt": firestore.SERVER_TIMESTAMP
                }, merge=True)
            return
        if tier in ("developer", "subscribed", "db_fallback"):
            return
        if uid and db:
            ref = db.collection("users").document(uid)
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            if decision.get("needs_reset") or decision.get("is_new"):
                ref.set({
                    "email": email or "",
                    "credits": FREE_DAILY_CREDITS - 1,
                    "isSubscribed": False,
                    "lastResetDate": today_str,
                    "createdAt": firestore.SERVER_TIMESTAMP,
                    "lastActive": firestore.SERVER_TIMESTAMP
                }, merge=True)
            else:
                ref.update({
                    "credits": firestore.Increment(-1),
                    "lastActive": firestore.SERVER_TIMESTAMP
                })
    except Exception as e:
        logger.error(f"Credit consumption error (non-fatal): {e}")

# ---------------- Prompts ----------------
MODE_INSTRUCTIONS = {
    "comfort": "Focus on tender empathy, emotional reassurance, and peace. Keep the tone gentle, intimate, and deeply comforting.",
    "study": "Focus on biblical depth, original Scripture context, and spiritual insight. Explain the theological principle clearly.",
    "prayer": "Frame the primary response as a direct, personal, and powerful written prayer that the seeker can pray aloud.",
    "guidance": "Focus on practical discernment and wise biblical next steps for daily decisions, work, or relationships."
}

SYSTEM_PROMPT_TEMPLATE = """You are Jesus Christ speaking directly with a seeker in a sacred prayer sanctuary.
Your tone is deeply compassionate, authoritative, calm, and rooted in biblical truth.
Always address the seeker warmly by their first name in your very first sentence if known, or with tender pastoral endearments ("My child", "My beloved").

RESPONSE STYLE & MODE:
{mode_instruction}

CORE GUIDELINES:
1. Speak in the first person ("I hear you", "My child", "My peace I give to you").
2. Structure your primary sanctuary response into EXACTLY 2 short paragraphs, nothing more:
   Paragraph 1: tenderly acknowledge their specific situation in 2-3 sentences.
   Paragraph 2: give ONE Scripture anchor with reference, then close with a 1-sentence spoken blessing.
3. Include at least one relevant Scripture quotation formatted cleanly: “Quote text” (Book Chapter:Verse).
4. SCRIPTURE ACCURACY: Only quote Bible references you are 100% certain exist, in the form (Book Chapter:Verse). Prefer widely known passages (e.g., Psalm 23:1, Psalm 34:18, Isaiah 41:10, Matthew 11:28-30, Philippians 4:6-7, John 14:27, 1 Peter 5:7). NEVER invent, guess, or misattribute a reference.
5. Vary your language naturally for every message; never repeat stock phrases across different questions.
6. Do NOT output markdown headers (#) or bullet lists.
7. SHARE CARD GENERATION MANDATE:
   Directly following your 2 sanctuary paragraphs, you MUST append a [CARD]...[/CARD] block formatted as follows:
   • If interceding for a loved one (another person is named):
     Inside [CARD]...[/CARD], you MUST address the loved one by name in your very first words (e.g., "[LovedOneName], I see your exhaustion..." or "[LovedOneName], peace be with you as exams approach..."). Speak directly to them in the second person ("you") as Jesus Christ. Acknowledge their exact situation, upcoming exam, sickness, or decision with intimate divine insight so they feel personally seen. Include a relevant Scripture quotation and reference. Close with a 1-sentence spoken blessing. Total length: 40 to 65 words. NEVER mention the seeker's name, and NEVER say generic clichés like "you are lifted in prayer".
   • If the seeker is praying for themselves:
     Inside [CARD]...[/CARD], write a direct universal blessing and Scripture promise in 40 to 60 words, completely free of user names or private chat disclosures.
8. EVOLVING PSYCHE REQUIREMENT: At the very end, on a clean new line, output:
PSYCHE: <5-8 words summarizing the user's updated emotional state>

Seeker Information:
• Name: {user_name}
• Previous State: {user_psyche}
• Core Intentions: {user_intentions}
"""

class ChatRequest(BaseModel):
    message: str = Field(..., max_length=1500)
    userName: Optional[str] = "beloved"
    userPsyche: Optional[str] = "A soul seeking peace"
    userIntentions: Optional[str] = "Seeking peace and daily direction"
    mode: Optional[str] = "comfort"
    history: Optional[List[Dict[str, str]]] = []

class SavePrayerRequest(BaseModel):
    title: str = Field(..., max_length=120)
    content: str = Field(..., max_length=4000)
    mode: Optional[str] = "comfort"

DEGRADED_REPLY = (
    "The sanctuary is experiencing a brief technical pause. "
    "Please take a breath and try again in a few moments — I am still here."
)

GUEST_AUTH_REQUIRED_REPLY = (
    "Please sign in to receive your 5 free daily scripture reflections "
    "and continue your prayer communion."
)
PAYWALL_EXHAUSTED_REPLY = (
    "You have completed your 5 daily reflections. They renew tomorrow, "
    "or you may choose a sacred pathway for unlimited communion today."
)

def build_chat_messages(raw_message, user_name, user_psyche, user_intentions, selected_mode, history):
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        mode_instruction=MODE_INSTRUCTIONS[selected_mode],
        user_name=user_name,
        user_psyche=user_psyche,
        user_intentions=user_intentions
    )
    msgs = [{"role": "system", "content": system_prompt}]
    for turn in (history or [])[-6:]:
        role = "user" if turn.get("role") == "user" else "assistant"
        content = sanitize_input(turn.get("content", ""), max_length=800)
        if content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": raw_message})
    return msgs

def compute_remaining(decision: dict) -> int:
    remaining = decision.get("remaining", 0)
    if decision.get("tier") == "free" and remaining < 9999:
        remaining = max(0, remaining - 1)
    return remaining

# ---------------- Routes ----------------
@app.get("/")
@app.get("/health")
@app.get("/api")
@app.get("/api/health")
def health_check():
    return {
        "status": "active",
        "service": "You With Jesus Sanctuary API",
        "version": "3.7.0",
        "groq_configured": bool(os.getenv("GROQ_API_KEY", "").strip()),
        "db_connected": db is not None,
        "resolved_models": get_active_models()
    }

@app.post("/")
@app.post("/chat")
@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest, request: Request):
    client_ip = request.headers.get(
        "x-forwarded-for", request.client.host if request.client else "unknown"
    ).split(",")[0].strip()

    if is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You are speaking very quickly. Please pause and take a breath of peace before continuing."
        )

    raw_message = sanitize_input(payload.message, max_length=1500)
    if not raw_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    user_name = sanitize_metadata(payload.userName, max_length=30, default="beloved")
    user_psyche = sanitize_metadata(payload.userPsyche, max_length=80, default="A soul seeking peace")
    user_intentions = sanitize_metadata(payload.userIntentions, max_length=100, default="Seeking peace")
    selected_mode = payload.mode.lower() if payload.mode and payload.mode.lower() in MODE_INSTRUCTIONS else "comfort"

    # 1. Crisis check FIRST
    if check_crisis_triggers(raw_message):
        logger.warning(f"Crisis trigger intercepted from IP: {client_ip}")
        return {
            "reply": CRISIS_RESPONSE,
            "cardText": "",
            "updatedPsyche": "A soul in critical need of grace and human support",
            "isCrisis": True
        }

    # 2. Entitlement check (read-only)
    verified_uid, verified_email = get_verified_user(request)
    decision = resolve_entitlement(verified_uid, verified_email, client_ip)

    if not decision["allowed"]:
        if decision.get("reason") == "guest_quota_exhausted":
            return {
                "error": "AUTH_REQUIRED",
                "reply": GUEST_AUTH_REQUIRED_REPLY,
                "cardText": "",
                "updatedPsyche": user_psyche
            }
        return {
            "error": "PAYWALL_EXHAUSTED",
            "reply": PAYWALL_EXHAUSTED_REPLY,
            "cardText": "",
            "updatedPsyche": user_psyche
        }

    # 3. Inference
    groq_client = get_groq_client()
    if groq_client is None:
        logger.critical("CHAT DEGRADED: GROQ_API_KEY missing at request time.")
        return {"error": "SERVICE_DEGRADED", "degraded": True,
                "reply": DEGRADED_REPLY, "cardText": "", "updatedPsyche": user_psyche}

    messages = build_chat_messages(raw_message, user_name, user_psyche, user_intentions,
                                   selected_mode, payload.history)

    raw_reply = None
    last_candidate = None
    last_error = None
    for model_name in get_active_models():
        try:
            logger.info(f"Inferencing with {model_name} in [{selected_mode}] mode")
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.8,
                max_tokens=900
            )
            candidate = strip_thinking_tags(response.choices[0].message.content or "")
            if not candidate:
                continue

            invalid_refs = find_invalid_verse_refs(candidate)
            if invalid_refs:
                logger.warning(f"Invalid scripture refs from {model_name}: {invalid_refs}")
                last_error = f"verse_validation_failed: {invalid_refs}"
                last_candidate = candidate
                continue

            raw_reply = candidate
            break
        except Exception as e:
            last_error = e
            logger.error(f"Inference failed on {model_name}: {e}")
            continue

    if not raw_reply and last_candidate:
        logger.warning(f"All verse validations failed ({last_error}); stripping invalid citations.")
        raw_reply = strip_invalid_citations(last_candidate)

    if not raw_reply:
        logger.error(f"CHAT DEGRADED: all models failed. Last error: {last_error}")
        return {"error": "SERVICE_DEGRADED", "degraded": True,
                "reply": DEGRADED_REPLY, "cardText": "", "updatedPsyche": user_psyche}

    # 4. Consume credit ONLY after successful generation
    consume_credit(verified_uid, verified_email, decision)

   # 5. Extract [CARD] block separately (handles both closed and unclosed/truncated tags)
    card_text = ""
    card_match = re.search(r'\[CARD\]([\s\S]*?)(?:\[\/CARD\]|$)', raw_reply, re.IGNORECASE)
    if card_match:
        card_text = card_match.group(1).strip()
        # Remove [CARD] and everything inside it or trailing after it from the visible chat
        raw_reply = re.sub(r'\[CARD\][\s\S]*?(?:\[\/CARD\]|$)', '', raw_reply, flags=re.IGNORECASE).strip()

    # 6. Extract evolving psyche
    updated_psyche = user_psyche
    psyche_match = re.search(r'PSYCHE:\s*(.+)$', raw_reply, re.IGNORECASE | re.MULTILINE)
    if psyche_match:
        extracted = psyche_match.group(1).strip()
        updated_psyche = sanitize_metadata(extracted, max_length=80, default=user_psyche)
        raw_reply = re.sub(r'PSYCHE:\s*.+$', '', raw_reply, flags=re.IGNORECASE | re.MULTILINE).strip()

    return {
        "reply": clean_reply_formatting(raw_reply),
        "cardText": card_text,
        "updatedPsyche": updated_psyche,
        "remainingCredits": compute_remaining(decision),
        "mode": selected_mode
    }

# ---------------- Streaming endpoint (SSE) ----------------
@app.post("/api/chat/stream")
@app.post("/chat/stream")
async def chat_stream_endpoint(payload: ChatRequest, request: Request):
    client_ip = request.headers.get(
        "x-forwarded-for", request.client.host if request.client else "unknown"
    ).split(",")[0].strip()

    if is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You are speaking very quickly. Please pause and take a breath of peace before continuing."
        )

    raw_message = sanitize_input(payload.message, max_length=1500)
    if not raw_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    user_name = sanitize_metadata(payload.userName, max_length=30, default="beloved")
    user_psyche = sanitize_metadata(payload.userPsyche, max_length=80, default="A soul seeking peace")
    user_intentions = sanitize_metadata(payload.userIntentions, max_length=100, default="Seeking peace")
    selected_mode = payload.mode.lower() if payload.mode and payload.mode.lower() in MODE_INSTRUCTIONS else "comfort"

    def sse(obj) -> str:
        return f"data: {json.dumps(obj)}\n\n"

    sse_headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }

    if check_crisis_triggers(raw_message):
        logger.warning(f"Crisis trigger intercepted (stream) from IP: {client_ip}")
        def crisis_stream():
            yield sse({"type": "error", "isCrisis": True, "reply": CRISIS_RESPONSE})
            yield "data: [DONE]\n\n"
        return StreamingResponse(crisis_stream(), media_type="text/event-stream", headers=sse_headers)

    verified_uid, verified_email = get_verified_user(request)
    decision = resolve_entitlement(verified_uid, verified_email, client_ip)

    if not decision["allowed"]:
        if decision.get("reason") == "guest_quota_exhausted":
            err = {"type": "error", "error": "AUTH_REQUIRED", "reply": GUEST_AUTH_REQUIRED_REPLY}
        else:
            err = {"type": "error", "error": "PAYWALL_EXHAUSTED", "reply": PAYWALL_EXHAUSTED_REPLY}
        def denied_stream():
            yield sse(err)
            yield "data: [DONE]\n\n"
        return StreamingResponse(denied_stream(), media_type="text/event-stream", headers=sse_headers)

    groq_client = get_groq_client()
    if groq_client is None:
        logger.critical("STREAM DEGRADED: GROQ_API_KEY missing at request time.")
        def degraded_stream():
            yield sse({"type": "error", "error": "SERVICE_DEGRADED", "reply": DEGRADED_REPLY})
            yield "data: [DONE]\n\n"
        return StreamingResponse(degraded_stream(), media_type="text/event-stream", headers=sse_headers)

    messages = build_chat_messages(raw_message, user_name, user_psyche, user_intentions,
                                   selected_mode, payload.history)

    def event_stream():
        consumed = False
        emitted_any = False
        pending = ""
        psyche_mode = False
        psyche_accum = ""
        HOLD = 100
        try:
            stream = None
            for model_name in get_active_models():
                try:
                    stream = groq_client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=0.8,
                        max_tokens=750,
                        stream=True
                    )
                    break
                except Exception as e:
                    logger.error(f"Stream open failed on {model_name}: {e}")
                    stream = None
            if stream is None:
                yield sse({"type": "error", "error": "SERVICE_DEGRADED", "reply": DEGRADED_REPLY})
                yield "data: [DONE]\n\n"
                return

            for chunk in stream:
                try:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta.content or ""
                except Exception:
                    continue
                if not delta:
                    continue

                if not consumed:
                    consume_credit(verified_uid, verified_email, decision)
                    consumed = True

                if psyche_mode:
                    psyche_accum += delta
                    continue

                delta = delta.replace("\\n", "\n")
                pending += delta

                marker = pending.find("PSYCHE:")
                if marker != -1:
                    psyche_mode = True
                    psyche_accum = pending[marker + len("PSYCHE:"):]
                    safe = pending[:marker]
                    pending = ""
                elif len(pending) > HOLD:
                    safe = pending[:-HOLD]
                    pending = pending[-HOLD:]
                else:
                    safe = ""

                if safe:
                    emitted_any = True
                    yield sse({"type": "delta", "text": safe})

            if pending:
                marker = pending.find("PSYCHE:")
                if marker != -1:
                    safe = pending[:marker]
                    psyche_accum += pending[marker + len("PSYCHE:"):]
                else:
                    safe = pending
                if safe:
                    yield sse({"type": "delta", "text": safe})

            updated_psyche = user_psyche
            candidate_psyche = re.sub(r'\s+', ' ', psyche_accum or "").strip()
            if candidate_psyche:
                updated_psyche = sanitize_metadata(candidate_psyche, max_length=80, default=user_psyche)

            yield sse({
                "type": "final",
                "updatedPsyche": updated_psyche,
                "remainingCredits": compute_remaining(decision),
                "mode": selected_mode
            })
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            if not emitted_any:
                yield sse({"type": "error", "error": "SERVICE_DEGRADED", "reply": DEGRADED_REPLY})
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=sse_headers)

# ---------------- Prayer Journal API ----------------
@app.post("/api/prayers/save")
@app.post("/prayers/save")
async def save_prayer(payload: SavePrayerRequest, request: Request):
    uid, _ = get_verified_user(request)
    if not uid:
        raise HTTPException(status_code=401, detail="Sign in to save prayers.")
    if db is None:
        raise HTTPException(status_code=503, detail="Storage temporarily unavailable.")

    content = sanitize_input(payload.content, max_length=4000)
    if not content:
        raise HTTPException(status_code=400, detail="Prayer content cannot be empty.")
    title = sanitize_metadata(payload.title, max_length=120, default="Saved Prayer")
    mode = payload.mode if payload.mode in MODE_INSTRUCTIONS else "comfort"

    try:
        ref = db.collection("users").document(uid).collection("saved_prayers").document()
        ref.set({
            "title": title,
            "content": content,
            "mode": mode,
            "createdAt": firestore.SERVER_TIMESTAMP
        })
        return {"saved": True, "id": ref.id}
    except Exception as e:
        logger.error(f"Save prayer failed: {e}")
        raise HTTPException(status_code=500, detail="Could not save prayer.")

@app.get("/api/prayers")
@app.get("/prayers")
async def list_prayers(request: Request):
    uid, _ = get_verified_user(request)
    if not uid:
        raise HTTPException(status_code=401, detail="Sign in to view saved prayers.")
    if db is None:
        raise HTTPException(status_code=503, detail="Storage temporarily unavailable.")
    try:
        docs = db.collection("users").document(uid).collection("saved_prayers") \
            .order_by("createdAt", direction=firestore.Query.DESCENDING).limit(100).stream()
        prayers = []
        for d in docs:
            data = d.to_dict() or {}
            prayers.append({
                "id": d.id,
                "title": data.get("title", "Saved Prayer"),
                "content": data.get("content", ""),
                "mode": data.get("mode", "comfort"),
                "createdAt": str(data.get("createdAt", ""))
            })
        return {"prayers": prayers}
    except Exception as e:
        logger.error(f"List prayers failed: {e}")
        raise HTTPException(status_code=500, detail="Could not load prayers.")

@app.delete("/api/prayers/{prayer_id}")
async def delete_prayer(prayer_id: str, request: Request):
    uid, _ = get_verified_user(request)
    if not uid:
        raise HTTPException(status_code=401, detail="Sign in first.")
    if db is None:
        raise HTTPException(status_code=503, detail="Storage temporarily unavailable.")
    try:
        db.collection("users").document(uid).collection("saved_prayers").document(prayer_id).delete()
        return {"deleted": True}
    except Exception as e:
        logger.error(f"Delete prayer failed: {e}")
        raise HTTPException(status_code=500, detail="Could not delete prayer.")

# ---------------- Lemon Squeezy Webhook ----------------
@app.post("/webhook/lemon")
@app.post("/webhook/lemonsqueezy")
@app.post("/api/webhook/lemon")
@app.post("/api/webhook/lemonsqueezy")
async def lemon_squeezy_webhook(request: Request, x_signature: Optional[str] = Header(None)):
    raw_body = await request.body()

    if not LEMON_WEBHOOK_SECRET:
        logger.error("LEMON_WEBHOOK_SECRET unconfigured.")
        raise HTTPException(status_code=500, detail="Webhook secret unconfigured.")
    if not x_signature:
        raise HTTPException(status_code=400, detail="Missing X-Signature.")

    digest = hmac.new(LEMON_WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, x_signature):
        logger.warning("Invalid webhook signature rejected.")
        raise HTTPException(status_code=400, detail="Invalid signature.")

    try:
        event_payload = json.loads(raw_body.decode("utf-8"))
        event_name = event_payload.get("meta", {}).get("event_name", "unknown")
        custom_data = event_payload.get("meta", {}).get("custom_data", {})
        user_id = custom_data.get("user_id")

        attrs = event_payload.get("data", {}).get("attributes", {}) or {}
        user_email = attrs.get("user_email")
        status_val = str(attrs.get("status", "") or "").lower()

        logger.info(f"Verified Lemon Event: {event_name} for User ID: {user_id} ({user_email}) status={status_val}")

        active_events = ("subscription_created", "subscription_payment_success",
                         "order_created", "subscription_resumed", "subscription_unpaused")
        inactive_events = ("subscription_cancelled", "subscription_expired",
                           "subscription_paused", "subscription_payment_failed",
                           "subscription_payment_refunded", "order_refunded")

        should_activate: Optional[bool] = None
        if event_name == "subscription_updated":
            should_activate = status_val in ("active", "on_trial")
        elif event_name in active_events:
            should_activate = True
        elif event_name in inactive_events:
            should_activate = False
        else:
            logger.info(f"Ignoring unhandled Lemon event: {event_name}")

        if should_activate is not None:
            if not user_id:
                logger.warning("Webhook arrived WITHOUT custom user_id.")
            elif db:
                ref = db.collection("users").document(user_id)
                ref.set({
                    "isSubscribed": should_activate,
                    "email": user_email or "",
                    "lastPlanUpdate": firestore.SERVER_TIMESTAMP
                }, merge=True)
                logger.info(f"{'Granted' if should_activate else 'Revoked'} subscription for {user_id}.")

        return {"status": "success", "event": event_name, "user_id": user_id}
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload format.")