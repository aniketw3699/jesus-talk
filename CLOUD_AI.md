# Cloud AI configuration

The core 1into1 product does **not** require cloud AI. Prayer, local guidance, Lay It Down, journeys, Bible reading/search, and other local features run in the browser.

Cloud AI is reserved for **Ask Deeper**.

## Provider choices

### Groq (current backward-compatible default)

```env
AI_PROVIDER=groq
GROQ_API_KEY=...
AI_MODEL=openai/gpt-oss-20b
AI_FALLBACK_MODELS=openai/gpt-oss-120b
```

If `AI_MODEL` is not set, the adapter uses current GPT-OSS defaults and filters them against Groq's active-model list when possible.

### Any OpenAI-compatible endpoint

```env
AI_PROVIDER=openai_compatible
AI_API_KEY=...
AI_BASE_URL=https://provider.example/v1
AI_MODEL=provider-model-id
AI_FALLBACK_MODELS=optional-second-model
```

The rest of the application does not change.

### Local-only / no cloud bill

```env
AI_PROVIDER=disabled
```

Ask Deeper will report that cloud guidance is unavailable while the local product continues working.

## Secret handling

Never commit real API keys. Keep them only in Vercel/hosting environment variables.

## Plus fair use

Core local prayer is not metered.

Plus Ask Deeper uses paid cloud inference, so subscribed accounts are protected by a configurable daily anti-abuse ceiling:

`PLUS_DAILY_FAIR_USE_LIMIT=100`

The default is intentionally generous for normal personal use. If the ceiling is reached, Ask Deeper pauses until the next UTC day while local prayer, Bible, journal, journeys and Lay It Down continue working normally.

The limit is an economics/abuse guardrail, not a prayer limit.
