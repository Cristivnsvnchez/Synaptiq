import json
from typing import Any

from app.ai.structuring import call_claude


DOMAIN_SLUGS = [
    "identity", "housing", "finance", "work", "health",
    "learning", "vehicle", "travel", "subscriptions", "contacts", "projects"
]


async def process_capture(
    url: str | None = None,
    file_content: bytes | None = None,
    filename: str | None = None,
    mime_type: str | None = None,
) -> dict[str, Any]:
    if url:
        prompt = f"""
You are Synaptiq, a personal OS that organizes life documents.
A user provided this URL: {url}

Analyze the URL and extract all relevant information. Return a JSON object with:
- suggested_domain: one of {DOMAIN_SLUGS}
- suggested_entity_type: specific type (e.g. "bail", "passeport", "compte_bancaire")
- suggested_name: a short name for this entity
- extracted_data: all relevant fields extracted (dates, amounts, references, names...)
- confidence: float 0.0-1.0

Respond ONLY with valid JSON, no explanation.
"""
    else:
        prompt = f"""
You are Synaptiq, a personal OS that organizes life documents.
A user uploaded a file: {filename} ({mime_type})

Based on the filename and type, infer the document category. Return a JSON object with:
- suggested_domain: one of {DOMAIN_SLUGS}
- suggested_entity_type: specific type (e.g. "bail", "passeport", "facture_electricite")
- suggested_name: a short name for this document
- extracted_data: any inferable fields from the filename
- confidence: float 0.0-1.0

Respond ONLY with valid JSON, no explanation.
"""

    raw = await call_claude(prompt)
    return json.loads(raw)
