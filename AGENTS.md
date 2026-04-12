---
trigger: always_on
---
# SYNAPSE Project Rules

## Stack
- Backend: FastAPI Python 3.12+, async everywhere
- Frontend: Next.js 14 App Router, TypeScript strict
- Vector DB: Qdrant (HNSW, RBAC filtering)
- Graph DB: Neo4j 5
- Relational DB: PostgreSQL 16 + Alembic
- LLM: Ollama local (Llama 3 8B)
- Embeddings: Sentence-Transformers all-MiniLM-L6-v2
- Task Queue: Celery + Redis

## Backend Rules
- Type hints on every function. No `Any`.
- Pydantic schema on every endpoint.
- NEVER f-strings for SQL. Parameterized only.
- NEVER print(). Use structlog.
- NEVER hardcode secrets. Use Pydantic Settings.
- All external calls need timeouts + tenacity retry.

## Frontend Rules
- TypeScript strict. NO `any` ever.
- All components: loading / error / success states.
- No inline styles. Tailwind + CSS variables only.
- Dark mode default. Self-host all fonts.

## UI Design (CRITICAL)
- Font: General Sans + JetBrains Mono
- NO Inter, Roboto, Arial, system fonts
- NO purple/blue gradients, NO drop shadows
- Colors: #0A0A0F background, #00E5CC cyan accent
- Cards: 1px border, 12px radius, no shadow
- Buttons: 6px radius, glow on hover
- Inputs: bottom-border style only

## Full spec: docs/prompts/SYNAPSE_MASTER_PROMPT.md
Read the relevant section before implementing anything.