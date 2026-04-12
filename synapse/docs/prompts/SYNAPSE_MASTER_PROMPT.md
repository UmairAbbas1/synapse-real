# SYNAPSE — Production-Grade AI Coding Agent Prompt
## Ambient Enterprise Knowledge Graph & AI Assistant

> **Author:** Umair Abbas (BSAI-24077)  
> **Course:** Software Engineering + Advanced Database Systems  
> **Version:** 1.0 — April 2026  

---

## TABLE OF CONTENTS

1. [Project Overview & Vision](#1-project-overview--vision)
2. [Architecture Decision Record](#2-architecture-decision-record)
3. [Technology Stack](#3-technology-stack)
4. [File Structure](#4-file-structure)
5. [Backend Implementation Rules](#5-backend-implementation-rules)
6. [Frontend Implementation Rules](#6-frontend-implementation-rules)
7. [Database Schema & Models](#7-database-schema--models)
8. [RAG Pipeline Specification](#8-rag-pipeline-specification)
9. [Knowledge Graph Specification](#9-knowledge-graph-specification)
10. [Authentication & RBAC](#10-authentication--rbac)
11. [Data Ingestion Pipeline](#11-data-ingestion-pipeline)
12. [API Design](#12-api-design)
13. [Error Handling & Resilience](#13-error-handling--resilience)
14. [Testing Strategy](#14-testing-strategy)
15. [DevOps & Deployment](#15-devops--deployment)
16. [UI/UX Design System](#16-uiux-design-system)
17. [Performance Benchmarks](#17-performance-benchmarks)
18. [Security Hardening](#18-security-hardening)
19. [Prompt Templates for LLM](#19-prompt-templates-for-llm)
20. [Step-by-Step Build Order](#20-step-by-step-build-order)

---

## 1. PROJECT OVERVIEW & VISION

### What is Synapse?

Synapse is a **fully self-hosted, air-gapped enterprise AI assistant** that:
- Connects to internal tools (Slack, GitHub, Jira, Google Drive)
- Ingests, chunks, and embeds all internal documents into a vector database
- Builds a knowledge graph mapping people, documents, projects, and teams
- Answers natural-language questions using a local LLM via RAG (Retrieval-Augmented Generation)
- Enforces role-based access control at the database query level — no data leaks
- Routes unanswered questions to the most relevant human expert
- **ZERO data leaves company infrastructure. Ever.**

### Core Use Case

```
Employee types: "How do I fix the ERR-502-DB error?"
  → Synapse embeds the question locally
  → Searches all indexed internal docs (vector similarity + RBAC filter)
  → Retrieves top-5 relevant chunks
  → Passes chunks as context to a local LLM (Llama 3 / Mistral via Ollama)
  → Returns a precise, sourced answer with citation cards
  → If confidence < 0.65 → recommends the most relevant senior engineer
  → Total time: < 10 seconds
  → Data that left the building: NOTHING
```

### What This Prompt Does

This document is the **single source of truth** for any AI coding agent (Cursor, GitHub Copilot, Cline, Aider, etc.) to build Synapse as a **production-grade, resume-worthy product** — not a toy demo. Every file, every function, every edge case is specified.

---

## 2. ARCHITECTURE DECISION RECORD

### Why This Architecture?

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Backend Framework | **FastAPI (Python)** | Async-first, type hints, auto OpenAPI docs, ML ecosystem native |
| Frontend Framework | **Next.js 14+ (App Router)** | RSC, server actions, file-based routing, production SSR/SSG |
| Vector Database | **Qdrant** | Purpose-built for vectors, HNSW index, payload filtering (RBAC), gRPC support, better than pgvector for scale |
| Graph Database | **Neo4j** | Industry standard, Cypher query language, visualization tools, mature Python driver |
| Relational Database | **PostgreSQL 16** | RBAC tables, audit logs, user management, session storage |
| Local LLM Runtime | **Ollama** | Single binary, model management, OpenAI-compatible API, GPU acceleration |
| Embedding Model | **all-MiniLM-L6-v2** (Sentence Transformers) | 768-dim vectors, fast inference, runs on CPU, production-proven |
| Task Queue | **Celery + Redis** | Async ingestion jobs, retry logic, monitoring with Flower |
| Containerization | **Docker Compose** | Single command deployment, service isolation, reproducible builds |
| Auth | **OAuth 2.0 / SAML 2.0 via Keycloak** | Enterprise SSO, RBAC management, session management |

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        COMPANY NETWORK (Air-Gapped)                  │
│                                                                      │
│  ┌─────────────┐     ┌──────────────────────────────────────────┐   │
│  │   Next.js    │────▶│            FastAPI Gateway               │   │
│  │   Frontend   │◀────│  (Query API / Admin API / Auth API)      │   │
│  └─────────────┘     └──────────┬───────────┬───────────────────┘   │
│                                 │           │                        │
│                    ┌────────────┴──┐  ┌─────┴──────────┐            │
│                    │  Query Service │  │ Ingestion Svc  │            │
│                    │               │  │ (Celery Worker) │            │
│                    └───┬───┬───┬───┘  └──┬──────┬──────┘            │
│                        │   │   │         │      │                    │
│               ┌────────┘   │   └────┐    │      │                    │
│               ▼            ▼        ▼    ▼      ▼                    │
│  ┌──────────────┐ ┌──────────┐ ┌────────────┐ ┌─────────────┐      │
│  │    Qdrant     │ │  Neo4j   │ │ PostgreSQL │ │   Redis     │      │
│  │ (Vectors +   │ │ (Graph)  │ │ (Users,    │ │ (Queue +    │      │
│  │  Embeddings) │ │          │ │  RBAC,     │ │  Cache)     │      │
│  └──────────────┘ └──────────┘ │  Audit)    │ └─────────────┘      │
│                                └────────────┘                        │
│                                      │                               │
│                              ┌───────┴───────┐                       │
│                              │    Ollama      │                       │
│                              │  (Local LLM)   │                       │
│                              │ Llama3 / Mistral│                      │
│                              └────────────────┘                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Data Source Connectors (OAuth 2.0)               │    │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────────┐      │    │
│  │  │ Slack  │  │ GitHub │  │  Jira  │  │ Google Drive │      │    │
│  │  └────────┘  └────────┘  └────────┘  └──────────────┘      │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. TECHNOLOGY STACK

### Backend (Python 3.12+)

```
# Core
fastapi==0.115.*
uvicorn[standard]==0.34.*
pydantic==2.*
pydantic-settings==2.*

# Database Drivers
asyncpg==0.30.*                    # Async PostgreSQL
neo4j==5.*                         # Neo4j Python driver
qdrant-client==1.12.*              # Qdrant vector DB client
redis==5.*                         # Redis client

# ML / Embeddings
sentence-transformers==3.*         # Embedding model
torch==2.5.*                       # PyTorch (CPU build for dev)
transformers==4.*                  # Hugging Face

# LLM Integration
ollama==0.4.*                      # Ollama Python SDK
httpx==0.28.*                      # Async HTTP client

# Task Queue
celery[redis]==5.*                  # Distributed task queue
flower==2.*                        # Celery monitoring

# Auth
python-jose[cryptography]==3.*     # JWT handling
passlib[bcrypt]==1.*               # Password hashing
authlib==1.*                       # OAuth 2.0 / SAML

# Ingestion Connectors
slack-sdk==3.*                     # Slack API
PyGithub==2.*                      # GitHub API
atlassian-python-api==3.*          # Jira API
google-api-python-client==2.*      # Google Drive API

# Document Processing
langchain-text-splitters==0.3.*    # Smart text chunking
pypdf==5.*                         # PDF text extraction
python-docx==1.*                   # Word doc extraction
beautifulsoup4==4.*                # HTML parsing
markdownify==0.14.*                # HTML to Markdown

# Utilities
structlog==24.*                    # Structured logging
tenacity==9.*                      # Retry logic
python-multipart==0.0.*            # File uploads
python-dotenv==1.*                 # Environment variables

# Testing
pytest==8.*
pytest-asyncio==0.24.*
pytest-cov==6.*
httpx                              # For TestClient
factory-boy==3.*                   # Test factories
faker==33.*                        # Fake data generation
```

### Frontend (Node 20+ / TypeScript 5+)

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "typescript": "^5.5",
    "@tanstack/react-query": "^5.60",
    "zustand": "^5.0",
    "framer-motion": "^11.11",
    "tailwindcss": "^3.4",
    "@headlessui/react": "^2.2",
    "lucide-react": "^0.460",
    "date-fns": "^4.1",
    "react-hot-toast": "^2.4",
    "react-markdown": "^9.0",
    "rehype-highlight": "^7.0",
    "clsx": "^2.1",
    "zod": "^3.23",
    "next-auth": "^4.24",
    "@react-three/fiber": "^8.17",
    "@react-three/drei": "^9.114",
    "three": "^0.170",
    "recharts": "^2.13",
    "cmdk": "^1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3",
    "@types/node": "^22",
    "eslint": "^9",
    "eslint-config-next": "^14.2",
    "prettier": "^3.4",
    "vitest": "^2.1",
    "@testing-library/react": "^16.0",
    "@testing-library/jest-dom": "^6.6",
    "playwright": "^1.49"
  }
}
```

### Infrastructure

```yaml
# docker-compose.yml services
services:
  - synapse-api          # FastAPI backend
  - synapse-frontend     # Next.js frontend
  - synapse-worker       # Celery worker (ingestion)
  - synapse-beat         # Celery beat (scheduler)
  - qdrant               # Vector database
  - neo4j                # Graph database
  - postgres             # Relational database
  - redis                # Queue broker + cache
  - ollama               # Local LLM runtime
  - keycloak             # SSO / Auth server (optional)
  - flower               # Celery monitoring dashboard
  - nginx                # Reverse proxy + TLS termination
```

---

## 4. FILE STRUCTURE

```
synapse/
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── .env.example
├── .env.dev
├── .gitignore
├── Makefile                          # make dev, make test, make build, make deploy
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── pyproject.toml                # Modern Python packaging
│   ├── alembic.ini                   # Database migrations config
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       ├── 001_initial_schema.py
│   │       ├── 002_rbac_tables.py
│   │       └── 003_audit_log.py
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app factory
│   │   ├── config.py                 # Pydantic Settings (env vars)
│   │   ├── dependencies.py           # FastAPI dependency injection
│   │   │
│   │   ├── api/                      # API Layer (thin — delegates to services)
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # Central router aggregator
│   │   │   ├── middleware/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py           # JWT validation middleware
│   │   │   │   ├── rate_limit.py     # Rate limiting
│   │   │   │   ├── request_id.py     # X-Request-ID injection
│   │   │   │   └── error_handler.py  # Global exception handler
│   │   │   │
│   │   │   └── v1/                   # API v1 namespace
│   │   │       ├── __init__.py
│   │   │       ├── query.py          # POST /api/v1/query
│   │   │       ├── sources.py        # CRUD /api/v1/sources
│   │   │       ├── users.py          # CRUD /api/v1/users
│   │   │       ├── auth.py           # POST /api/v1/auth/login, /refresh, /logout
│   │   │       ├── admin.py          # Admin dashboard endpoints
│   │   │       ├── health.py         # GET /api/v1/health (readiness + liveness)
│   │   │       └── audit.py          # GET /api/v1/audit (audit log viewer)
│   │   │
│   │   ├── core/                     # Business Logic Layer
│   │   │   ├── __init__.py
│   │   │   ├── query_engine.py       # RAG pipeline orchestrator
│   │   │   ├── embedding.py          # Sentence Transformer wrapper
│   │   │   ├── vector_search.py      # Qdrant search with RBAC filter
│   │   │   ├── graph_search.py       # Neo4j Cypher queries
│   │   │   ├── llm_client.py         # Ollama LLM client
│   │   │   ├── expert_router.py      # Expert routing logic (score < 0.65)
│   │   │   ├── prompt_builder.py     # LLM prompt template construction
│   │   │   ├── chunker.py            # Document chunking (512 tokens, 50 overlap)
│   │   │   └── citation_builder.py   # Source citation formatter
│   │   │
│   │   ├── services/                 # Service Layer (orchestrates core + db)
│   │   │   ├── __init__.py
│   │   │   ├── query_service.py      # Handles full query lifecycle
│   │   │   ├── ingestion_service.py  # Manages ingestion jobs
│   │   │   ├── user_service.py       # User CRUD + RBAC management
│   │   │   ├── source_service.py     # Data source CRUD
│   │   │   ├── auth_service.py       # Authentication logic
│   │   │   └── audit_service.py      # Audit log writer/reader
│   │   │
│   │   ├── connectors/               # Data Source Connectors
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # Abstract connector interface
│   │   │   ├── slack.py              # Slack connector (OAuth 2.0)
│   │   │   ├── github.py             # GitHub connector
│   │   │   ├── jira.py               # Jira connector
│   │   │   ├── google_drive.py       # Google Drive connector
│   │   │   └── registry.py           # Connector factory/registry
│   │   │
│   │   ├── models/                   # SQLAlchemy ORM Models
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # DeclarativeBase + mixins (timestamps, soft delete)
│   │   │   ├── user.py               # User model
│   │   │   ├── role.py               # Role + Permission models
│   │   │   ├── data_source.py        # DataSource model
│   │   │   ├── ingestion_job.py      # IngestionJob model (status tracking)
│   │   │   ├── audit_log.py          # AuditLog model
│   │   │   └── session.py            # UserSession model
│   │   │
│   │   ├── schemas/                  # Pydantic Schemas (request/response)
│   │   │   ├── __init__.py
│   │   │   ├── query.py              # QueryRequest, QueryResponse, Citation
│   │   │   ├── user.py               # UserCreate, UserUpdate, UserResponse
│   │   │   ├── source.py             # SourceCreate, SourceResponse
│   │   │   ├── auth.py               # LoginRequest, TokenResponse
│   │   │   ├── admin.py              # DashboardStats, SystemHealth
│   │   │   └── common.py             # PaginatedResponse, ErrorResponse
│   │   │
│   │   ├── db/                       # Database Connections
│   │   │   ├── __init__.py
│   │   │   ├── postgres.py           # AsyncSession factory
│   │   │   ├── qdrant.py             # Qdrant client singleton
│   │   │   ├── neo4j.py              # Neo4j driver singleton
│   │   │   └── redis.py              # Redis connection pool
│   │   │
│   │   └── workers/                  # Celery Tasks
│   │       ├── __init__.py
│   │       ├── celery_app.py         # Celery application config
│   │       ├── ingestion_tasks.py    # Ingest, chunk, embed, store
│   │       ├── sync_tasks.py         # Scheduled sync jobs
│   │       └── cleanup_tasks.py      # GDPR deletion, stale data cleanup
│   │
│   └── tests/
│       ├── conftest.py               # Fixtures (test DB, mock services)
│       ├── factories.py              # Factory Boy factories
│       ├── unit/
│       │   ├── test_chunker.py
│       │   ├── test_embedding.py
│       │   ├── test_vector_search.py
│       │   ├── test_expert_router.py
│       │   ├── test_prompt_builder.py
│       │   └── test_rbac.py
│       ├── integration/
│       │   ├── test_query_pipeline.py
│       │   ├── test_ingestion.py
│       │   ├── test_auth_flow.py
│       │   └── test_connectors.py
│       └── e2e/
│           ├── test_full_query.py
│           └── test_admin_flow.py
│
├── frontend/
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── postcss.config.js
│   │
│   ├── public/
│   │   ├── fonts/                    # Self-hosted fonts (no external CDN)
│   │   │   ├── GeneralSans-Variable.woff2
│   │   │   └── JetBrainsMono-Variable.woff2
│   │   ├── icons/
│   │   │   ├── slack.svg
│   │   │   ├── github.svg
│   │   │   ├── jira.svg
│   │   │   └── gdrive.svg
│   │   └── synapse-logo.svg
│   │
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── layout.tsx            # Root layout (fonts, providers, theme)
│   │   │   ├── page.tsx              # Landing / redirect to /chat
│   │   │   ├── globals.css           # Tailwind + CSS custom properties
│   │   │   │
│   │   │   ├── (auth)/               # Auth route group
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── (dashboard)/          # Protected route group
│   │   │   │   ├── layout.tsx        # Sidebar + topbar layout
│   │   │   │   ├── chat/
│   │   │   │   │   └── page.tsx      # Main Q&A interface
│   │   │   │   ├── history/
│   │   │   │   │   └── page.tsx      # Past conversations
│   │   │   │   ├── admin/
│   │   │   │   │   ├── page.tsx      # Admin dashboard overview
│   │   │   │   │   ├── sources/
│   │   │   │   │   │   └── page.tsx  # Data source management
│   │   │   │   │   ├── users/
│   │   │   │   │   │   └── page.tsx  # User & role management
│   │   │   │   │   └── audit/
│   │   │   │   │       └── page.tsx  # Audit log viewer
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx      # User preferences
│   │   │   │
│   │   │   └── api/                  # Next.js API routes (BFF pattern)
│   │   │       └── auth/
│   │   │           └── [...nextauth]/route.ts
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                   # Primitive UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Dialog.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Tooltip.tsx
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   └── CommandPalette.tsx # cmdk-powered (Cmd+K)
│   │   │   │
│   │   │   ├── chat/                 # Chat-specific components
│   │   │   │   ├── ChatContainer.tsx # Main chat area
│   │   │   │   ├── MessageBubble.tsx # Individual message
│   │   │   │   ├── QueryInput.tsx    # Input bar with suggestions
│   │   │   │   ├── CitationCard.tsx  # Source citation display
│   │   │   │   ├── ExpertCard.tsx    # Expert recommendation card
│   │   │   │   ├── ThinkingIndicator.tsx # Animated "thinking" state
│   │   │   │   └── MarkdownRenderer.tsx  # Rendered LLM output
│   │   │   │
│   │   │   ├── admin/                # Admin-specific components
│   │   │   │   ├── SourceCard.tsx
│   │   │   │   ├── SourceConnectDialog.tsx
│   │   │   │   ├── UserTable.tsx
│   │   │   │   ├── RoleEditor.tsx
│   │   │   │   ├── IngestionProgress.tsx
│   │   │   │   ├── SystemHealthCard.tsx
│   │   │   │   └── AuditLogTable.tsx
│   │   │   │
│   │   │   ├── layout/               # Layout components
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Topbar.tsx
│   │   │   │   ├── MobileNav.tsx
│   │   │   │   └── BreadcrumbNav.tsx
│   │   │   │
│   │   │   └── three/                # 3D visual elements
│   │   │       ├── KnowledgeGraph3D.tsx  # Interactive 3D graph visualization
│   │   │       ├── NeuralParticles.tsx   # Background particle system
│   │   │       └── GlobeVisualization.tsx # Data flow visualization
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useQuery.ts           # Query submission + streaming
│   │   │   ├── useAuth.ts            # Auth state management
│   │   │   ├── useSources.ts         # Data source CRUD
│   │   │   ├── useUsers.ts           # User management
│   │   │   ├── useAuditLog.ts        # Audit log pagination
│   │   │   ├── useTheme.ts           # Dark/light/system theme
│   │   │   └── useCommandPalette.ts  # Keyboard shortcut handler
│   │   │
│   │   ├── stores/                   # Zustand state stores
│   │   │   ├── authStore.ts
│   │   │   ├── chatStore.ts
│   │   │   └── uiStore.ts
│   │   │
│   │   ├── lib/                      # Utilities
│   │   │   ├── api.ts                # Axios/fetch wrapper with interceptors
│   │   │   ├── constants.ts
│   │   │   ├── formatters.ts         # Date, file size formatters
│   │   │   └── validators.ts         # Zod schemas for forms
│   │   │
│   │   └── types/                    # TypeScript type definitions
│   │       ├── api.ts                # API response types
│   │       ├── chat.ts               # Chat/message types
│   │       ├── admin.ts              # Admin panel types
│   │       └── index.ts              # Re-exports
│   │
│   └── tests/
│       ├── components/
│       │   └── ChatContainer.test.tsx
│       └── e2e/
│           └── chat-flow.spec.ts     # Playwright e2e
│
├── nginx/
│   ├── nginx.conf
│   ├── ssl/                          # Self-signed certs for dev
│   └── snippets/
│       └── security-headers.conf
│
├── scripts/
│   ├── seed_data.py                  # Demo data seeder
│   ├── init_qdrant.py                # Create Qdrant collection with schema
│   ├── init_neo4j.py                 # Create Neo4j constraints/indexes
│   ├── download_models.py            # Pre-download Ollama + embedding models
│   └── healthcheck.sh                # Docker healthcheck script
│
└── docs/
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    ├── DEPLOYMENT.md
    └── CONTRIBUTING.md
```

---

## 5. BACKEND IMPLEMENTATION RULES

### STRICT Rules — AI Agent Must Follow

```
RULE 01: Every function MUST have type hints. No `Any` unless unavoidable.
RULE 02: Every API endpoint MUST have a Pydantic request AND response schema.
RULE 03: Every database query MUST be parameterized. NEVER use f-strings for SQL.
RULE 04: Every service function MUST have a docstring explaining what it does.
RULE 05: Every error MUST be caught and converted to a structured ErrorResponse.
RULE 06: NEVER use print(). Use structlog for ALL logging.
RULE 07: NEVER hardcode secrets. ALL config via environment variables + Pydantic Settings.
RULE 08: NEVER return raw exceptions to the client. Always sanitize.
RULE 09: ALL database sessions MUST use async context managers (async with).
RULE 10: ALL external calls (Ollama, Qdrant, Neo4j) MUST have timeouts and retries.
RULE 11: Follow PEP-8 strictly. Max line length 100 characters.
RULE 12: Use dependency injection via FastAPI's Depends() for all services.
RULE 13: NEVER commit .env files. Use .env.example with dummy values.
RULE 14: ALL list endpoints MUST support pagination (limit + offset).
RULE 15: Use Alembic for ALL database schema changes. No raw DDL.
```

### FastAPI App Factory Pattern

```python
# backend/app/main.py

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.router import api_router
from app.api.middleware.request_id import RequestIDMiddleware
from app.api.middleware.error_handler import global_exception_handler
from app.db.postgres import init_db, close_db
from app.db.qdrant import init_qdrant, close_qdrant
from app.db.neo4j import init_neo4j, close_neo4j
from app.db.redis import init_redis, close_redis
from app.core.embedding import load_embedding_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect all services. Shutdown: close all connections."""
    # Startup
    await init_db()
    await init_qdrant()
    await init_neo4j()
    await init_redis()
    load_embedding_model()
    
    yield
    
    # Shutdown
    await close_db()
    await close_qdrant()
    await close_neo4j()
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Synapse API",
        description="Enterprise Knowledge Graph & AI Assistant",
        version="1.0.0",
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # Middleware (order matters — outermost first)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    app.add_exception_handler(Exception, global_exception_handler)

    # Routes
    app.include_router(api_router, prefix="/api")

    return app


app = create_app()
```

### Config Pattern

```python
# backend/app/config.py

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Synapse"
    DEBUG: bool = False
    API_VERSION: str = "v1"
    SECRET_KEY: str = Field(..., description="JWT signing key")
    
    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "synapse"
    POSTGRES_PASSWORD: str = Field(..., description="DB password")
    POSTGRES_DB: str = "synapse"
    
    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "synapse_documents"
    
    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = Field(...)
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3:8b"
    OLLAMA_TIMEOUT: int = 30
    
    # Embedding
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 768
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    
    # RBAC
    SIMILARITY_THRESHOLD: float = 0.65
    TOP_K_RESULTS: int = 5
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # Session
    SESSION_EXPIRE_HOURS: int = 8
    
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

---

## 6. FRONTEND IMPLEMENTATION RULES

### STRICT Rules — AI Agent Must Follow

```
RULE 01: TypeScript strict mode. NO `any` type. Ever. Use `unknown` if truly needed.
RULE 02: ALL API responses typed with Zod schemas that match backend Pydantic schemas.
RULE 03: ALL forms use controlled components + Zod validation. No unvalidated submissions.
RULE 04: NEVER use inline styles. ALL styling via Tailwind utility classes + CSS variables.
RULE 05: EVERY component must handle 3 states: loading (skeleton), error, success.
RULE 06: NEVER fetch data in components directly. Use custom hooks (useQuery pattern).
RULE 07: ALL images must have explicit width/height or use Next.js Image component.
RULE 08: ALL interactive elements must be keyboard accessible (tabIndex, aria labels).
RULE 09: Use framer-motion for ALL animations. No CSS keyframes for complex motion.
RULE 10: Dark mode is the DEFAULT. Light mode is secondary. Both must work perfectly.
RULE 11: ALL text content must handle overflow with truncation or scroll.
RULE 12: NEVER use alert() or confirm(). Use custom Dialog/Toast components.
RULE 13: Self-host ALL fonts. No Google Fonts CDN (air-gapped requirement).
RULE 14: EVERY page must have a proper <title> and meta description.
RULE 15: Use semantic HTML (main, nav, article, section, aside). No div soup.
```

### Design System — NOT Generic AI UI

**CRITICAL: The UI must look like a real product designed by a senior UI designer, NOT an AI-generated interface.**

#### What to AVOID (AI-generated tells):
- Purple/blue gradients on white backgrounds
- Rounded cards with drop shadows everywhere
- Inter/Roboto/Arial fonts
- Evenly-spaced grid layouts with identical card sizes
- Generic placeholder illustrations
- Rainbow RGB gamer aesthetics
- Excessive border-radius on everything
- Bland, safe, corporate blue color schemes

#### What to DO (Production design):

**Typography:**
- Primary: `General Sans` (variable weight) — geometric sans with character
- Monospace: `JetBrains Mono` — for code snippets, technical data
- Use font-weight variation aggressively (300 for body, 600 for headings, 800 for hero)

**Color Palette (Dark-first):**
```css
:root {
  /* Backgrounds — deep charcoal, NOT pure black */
  --bg-primary: #0A0A0F;
  --bg-secondary: #12121A;
  --bg-elevated: #1A1A26;
  --bg-hover: #22222E;
  
  /* Surfaces — subtle warmth */
  --surface-1: #1E1E2A;
  --surface-2: #262636;
  --surface-3: #2E2E40;
  
  /* Text — warm whites, not pure white */
  --text-primary: #EEEEF0;
  --text-secondary: #9898A6;
  --text-tertiary: #68687A;
  
  /* Accent — electric cyan (NOT purple, NOT blue) */
  --accent-primary: #00E5CC;
  --accent-hover: #00FFE0;
  --accent-muted: rgba(0, 229, 204, 0.15);
  --accent-glow: rgba(0, 229, 204, 0.4);
  
  /* Semantic */
  --success: #34D399;
  --warning: #FBBF24;
  --error: #F87171;
  --info: #60A5FA;
  
  /* Borders — barely visible */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-medium: rgba(255, 255, 255, 0.10);
  --border-strong: rgba(255, 255, 255, 0.16);
  
  /* Glassmorphism */
  --glass-bg: rgba(18, 18, 26, 0.8);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-blur: 20px;
}

/* Light mode overrides */
[data-theme="light"] {
  --bg-primary: #FAFAF9;
  --bg-secondary: #F5F5F0;
  --bg-elevated: #FFFFFF;
  --text-primary: #1A1A1A;
  --text-secondary: #6B6B6B;
  --accent-primary: #009B8D;
}
```

**Layout Principles:**
- Sidebar: 240px fixed, collapsible to 64px (icon-only)
- Main content: fluid, max-width 1200px, centered
- Chat area: full-height flex column, messages scroll, input fixed bottom
- Admin pages: responsive grid, 2-col on tablet, 3-col on desktop
- Generous whitespace — 24px minimum between sections

**Component Design Language:**
- Cards: 1px border (--border-subtle), 12px border-radius, NO drop shadow in dark mode, subtle inset shadow instead
- Buttons: sharp corners (6px radius), bold text, hover glow effect on primary
- Inputs: bottom-border-only style (not boxed), transitions to accent color on focus
- Tables: zebra striping with --bg-hover, sticky headers, horizontal scroll on mobile
- Badges: pill shape, muted background colors, 10px font size
- Avatars: 2px accent border, rounded-full
- Citations: left accent border (4px), subtle background, monospace metadata

**Animation Guidelines:**
- Page transitions: subtle fade + 8px translateY (200ms ease-out)
- Skeleton loading: shimmer effect with gradient sweep
- Chat messages: stagger-in from bottom (100ms delay between messages)
- Thinking indicator: 3 dots with sequential bounce (not pulse)
- Sidebar collapse: smooth width transition (300ms cubic-bezier)
- Hover states: 150ms transitions, scale(1.02) on cards
- NEVER use spring/bounce physics on functional elements
- Loading spinners: custom SVG ring, NOT a rotating circle

---

## 7. DATABASE SCHEMA & MODELS

### PostgreSQL Schema (via Alembic)

```sql
-- Users & Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role_id UUID NOT NULL REFERENCES roles(id),
    sso_provider VARCHAR(50),          -- 'keycloak', 'google', 'github'
    sso_subject_id VARCHAR(255),       -- External SSO identifier
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,  -- 'ADMIN', 'SENIOR_DEV', 'JUNIOR_DEV', 'PM', 'HR'
    description TEXT,
    permission_tags TEXT[] NOT NULL DEFAULT '{}',  -- Array of permission tags
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Sources
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,  -- 'slack', 'github', 'jira', 'google_drive'
    config JSONB NOT NULL DEFAULT '{}',
    encrypted_credentials BYTEA,       -- AES-256 encrypted OAuth tokens
    default_permission_tags TEXT[] NOT NULL DEFAULT '{}',
    sync_schedule VARCHAR(50) DEFAULT '0 */6 * * *',  -- Cron expression
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'paused', 'error'
    last_sync_at TIMESTAMPTZ,
    documents_count INT DEFAULT 0,
    chunks_count INT DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingestion Jobs
CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES data_sources(id),
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending','running','completed','failed','retrying'
    documents_processed INT DEFAULT 0,
    chunks_created INT DEFAULT 0,
    errors JSONB DEFAULT '[]',
    retry_count INT DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,       -- 'query', 'login', 'role_change', 'source_connect', etc.
    resource_type VARCHAR(50),         -- 'query', 'user', 'data_source', etc.
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}',
    query_hash VARCHAR(64),            -- SHA-256 of query text (anonymized)
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_ingestion_source ON ingestion_jobs(source_id, created_at DESC);
```

### Qdrant Collection Schema

```python
# scripts/init_qdrant.py

from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, 
    PayloadSchemaType, 
    TextIndexParams, TokenizerType,
    HnswConfigDiff, OptimizersConfigDiff
)

client = QdrantClient(host="localhost", port=6333)

client.create_collection(
    collection_name="synapse_documents",
    vectors_config=VectorParams(
        size=768,                        # all-MiniLM-L6-v2 output dim
        distance=Distance.COSINE,
    ),
    hnsw_config=HnswConfigDiff(
        m=16,                            # Graph connectivity
        ef_construct=100,                # Build-time accuracy
        full_scan_threshold=10000,
    ),
    optimizers_config=OptimizersConfigDiff(
        indexing_threshold=20000,
    ),
)

# Create payload indexes for RBAC filtering
client.create_payload_index(
    collection_name="synapse_documents",
    field_name="permission_tags",
    field_schema=PayloadSchemaType.KEYWORD,  # Array of strings
)

client.create_payload_index(
    collection_name="synapse_documents",
    field_name="source_type",
    field_schema=PayloadSchemaType.KEYWORD,
)

client.create_payload_index(
    collection_name="synapse_documents",
    field_name="author",
    field_schema=PayloadSchemaType.KEYWORD,
)

client.create_payload_index(
    collection_name="synapse_documents",
    field_name="chunk_text",
    field_schema=TextIndexParams(
        type="text",
        tokenizer=TokenizerType.WORD,
        min_token_len=2,
        max_token_len=20,
    ),
)
```

**Qdrant Point Payload Schema:**
```json
{
  "chunk_text": "The error ERR-502-DB occurs when the connection pool...",
  "source_url": "https://slack.com/archives/C0123/p1234567890",
  "source_type": "slack",
  "source_id": "uuid-of-data-source",
  "document_title": "Backend Troubleshooting Guide",
  "author": "jane.doe@company.com",
  "permission_tags": ["engineering", "backend"],
  "timestamp": "2026-01-15T10:30:00Z",
  "chunk_index": 3,
  "total_chunks": 12,
  "document_hash": "sha256-of-original-doc"
}
```

### Neo4j Graph Schema

```cypher
// Constraints
CREATE CONSTRAINT person_email IF NOT EXISTS FOR (p:Person) REQUIRE p.email IS UNIQUE;
CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.doc_id IS UNIQUE;
CREATE CONSTRAINT project_name IF NOT EXISTS FOR (p:Project) REQUIRE p.name IS UNIQUE;
CREATE CONSTRAINT team_name IF NOT EXISTS FOR (t:Team) REQUIRE t.name IS UNIQUE;
CREATE CONSTRAINT ticket_key IF NOT EXISTS FOR (t:Ticket) REQUIRE t.key IS UNIQUE;

// Indexes
CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name);
CREATE INDEX document_type IF NOT EXISTS FOR (d:Document) ON (d.source_type);
CREATE FULLTEXT INDEX document_content IF NOT EXISTS FOR (d:Document) ON EACH [d.title, d.summary];

// Node Types
// (:Person {email, name, title, team, department, avatar_url, last_active})
// (:Document {doc_id, title, source_type, source_url, summary, created_at, updated_at})
// (:Project {name, description, status, created_at})
// (:Team {name, department, description})
// (:Ticket {key, title, status, priority, created_at, resolved_at})

// Edge Types
// (Person)-[:AUTHORED]->(Document)
// (Person)-[:REFERENCED]->(Document)
// (Person)-[:ASSIGNED_TO]->(Ticket)
// (Person)-[:BELONGS_TO]->(Team)
// (Person)-[:WORKS_ON]->(Project)
// (Document)-[:RELATED_TO]->(Document)
// (Document)-[:MENTIONS]->(Project)
// (Ticket)-[:BELONGS_TO]->(Project)
// (Team)-[:OWNS]->(Project)
```

---

## 8. RAG PIPELINE SPECIFICATION

### Full Query Flow (query_engine.py)

```python
# backend/app/core/query_engine.py

import structlog
from dataclasses import dataclass
from app.core.embedding import EmbeddingService
from app.core.vector_search import VectorSearchService
from app.core.graph_search import GraphSearchService
from app.core.llm_client import LLMClient
from app.core.expert_router import ExpertRouter
from app.core.prompt_builder import PromptBuilder
from app.core.citation_builder import CitationBuilder
from app.schemas.query import QueryResponse, Citation, ExpertSuggestion

logger = structlog.get_logger()


@dataclass
class RetrievedChunk:
    text: str
    score: float
    source_url: str
    source_type: str
    document_title: str
    author: str
    timestamp: str


class QueryEngine:
    """
    Orchestrates the full RAG pipeline:
    1. Embed the query
    2. Vector search with RBAC filtering
    3. Graph enrichment (optional)
    4. Build context-augmented prompt
    5. LLM inference
    6. Format response with citations
    7. Expert routing if low confidence
    """
    
    def __init__(
        self,
        embedding_svc: EmbeddingService,
        vector_svc: VectorSearchService,
        graph_svc: GraphSearchService,
        llm_client: LLMClient,
        expert_router: ExpertRouter,
        prompt_builder: PromptBuilder,
        citation_builder: CitationBuilder,
    ):
        self.embedding = embedding_svc
        self.vector = vector_svc
        self.graph = graph_svc
        self.llm = llm_client
        self.expert = expert_router
        self.prompt = prompt_builder
        self.citation = citation_builder

    async def execute(
        self,
        query: str,
        user_permission_tags: list[str],
        user_id: str,
    ) -> QueryResponse:
        
        log = logger.bind(user_id=user_id, query_length=len(query))
        log.info("query_pipeline_started")
        
        # Step 1: Embed the query
        query_vector = self.embedding.encode(query)
        log.info("query_embedded", dimensions=len(query_vector))
        
        # Step 2: Vector search with RBAC filter
        chunks = await self.vector.search(
            vector=query_vector,
            permission_tags=user_permission_tags,
            top_k=5,
        )
        log.info("vector_search_complete", results=len(chunks), 
                 top_score=chunks[0].score if chunks else 0)
        
        # Step 3: Check confidence threshold
        max_score = max((c.score for c in chunks), default=0)
        is_low_confidence = max_score < 0.65
        
        # Step 4: Graph enrichment
        graph_context = []
        if chunks:
            graph_context = await self.graph.enrich(
                chunk_sources=[c.source_url for c in chunks],
                query_text=query,
            )
            log.info("graph_enrichment_complete", nodes=len(graph_context))
        
        # Step 5: Build prompt
        prompt = self.prompt.build(
            query=query,
            chunks=chunks,
            graph_context=graph_context,
            is_low_confidence=is_low_confidence,
        )
        
        # Step 6: LLM inference
        llm_response = await self.llm.generate(prompt)
        log.info("llm_inference_complete", response_length=len(llm_response))
        
        # Step 7: Build citations
        citations = self.citation.build(chunks)
        
        # Step 8: Expert routing (if needed)
        expert: ExpertSuggestion | None = None
        if is_low_confidence:
            expert = await self.expert.find_expert(query)
            log.info("expert_routed", expert=expert.name if expert else None)
        
        return QueryResponse(
            answer=llm_response,
            citations=citations,
            expert=expert,
            is_low_confidence=is_low_confidence,
            metadata={
                "top_similarity_score": round(max_score, 4),
                "chunks_retrieved": len(chunks),
                "graph_nodes_used": len(graph_context),
                "model": self.llm.model_name,
            }
        )
```

### Embedding Service

```python
# backend/app/core/embedding.py

import numpy as np
from sentence_transformers import SentenceTransformer
from app.config import settings

_model: SentenceTransformer | None = None


def load_embedding_model() -> None:
    """Load model at startup. Called once in lifespan."""
    global _model
    _model = SentenceTransformer(settings.EMBEDDING_MODEL)


class EmbeddingService:
    def encode(self, text: str) -> list[float]:
        if _model is None:
            raise RuntimeError("Embedding model not loaded")
        vector = _model.encode(text, normalize_embeddings=True)
        return vector.tolist()
    
    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        if _model is None:
            raise RuntimeError("Embedding model not loaded")
        vectors = _model.encode(texts, normalize_embeddings=True, batch_size=64)
        return vectors.tolist()
```

### Vector Search with RBAC

```python
# backend/app/core/vector_search.py

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny, SearchRequest
from app.config import settings


class VectorSearchService:
    def __init__(self, client: AsyncQdrantClient):
        self.client = client
        self.collection = settings.QDRANT_COLLECTION

    async def search(
        self,
        vector: list[float],
        permission_tags: list[str],
        top_k: int = 5,
    ) -> list[RetrievedChunk]:
        """
        CRITICAL: RBAC filter is applied AT THE DATABASE LEVEL.
        The search space is physically restricted to only chunks
        the user is permitted to access. Bypass is architecturally
        impossible — the filter is part of the query itself.
        """
        rbac_filter = Filter(
            must=[
                FieldCondition(
                    key="permission_tags",
                    match=MatchAny(any=permission_tags),
                )
            ]
        )
        
        results = await self.client.search(
            collection_name=self.collection,
            query_vector=vector,
            query_filter=rbac_filter,
            limit=top_k,
            with_payload=True,
            score_threshold=0.3,  # Minimum relevance cutoff
        )
        
        return [
            RetrievedChunk(
                text=hit.payload["chunk_text"],
                score=hit.score,
                source_url=hit.payload["source_url"],
                source_type=hit.payload["source_type"],
                document_title=hit.payload["document_title"],
                author=hit.payload["author"],
                timestamp=hit.payload["timestamp"],
            )
            for hit in results
        ]
```

---

## 9. KNOWLEDGE GRAPH SPECIFICATION

### Graph Enrichment Queries

```python
# backend/app/core/graph_search.py

from neo4j import AsyncGraphDatabase
from app.config import settings


class GraphSearchService:
    def __init__(self, driver):
        self.driver = driver

    async def enrich(
        self,
        chunk_sources: list[str],
        query_text: str,
    ) -> list[dict]:
        """
        Given retrieved chunks, find related entities in the knowledge graph.
        Returns related tickets, projects, and authors for context enrichment.
        """
        async with self.driver.session() as session:
            result = await session.run(
                """
                UNWIND $source_urls AS url
                MATCH (d:Document {source_url: url})
                OPTIONAL MATCH (d)<-[:AUTHORED]-(p:Person)
                OPTIONAL MATCH (d)-[:MENTIONS]->(proj:Project)
                OPTIONAL MATCH (d)-[:RELATED_TO]->(related:Document)
                RETURN d.title AS doc_title,
                       collect(DISTINCT p.name) AS authors,
                       collect(DISTINCT proj.name) AS projects,
                       collect(DISTINCT related.title)[..3] AS related_docs
                """,
                source_urls=chunk_sources,
            )
            return [record.data() async for record in result]
```

### Expert Routing

```python
# backend/app/core/expert_router.py

from app.schemas.query import ExpertSuggestion


class ExpertRouter:
    def __init__(self, neo4j_driver):
        self.driver = neo4j_driver

    async def find_expert(self, query: str) -> ExpertSuggestion | None:
        """
        When similarity score < 0.65, find the Person most connected
        to the query topic via TF-IDF keyword extraction + graph traversal.
        """
        # Extract top 3 keywords (simple TF-IDF)
        keywords = self._extract_keywords(query, top_n=3)
        
        async with self.driver.session() as session:
            result = await session.run(
                """
                UNWIND $keywords AS keyword
                CALL db.index.fulltext.queryNodes('document_content', keyword)
                YIELD node AS doc, score
                WITH doc, score
                MATCH (p:Person)-[:AUTHORED]->(doc)
                WITH p, count(doc) AS relevance, sum(score) AS total_score
                ORDER BY relevance DESC, total_score DESC
                LIMIT 1
                RETURN p.name AS name,
                       p.email AS email,
                       p.title AS job_title,
                       relevance
                """,
                keywords=keywords,
            )
            record = await result.single()
            
            if record:
                return ExpertSuggestion(
                    name=record["name"],
                    email=record["email"],
                    job_title=record["job_title"],
                    relevance_score=record["relevance"],
                )
            return None

    def _extract_keywords(self, text: str, top_n: int = 3) -> list[str]:
        """Simple keyword extraction using TF-IDF weighting."""
        # Implementation: use sklearn TfidfVectorizer or 
        # a lightweight approach with stop word removal
        from sklearn.feature_extraction.text import TfidfVectorizer
        import numpy as np
        
        vectorizer = TfidfVectorizer(stop_words='english', max_features=top_n)
        tfidf = vectorizer.fit_transform([text])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf.toarray()[0]
        top_indices = np.argsort(scores)[::-1][:top_n]
        return [feature_names[i] for i in top_indices if scores[i] > 0]
```

---

## 10. AUTHENTICATION & RBAC

### JWT Flow

```python
# backend/app/services/auth_service.py

from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings
from app.schemas.auth import TokenPayload

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def create_access_token(self, user_id: str, role: str, permissions: list[str]) -> str:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
        payload = {
            "sub": user_id,
            "role": role,
            "permissions": permissions,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access",
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    def verify_token(self, token: str) -> TokenPayload:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            return TokenPayload(**payload)
        except JWTError as e:
            raise AuthenticationError(f"Invalid token: {e}")
```

### RBAC Enforcement Middleware

```python
# backend/app/api/middleware/auth.py

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer
from app.services.auth_service import AuthService
from app.schemas.auth import TokenPayload

security = HTTPBearer()


async def get_current_user(
    request: Request,
    credentials = Depends(security),
    auth_service: AuthService = Depends(),
) -> TokenPayload:
    """Extract and validate JWT from Authorization header."""
    token = credentials.credentials
    user = auth_service.verify_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Inject into request state for audit logging
    request.state.user_id = user.sub
    request.state.user_role = user.role
    request.state.user_permissions = user.permissions
    
    return user


def require_role(*roles: str):
    """Dependency that checks if user has one of the required roles."""
    async def checker(user: TokenPayload = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{user.role}' does not have access to this resource"
            )
        return user
    return checker
```

---

## 11. DATA INGESTION PIPELINE

### Connector Interface

```python
# backend/app/connectors/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator


@dataclass
class RawDocument:
    """Normalized document from any source."""
    source_id: str
    source_type: str          # 'slack', 'github', 'jira', 'google_drive'
    source_url: str
    title: str
    content: str              # Plain text content
    author_email: str
    author_name: str
    permission_tags: list[str]
    created_at: str           # ISO 8601
    updated_at: str
    metadata: dict            # Source-specific metadata


class BaseConnector(ABC):
    """All connectors must implement this interface."""
    
    @abstractmethod
    async def authenticate(self, credentials: dict) -> bool:
        """Validate OAuth credentials. Return True if valid."""
        ...
    
    @abstractmethod
    async def fetch_documents(
        self, 
        since: str | None = None,  # ISO 8601 — fetch only newer docs
    ) -> AsyncIterator[RawDocument]:
        """Yield documents from the source. Supports incremental sync."""
        ...
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """Quick connectivity check."""
        ...
```

### Celery Ingestion Task

```python
# backend/app/workers/ingestion_tasks.py

from celery import shared_task
from app.core.chunker import chunk_document
from app.core.embedding import EmbeddingService
from app.db.qdrant import get_qdrant_client
from app.db.neo4j import get_neo4j_driver
from app.connectors.registry import get_connector
import structlog

logger = structlog.get_logger()


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,           # 60 seconds
    retry_backoff=True,               # Exponential backoff
    retry_backoff_max=600,            # Max 10 minutes
    acks_late=True,                   # Acknowledge after completion
    reject_on_worker_lost=True,       # Retry if worker dies
)
def ingest_source(self, source_id: str, job_id: str):
    """
    Full ingestion pipeline for a data source:
    1. Fetch all documents from connector
    2. Chunk each document (512 tokens, 50 overlap)
    3. Embed all chunks in batches
    4. Store in Qdrant with permission metadata
    5. Update Neo4j knowledge graph
    6. Update job status
    """
    try:
        log = logger.bind(source_id=source_id, job_id=job_id)
        log.info("ingestion_started")
        
        connector = get_connector(source_id)
        embedding_svc = EmbeddingService()
        qdrant = get_qdrant_client()
        neo4j = get_neo4j_driver()
        
        docs_processed = 0
        chunks_created = 0
        
        for doc in connector.fetch_documents():
            # Chunk
            chunks = chunk_document(doc.content, chunk_size=512, overlap=50)
            
            # Embed batch
            texts = [c.text for c in chunks]
            vectors = embedding_svc.encode_batch(texts)
            
            # Store in Qdrant
            points = []
            for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
                points.append({
                    "id": f"{doc.source_id}_{i}",
                    "vector": vector,
                    "payload": {
                        "chunk_text": chunk.text,
                        "source_url": doc.source_url,
                        "source_type": doc.source_type,
                        "source_id": source_id,
                        "document_title": doc.title,
                        "author": doc.author_email,
                        "permission_tags": doc.permission_tags,
                        "timestamp": doc.updated_at,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                    }
                })
            
            qdrant.upsert(collection="synapse_documents", points=points)
            
            # Update Neo4j
            _update_graph(neo4j, doc)
            
            docs_processed += 1
            chunks_created += len(chunks)
            
            # Update job progress every 10 docs
            if docs_processed % 10 == 0:
                _update_job_progress(job_id, docs_processed, chunks_created)
        
        _complete_job(job_id, docs_processed, chunks_created)
        log.info("ingestion_completed", docs=docs_processed, chunks=chunks_created)
        
    except Exception as exc:
        log.error("ingestion_failed", error=str(exc))
        _fail_job(job_id, str(exc))
        raise self.retry(exc=exc)
```

---

## 12. API DESIGN

### Endpoint Specification

```
# Authentication
POST   /api/v1/auth/login              # SSO login → returns JWT
POST   /api/v1/auth/refresh            # Refresh access token
POST   /api/v1/auth/logout             # Invalidate session

# Query (Core Feature)
POST   /api/v1/query                   # Submit natural language query
GET    /api/v1/query/history           # User's past queries (paginated)
GET    /api/v1/query/{id}              # Get specific query result

# Data Sources (Admin)
GET    /api/v1/sources                 # List all connected sources
POST   /api/v1/sources                 # Connect new source
GET    /api/v1/sources/{id}            # Source details + sync status
PUT    /api/v1/sources/{id}            # Update source config
DELETE /api/v1/sources/{id}            # Disconnect source
POST   /api/v1/sources/{id}/sync      # Trigger manual sync
GET    /api/v1/sources/{id}/jobs      # Ingestion job history

# Users & Roles (Admin)
GET    /api/v1/users                   # List all users (paginated)
GET    /api/v1/users/{id}              # User details
PUT    /api/v1/users/{id}/role         # Change user role
GET    /api/v1/roles                   # List all roles
POST   /api/v1/roles                   # Create custom role
PUT    /api/v1/roles/{id}              # Update role permissions

# Admin Dashboard
GET    /api/v1/admin/stats             # System statistics
GET    /api/v1/admin/health            # Service health checks

# Audit
GET    /api/v1/audit                   # Audit log (paginated, filterable)

# Health
GET    /api/v1/health                  # Liveness probe
GET    /api/v1/health/ready            # Readiness probe (all services up)

# GDPR
DELETE /api/v1/gdpr/erasure/{email}    # Right to erasure — delete all user data
```

### Query Endpoint Implementation

```python
# backend/app/api/v1/query.py

from fastapi import APIRouter, Depends
from app.schemas.query import QueryRequest, QueryResponse
from app.services.query_service import QueryService
from app.services.audit_service import AuditService
from app.api.middleware.auth import get_current_user
from app.schemas.auth import TokenPayload

router = APIRouter(prefix="/query", tags=["Query"])


@router.post("", response_model=QueryResponse)
async def submit_query(
    request: QueryRequest,
    user: TokenPayload = Depends(get_current_user),
    query_service: QueryService = Depends(),
    audit_service: AuditService = Depends(),
) -> QueryResponse:
    """
    Submit a natural language query.
    
    The system will:
    1. Embed your question
    2. Search internal documents (filtered by your permissions)
    3. Generate an AI-powered answer with source citations
    4. Suggest an expert if confidence is low
    
    All processing happens locally. No data leaves the server.
    """
    response = await query_service.execute_query(
        query=request.question,
        user_id=user.sub,
        permission_tags=user.permissions,
    )
    
    # Audit log
    await audit_service.log(
        user_id=user.sub,
        action="query",
        resource_type="query",
        details={
            "query_length": len(request.question),
            "chunks_retrieved": response.metadata["chunks_retrieved"],
            "is_low_confidence": response.is_low_confidence,
        },
        query_hash=audit_service.hash_query(request.question),
    )
    
    return response
```

### Pydantic Schemas

```python
# backend/app/schemas/query.py

from pydantic import BaseModel, Field
from datetime import datetime


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000, 
                          description="Natural language question")


class Citation(BaseModel):
    title: str
    source_type: str           # 'slack', 'github', 'jira', 'google_drive'
    source_url: str
    author: str
    timestamp: datetime
    relevance_score: float


class ExpertSuggestion(BaseModel):
    name: str
    email: str
    job_title: str
    relevance_score: int


class QueryMetadata(BaseModel):
    top_similarity_score: float
    chunks_retrieved: int
    graph_nodes_used: int
    model: str


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    expert: ExpertSuggestion | None = None
    is_low_confidence: bool
    metadata: QueryMetadata
```

---

## 13. ERROR HANDLING & RESILIENCE

### Global Exception Handler

```python
# backend/app/api/middleware/error_handler.py

from fastapi import Request
from fastapi.responses import JSONResponse
import structlog

logger = structlog.get_logger()


class SynapseError(Exception):
    """Base exception for all Synapse errors."""
    def __init__(self, message: str, status_code: int = 500, error_code: str = "INTERNAL_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class AuthenticationError(SynapseError):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, 401, "AUTH_ERROR")


class AuthorizationError(SynapseError):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, 403, "FORBIDDEN")


class NotFoundError(SynapseError):
    def __init__(self, resource: str, identifier: str):
        super().__init__(f"{resource} '{identifier}' not found", 404, "NOT_FOUND")


class LLMUnavailableError(SynapseError):
    def __init__(self):
        super().__init__("AI service temporarily unavailable. Please retry.", 503, "LLM_UNAVAILABLE")


class VectorDBError(SynapseError):
    def __init__(self):
        super().__init__("Search service error. Please retry.", 503, "VECTOR_DB_ERROR")


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    
    if isinstance(exc, SynapseError):
        logger.warning("handled_error", error_code=exc.error_code, message=exc.message,
                       request_id=request_id)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error_code,
                "message": exc.message,
                "request_id": request_id,
            }
        )
    
    # Unhandled — log full traceback but return sanitized response
    logger.exception("unhandled_error", request_id=request_id, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again.",
            "request_id": request_id,
        }
    )
```

### Retry Configuration (Tenacity)

```python
# Used in LLM client, Qdrant client, Neo4j client

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
    before_sleep=lambda retry_state: logger.warning(
        "retrying", attempt=retry_state.attempt_number
    ),
)
async def call_ollama(prompt: str) -> str:
    """Call local Ollama with retry logic."""
    ...
```

---

## 14. TESTING STRATEGY

### Test Pyramid

```
E2E Tests (Playwright)           ← 10% — Full user flows
Integration Tests (pytest)       ← 30% — Service + DB interactions  
Unit Tests (pytest)              ← 60% — Pure logic, no I/O
```

### Test Examples

```python
# backend/tests/unit/test_chunker.py

import pytest
from app.core.chunker import chunk_document


class TestChunker:
    def test_short_document_single_chunk(self):
        text = "Short document content."
        chunks = chunk_document(text, chunk_size=512, overlap=50)
        assert len(chunks) == 1
        assert chunks[0].text == text

    def test_long_document_multiple_chunks(self):
        text = "word " * 1000  # ~1000 tokens
        chunks = chunk_document(text, chunk_size=512, overlap=50)
        assert len(chunks) >= 2
        
    def test_chunk_overlap(self):
        text = "word " * 1000
        chunks = chunk_document(text, chunk_size=100, overlap=20)
        # Verify overlap exists between consecutive chunks
        for i in range(len(chunks) - 1):
            overlap = set(chunks[i].text.split()[-20:]) & set(chunks[i+1].text.split()[:20])
            assert len(overlap) > 0

    def test_empty_document(self):
        chunks = chunk_document("", chunk_size=512, overlap=50)
        assert len(chunks) == 0

    def test_preserves_sentence_boundaries(self):
        text = "First sentence. Second sentence. Third sentence."
        chunks = chunk_document(text, chunk_size=5, overlap=1)
        # No chunk should split mid-sentence
        for chunk in chunks:
            assert chunk.text.endswith(('.', '!', '?')) or chunk == chunks[-1]


# backend/tests/unit/test_rbac.py

class TestRBACFilter:
    def test_junior_dev_cannot_access_hr_docs(self):
        user_tags = ["engineering", "backend"]
        doc_tags = ["hr", "payroll"]
        assert not has_access(user_tags, doc_tags)

    def test_admin_accesses_everything(self):
        user_tags = ["admin", "*"]
        doc_tags = ["hr", "payroll"]
        assert has_access(user_tags, doc_tags)

    def test_matching_tag_grants_access(self):
        user_tags = ["engineering", "backend", "devops"]
        doc_tags = ["engineering"]
        assert has_access(user_tags, doc_tags)
```

### Running Tests

```makefile
# Makefile

test:
	cd backend && python -m pytest tests/ -v --cov=app --cov-report=html

test-unit:
	cd backend && python -m pytest tests/unit/ -v

test-integration:
	cd backend && python -m pytest tests/integration/ -v --tb=short

test-e2e:
	cd frontend && npx playwright test

test-all: test test-e2e
```

---

## 15. DEVOPS & DEPLOYMENT

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml

version: "3.9"

services:
  synapse-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_HOST=postgres
      - QDRANT_HOST=qdrant
      - NEO4J_URI=bolt://neo4j:7687
      - REDIS_URL=redis://redis:6379/0
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      postgres:
        condition: service_healthy
      qdrant:
        condition: service_healthy
      neo4j:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  synapse-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://synapse-api:8000
    depends_on:
      - synapse-api

  synapse-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    command: celery -A app.workers.celery_app worker -l info -c 4
    depends_on:
      - redis
      - postgres
      - qdrant
      - neo4j

  synapse-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    command: celery -A app.workers.celery_app beat -l info
    depends_on:
      - redis

  qdrant:
    image: qdrant/qdrant:v1.12.1
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/healthz"]
      interval: 10s

  neo4j:
    image: neo4j:5.25-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
      - NEO4J_PLUGINS=["apoc"]
    volumes:
      - neo4j_data:/data
    healthcheck:
      test: ["CMD", "neo4j", "status"]
      interval: 10s

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: synapse
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: synapse
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U synapse"]
      interval: 5s

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  nginx:
    image: nginx:1.27-alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - synapse-api
      - synapse-frontend

  flower:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    command: celery -A app.workers.celery_app flower --port=5555
    ports:
      - "5555:5555"
    depends_on:
      - redis

volumes:
  qdrant_data:
  neo4j_data:
  postgres_data:
  redis_data:
  ollama_data:
```

### Makefile

```makefile
.PHONY: dev build test deploy seed

# Development
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production build
build:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run all tests
test:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm synapse-api \
		python -m pytest tests/ -v --cov=app

# Deploy
deploy:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Seed demo data
seed:
	docker compose exec synapse-api python scripts/seed_data.py

# Download AI models
models:
	docker compose exec ollama ollama pull llama3:8b
	docker compose exec ollama ollama pull mistral:7b

# Database migrations
migrate:
	docker compose exec synapse-api alembic upgrade head

# Logs
logs:
	docker compose logs -f synapse-api synapse-worker

# Clean everything
clean:
	docker compose down -v --rmi all
```

---

## 16. UI/UX DESIGN SYSTEM

### Key Screens — Detailed Specifications

#### 1. Chat Interface (Primary Screen)

```
┌──────────────────────────────────────────────────────────────┐
│  ┌────────┐                                     ┌──┐ ┌──┐  │
│  │SYNAPSE │  Chat  History  Settings             │🌙│ │👤│  │
│  └────────┘                                     └──┘ └──┘  │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   ┌──────────────────────────────────────────┐     │   │
│  │   │ 👤 How do I fix the ERR-502-DB error?    │     │   │
│  │   └──────────────────────────────────────────┘     │   │
│  │                                                     │   │
│  │   ┌──────────────────────────────────────────────┐ │   │
│  │   │ 🧠 The ERR-502-DB error occurs when the     │ │   │
│  │   │    database connection pool is exhausted...   │ │   │
│  │   │                                              │ │   │
│  │   │    To fix this:                              │ │   │
│  │   │    1. Check your connection pool settings... │ │   │
│  │   │    2. Verify the max_connections in pg...    │ │   │
│  │   │                                              │ │   │
│  │   │ ┌─ Sources ──────────────────────────────┐  │ │   │
│  │   │ │ 📄 Backend Troubleshooting Guide       │  │ │   │
│  │   │ │    Slack · jane.doe · 2 weeks ago  0.87│  │ │   │
│  │   │ │                                        │  │ │   │
│  │   │ │ 📄 Database Connection Pooling Config  │  │ │   │
│  │   │ │    GitHub · ops-team · 1 month ago 0.82│  │ │   │
│  │   │ └────────────────────────────────────────┘  │ │   │
│  │   └──────────────────────────────────────────────┘ │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💬 Ask Synapse anything...              ┌────────┐ │   │
│  │                                          │  Send  │ │   │
│  └──────────────────────────────────────────┴────────┴─┘   │
└──────────────────────────────────────────────────────────────┘
```

**Chat UX Details:**
- Messages appear with a stagger animation (framer-motion, 100ms delay)
- "Thinking" state: animated 3-dot loader with pulsing accent glow
- LLM response streams in token-by-token (SSE from backend)
- Citations appear below the answer as expandable cards
- Clicking a citation opens source in new tab (or preview panel)
- Expert card (when shown) has a distinct yellow/amber accent
- Markdown rendered with syntax highlighting for code blocks
- Command palette (Cmd+K) for quick navigation
- Auto-focus on input after response completes

#### 2. Admin Dashboard

```
Key metrics displayed as cards:
- Total Documents Indexed (with trend sparkline)
- Active Data Sources (with status indicators)
- Queries Today (with hourly bar chart)
- System Health (CPU, RAM, GPU utilization)
- Active Users (with role breakdown pie chart)
- Average Response Time (with p50/p95/p99)
```

#### 3. Data Source Management

```
Source cards showing:
- Source icon (Slack/GitHub/Jira/Drive)
- Source name
- Status badge (Active/Paused/Error)
- Last sync timestamp
- Documents count
- Chunks count
- "Sync Now" button
- "Configure" / "Disconnect" dropdown
```

#### 4. 3D Knowledge Graph Visualization

```
Interactive Three.js visualization:
- Nodes: colored by type (Person=cyan, Document=white, Project=amber, Team=green)
- Edges: thin lines with directional arrows
- Hover: node expands, shows tooltip with details
- Click: centers camera on node, shows related entities
- Search: highlight matching nodes
- Orbit controls: rotate, zoom, pan
- Force-directed layout (d3-force-3d)
```

---

## 17. PERFORMANCE BENCHMARKS

```
| Metric                               | Target     | How to Measure                    |
|---------------------------------------|------------|-----------------------------------|
| Vector search (1M vectors, HNSW)      | < 200ms    | Qdrant /search latency            |
| End-to-end query (embed→search→LLM)   | < 10 sec   | API response time                 |
| Embedding generation (single query)    | < 50ms     | SentenceTransformer.encode()      |
| Embedding batch (100 chunks)           | < 2 sec    | SentenceTransformer.encode()      |
| Ingestion throughput                   | > 50 docs/min | Celery task metrics             |
| Neo4j graph query                      | < 100ms    | Cypher PROFILE                    |
| Frontend First Contentful Paint        | < 1.5s     | Lighthouse                        |
| Frontend Time to Interactive           | < 3s       | Lighthouse                        |
| API cold start                         | < 5s       | Uvicorn startup log               |
| Concurrent users supported             | 50+        | Load test (Locust)                |
```

---

## 18. SECURITY HARDENING

```
1. ALL data in transit: TLS 1.3 (nginx terminates SSL)
2. Database credentials: environment variables, NEVER in source code
3. RBAC filtering: enforced at Qdrant query level — bypass is architecturally impossible
4. JWT tokens: HS256 signed, 8-hour expiry, server-side session validation
5. Input sanitization: Pydantic validates ALL inputs before processing
6. SQL injection: impossible — parameterized queries via SQLAlchemy ORM
7. Rate limiting: 60 queries/min per user (configurable)
8. Audit logging: every query, login, role change, and admin action logged
9. GDPR erasure: DELETE /api/v1/gdpr/erasure/{email} removes all user data
10. No external network calls: Ollama, Qdrant, Neo4j all run on internal network
11. Container security: non-root users, read-only filesystems where possible
12. Secret rotation: support for rotating JWT signing keys without downtime
13. CORS: restricted to frontend origin only
14. CSP headers: strict Content-Security-Policy via nginx
15. Request IDs: every request tagged with UUID for tracing
```

---

## 19. PROMPT TEMPLATES FOR LLM

```python
# backend/app/core/prompt_builder.py

SYSTEM_PROMPT = """You are Synapse, an internal AI assistant for {company_name}. 
You answer questions ONLY using the provided context from internal company documents.

RULES:
1. ONLY use information from the provided context. Do not make up information.
2. If the context does not contain enough information, say so clearly.
3. Always reference which source document your answer comes from.
4. Be concise but thorough. Use bullet points for multi-step answers.
5. If the question is about code, format your answer with proper code blocks.
6. Never reveal sensitive information beyond what the context provides.
7. If you're unsure, say "Based on the available documents, I'm not fully confident..." 
"""

QUERY_PROMPT = """## Context from Internal Documents

{context_chunks}

## Related Graph Information
{graph_context}

## User Question
{user_query}

## Instructions
Answer the question using ONLY the context above. Cite your sources by referencing 
the document titles. If the context doesn't contain a clear answer, acknowledge 
the limitation and suggest who might know more.
"""

LOW_CONFIDENCE_ADDENDUM = """
NOTE: The search confidence for this query is low (score: {score}). 
The provided context may not be directly relevant. Please clearly 
indicate your uncertainty level in the response.
"""
```

---

## 20. STEP-BY-STEP BUILD ORDER

Follow this exact order to build Synapse. Each step depends on the previous one.

```
PHASE 1: FOUNDATION (Days 1-3)
├── Step 01: Initialize project structure (folders, configs, Dockerfiles)
├── Step 02: Set up docker-compose.dev.yml with all services
├── Step 03: Configure PostgreSQL + Alembic migrations
├── Step 04: Configure Qdrant collection + indexes
├── Step 05: Configure Neo4j constraints + indexes
├── Step 06: Build FastAPI app factory (main.py, config.py, lifespan)
├── Step 07: Build Pydantic schemas (all request/response models)
└── Step 08: Build health check endpoints + readiness probes

PHASE 2: CORE PIPELINE (Days 4-7)
├── Step 09: Build EmbeddingService (Sentence Transformers wrapper)
├── Step 10: Build Chunker (512 tokens, 50 overlap, sentence-aware)
├── Step 11: Build VectorSearchService (Qdrant + RBAC filter)
├── Step 12: Build GraphSearchService (Neo4j enrichment queries)
├── Step 13: Build LLMClient (Ollama wrapper with retry/timeout)
├── Step 14: Build PromptBuilder (template construction)
├── Step 15: Build ExpertRouter (low-confidence → find expert)
├── Step 16: Build CitationBuilder (format source references)
├── Step 17: Build QueryEngine (full RAG pipeline orchestrator)
└── Step 18: Build POST /api/v1/query endpoint

PHASE 3: INGESTION (Days 8-10)
├── Step 19: Build BaseConnector abstract interface
├── Step 20: Build SlackConnector (OAuth + message fetching)
├── Step 21: Build GitHubConnector (OAuth + repo/issue fetching)
├── Step 22: Build JiraConnector (OAuth + ticket fetching)
├── Step 23: Build GoogleDriveConnector (OAuth + doc fetching)
├── Step 24: Build Connector Registry (factory pattern)
├── Step 25: Build Celery ingestion task (chunk→embed→store→graph)
├── Step 26: Build Celery beat scheduler (periodic sync)
└── Step 27: Build source management API endpoints

PHASE 4: AUTH & RBAC (Days 11-12)
├── Step 28: Build AuthService (JWT creation + validation)
├── Step 29: Build auth middleware (token extraction + validation)
├── Step 30: Build role-based access control (require_role decorator)
├── Step 31: Build user management endpoints
├── Step 32: Build audit logging service
└── Step 33: Build audit log endpoints

PHASE 5: FRONTEND (Days 13-18)
├── Step 34: Initialize Next.js project with TypeScript
├── Step 35: Set up Tailwind + CSS variables (design system)
├── Step 36: Self-host fonts (General Sans + JetBrains Mono)
├── Step 37: Build primitive UI components (Button, Input, Card, etc.)
├── Step 38: Build layout (Sidebar, Topbar, route groups)
├── Step 39: Build auth flow (login page, session management)
├── Step 40: Build ChatContainer + MessageBubble + QueryInput
├── Step 41: Build CitationCard + ExpertCard
├── Step 42: Build ThinkingIndicator (animated loading)
├── Step 43: Build MarkdownRenderer (syntax highlighting)
├── Step 44: Build admin dashboard (stats cards, charts)
├── Step 45: Build source management page
├── Step 46: Build user management page
├── Step 47: Build audit log viewer
├── Step 48: Build 3D Knowledge Graph visualization
├── Step 49: Add command palette (Cmd+K)
└── Step 50: Add streaming response support (SSE)

PHASE 6: POLISH (Days 19-21)
├── Step 51: Write unit tests (>80% coverage target)
├── Step 52: Write integration tests
├── Step 53: Write E2E tests (Playwright)
├── Step 54: Build seed data script (demo data)
├── Step 55: Production Docker build optimization (multi-stage)
├── Step 56: Nginx configuration (TLS, security headers, proxy)
├── Step 57: Write documentation (README, API reference, deployment guide)
├── Step 58: Performance testing (Locust load tests)
├── Step 59: Security audit checklist
└── Step 60: Final review + deployment test
```

---

## APPENDIX A: ENVIRONMENT VARIABLES (.env.example)

```env
# === Application ===
APP_NAME=Synapse
DEBUG=false
SECRET_KEY=your-256-bit-secret-key-here
API_VERSION=v1

# === PostgreSQL ===
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=synapse
POSTGRES_PASSWORD=change-me-in-production
POSTGRES_DB=synapse

# === Qdrant ===
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_COLLECTION=synapse_documents

# === Neo4j ===
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=change-me-in-production

# === Redis ===
REDIS_URL=redis://redis:6379/0

# === Ollama ===
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3:8b
OLLAMA_TIMEOUT=30

# === Embedding ===
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIM=768
CHUNK_SIZE=512
CHUNK_OVERLAP=50

# === Auth ===
SESSION_EXPIRE_HOURS=8

# === CORS ===
CORS_ORIGINS=["http://localhost:3000"]

# === Data Source Connectors (fill when connecting) ===
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
JIRA_BASE_URL=
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## APPENDIX B: HOW TO USE THIS PROMPT

### For Cursor / Copilot / Cline / Aider:

1. **Create the project folder:**
   ```bash
   mkdir synapse && cd synapse
   ```

2. **Paste this entire document** as the system prompt or `.cursorrules` file

3. **Start with Phase 1, Step 01:**
   Tell the agent: *"Initialize the project structure as defined in Section 4. Create all folders and placeholder files."*

4. **Work through each step sequentially:**
   Tell the agent: *"Implement Step XX as specified in the prompt. Follow all rules strictly."*

5. **For each step, verify:**
   - Code compiles / lints cleanly
   - Tests pass
   - Docker services start
   - No hardcoded secrets

### Tips for Best Results:

- Give the agent ONE step at a time, not the entire project
- Always reference the section number: *"Implement the QueryEngine as specified in Section 8"*
- If the agent deviates, paste the relevant section and say *"Follow this specification exactly"*
- Run `make test` after every 3-4 steps
- Run `make dev` to verify Docker services after infrastructure changes

---

## APPENDIX C: RESUME BULLET POINTS

Once built, add these to your resume:

```
SYNAPSE — Enterprise Knowledge Graph & AI Assistant
• Architected and built a fully self-hosted AI assistant using FastAPI, Next.js 14,
  Qdrant, Neo4j, and PostgreSQL with a RAG pipeline serving 50+ concurrent users
• Implemented semantic search over 1M+ document chunks with <200ms HNSW vector
  retrieval and RBAC-enforced access control at the database query level
• Built a knowledge graph (Neo4j) mapping cross-tool relationships between people,
  documents, and projects with automated expert routing for unresolved queries
• Designed a multi-source ingestion pipeline (Slack, GitHub, Jira, Google Drive)
  using Celery workers with exponential backoff retry and incremental sync
• Deployed air-gapped local LLM inference (Llama 3 8B via Ollama) ensuring zero
  data exfiltration — all processing on company hardware
• Achieved 80%+ test coverage with pytest + Playwright E2E tests across 60+ endpoints
• Tech: Python, TypeScript, FastAPI, Next.js, Qdrant, Neo4j, PostgreSQL, Redis,
  Celery, Docker, Ollama, Sentence-Transformers, Three.js
```

---

*This prompt was generated for Umair Abbas (BSAI-24077) — Software Engineering + Advanced Database Systems project, BS-AI Semester 4, Information Technology University.*
