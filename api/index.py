import os
import re
import json
import time
import hmac
import hashlib
import logging
from typing import List, Dict, Optional
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import FastAPI, Request, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

try:
    from api.ai_provider import get_cloud_provider, describe_cloud_provider
except ImportError:
    from ai_provider import get_cloud_provider, describe_cloud_provider

# Optional Sentry monitoring
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    _dsn = os.getenv("SENTRY_DSN", "")
    if _dsn:
        _sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.05"))
        sentry_sdk.init(
            dsn=_dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=max(0.0, min(_sample_rate, 1.0)),
            send_default_pii=False,
            max_request_body_size="never"
        )
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
DEVELOPER_EMAIL = os.getenv("DEVELOPER_EMAIL", "").strip()
LEMON_PLUS_VARIANT_IDS = {
    item.strip()
    for item in os.getenv("LEMON_PLUS_VARIANT_IDS", "").split(",")
    if item.strip()
}
FREE_DAILY_CREDITS = int(os.getenv("FREE_DAILY_CREDITS", "5"))
GUEST_DAILY_CREDITS = int(os.getenv("GUEST_DAILY_CREDITS", "1"))
MAX_JSON_BODY_BYTES = int(os.getenv("MAX_JSON_BODY_BYTES", "32768"))
EXPOSE_HEALTH_DETAILS = os.getenv("EXPOSE_HEALTH_DETAILS", "").lower() in {"1", "true", "yes"}

DEFAULT_ALLOWED_ORIGINS = [
    "https://www.1into1.com",
    "https://1into1.com",
    "https://jesus-chat-bd89f.web.app",
    "https://jesus-chat-bd89f.firebaseapp.com",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000"
]
EXTRA_ALLOWED_ORIGINS = [
    item.strip().rstrip("/")
    for item in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if item.strip()
]
ALLOWED_ORIGINS = list(dict.fromkeys(DEFAULT_ALLOWED_ORIGINS + EXTRA_ALLOWED_ORIGINS))

app = FastAPI(title="1into1 with Jesus Sanctuary API", version="4.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.middleware("http")
async def production_request_guard(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH"}:
        raw_length = request.headers.get("content-length", "")
        try:
            if raw_length and int(raw_length) > MAX_JSON_BODY_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Request body is too large."}
                )
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header."})

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=(self)"
    return response

# ---------------- Cloud AI Provider ----------------
# Core prayer features run locally in the browser. This provider layer is
# reserved for deeper cloud reasoning and can be swapped without changing
# the chat endpoint implementation.

def get_cloud_status() -> dict:
    try:
        return describe_cloud_provider()
    except Exception as exc:
        logger.warning(f"Cloud provider status fallback: {exc}")
        return {"provider": "unknown", "configured": False, "models": []}

# ---------------- Rate limiting ----------------
IP_REQUEST_LOG = defaultdict(list)
GUEST_DAILY_IP_LOG = defaultdict(int)
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "12"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

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
    r"\bkill(?:ing)?\s+my\s?self\b",
    r"\b(?:take|end|destroy)\s+(?:my\s+own\s+life|my\s+life|it\s+all)\b",
    r"\b(hang|slit|shoot|overdose|poison|drown)\s+my\s?self\b",
    r"\bself[- ]?harm(?:ing)?\b",
    r"\bcut(?:ting)?\s+my\s?self\b",
    r"\bhurt(?:ing)?\s+my\s?self\b",
    r"\bunalive\s+my\s?self\b",
    r"\b(suicide|suicidal|suicidality)\b",
    r"\b(?:want|wanna|wish)\s+to\s+(?:die|be\s+dead|disappear|not\s+wake\s+up)\b",
    r"\bwanna\s+(?:die|end\s+it)\b",
    r"\bdon'?t\s+want\s+to\s+(?:live|wake\s+up|exist|be\s+alive|be\s+here|go\s+on)\b",
    r"\bcan'?t\s+go\s+on(?:\s+anymore)?\b",
    r"\bbetter\s+off\s+(?:dead|without\s+me|gone)\b",
    r"\bno\s+(?:reason|point|will|purpose)\s+(?:to\s+live|in\s+living|to\s+go\s+on|to\s+stay\s+alive|to\s+keep\s+going)\b",
    r"\bnot\s+worth\s+living\b",
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
    text = re.sub(r'["“]([^"”]+)["”]\s*\(([1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\)+', r'“\1” (\2)', text)
    return text.strip()

# ---------------- Scripture validation (Offline Canonical Map) ----------------
BIBLE_CHAPTER_LIMITS = {
    "genesis": 50, "exodus": 40, "leviticus": 27, "numbers": 36, "deuteronomy": 34,
    "joshua": 24, "judges": 21, "ruth": 4, "1 samuel": 31, "2 samuel": 24,
    "1 kings": 22, "2 kings": 25, "1 chronicles": 29, "2 chronicles": 36,
    "ezra": 10, "nehemiah": 13, "esther": 10, "job": 42, "psalms": 150, "psalm": 150,
    "proverbs": 31, "ecclesiastes": 12, "song of solomon": 8, "song of songs": 8,
    "isaiah": 66, "jeremiah": 52, "lamentations": 5, "ezekiel": 48, "daniel": 12,
    "hosea": 14, "joel": 3, "amos": 9, "obadiah": 1, "jonah": 4, "micah": 7,
    "nahum": 3, "habakkuk": 3, "zephaniah": 3, "haggai": 2, "zechariah": 14, "malachi": 4,
    "matthew": 28, "mark": 16, "luke": 24, "john": 21, "acts": 28, "romans": 16,
    "1 corinthians": 16, "2 corinthians": 13, "galatians": 6, "ephesians": 6,
    "philippians": 4, "colossians": 4, "1 thessalonians": 5, "2 thessalonians": 3,
    "1 timothy": 6, "2 timothy": 4, "titus": 3, "philemon": 1, "hebrews": 13,
    "james": 5, "1 peter": 5, "2 peter": 3, "1 john": 5, "2 john": 1, "3 john": 1,
    "jude": 1, "revelation": 22, "revelations": 22
}

VERSE_REF_PATTERN = re.compile(
    r'\(\s*(Song\s+of\s+(?:Solomon|Songs)|(?:[1-3]\s+)?[A-Za-z]+)\s+(\d+):(\d+(?:-\d+)?)\s*\)',
    re.IGNORECASE
)

def verse_ref_exists(ref: str) -> bool:
    match = re.match(r'^(.*?)\s+(\d+):(\d+(?:-\d+)?)$', ref.strip())
    if not match:
        return False
    book_raw, chapter_str, _ = match.groups()
    book_clean = re.sub(r'\s+', ' ', book_raw.strip().lower())
    
    max_chapters = BIBLE_CHAPTER_LIMITS.get(book_clean)
    if not max_chapters:
        return False
    try:
        chap_num = int(chapter_str)
        return 1 <= chap_num <= max_chapters
    except ValueError:
        return False

def find_invalid_verse_refs(text: str) -> list:
    refs = [f"{m.group(1)} {m.group(2)}:{m.group(3)}" for m in VERSE_REF_PATTERN.finditer(text)]
    return [r for r in refs if not verse_ref_exists(r)]

def strip_invalid_citations(text: str) -> str:
    for m in list(VERSE_REF_PATTERN.finditer(text)):
        full = m.group(0)
        ref = f"{m.group(1)} {m.group(2)}:{m.group(3)}"
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

def reserve_cloud_access(uid: Optional[str], email: Optional[str], client_ip: str) -> dict:
    """
    Atomically reserve one Ask Deeper use before the provider is called.
    This prevents concurrent requests from overspending free/guest quotas.
    """
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if DEVELOPER_EMAIL and email and email.lower() == DEVELOPER_EMAIL.lower():
        return {
            "allowed": True,
            "remaining": 9999,
            "tier": "developer",
            "reserved": False
        }

    if db is None or firestore is None:
        return {
            "allowed": False,
            "remaining": 0,
            "tier": "unavailable",
            "reason": "entitlement_unavailable"
        }

    if uid:
        ref = db.collection("users").document(uid)
        transaction = db.transaction()

        @firestore.transactional
        def reserve_user(txn):
            snapshot = ref.get(transaction=txn)
            exists = snapshot.exists
            data = snapshot.to_dict() or {} if exists else {}

            if bool(data.get("isSubscribed", False)):
                return {
                    "allowed": True,
                    "remaining": 9999,
                    "tier": "subscribed",
                    "reserved": False
                }

            if data.get("lastResetDate") != today_str:
                credits = FREE_DAILY_CREDITS
            else:
                try:
                    credits = int(data.get("credits", FREE_DAILY_CREDITS))
                except (TypeError, ValueError):
                    credits = FREE_DAILY_CREDITS

            credits = max(0, min(credits, FREE_DAILY_CREDITS))
            if credits <= 0:
                return {
                    "allowed": False,
                    "remaining": 0,
                    "tier": "free",
                    "reason": "quota_exhausted",
                    "reserved": False
                }

            remaining = credits - 1
            updates = {
                "email": email or data.get("email", ""),
                "credits": remaining,
                "isSubscribed": False,
                "lastResetDate": today_str,
                "lastActive": firestore.SERVER_TIMESTAMP
            }
            if not exists:
                updates["createdAt"] = firestore.SERVER_TIMESTAMP

            txn.set(ref, updates, merge=True)
            return {
                "allowed": True,
                "remaining": remaining,
                "tier": "free",
                "reserved": True,
                "reservation_kind": "user",
                "reservation_key": uid,
                "reservation_date": today_str
            }

        try:
            return reserve_user(transaction)
        except Exception as exc:
            logger.error(f"Firestore user entitlement reservation failed: {exc}")
            return {
                "allowed": False,
                "remaining": 0,
                "tier": "unavailable",
                "reason": "entitlement_unavailable"
            }

    safe_ip = re.sub(r'[^a-zA-Z0-9.:_-]', '', client_ip) or "unknown"
    guest_doc_id = f"{today_str}_{safe_ip}"
    ref = db.collection("guest_usage").document(guest_doc_id)
    transaction = db.transaction()

    @firestore.transactional
    def reserve_guest(txn):
        snapshot = ref.get(transaction=txn)
        data = snapshot.to_dict() or {} if snapshot.exists else {}
        try:
            used = int(data.get("count", 0))
        except (TypeError, ValueError):
            used = 0

        if used >= GUEST_DAILY_CREDITS:
            return {
                "allowed": False,
                "remaining": 0,
                "tier": "guest",
                "reason": "guest_quota_exhausted",
                "reserved": False
            }

        new_count = used + 1
        txn.set(ref, {
            "count": new_count,
            "ip": safe_ip,
            "date": today_str,
            "updatedAt": firestore.SERVER_TIMESTAMP
        }, merge=True)

        return {
            "allowed": True,
            "remaining": max(0, GUEST_DAILY_CREDITS - new_count),
            "tier": "guest",
            "reserved": True,
            "reservation_kind": "guest",
            "reservation_key": guest_doc_id,
            "reservation_date": today_str
        }

    try:
        return reserve_guest(transaction)
    except Exception as exc:
        logger.error(f"Firestore guest entitlement reservation failed: {exc}")
        return {
            "allowed": False,
            "remaining": 0,
            "tier": "unavailable",
            "reason": "entitlement_unavailable"
        }


def release_cloud_reservation(uid: Optional[str], decision: dict) -> None:
    """Best-effort refund when a reserved cloud request never produces an answer."""
    if not decision.get("reserved") or db is None or firestore is None:
        return

    kind = decision.get("reservation_kind")
    key = decision.get("reservation_key")
    reservation_date = decision.get("reservation_date")

    try:
        if kind == "user" and uid and key == uid:
            ref = db.collection("users").document(uid)
            transaction = db.transaction()

            @firestore.transactional
            def refund_user(txn):
                snapshot = ref.get(transaction=txn)
                if not snapshot.exists:
                    return
                data = snapshot.to_dict() or {}
                if data.get("lastResetDate") != reservation_date:
                    return
                try:
                    current = int(data.get("credits", 0))
                except (TypeError, ValueError):
                    current = 0
                txn.set(ref, {
                    "credits": min(FREE_DAILY_CREDITS, max(0, current) + 1),
                    "lastActive": firestore.SERVER_TIMESTAMP
                }, merge=True)

            refund_user(transaction)
            return

        if kind == "guest" and key:
            ref = db.collection("guest_usage").document(str(key))
            transaction = db.transaction()

            @firestore.transactional
            def refund_guest(txn):
                snapshot = ref.get(transaction=txn)
                if not snapshot.exists:
                    return
                data = snapshot.to_dict() or {}
                if data.get("date") != reservation_date:
                    return
                try:
                    current = int(data.get("count", 0))
                except (TypeError, ValueError):
                    current = 0
                txn.set(ref, {
                    "count": max(0, current - 1),
                    "updatedAt": firestore.SERVER_TIMESTAMP
                }, merge=True)

            refund_guest(transaction)
    except Exception as exc:
        logger.error(f"Cloud reservation refund failed: {exc}")

# ---------------- Prompts ----------------
MODE_INSTRUCTIONS = {
    "comfort": "Offer gentle Scripture-grounded comfort. Do not impersonate Jesus or claim divine authority. Help the user bring the concern to God with calm, practical language.",
    "study": "This is Ask Deeper mode. Focus on biblical context, literary setting, theology, and interpretation. Distinguish the biblical text from interpretation and note meaningful differences among major Christian traditions when relevant.",
    "prayer": "Write a personal prayer addressed to God or Jesus that the seeker can pray aloud. The assistant must never speak as God or Jesus.",
    "guidance": "Offer practical discernment and Scripture-grounded next steps for daily decisions, work, relationships, or habits. Avoid presenting personal advice as a divine command."
}

SYSTEM_PROMPT_TEMPLATE = """You are the 1into1 Scripture Companion: a Christian prayer and Bible-study assistant.

IDENTITY & BOUNDARIES:
- You are NOT Jesus Christ, God, the Holy Spirit, a prophet, clergy, or a divine authority.
- Never claim to be Jesus or to speak on Jesus' behalf.
- Never say that God personally told you a specific outcome or command for this user.
- Help the seeker pray to Jesus/God, understand Scripture, reflect, and make thoughtful next steps.
- Be warm and pastoral without using language that falsely implies divine identity.

RESPONSE MODE:
{mode_instruction}

SCRIPTURE & THEOLOGY:
1. Ground biblical claims in identifiable Scripture references.
2. Never invent a Bible reference or fabricate a quotation.
3. Prefer accurate references and concise paraphrase when exact wording is uncertain.
4. When a theological question has meaningful denominational differences, briefly identify the major interpretations rather than pretending there is only one uncontested Christian view.
5. Do not replace medical, legal, financial, mental-health, safeguarding, or emergency professionals with spiritual advice.

RESPONSE QUALITY:
1. Address the seeker's actual question directly rather than forcing every answer into the same devotional template.
2. For prayer requests, provide a complete prayer addressed to God/Jesus.
3. For study questions, explain context and interpretation clearly, then offer a short reflection or practical takeaway when useful.
4. For guidance questions, separate Scripture-grounded principles from your practical suggestions.
5. Keep answers complete and avoid unfinished sentences.
6. Continue numbered/multi-step requests from the conversation history rather than restarting.

SHARE CARD:
After the main response, append a [CARD]...[/CARD] block containing a concise 30-45 word Scripture-grounded blessing suitable for sharing. Do not put private identifying details in the card unless the user explicitly asked to pray for a named loved one.

PSYCHE:
At the very end, after the [CARD] block, output on its own line:
PSYCHE: <5-8 words summarizing the user's current emotional direction>

Seeker Information:
- Name: {user_name}
- Previous State: {user_psyche}
- Core Intentions: {user_intentions}
"""

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1500)
    userName: Optional[str] = Field(default="beloved", max_length=60)
    userPsyche: Optional[str] = Field(default="A soul seeking peace", max_length=120)
    userIntentions: Optional[str] = Field(default="Seeking peace and daily direction", max_length=240)
    mode: Optional[str] = Field(default="comfort", max_length=16)
    history: List[Dict[str, str]] = Field(default_factory=list, max_length=12)

class SavePrayerRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    content: str = Field(..., min_length=1, max_length=4000)
    mode: Optional[str] = Field(default="comfort", max_length=16)

DEGRADED_REPLY = (
    "Ask Deeper is temporarily unavailable. "
    "Your local prayer tools, Bible, journeys, journal, and Lay It Down still work on this device."
)

GUEST_AUTH_REQUIRED_REPLY = (
    "You have used today's guest Ask Deeper question. Sign in for 5 free Ask Deeper questions per day. "
    "Your local prayer tools, Bible, journeys, and Lay It Down remain available without using cloud AI."
)
PAYWALL_EXHAUSTED_REPLY = (
    "You have used today's 5 free Ask Deeper questions. They renew tomorrow. "
    "Your local prayer tools, Bible, journeys, and Lay It Down remain available."
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
    try:
        return max(0, int(decision.get("remaining", 0)))
    except (TypeError, ValueError):
        return 0

# ---------------- Routes ----------------
@app.get("/")
@app.get("/health")
@app.get("/api")
@app.get("/api/health")
def health_check():
    payload = {
        "status": "active",
        "service": "1into1 with Jesus Sanctuary API",
        "version": "4.1.0"
    }
    if EXPOSE_HEALTH_DETAILS:
        cloud = get_cloud_status()
        payload.update({
            "cloud_provider": cloud.get("provider"),
            "cloud_configured": cloud.get("configured", False),
            "db_connected": db is not None,
            "billing_variant_guard": bool(LEMON_PLUS_VARIANT_IDS)
        })
    return payload

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

    if check_crisis_triggers(raw_message):
        return {
            "reply": CRISIS_RESPONSE,
            "cardText": "",
            "updatedPsyche": "A soul in critical need of grace and human support",
            "isCrisis": True
        }

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

    cloud_provider = get_cloud_provider()
    if not cloud_provider.is_configured():
        return {"error": "SERVICE_DEGRADED", "degraded": True,
                "reply": DEGRADED_REPLY, "cardText": "", "updatedPsyche": user_psyche}

    messages = build_chat_messages(raw_message, user_name, user_psyche, user_intentions,
                                   selected_mode, payload.history)

    raw_reply = None
    last_candidate = None
    for model_name in cloud_provider.model_candidates():
        try:
            response_text = cloud_provider.complete(
                messages=messages,
                model=model_name,
                temperature=0.7,
                max_tokens=4096
            )
            candidate = strip_thinking_tags(response_text or "")
            if not candidate:
                continue

            invalid_refs = find_invalid_verse_refs(candidate)
            if invalid_refs:
                last_candidate = candidate
                continue

            raw_reply = candidate
            break
        except Exception as exc:
            logger.warning(f"Cloud model attempt failed ({cloud_provider.name}/{model_name}): {exc}")
            continue

    if not raw_reply and last_candidate:
        raw_reply = strip_invalid_citations(last_candidate)

    if not raw_reply:
        return {"error": "SERVICE_DEGRADED", "degraded": True,
                "reply": DEGRADED_REPLY, "cardText": "", "updatedPsyche": user_psyche}

    consume_credit(verified_uid, verified_email, decision)

    # 1. Reliably extract Psyche using an anchored line match
    updated_psyche = user_psyche
    psyche_match = re.search(r'^\s*PSYCHE\s*:\s*(.+)$', raw_reply, re.IGNORECASE | re.MULTILINE)
    if psyche_match:
        extracted = psyche_match.group(1).strip()
        if extracted:
            updated_psyche = sanitize_metadata(extracted, max_length=80, default=user_psyche)

    # 2. Extract Card Text strictly requiring closed [/CARD]
    card_text = ""
    card_match = re.search(r'\[CARD\]([\s\S]*?)\[\/CARD\]', raw_reply, re.IGNORECASE)
    if card_match:
        card_text = card_match.group(1).strip()
        card_text = re.sub(r'^\s*PSYCHE\s*:.*$', '', card_text, flags=re.IGNORECASE | re.MULTILINE)
        card_text = re.sub(r'\n{3,}', '\n\n', card_text).strip()

    # 3. Guardrail: If card is missing or unclosed, synthesize from sanctuary response
    if not card_text:
        verse_search = re.search(r'“([^”]+)”\s*\(([^)]+)\)', raw_reply)
        if verse_search:
            q_text, q_ref = verse_search.group(1).strip(), verse_search.group(2).strip()
            card_text = f"“{q_text}” ({q_ref})\n\nMay His peace, purpose, and strength guide your steps today."
        else:
            card_text = "May the peace of Christ rule in your heart and renew your strength today. (Colossians 3:15)"

    # 4. Clean reply from card/psyche tags
    clean_reply = re.sub(r'\[CARD\][\s\S]*?(?:\[\/CARD\]|$)', '', raw_reply, flags=re.IGNORECASE).strip()
    clean_reply = re.sub(r'^\s*PSYCHE\s*:.*$', '', clean_reply, flags=re.IGNORECASE | re.MULTILINE).strip()

    return {
        "reply": clean_reply_formatting(clean_reply),
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

    cloud_provider = get_cloud_provider()
    if not cloud_provider.is_configured():
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
            for model_name in cloud_provider.model_candidates():
                try:
                    stream = cloud_provider.stream(
                        messages=messages,
                        model=model_name,
                        temperature=0.7,
                        max_tokens=4096
                    )
                    break
                except Exception as exc:
                    logger.warning(f"Cloud stream model attempt failed ({cloud_provider.name}/{model_name}): {exc}")
                    stream = None
            if stream is None:
                yield sse({"type": "error", "error": "SERVICE_DEGRADED", "reply": DEGRADED_REPLY})
                yield "data: [DONE]\n\n"
                return

            for delta in stream:
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

                psyche_marker_match = re.search(r'(?:\n|^)\s*PSYCHE\s*:', pending, re.IGNORECASE)
                if psyche_marker_match:
                    psyche_mode = True
                    psyche_accum = pending[psyche_marker_match.start():]
                    safe = pending[:psyche_marker_match.start()]
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
                psyche_marker_match = re.search(r'(?:\n|^)\s*PSYCHE\s*:', pending, re.IGNORECASE)
                if psyche_marker_match:
                    safe = pending[:psyche_marker_match.start()]
                    psyche_accum += pending[psyche_marker_match.start():]
                else:
                    safe = pending
                if safe:
                    yield sse({"type": "delta", "text": safe})

            updated_psyche = user_psyche
            candidate_psyche = re.sub(r'^\s*PSYCHE\s*:\s*', '', psyche_accum or "", flags=re.IGNORECASE | re.MULTILINE).strip()
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

# ---------------- Prayer Journal & Webhooks ----------------
@app.post("/api/prayers/save")
@app.post("/prayers/save")
async def save_prayer(payload: SavePrayerRequest, request: Request):
    uid, _ = get_verified_user(request)
    if not uid:
        raise HTTPException(status_code=401, detail="Sign in to save prayers.")
    if db is None:
        raise HTTPException(status_code=503, detail="Storage unavailable.")

    content = sanitize_input(payload.content, max_length=4000)
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
    except Exception:
        raise HTTPException(status_code=500, detail="Could not save prayer.")

@app.get("/api/prayers")
@app.get("/prayers")
async def list_prayers(request: Request):
    uid, _ = get_verified_user(request)
    if not uid:
        raise HTTPException(status_code=401, detail="Sign in required.")
    if db is None:
        raise HTTPException(status_code=503, detail="Storage unavailable.")
    try:
        docs = db.collection("users").document(uid).collection("saved_prayers") \
            .order_by("createdAt", direction=firestore.Query.DESCENDING).limit(100).stream()
        prayers = [{
            "id": d.id,
            "title": d.to_dict().get("title", "Saved Prayer"),
            "content": d.to_dict().get("content", ""),
            "mode": d.to_dict().get("mode", "comfort"),
            "createdAt": str(d.to_dict().get("createdAt", ""))
        } for d in docs]
        return {"prayers": prayers}
    except Exception:
        raise HTTPException(status_code=500, detail="Could not load prayers.")

@app.delete("/api/prayers/{prayer_id}")
async def delete_prayer(prayer_id: str, request: Request):
    uid, _ = get_verified_user(request)
    if not uid:
        raise HTTPException(status_code=401, detail="Sign in required.")
    if db is None:
        raise HTTPException(status_code=503, detail="Storage unavailable.")
    db.collection("users").document(uid).collection("saved_prayers").document(prayer_id).delete()
    return {"deleted": True}

@app.post("/webhook/lemon")
@app.post("/webhook/lemonsqueezy")
@app.post("/api/webhook/lemon")
@app.post("/api/webhook/lemonsqueezy")
async def lemon_squeezy_webhook(request: Request, x_signature: Optional[str] = Header(None)):
    raw_body = await request.body()
    if not LEMON_WEBHOOK_SECRET or not x_signature:
        raise HTTPException(status_code=400, detail="Missing configuration or signature.")

    digest = hmac.new(LEMON_WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, x_signature):
        raise HTTPException(status_code=400, detail="Invalid signature.")

    try:
        event_payload = json.loads(raw_body.decode("utf-8"))
        event_name = event_payload.get("meta", {}).get("event_name", "unknown")
        custom_data = event_payload.get("meta", {}).get("custom_data", {})
        user_id = custom_data.get("user_id")

        attrs = event_payload.get("data", {}).get("attributes", {}) or {}
        status_val = str(attrs.get("status", "") or "").lower()

        # Handle 7-Day Pass one-time order
        if event_name == "order_created" and user_id and db:
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            db.collection("users").document(user_id).set({
                "passExpiresAt": expires_at,
                "lastPlanUpdate": firestore.SERVER_TIMESTAMP
            }, merge=True)
            return {"status": "success", "event": event_name}

        # Handle 7-Day Pass refund
        if event_name == "order_refunded" and user_id and db:
            db.collection("users").document(user_id).set({
                "passExpiresAt": None,
                "isSubscribed": False,
                "lastPlanUpdate": firestore.SERVER_TIMESTAMP
            }, merge=True)
            return {"status": "success", "event": event_name}

        # Handle recurring subscriptions
        active_events = ("subscription_created", "subscription_payment_success", "subscription_resumed", "subscription_unpaused")
        inactive_events = ("subscription_cancelled", "subscription_expired", "subscription_paused", "subscription_payment_failed", "subscription_payment_refunded")

        should_activate = None
        if event_name == "subscription_updated":
            should_activate = status_val in ("active", "on_trial")
        elif event_name in active_events:
            should_activate = True
        elif event_name in inactive_events:
            should_activate = False

        if should_activate is not None and user_id and db:
            db.collection("users").document(user_id).set({
                "isSubscribed": should_activate,
                "lastPlanUpdate": firestore.SERVER_TIMESTAMP
            }, merge=True)

        return {"status": "success", "event": event_name}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload format.")