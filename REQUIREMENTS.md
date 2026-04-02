# Synaptiq — Business Requirements Document

> Version 1.0 — April 2026

## Vision

Synaptiq est un OS personnel — un "second brain" qui organise chaque dimension de la vie : documents officiels, logement, finances, santé, apprentissage, travail, véhicule, voyages, abonnements, contacts clés. L'IA structure automatiquement, relie les éléments entre eux, et signale ce qui demande attention.

---

## Stack technique

| Composant | Technologie |
|---|---|
| Backend | FastAPI (Python) |
| Base de données | PostgreSQL (données structurées) |
| Stockage fichiers | Système de fichiers local (`storage/`) |
| IA | Anthropic Claude API |
| Auth | JWT (python-jose) |
| Migrations | Alembic |
| Notifications | APScheduler |
| Frontend (Phase 2+) | React / Next.js |
| Mobile (Phase 3+) | PWA |

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

### Exemples d'entités par domaine

- **identity** : passeport, CNI, permis de conduire, diplômes, carte vitale
- **housing** : bail, assurance habitation, contrat électricité/gaz/internet, quittances
- **finance** : compte bancaire, carte, crédit, épargne, déclaration fiscale, facture
- **work** : employeur, contrat de travail, fiche de paie, contact RH, projet
- **health** : médecin, médicament, vaccin, résultat d'analyse, mutuelle
- **learning** : certification, cours, note structurée, parcours
- **vehicle** : carte grise, assurance, contrôle technique, entretien
- **travel** : trip, visa, réservation hôtel/vol, assurance voyage
- **subscriptions** : abonnement logiciel, service physique, licence
- **contacts** : personne importante avec contexte (relation, coordonnées, notes)
- **projects** : side project, goal, idée

---

## Modèles de données

### Domain
```
id            UUID PK
slug          VARCHAR UNIQUE  -- identity, housing, ...
label         VARCHAR
icon          VARCHAR
health_score  INTEGER         -- 0-100, calculé
created_at    TIMESTAMP
```

### Entity
```
id          UUID PK
domain_id   UUID FK → Domain
name        VARCHAR
type        VARCHAR           -- ex: "passeport", "bail", "compte_bancaire"
metadata    JSONB             -- données spécifiques au type
notes       TEXT
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

### Document
```
id                UUID PK
entity_id         UUID FK → Entity
filename          VARCHAR
filepath          VARCHAR       -- chemin local dans storage/
mime_type         VARCHAR
doc_type          VARCHAR       -- ex: "contrat", "facture", "resultat"
status            ENUM          -- valid | expired | pending | archived
expires_at        DATE
ai_extracted_data JSONB         -- données extraites par Claude
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### Access
```
id          UUID PK
entity_id   UUID FK → Entity
label       VARCHAR           -- ex: "Portail Ameli", "Espace client EDF"
url         VARCHAR
account_ref VARCHAR           -- numéro de compte, référence client
username    VARCHAR (encrypted)
notes       TEXT
created_at  TIMESTAMP
```

### Reminder
```
id            UUID PK
entity_id     UUID FK → Entity
document_id   UUID FK → Document (nullable)
title         VARCHAR
trigger_date  DATE
type          ENUM             -- expiry | deadline | renewal | custom
status        ENUM             -- pending | sent | dismissed
recurrence    VARCHAR          -- null | monthly | yearly
created_at    TIMESTAMP
```

---

## Features — Phase 1 (MVP)

### F1 — Document Vault
- Upload de fichiers attachés à une entité (PDF, image, etc.)
- Statut : `valid` / `expired` / `pending` / `archived`
- Date d'expiration optionnelle
- Téléchargement sécurisé

### F2 — AI Capture Layer
- Input : URL ou fichier uploadé
- Claude extrait : type de document, entité concernée, dates clés, données structurées
- Auto-routing vers le bon domaine
- Proposition de création d'entité + document à valider par l'utilisateur

### F3 — Access Manager
- Stockage d'accès liés à une entité (portail, numéro de compte, référence)
- Champs : URL, identifiant, référence, notes libres

### F4 — Smart Reminders
- Alertes automatiques avant expiration de documents (J-90, J-30, J-7)
- Rappels d'échéances de factures et renouvellements
- Déclenchement via APScheduler

### F5 — Dashboard
- Vue "Attention requise" : documents expirés ou proches de l'expiration, reminders actifs
- Timeline 30 jours
- Score de santé par domaine (% de documents valides, reminders en retard)

---

## Features — Phase 2

- **Context View** : vue détaillée d'un domaine avec toutes ses entités liées
- **Quick Capture** : saisie rapide texte libre → AI route et structure
- **Relationship Graph** : liens entre entités (ex: médecin → ordonnance → médicament → mutuelle)
- **Life Metrics** : indicateurs de vie (dépenses, santé, progression learning)

## Features — Phase 3

- **Decision Vault** : stocker grandes décisions avec contexte et raisonnement
- **Emergency Package** : export d'un pack d'urgence (docs critiques + accès essentiels)
- **Extension Chrome** : capture depuis le navigateur
- **Synaptiq Inbox** : forwarding email → extraction automatique

---

## Architecture API (v1)

```
POST   /api/v1/capture              # AI Capture Layer
GET    /api/v1/domains              # Liste des domaines + health score
GET    /api/v1/domains/{slug}/entities
POST   /api/v1/entities
GET    /api/v1/entities/{id}
PUT    /api/v1/entities/{id}
DELETE /api/v1/entities/{id}
POST   /api/v1/documents/upload     # Upload fichier
GET    /api/v1/documents/{id}
GET    /api/v1/documents/{id}/download
PATCH  /api/v1/documents/{id}/status
POST   /api/v1/accesses
GET    /api/v1/entities/{id}/accesses
POST   /api/v1/reminders
GET    /api/v1/reminders?status=pending
PATCH  /api/v1/reminders/{id}/dismiss
GET    /api/v1/dashboard            # Vue globale attention + timeline
```

---

## Structure du projet

```
Synaptiq/
├── src/
│   └── app/
│       ├── main.py
│       ├── core/
│       │   ├── config.py          # Settings (pydantic-settings)
│       │   ├── database.py        # SQLAlchemy async engine
│       │   ├── security.py        # JWT
│       │   └── scheduler.py       # APScheduler
│       ├── domains/               # 11 domaines (extensibles)
│       │   ├── identity/
│       │   ├── housing/
│       │   ├── finance/
│       │   ├── work/
│       │   ├── health/
│       │   ├── learning/
│       │   ├── vehicle/
│       │   ├── travel/
│       │   ├── subscriptions/
│       │   ├── contacts/
│       │   └── projects/
│       ├── shared/
│       │   ├── models/
│       │   │   ├── base.py
│       │   │   ├── domain.py
│       │   │   ├── entity.py
│       │   │   ├── document.py
│       │   │   ├── access.py
│       │   │   └── reminder.py
│       │   └── schemas/
│       │       ├── domain.py
│       │       ├── entity.py
│       │       ├── document.py
│       │       ├── access.py
│       │       └── reminder.py
│       ├── ai/
│       │   ├── capture.py
│       │   ├── routing.py
│       │   └── structuring.py
│       └── api/
│           └── v1/
│               ├── __init__.py
│               ├── capture.py
│               ├── domains.py
│               ├── entities.py
│               ├── documents.py
│               ├── accesses.py
│               ├── reminders.py
│               └── dashboard.py
├── storage/                       # Fichiers uploadés (gitignored)
├── alembic/                       # Migrations DB
├── tests/
├── REQUIREMENTS.md
├── requirements.txt
└── .env.example
```

---

## Variables d'environnement

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/synaptiq
SECRET_KEY=changeme
ANTHROPIC_API_KEY=sk-ant-...
STORAGE_PATH=./storage
```
