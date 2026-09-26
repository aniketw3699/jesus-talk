# Cloud AI configuration

The core 1into1 product does **not** require cloud AI. Prayer, local guidance, Lay It Down, journeys, Bible reading/search, and the local journal run in the browser.

Cloud AI is reserved for **Ask Deeper**.

## Provider choices

### Groq (backward-compatible default)

```env
AI_PROVIDER=groq
GROQ_API_KEY=...
AI_MODEL=openai/gpt-oss-20b
AI_FALLBACK_MODELS=openai/gpt-oss-120b
```

### Any OpenAI-compatible endpoint

```env
AI_PROVIDER=openai_compatible
AI_API_KEY=...
AI_BASE_URL=https://provider.example/v1
AI_MODEL=provider-model-id
AI_FALLBACK_MODELS=optional-second-model
```

### Local-only / no cloud bill

```env
AI_PROVIDER=disabled
```

Ask Deeper reports that cloud guidance is unavailable while the local product continues working.

## Cost and abuse controls

Before a cloud request begins, the backend atomically reserves the user's daily Ask Deeper allowance in Firestore. This prevents parallel requests from spending the same free credit twice.

If the provider fails before returning an answer, the reservation is refunded on a best-effort basis.

If Firestore entitlements are unavailable, cloud AI fails closed rather than granting unmetered access. Local prayer/Bible/journal features remain available.

Additional defaults:
- signed-in free users: 5 Ask Deeper uses/day;
- guests: 1 Ask Deeper use/day per server-recorded IP key;
- request rate limit: 12 requests/minute per observed client IP/process;
- JSON request body cap: 32 KB;
- chat message cap: 1,500 characters;
- history list cap: 12 turns, with only the latest 6 used in the model context.

These values can be adjusted through environment variables.

## Secret handling

Never commit AI, Firebase, Lemon Squeezy or monitoring secrets. Keep them only in the deployment environment.
