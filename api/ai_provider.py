import os
import json
import logging
from typing import Iterable, List, Dict, Optional

import httpx
from groq import Groq

logger = logging.getLogger("oneintoone_ai_provider")

DEFAULT_GROQ_MODELS = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
]

class CloudAIProvider:
    name = "base"

    def is_configured(self) -> bool:
        raise NotImplementedError

    def model_candidates(self) -> List[str]:
        raise NotImplementedError

    def complete(self, messages: List[Dict], model: str, temperature: float = 0.7, max_tokens: int = 4096) -> str:
        raise NotImplementedError

    def stream(self, messages: List[Dict], model: str, temperature: float = 0.7, max_tokens: int = 4096) -> Iterable[str]:
        raise NotImplementedError


class GroqProvider(CloudAIProvider):
    name = "groq"

    def __init__(self):
        self.api_key = (os.getenv("AI_API_KEY") or os.getenv("GROQ_API_KEY") or "").strip()
        self._client = Groq(api_key=self.api_key) if self.api_key else None

    def is_configured(self) -> bool:
        return bool(self._client)

    def model_candidates(self) -> List[str]:
        configured = _configured_models()
        candidates = configured or list(DEFAULT_GROQ_MODELS)

        if not self._client:
            return candidates

        try:
            alive = {
                m.id for m in self._client.models.list().data
                if getattr(m, "active", True)
            }
            filtered = [model for model in candidates if model in alive]
            if filtered:
                return filtered

            safe = [
                model for model in alive
                if not any(token in model.lower() for token in [
                    "whisper", "guard", "safeguard", "tts", "orpheus"
                ])
            ]
            if safe:
                return sorted(safe)[:3]
        except Exception as exc:
            logger.warning("Groq model discovery fallback: %s", exc)

        return candidates

    def complete(self, messages: List[Dict], model: str, temperature: float = 0.7, max_tokens: int = 4096) -> str:
        if not self._client:
            raise RuntimeError("Groq provider is not configured")
        response = self._client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "").strip()

    def stream(self, messages: List[Dict], model: str, temperature: float = 0.7, max_tokens: int = 4096) -> Iterable[str]:
        if not self._client:
            raise RuntimeError("Groq provider is not configured")
        stream = self._client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in stream:
            if not getattr(chunk, "choices", None):
                continue
            delta = getattr(chunk.choices[0].delta, "content", None) or ""
            if delta:
                yield delta


class OpenAICompatibleProvider(CloudAIProvider):
    name = "openai_compatible"

    def __init__(self):
        self.api_key = (os.getenv("AI_API_KEY") or "").strip()
        self.base_url = (os.getenv("AI_BASE_URL") or "").strip().rstrip("/")
        self.timeout = float(os.getenv("AI_TIMEOUT_SECONDS", "90"))

    def is_configured(self) -> bool:
        return bool(self.api_key and self.base_url and self.model_candidates())

    def model_candidates(self) -> List[str]:
        return _configured_models()

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": "Bearer " + self.api_key,
            "Content-Type": "application/json",
        }

    def _endpoint(self) -> str:
        return self.base_url + "/chat/completions"

    def complete(self, messages: List[Dict], model: str, temperature: float = 0.7, max_tokens: int = 4096) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(self._endpoint(), headers=self._headers(), json=payload)
            response.raise_for_status()
            data = response.json()
        return str(data["choices"][0]["message"].get("content") or "").strip()

    def stream(self, messages: List[Dict], model: str, temperature: float = 0.7, max_tokens: int = 4096) -> Iterable[str]:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        with httpx.Client(timeout=self.timeout) as client:
            with client.stream("POST", self._endpoint(), headers=self._headers(), json=payload) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line:
                        continue
                    if line.startswith("data:"):
                        line = line[5:].strip()
                    if line == "[DONE]":
                        break
                    try:
                        packet = json.loads(line)
                        delta = packet["choices"][0].get("delta", {}).get("content") or ""
                    except Exception:
                        continue
                    if delta:
                        yield delta


def _configured_models() -> List[str]:
    primary = (os.getenv("AI_MODEL") or "").strip()
    fallbacks = [
        item.strip()
        for item in (os.getenv("AI_FALLBACK_MODELS") or "").split(",")
        if item.strip()
    ]
    ordered = []
    for model in ([primary] if primary else []) + fallbacks:
        if model and model not in ordered:
            ordered.append(model)
    return ordered


_PROVIDER_CACHE: Optional[CloudAIProvider] = None
_PROVIDER_CACHE_KEY: Optional[str] = None


def get_cloud_provider() -> CloudAIProvider:
    global _PROVIDER_CACHE, _PROVIDER_CACHE_KEY

    provider_name = (os.getenv("AI_PROVIDER") or "groq").strip().lower()
    config_key = "|".join([
        provider_name,
        (os.getenv("AI_BASE_URL") or "").strip(),
        (os.getenv("AI_MODEL") or "").strip(),
        (os.getenv("AI_FALLBACK_MODELS") or "").strip(),
        "1" if (os.getenv("AI_API_KEY") or os.getenv("GROQ_API_KEY")) else "0",
    ])

    if _PROVIDER_CACHE is not None and _PROVIDER_CACHE_KEY == config_key:
        return _PROVIDER_CACHE

    if provider_name in {"openai_compatible", "openai-compatible", "compatible"}:
        provider = OpenAICompatibleProvider()
    else:
        provider = GroqProvider()

    _PROVIDER_CACHE = provider
    _PROVIDER_CACHE_KEY = config_key
    return provider


def describe_cloud_provider() -> Dict:
    provider = get_cloud_provider()
    return {
        "provider": provider.name,
        "configured": provider.is_configured(),
        "models": provider.model_candidates(),
    }
