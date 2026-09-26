#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parent

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def main():
    failures = []

    api = read("api/index.py")
    rules = read("firestore.rules")
    firebase = read("firebase.json")
    env_example = read("api/.env.example")
    billing = read("billing-config.js")
    index = read("index.html")

    required_api = [
        "def reserve_cloud_access(",
        "def release_cloud_reservation(",
        "LEMON_PLUS_VARIANT_IDS",
        "hmac.compare_digest",
        'data_type != "subscriptions"',
        '"X-Content-Type-Options"] = "nosniff"',
        '"X-Frame-Options"] = "DENY"',
        "MAX_JSON_BODY_BYTES",
        "Field(default_factory=list, max_length=12)",
        "verify_id_token(token)",
    ]
    for marker in required_api:
        if marker not in api:
            failures.append(f"api/index.py: required security marker missing -> {marker!r}")

    forbidden_api = [
        "def resolve_entitlement(",
        "def consume_credit(",
        "passExpiresAt",
        "7-Day Pass",
        "SavePrayerRequest",
        '@app.get("/api/prayers")',
        '@app.post("/api/prayers/save")',
        'allow_headers=["*"]',
        'DEVELOPER_EMAIL = os.getenv("DEVELOPER_EMAIL", "anu',
        '"tier": "db_fallback"',
    ]
    for marker in forbidden_api:
        if marker in api:
            failures.append(f"api/index.py: forbidden legacy/security pattern present -> {marker!r}")

    for endpoint in ["async def chat_endpoint", "async def chat_stream_endpoint"]:
        start = api.find(endpoint)
        if start < 0:
            failures.append(f"api/index.py: endpoint missing -> {endpoint}")
            continue
        end = api.find("\n@app.", start + len(endpoint))
        block = api[start:end if end > start else len(api)]
        provider_pos = block.find("cloud_provider.is_configured()")
        reserve_pos = block.find("reserve_cloud_access(")
        if provider_pos < 0 or reserve_pos < 0 or provider_pos > reserve_pos:
            failures.append(f"api/index.py: {endpoint} must verify provider before reserving quota")

    normal_start = api.find("async def chat_endpoint")
    stream_start = api.find("async def chat_stream_endpoint")
    normal = api[normal_start:stream_start]
    if "release_cloud_reservation(verified_uid, decision)" not in normal:
        failures.append("api/index.py: non-stream cloud failure does not refund reservation")

    stream = api[stream_start:]
    if "finally:" not in stream or "release_cloud_reservation(verified_uid, decision)" not in stream:
        failures.append("api/index.py: streaming cloud failure does not protect/refund unused reservation")

    if (
        "currentUser.getIdToken" not in index
        or '"Authorization":' not in index
        or "Bearer" not in index
    ):
        failures.append("index.html: Ask Deeper request is not forwarding a Firebase ID token")

    legacy_ids = [
        "cf0e4518-23cd-4011-8fc6-df4713c51516",
        "4aab51c1-d448-43d4-b3da-7ad7408d2a73",
        "dca75e97-af03-4754-97ef-36a760e80e83",
    ]
    for legacy in legacy_ids:
        if legacy in billing or legacy in index:
            failures.append(f"legacy Lemon checkout ID returned: {legacy}")
    if not re.search(r'checkoutUrl:\s*""', billing):
        failures.append("billing-config.js: checkout URLs are no longer blank before approved variants are configured")

    rule_markers = [
        "validAccountCreate()",
        "validAccountUpdate()",
        ".hasOnly(['email', 'displayName', 'lastActive'])",
        "match /saved_prayers/{prayerId}",
        "allow read, write: if false;",
        "validEncryptedBackup()",
        "validEncryptedChunk()",
        "request.resource.data.data.size() <= 250000",
        "request.resource.data.chunkCount <= 32",
        "match /guest_usage/{docId}",
    ]
    for marker in rule_markers:
        if marker not in rules:
            failures.append(f"firestore.rules: required hardened rule missing -> {marker!r}")

    update_start = rules.find("function validAccountUpdate()")
    update_end = rules.find("}", update_start)
    update_block = rules[update_start:update_end]
    for field in [
        "isSubscribed", "credits", "subscriptionStatus", "lastPlanUpdate",
        "lemonSubscriptionId", "lemonVariantId", "subscriptionEndsAt"
    ]:
        if field in update_block:
            failures.append(f"firestore.rules: client update allowlist contains billing field {field}")

    try:
        firebase_cfg = json.loads(firebase)
        headers = firebase_cfg.get("hosting", {}).get("headers", [])
        flattened = json.dumps(headers)
        for required in [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "Referrer-Policy",
            "Permissions-Policy",
            "Strict-Transport-Security",
            "service-worker.js",
            "no-cache, no-store, must-revalidate",
        ]:
            if required not in flattened:
                failures.append(f"firebase.json: required hosting header/config missing -> {required}")
    except Exception as exc:
        failures.append(f"firebase.json: invalid JSON: {exc}")

    for key in [
        "LEMON_WEBHOOK_SECRET=",
        "LEMON_PLUS_VARIANT_IDS=",
        "ALLOW_TEST_BILLING=false",
        "FIREBASE_SERVICE_ACCOUNT=",
        "RATE_LIMIT_REQUESTS=12",
        "MAX_JSON_BODY_BYTES=32768",
        "EXPOSE_HEALTH_DETAILS=false",
    ]:
        if key not in env_example:
            failures.append(f"api/.env.example: missing production control -> {key}")

    secret_patterns = [
        r"gsk_[A-Za-z0-9_-]{20,}",
        r"sk-[A-Za-z0-9_-]{20,}",
        r"github_pat_[A-Za-z0-9_]{20,}",
        r"ghp_[A-Za-z0-9]{20,}",
        r"-----BEGIN PRIVATE KEY-----",
    ]
    for path in [
        "api/.env.example", "billing-config.js", "CLOUD_AI.md",
        "BILLING_SETUP.md", "PRIVATE_SYNC.md"
    ]:
        text = read(path)
        for pattern in secret_patterns:
            if re.search(pattern, text):
                failures.append(f"{path}: looks like a real secret/private key is committed")

    print("Security audit checked API auth/quota, billing, Firestore rules, frontend auth, and hosting headers.")
    if failures:
        print(f"FAILED: {len(failures)} security issue(s)")
        for failure in failures:
            print(" - " + failure)
        return 1

    print("PASS: production security invariants are intact.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
