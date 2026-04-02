from __future__ import annotations
from typing import Optional
import anthropic
from app.core.config import settings

_client: Optional[anthropic.AsyncAnthropic] = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def call_claude(
    prompt: str,
    system: Optional[str] = None,
    model: str = "claude-sonnet-4-6",
) -> str:
    client = get_client()
    kwargs = dict(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    if system:
        kwargs["system"] = system
    message = await client.messages.create(**kwargs)
    return message.content[0].text
