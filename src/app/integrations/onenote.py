"""
OneNote integration — pushes structured notes to OneNote via Microsoft Graph API.
Free with any personal Microsoft account (Outlook.com/Hotmail).

Setup:
  1. Register a free app at https://portal.azure.com (App registrations)
  2. Add permission: Notes.ReadWrite (Microsoft Graph)
  3. Set MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID in your .env file
"""
import os
import httpx

MS_CLIENT_ID = os.getenv("MS_CLIENT_ID", "")
MS_CLIENT_SECRET = os.getenv("MS_CLIENT_SECRET", "")
MS_TENANT_ID = os.getenv("MS_TENANT_ID", "common")
GRAPH_API_URL = "https://graph.microsoft.com/v1.0"


async def get_access_token() -> str | None:
    """Obtain an access token via client credentials flow."""
    url = f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": MS_CLIENT_ID,
        "client_secret": MS_CLIENT_SECRET,
        "scope": "https://graph.microsoft.com/.default",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        if response.status_code == 200:
            return response.json().get("access_token")
    return None


async def push_note_to_onenote(title: str, content: str) -> str | None:
    """Push a structured note to OneNote. Returns the page URL."""
    token = await get_access_token()
    if not token:
        return None

    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head><title>{title}</title></head>
      <body>{content}</body>
    </html>
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/xhtml+xml",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GRAPH_API_URL}/me/onenote/pages",
            headers=headers,
            content=html_content.encode("utf-8"),
        )
        if response.status_code == 201:
            return response.json().get("links", {}).get("oneNoteWebUrl", {}).get("href")
    return None
