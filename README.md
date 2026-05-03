# Synapse

Synapse is a self-hosted enterprise AI assistant that addresses a problem most growing com-
panies face: knowledge is scattered across many tools and finding it wastes hours every week.
Employees search through Slack threads, GitHub wikis, Jira tickets, and Google Drive files sep-
arately, often interrupting colleagues just to ask questions whose answers already exist some-
where in the system.
Self-hosted enterprise knowledge graph and RAG assistant. Specification: `synapse/docs/prompts/SYNAPSE_MASTER_PROMPT.md` (or `docs/prompts/` copy in this repo).


## Quick start (Docker)

1. Copy `.env.example` to `.env` in the repository root (Compose substitutes `${SECRET_KEY}`, `${POSTGRES_PASSWORD}`, `${NEO4J_PASSWORD}`). You can start from `.env.dev` for local development.
2. Run:

```bash
make dev
```

3. API: `http://localhost:8000` (health: `GET /api/v1/health`)  
4. Frontend: `http://localhost:3000`  
5. Nginx (reverse proxy): `http://localhost:80`

## Project layout

See **Section 4 — File Structure** in the master prompt: `backend/` (FastAPI), `frontend/` (Next.js), `nginx/`, `scripts/`, `docs/`.

## Configuration

Backend settings are defined in `backend/app/config.py` (Pydantic Settings, Section 5). Container development loads `backend/.env.dev` via `docker-compose.dev.yml`.
