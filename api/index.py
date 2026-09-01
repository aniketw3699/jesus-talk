import os
import re
import time
import json
import hmac
import hashlib
import logging
from typing import List, Dict, Optional
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import FastAPI, Request, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
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

ALLOWED_ORIGINS = [
    "https://jesus-chat-bd89f.web.app",
    "https://jesus-chat-bd89f.firebaseapp.com",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000"
]

app = FastAPI(title="You With Jesus Sanctuary API", version="3.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

def get_groq_client():
    key = os.getenv("GROQ_API_KEY", "").strip()
    return Groq(api_key=key) if key else None

# ---------------- SELF-HEALING MODEL DISCOVERY ----------------
PREFERRED_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b"
]

_MODEL_CACHE = {"models": None, "fetched_at": 0.0}
MODEL_CACHE_TTL = 3600  # refresh hourly

def get_active_models() -> list:
    """Ask Groq which models exist RIGHT NOW; pick preferred ones that are alive."""
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

# ---------------- Rate Limiting & Guest Tracking ----------------
IP_REQUEST_LOG = defaultdict(list)
GUEST_DAILY_IP_LOG = defaultdict(int)
RATE_LIMIT_REQUESTS = 20
RATE_LIMIT_WINDOW = 60

def is_rate_limited(client_ip: str) -> bool:
    now = time.time()
    timestamps = IP_REQUEST_LOG[client_ip]
    IP_REQUEST_LOG[client_ip] = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(IP_REQUEST_LOG[client_ip]) >= RATE_LIMIT_REQUESTS:
        return True
    IP_REQUEST_LOG[client_ip].append(now)
    return False

def sanitize_doc_id(raw_id: str) -> str:
    """Sanitizes strings for safe Firestore document IDs."""
    return re.sub(r'[^a-zA-Z0-9_-]', '_', raw_id)

def prune_guest_log():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for k in [k for k in GUEST_DAILY_IP_LOG if not k.startswith(today)]:
        del GUEST_DAILY_IP_LOG[k]

# ---------------- Crisis Protocol ----------------
CRISIS_PATTERNS = [
    # Direct suicidal intent
    r"\b(kill|end|take)\s+my\s+(life|myself|own\s+life)\b",
    r"\b(suicide|suicidal|suicidality)\b",
    r"\bwant\s+to\s+(die|be\s+dead|kill\s+myself|end\s+it\s+all)\b",
    r"\bdon'?t\s+want\s+to\s+(live|wake\s+up|exist|be\s+here|go\s+on)\b",
    r"\b(hang|slit|shoot|overdose|poison|drown)\s+myself\b",
    r"\bbetter\s+off\s+(dead|without\s+me|gone)\b",
    r"\bself[- ]?harm(ing)?\b",
    r"\bcutting\s+myself\b",
    r"\bno\s+(reason|point|will)\s+to\s+(live|stay\s+alive)\b",
    r"\bwant\s+to\s+disappear\s+forever\b",
    r"\bcan'?t\s+(take|bear|survive|handle|go\s+on\s+with)\s+this\s+(pain|life|anymore)\b",
    r"\bready\s+to\s+end\s+(everything|it\s+all|my\s+life)\b",
    r"\beveryone\s+would\s+be\s+better\s+off\s+without\s+me\b",
    r"\bgiving\s+away\s+my\s+things\b",
    r"\bsaying\s+my\s+last\s+goodbyes\b",
    r"\bdone\s+with\s+living\b",
    r"\bplanning\s+my\s+suicide\b"
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
    """Checks for explicit or colloquial crisis indicators."""
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
    """Removes <think>...</think> reasoning blocks that reasoning models may emit."""
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

def resolve_entitlement(uid: Optional[str], email: Optional[str], client_ip: str) -> dict:
    """READ-ONLY check. Persists across serverless instances via Firestore."""
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 1. Developer bypass
    if email and email.lower() == DEVELOPER_EMAIL.lower():
        return {"allowed": True, "remaining": 9999, "tier": "developer"}

    # 2. Authenticated user entitlement
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

    # 3. Persistent Guest Gate: 1 free prayer per IP per day stored in Firestore
    guest_doc_id = sanitize_doc_id(f"{today_str}_{client_ip}")
    if db:
        try:
            guest_ref = db.collection("guest_usage").document(guest_doc_id)
            doc = guest_ref.get()
            if doc.exists:
                data = doc.to_dict() or {}
                if data.get("count", 0) >= 1:
                    return {"allowed": False, "remaining": 0, "tier": "guest", "reason": "guest_quota_exhausted"}
            return {"allowed": True, "remaining": 0, "tier": "guest", "guest_key": guest_doc_id}
        except Exception as e:
            logger.warning(f"Firestore guest check fallback: {e}")

    # Fallback to local memory if Firestore is offline
    prune_guest_log()
    if GUEST_DAILY_IP_LOG[guest_doc_id] >= 1:
        return {"allowed": False, "remaining": 0, "tier": "guest", "reason": "guest_quota_exhausted"}
    return {"allowed": True, "remaining": 0, "tier": "guest", "guest_key": guest_doc_id}

def consume_credit(uid: Optional[str], email: Optional[str], decision: dict):
    """Called ONLY after successful generation. Never burns credits on failures."""
    tier = decision.get("tier")
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    try:
        if tier == "guest":
            guest_key = decision.get("guest_key")
            if guest_key:
                GUEST_DAILY_IP_LOG[guest_key] += 1
                if db:
                    guest_ref = db.collection("guest_usage").document(guest_key)
                    guest_ref.set({
                        "count": firestore.Increment(1),
                        "date": today_str,
                        "lastActive": firestore.SERVER_TIMESTAMP
                    }, merge=True)
            return

        if tier in ("developer", "subscribed", "db_fallback"):
            return

        if uid and db:
            ref = db.collection("users").document(uid)
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
# ---------------- Prompts ----------------
MODE_INSTRUCTIONS = {
    "comfort": "Focus on tender empathy, emotional reassurance, and God's peace. Offer gentle pastoral care.",
    "study": "Focus on biblical depth, original Scripture context, and spiritual insight. Explain the theological principles clearly.",
    "prayer": "Frame the response as a heartfelt, scripture-anchored intercessory prayer spoken alongside the seeker.",
    "guidance": "Focus on practical biblical wisdom, discernment, and next steps for daily decisions, work, or relationships."
}

SYSTEM_PROMPT_TEMPLATE = """You are a compassionate, scripture-grounded Christian pastoral companion in a private prayer sanctuary.
Your role is to listen to the seeker's burdens, point them to the love and promises of God, and lift them up in prayer.

RESPONSE STYLE & MODE:
{mode_instruction}

CORE GUIDELINES:
1. Speak with warmth, humility, and biblical authority ("Let us bring this before the Lord", "You are deeply loved by God").
2. Structure your response into EXACTLY 2 short paragraphs:
   Paragraph 1: Tenderly acknowledge their specific situation with empathy in 2-3 sentences.
   Paragraph 2: Anchor their heart in ONE relevant Scripture quotation, followed by a 1-sentence prayer or blessing over their day.
3. Include at least one relevant Scripture quotation formatted cleanly: “Quote text” (Book Chapter:Verse).
4. Vary your language naturally; avoid repetitive canned formulas.
5. Do NOT output markdown headers (#) or bullet lists.
6. EVOLVING PSYCHE REQUIREMENT: At the very end, on a clean new line, output:
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

DEGRADED_REPLY = (
    "The sanctuary is experiencing a brief technical pause. "
    "Please take a breath and try again in a few moments — I am still here."
)

# ---------------- Routes ----------------
@app.get("/")
@app.get("/health")
@app.get("/api")
@app.get("/api/health")
def health_check():
    return {
        "status": "active",
        "service": "You With Jesus Sanctuary API",
        "version": "3.5.0",
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
                "reply": "Please sign in to receive your 5 free daily scripture reflections and continue your prayer communion.",
                "updatedPsyche": user_psyche
            }
        return {
            "error": "PAYWALL_EXHAUSTED",
            "reply": "You have completed your 5 daily reflections. They renew tomorrow, or you may choose a sacred pathway for unlimited communion today.",
            "updatedPsyche": user_psyche
        }

    # 3. Inference
    groq_client = get_groq_client()
    if groq_client is None:
        logger.critical("CHAT DEGRADED: GROQ_API_KEY missing at request time.")
        return {"error": "SERVICE_DEGRADED", "degraded": True,
                "reply": DEGRADED_REPLY, "updatedPsyche": user_psyche}

    mode_instruction = MODE_INSTRUCTIONS[selected_mode]
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        mode_instruction=mode_instruction,
        user_name=user_name,
        user_psyche=user_psyche,
        user_intentions=user_intentions
    )

    messages = [{"role": "system", "content": system_prompt}]
    if payload.history:
        for turn in payload.history[-6:]:
            role = "user" if turn.get("role") == "user" else "assistant"
            content = sanitize_input(turn.get("content", ""), max_length=800)
            if content:
                messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": raw_message})

    raw_reply = None
    last_error = None
    for model_name in get_active_models():
        try:
            logger.info(f"Inferencing with {model_name} in [{selected_mode}] mode")
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.8,
                max_tokens=700
            )
            candidate = strip_thinking_tags(response.choices[0].message.content or "")
            if candidate:
                raw_reply = candidate
                break
        except Exception as e:
            last_error = e
            logger.error(f"Inference failed on {model_name}: {e}")
            continue

    if not raw_reply:
        logger.error(f"CHAT DEGRADED: all models failed. Last error: {last_error}")
        return {"error": "SERVICE_DEGRADED", "degraded": True,
                "reply": DEGRADED_REPLY, "updatedPsyche": user_psyche}

    # 4. Consume credit ONLY after successful generation
    consume_credit(verified_uid, verified_email, decision)

    # 5. Extract evolving psyche
    updated_psyche = user_psyche
    psyche_match = re.search(r'PSYCHE:\s*(.+)$', raw_reply, re.IGNORECASE | re.MULTILINE)
    if psyche_match:
        extracted = psyche_match.group(1).strip()
        updated_psyche = sanitize_metadata(extracted, max_length=80, default=user_psyche)
        raw_reply = re.sub(r'PSYCHE:\s*.+$', '', raw_reply, flags=re.IGNORECASE | re.MULTILINE).strip()

    # Cloud Sync: Persist Soul Memory to user document
    if verified_uid and db:
        try:
            db.collection("users").document(verified_uid).set({
                "psyche": updated_psyche,
                "intentions": user_intentions,
                "lastActive": firestore.SERVER_TIMESTAMP
            }, merge=True)
        except Exception as e:
            logger.warning(f"Failed to sync psyche to Firestore: {e}")

    remaining = decision["remaining"]
    if decision["tier"] == "free" and remaining < 9999:
        remaining = max(0, remaining - 1)

    return {
        "reply": clean_reply_formatting(raw_reply),
        "updatedPsyche": updated_psyche,
        "remainingCredits": remaining,
        "mode": selected_mode
    }

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
        
        attributes = event_payload.get("data", {}).get("attributes", {})
        user_email = attributes.get("user_email")
        sub_status = (attributes.get("status") or "").lower()

        logger.info(f"Verified Lemon Event: {event_name} | Status: {sub_status} | User ID: {user_id} ({user_email})")

        if not user_id:
            logger.warning("Webhook arrived WITHOUT custom user_id. Ensure ?checkout[custom][user_id]=<firebase-uid> is in your checkout URL.")

        if db and user_id:
            ref = db.collection("users").document(user_id)
            
            # Determine entitlement strictly by attributes.status
            if event_name.startswith("subscription_"):
                # Active states in Lemon Squeezy: 'active', 'on_trial'
                is_active = sub_status in ("active", "on_trial")
            elif event_name == "order_created":
                # For one-time passes / devotions
                is_active = sub_status in ("paid", "active")
            elif event_name in ("subscription_cancelled", "subscription_expired", "subscription_paused", "subscription_payment_failed", "order_refunded"):
                is_active = False
            else:
                is_active = sub_status in ("active", "on_trial", "paid")

            ref.set({
                "isSubscribed": is_active,
                "subscriptionStatus": sub_status or event_name,
                "email": user_email or "",
                "lastPlanUpdate": firestore.SERVER_TIMESTAMP
            }, merge=True)
            
            logger.info(f"Updated subscription status for {user_id}: isSubscribed={is_active} (status={sub_status})")

        return {"status": "success", "event": event_name, "user_id": user_id, "subscription_status": sub_status}
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload format.")

    try:
        event_payload = json.loads(raw_body.decode("utf-8"))
        event_name = event_payload.get("meta", {}).get("event_name", "unknown")
        custom_data = event_payload.get("meta", {}).get("custom_data", {})
        user_id = custom_data.get("user_id")
        user_email = event_payload.get("data", {}).get("attributes", {}).get("user_email")

        logger.info(f"Verified Lemon Event: {event_name} for User ID: {user_id} ({user_email})")

        if not user_id:
            logger.warning("Webhook arrived WITHOUT custom user_id. Include ?checkout[custom][user_id]=<firebase-uid> in your checkout URL.")

        if db and user_id:
            ref = db.collection("users").document(user_id)
            active_events = ("subscription_created", "subscription_payment_success",
                             "order_created", "subscription_updated",
                             "subscription_resumed", "subscription_unpaused")
            inactive_events = ("subscription_cancelled", "subscription_expired",
                               "subscription_paused", "subscription_payment_failed")
            if event_name in active_events:
                ref.set({"isSubscribed": True, "email": user_email,
                         "lastPlanUpdate": firestore.SERVER_TIMESTAMP}, merge=True)
                logger.info(f"Granted subscription to {user_id}.")
            elif event_name in inactive_events:
                ref.set({"isSubscribed": False,
                         "lastPlanUpdate": firestore.SERVER_TIMESTAMP}, merge=True)
                logger.info(f"Revoked subscription for {user_id}.")

        return {"status": "success", "event": event_name, "user_id": user_id}
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload format.")