# Synaptiq 🧠

**Your personal learning brain** — capture what you learn, structure it automatically, track your progress.

## What is Synaptiq?

Synaptiq is a personal learning dashboard that solves one real problem: when you're learning something new (SAP, Power Platform, Python...), documenting what you understand is tedious. Synaptiq lets you dump raw notes in natural language, structures them automatically with AI, and pushes them to Notion or OneNote — so you can focus on learning, not formatting.

## Core Features (MVP)

| Feature | Description |
|---|---|
| 📝 Note Capture | Paste raw notes → AI structures them into titles, summaries, key concepts |
| 🗺️ Learning Paths | Create structured paths (e.g. "SAP Fundamentals") with steps and progression |
| 📊 Dashboard | Full view of what you know, your gaps, your streak, your next step |
| 🔗 Notion sync | Structured notes pushed automatically to your Notion workspace |
| 🔗 OneNote sync | Alternative: push to OneNote via Microsoft Graph API (free) |

## Project Structure

```
Synaptiq/
├── src/
│   └── app/
│       ├── main.py                  # FastAPI entry point
│       ├── routers/
│       │   ├── notes.py             # Note capture & retrieval
│       │   ├── paths.py             # Learning paths & steps
│       │   └── progress.py          # Dashboard & progress
│       ├── schemas/
│       │   ├── note.py              # Note data models
│       │   ├── path.py              # Learning path models
│       │   └── progress.py          # Dashboard models
│       └── integrations/
│           ├── notion.py            # Notion API integration
│           └── onenote.py           # Microsoft Graph / OneNote
├── tests/
├── docs/
├── design/
├── phases/
├── .env.example
├── requirements.txt
└── README.md
```

## Setup

```bash
# 1. Clone and enter the project
cd Synaptiq

# 2. Create a virtual environment
python -m venv venv
source venv/bin/activate  # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# → Fill in your Notion token and/or Microsoft credentials

# 5. Run the API
cd src
uvicorn app.main:app --reload
```

## API Docs

Once running: **http://localhost:8000/docs**

## Integrations Setup

### Notion (recommended, free)
1. Go to https://www.notion.so/my-integrations
2. Create a new integration → copy the token
3. Share your target Notion database with the integration
4. Add `NOTION_TOKEN` and `NOTION_DATABASE_ID` to your `.env`

### OneNote (free with any Microsoft account)
1. Go to https://portal.azure.com → App registrations
2. Register a new app → add `Notes.ReadWrite` permission
3. Add `MS_CLIENT_ID`, `MS_CLIENT_SECRET` to your `.env`

## Tech Stack

- **Backend**: FastAPI (Python)
- **AI structuring**: OpenAI API
- **Note storage**: Notion API or Microsoft Graph (OneNote)
- **Frontend** *(planned)*: Power Apps
