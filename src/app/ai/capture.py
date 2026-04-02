from __future__ import annotations
import json
from typing import Any, Dict, Optional

from app.ai.structuring import call_claude
from app.ai.extraction import extract_text_from_pdf, fetch_url_content


DOMAIN_SLUGS = [
    "identity", "housing", "finance", "work", "health",
    "learning", "vehicle", "travel", "subscriptions", "contacts", "projects"
]

SYSTEM_PROMPT = """You are Synaptiq, a personal OS that organizes life documents.
Your job is to analyze content and extract structured information.
Always respond with valid JSON only, no explanation, no markdown."""

EXTRACTION_PROMPT = """
Analyze the following content and return a JSON object with these exact fields:
- suggested_domain: one of {domains} — pick the most relevant
- suggested_entity_type: specific type in snake_case (e.g. "passeport", "bail", "compte_bancaire", "facture_electricite", "carte_grise")
- suggested_name: short display name for this entity/document (e.g. "Passeport FR", "Bail 12 rue de Paris")
- extracted_data: object with all relevant fields found (dates, amounts, names, references, addresses, numbers...)
- expires_at: ISO date string if an expiry/validity date is found, null otherwise
- confidence: float 0.0 to 1.0

Content to analyze:
---
{content}
---

Respond ONLY with valid JSON.
"""


async def process_capture(
    url: Optional[str] = None,
    file_content: Optional[bytes] = None,
    filename: Optional[str] = None,
    mime_type: Optional[str] = None,
) -> Dict[str, Any]:
    # Extract text content from source
    if url:
        content = await fetch_url_content(url)
        source_hint = f"URL: {url}"
    elif file_content:
        if mime_type == "application/pdf" or (filename and filename.endswith(".pdf")):
            content = extract_text_from_pdf(file_content)
            if not content:
                content = f"[PDF file: {filename}]"
        else:
            # Try to decode as text
            try:
                content = file_content.decode("utf-8", errors="ignore")[:8000]
            except Exception:
                content = f"[Binary file: {filename}]"
        source_hint = f"File: {filename} ({mime_type})"
    else:
        raise ValueError("Either url or file_content must be provided")

    prompt = EXTRACTION_PROMPT.format(
        domains=DOMAIN_SLUGS,
        content=content[:6000],  # safety limit
    )

    raw = await call_claude(prompt, system=SYSTEM_PROMPT)

    # Clean potential markdown code blocks
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    result = json.loads(raw)

    # Normalize
    result.setdefault("suggested_domain", "projects")
    result.setdefault("suggested_entity_type", "document")
    result.setdefault("suggested_name", filename or url or "Document")
    result.setdefault("extracted_data", {})
    result.setdefault("expires_at", None)
    result.setdefault("confidence", 0.5)

    return result
