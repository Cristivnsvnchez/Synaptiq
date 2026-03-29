"""
Notion integration — pushes structured notes to a Notion database.
Uses the Notion API (no extra subscription needed with a free account).

Setup:
  1. Create a Notion integration at https://www.notion.so/my-integrations
  2. Share your target database with the integration
  3. Set NOTION_TOKEN and NOTION_DATABASE_ID in your .env file
"""
import os
import httpx

NOTION_TOKEN = os.getenv("NOTION_TOKEN", "")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID", "")
NOTION_API_URL = "https://api.notion.com/v1"
HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}


async def push_note_to_notion(title: str, content: str, topic: str) -> str | None:
    """Push a structured note to Notion. Returns the page URL."""
    payload = {
        "parent": {"database_id": NOTION_DATABASE_ID},
        "properties": {
            "Name": {"title": [{"text": {"content": title}}]},
            "Topic": {"rich_text": [{"text": {"content": topic}}]},
        },
        "children": [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": content}}]
                },
            }
        ],
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{NOTION_API_URL}/pages",
            headers=HEADERS,
            json=payload,
        )
        if response.status_code == 200:
            return response.json().get("url")
    return None
