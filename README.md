# Synaptiq 🧠

**Personal OS — ton second cerveau.**
Organise chaque dimension de ta vie : documents, finances, santé, logement, travail, véhicule, voyages... L'IA structure automatiquement, relie les éléments entre eux, et signale ce qui demande attention.

---

## Lancer l'application

Une seule commande suffit :

```bash
cd "/Users/cristiansanchez/Library/Mobile Documents/com~apple~CloudDocs/Claude/Synaptiq"
./start.sh
```

Le script fait tout automatiquement :
- Démarre PostgreSQL
- Lance l'API FastAPI sur `http://localhost:8000`
- Lance le frontend Next.js sur `http://localhost:3000`
- Ouvre le navigateur automatiquement

**Ctrl+C** pour tout arrêter proprement.

---

## Prérequis (déjà installés)

- Python 3.9 + venv (`venv/`)
- PostgreSQL 16 (via Homebrew)
- Node.js 22
- Base de données `synaptiq` créée et migrée

---

## Configuration

Copie `.env.example` → `.env` et remplis :

```env
DATABASE_URL=postgresql+asyncpg://ton_user@localhost:5432/synaptiq
SECRET_KEY=changeme
ANTHROPIC_API_KEY=sk-ant-...
STORAGE_PATH=./storage
```

---

## Stack technique

| Composant | Technologie |
|---|---|
| Backend | FastAPI (Python 3.9) |
| Base de données | PostgreSQL 16 + SQLAlchemy async |
| Migrations | Alembic |
| IA | Anthropic Claude API |
| Scheduler | APScheduler |
| Frontend | Next.js 16 + Tailwind + shadcn/ui |
| Data fetching | TanStack Query |

---

## Structure du projet

```
Synaptiq/
├── start.sh                    # Lance tout en une commande
├── .env                        # Variables d'environnement (non versionné)
├── .env.example                # Template
├── requirements.txt            # Dépendances Python
├── REQUIREMENTS.md             # BRD complet (vision, features, modèles)
│
├── src/app/
│   ├── main.py                 # FastAPI entry point
│   ├── core/
│   │   ├── config.py           # Settings
│   │   ├── database.py         # SQLAlchemy async
│   │   └── scheduler.py        # APScheduler (jobs quotidiens)
│   ├── shared/
│   │   ├── models/             # Domain, Entity, Document, Access, Reminder
│   │   └── schemas/            # Schémas Pydantic
│   ├── ai/
│   │   ├── capture.py          # Extraction URL / fichier
│   │   ├── structuring.py      # Client Claude API
│   │   ├── extraction.py       # PDF + fetch URL
│   │   └── routing.py          # Auto-routing par mots-clés
│   ├── api/v1/
│   │   ├── capture.py          # POST /capture/url et /capture/file
│   │   ├── domains.py          # GET /domains/
│   │   ├── entities.py         # CRUD /entities/
│   │   ├── documents.py        # Upload, download, statut
│   │   ├── accesses.py         # CRUD /accesses/
│   │   ├── reminders.py        # CRUD + dismiss
│   │   └── dashboard.py        # Vue globale
│   └── services/
│       └── document_service.py # Auto-expiry + reminders J-90/J-30/J-7
│
├── alembic/                    # Migrations DB
├── storage/                    # Fichiers uploadés (non versionné)
│
└── frontend/
    ├── app/
    │   ├── page.tsx            # Dashboard
    │   ├── capture/page.tsx    # AI Capture
    │   ├── domains/[slug]/     # Vue par domaine
    │   └── entities/[id]/      # Vue d'une entité
    ├── components/
    │   ├── layout/Sidebar.tsx
    │   └── dashboard/          # StatCard, DomainHealthGrid, AttentionFeed
    ├── lib/
    │   ├── api.ts              # Toutes les fonctions d'appel API
    │   └── providers.tsx       # TanStack Query provider
    └── types/index.ts          # Types TypeScript
```

---

## API

Swagger disponible sur : **http://localhost:8000/docs**

| Endpoint | Description |
|---|---|
| `GET /api/v1/dashboard/` | Vue globale — alertes, timeline, health scores |
| `GET /api/v1/domains/` | Liste des 11 domaines |
| `GET /api/v1/entities/` | Entités (filtrables par domain_id) |
| `POST /api/v1/entities/` | Créer une entité |
| `POST /api/v1/documents/upload` | Uploader un fichier |
| `GET /api/v1/documents/expiring` | Documents expirant bientôt |
| `POST /api/v1/capture/file` | Analyser un fichier avec Claude |
| `POST /api/v1/capture/url` | Analyser une URL avec Claude |
| `POST /api/v1/reminders/` | Créer un reminder |
| `PATCH /api/v1/reminders/{id}/dismiss` | Dismisser un reminder |

---

## Domaines de vie

| # | Slug | Label |
|---|---|---|
| 1 | `identity` | Identité & Documents officiels |
| 2 | `housing` | Logement |
| 3 | `finance` | Finance |
| 4 | `work` | Travail |
| 5 | `health` | Santé |
| 6 | `learning` | Learning |
| 7 | `vehicle` | Véhicule |
| 8 | `travel` | Voyage |
| 9 | `subscriptions` | Abonnements & Assets |
| 10 | `contacts` | Contacts clés |
| 11 | `projects` | Projets personnels |

---

## Jobs automatiques (APScheduler)

| Heure | Job | Description |
|---|---|---|
| 00h05 | `sync_expired_documents` | Passe les docs expirés en statut `expired` |
| 00h10 | `fire_due_reminders` | Déclenche les reminders échus (`pending` → `sent`) |

Les reminders J-90 / J-30 / J-7 sont créés automatiquement à l'upload d'un document avec date d'expiration.

---

## Phases

- **Phase 1 (MVP) ✅** — Document Vault, AI Capture, Smart Reminders, Dashboard
- **Phase 2** — Context View, Quick Capture, Relationship Graph, Life Metrics
- **Phase 3** — Decision Vault, Emergency Package, Extension Chrome, Synaptiq Inbox

Voir `REQUIREMENTS.md` pour le BRD complet.
