from __future__ import annotations
import base64
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


async def call_claude_with_image(
    image_bytes: bytes,
    media_type: str,
    prompt: str,
    system: Optional[str] = None,
    model: str = "claude-sonnet-4-6",
) -> str:
    """Send an image to Claude Vision and get a text response."""
    client = get_client()
    image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
    content = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": image_data,
            },
        },
        {"type": "text", "text": prompt},
    ]
    kwargs = dict(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": content}],
    )
    if system:
        kwargs["system"] = system
    message = await client.messages.create(**kwargs)
    return message.content[0].text
