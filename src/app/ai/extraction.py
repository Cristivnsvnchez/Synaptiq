from __future__ import annotations
import io
from typing import Optional


def extract_text_from_pdf(content: bytes) -> str:
    """Extract raw text from a PDF file."""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages[:10]]  # max 10 pages
        return "\n".join(pages).strip()
    except Exception:
        return ""


async def fetch_url_content(url: str) -> str:
    """Fetch text content from a URL."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            response = await client.get(url, headers={"User-Agent": "Synaptiq/1.0"})
            response.raise_for_status()
            # Strip HTML tags simply
            text = response.text
            import re
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text).strip()
            return text[:8000]  # limit to avoid token overflow
    except Exception as e:
        return f"[Could not fetch URL: {e}]"
