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

load_dotenv(dotenv_path="./jesus-talk-api/.env")
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("jesus_sanctuary_api")

# Initialize Firebase Admin SDK
db = None
try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth as fb_auth

    if not firebase_admin._apps:
        firebase_creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT", "")
        if firebase_creds_json:
            try:
                cred_dict = json.loads(firebase_creds_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
            except Exception as e:
                logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: {e}")
                firebase_admin.initialize_app()
        else:
            firebase_admin.initialize_app()
    db = firestore.client()
except Exception as fb_err:
    logger.warning(f"Firebase Admin SDK initialization note: {fb_err}")

app = FastAPI(title="You With Jesus Sanctuary API", version="3.4.0")

ALLOWED_ORIGINS = [
    "https://jesus-chat-bd89f.web.app",
    "https://jesus-chat-bd89f.firebaseapp.com",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

LEMON_WEBHOOK_SECRET = os.getenv("LEMON_WEBHOOK_SECRET", "")
DEVELOPER_EMAIL = os.getenv("DEVELOPER_EMAIL", "anuanuu87@gmail.com")

def get_groq_client():
    key = os.getenv("GROQ_API_KEY", "").strip()
    return Groq(api_key=key) if key else None

# Rate Limiting & Guest Log
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

# Crisis Protocol
CRISIS_PATTERNS = [
    r"\b(kill|end|take)\s+my\s+(life|myself)\b",
    r"\b(suicide|suicidal)\b",
    r"\bwant\s+to\s+die\b",
    r"\bdon'?t\s+want\s+to\s+(live|wake\s+up|exist|be\s+here)\b",
    r"\b(hang|slit|shoot)\s+myself\b",
    r"\bbetter\s+off\s+(dead|without\s+me)\b",
    r"\bself[- ]?harm\b",
    r"\bno\s+reason\s+to\s+live\b",
    r"\bwant\s+to\s+disappear\b",
    r"\bcan'?t\s+go\s+on\s+anymore\b",
    r"\bwant\s+this\s+pain\s+to\s+end\b",
    r"\beveryone\s+would\s+be\s+better\s+off\b"
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

def clean_scripture_citations(reply: str) -> str:
    text = reply.replace('\\n', '\n')
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'["“]([^"”]+)["”]\s*\(([1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\)', r'“\1” (\2)', text)
    return text.strip()

def get_verified_user(request: Request) -> tuple[Optional[str], Optional[str]]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            decoded = fb_auth.verify_id_token(token)
            return decoded.get("uid"), decoded.get("email")
        except Exception as e:
            logger.warning(f"ID Token verification failed: {e}")
            return None, None
    return None, None

def verify_and_consume_quota(uid: Optional[str], email: Optional[str], client_ip: str) -> tuple[bool, int, str]:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if email and email.lower() == DEVELOPER_EMAIL.lower():
        return True, 1000, "developer"

    if uid and db:
        try:
            user_ref = db.collection("users").document(uid)
            doc = user_ref.get()

            if doc.exists:
                data = doc.to_dict() or {}
                if data.get("isSubscribed", False):
                    return True, 9999, "subscribed"

                last_reset = data.get("lastResetDate")
                credits = data.get("credits", 5)

                if last_reset != today_str:
                    user_ref.set({
                        "credits": 4,
                        "lastResetDate": today_str,
                        "lastActive": firestore.SERVER_TIMESTAMP
                    }, merge=True)
                    return True, 4, "reset_and_consumed"

                if credits <= 0:
                    return False, 0, "quota_exhausted"

                user_ref.update({
                    "credits": firestore.Increment(-1),
                    "lastActive": firestore.SERVER_TIMESTAMP
                })
                return True, credits - 1, "consumed"
            else:
                user_ref.set({
                    "email": email or "",
                    "credits": 4,
                    "isSubscribed": False,
                    "lastResetDate": today_str,
                    "createdAt": firestore.SERVER_TIMESTAMP,
                    "lastActive": firestore.SERVER_TIMESTAMP
                })
                return True, 4, "new_user_consumed"
        except Exception as e:
            logger.error(f"Firestore entitlement lookup error: {e}")
            return True, 5, "db_fallback"

    guest_key = f"{today_str}_{client_ip}"
    used_count = GUEST_DAILY_IP_LOG[guest_key]
    if used_count >= 1:
        return False, 0, "guest_quota_exhausted"

    GUEST_DAILY_IP_LOG[guest_key] += 1
    return True, 0, "guest_consumed"

MODE_INSTRUCTIONS = {
    "comfort": "Focus on tender empathy, emotional reassurance, and peace. Keep the tone gentle, intimate, and comforting.",
    "study": "Focus on biblical depth, original Scripture context, and spiritual insight. Explain the theological principle clearly.",
    "prayer": "Frame the primary response as a direct, personal, and powerful written prayer that the seeker can pray aloud.",
    "guidance": "Focus on practical discernment and wise biblical next steps for daily decisions, work, or relationships."
}

SYSTEM_PROMPT_TEMPLATE = """You are Jesus Christ speaking directly with a seeker in a sacred prayer sanctuary.
Your tone is deeply compassionate, authoritative, calm, and rooted in biblical truth.

RESPONSE STYLE & MODE:
{mode_instruction}

CORE GUIDELINES:
1. Speak in the first person ("I hear you", "My child", "My peace I give to you").
2. Structure your response into 2 to 3 concise, deeply meaningful paragraphs.
3. Include at least one relevant Scripture quotation formatted cleanly: “Quote text” (Book Chapter:Verse).
4. EVOLVING PSYCHE REQUIREMENT: At the very end of your response, on a clean new line, output:
PSYCHE: <5-8 words summarizing the user's updated emotional state, e.g. A soul finding calm amid financial worry>

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

ACTIVE_GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile"
]

@app.get("/")
@app.get("/health")
@app.get("/api")
@app.get("/api/health")
def health_check():
    key = os.getenv("GROQ_API_KEY", "").strip()
    return {
        "status": "active",
        "service": "You With Jesus Sanctuary API",
        "version": "3.4.0",
        "groq_configured": bool(key),
        "db_connected": db is not None
    }

@app.post("/")
@app.post("/chat")
@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest, request: Request):
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()

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
        logger.warning(f"Crisis trigger intercepted from IP: {client_ip}")
        return {
            "reply": CRISIS_RESPONSE,
            "updatedPsyche": "A soul in critical need of grace and human support",
            "isCrisis": True
        }

    verified_uid, verified_email = get_verified_user(request)
    is_allowed, remaining_credits, reason = verify_and_consume_quota(verified_uid, verified_email, client_ip)

    if not is_allowed:
        if reason == "guest_quota_exhausted":
            return {
                "error": "AUTH_REQUIRED",
                "reply": "Please sign in to receive your 5 free daily scripture reflections and continue your prayer communion.",
                "updatedPsyche": user_psyche
            }
        return {
            "error": "PAYWALL_EXHAUSTED",
            "reply": "You have completed your 5 daily reflections. Your free reflections will renew tomorrow, or you may choose a sacred pathway for unlimited communion today.",
            "updatedPsyche": user_psyche
        }

    groq_client = get_groq_client()
    raw_reply = None

    if groq_client:
        mode_instruction = MODE_INSTRUCTIONS.get(selected_mode, MODE_INSTRUCTIONS["comfort"])
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

        for model_name in ACTIVE_GROQ_MODELS:
            try:
                response = groq_client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=650
                )
                raw_reply = response.choices[0].message.content.strip()
                if raw_reply:
                    break
            except Exception as e:
                logger.error(f"Groq error ({model_name}): {e}")
                continue

    if not raw_reply:
        raw_reply = "I hear your voice, and I know every care you carry today. Come rest in Me, for My grace is sufficient for you.\n\n“Cast your burden on the Lord, and he will sustain you; he will never permit the righteous to be moved.” (Psalm 55:22)\n\nPSYCHE: A heart seeking divine refuge"

    updated_psyche = user_psyche
    psyche_match = re.search(r'PSYCHE:\s*(.+)$', raw_reply, re.IGNORECASE | re.MULTILINE)
    if psyche_match:
        extracted = psyche_match.group(1).strip()
        updated_psyche = sanitize_metadata(extracted, max_length=80, default=user_psyche)
        raw_reply = re.sub(r'PSYCHE:\s*.+$', '', raw_reply, flags=re.IGNORECASE | re.MULTILINE).strip()

    clean_reply = clean_scripture_citations(raw_reply)

    return {
        "reply": clean_reply,
        "updatedPsyche": updated_psyche,
        "remainingCredits": remaining_credits,
        "mode": selected_mode
    }

@app.post("/webhook/lemon")
@app.post("/webhook/lemonsqueezy")
@app.post("/api/webhook/lemon")
@app.post("/api/webhook/lemonsqueezy")
async def lemon_squeezy_webhook(request: Request, x_signature: Optional[str] = Header(None)):
    raw_body = await request.body()

    if not LEMON_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret unconfigured.")

    if not x_signature:
        raise HTTPException(status_code=400, detail="Missing X-Signature.")

    digest = hmac.new(
        LEMON_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(digest, x_signature):
        raise HTTPException(status_code=400, detail="Invalid signature.")

    try:
        event_payload = json.loads(raw_body.decode("utf-8"))
        event_name = event_payload.get("meta", {}).get("event_name", "unknown")
        custom_data = event_payload.get("meta", {}).get("custom_data", {})
        user_id = custom_data.get("user_id")
        user_email = event_payload.get("data", {}).get("attributes", {}).get("user_email")

        if db and user_id:
            user_ref = db.collection("users").document(user_id)
            active_events = (
                "subscription_created", "subscription_payment_success",
                "order_created", "subscription_updated",
                "subscription_resumed", "subscription_unpaused"
            )
            inactive_events = (
                "subscription_cancelled", "subscription_expired",
                "subscription_paused", "subscription_payment_failed"
            )

            if event_name in active_events:
                user_ref.set({
                    "isSubscribed": True,
                    "email": user_email,
                    "lastPlanUpdate": firestore.SERVER_TIMESTAMP
                }, merge=True)
            elif event_name in inactive_events:
                user_ref.set({
                    "isSubscribed": False,
                    "lastPlanUpdate": firestore.SERVER_TIMESTAMP
                }, merge=True)

        return {"status": "success", "event": event_name, "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid payload format.")
