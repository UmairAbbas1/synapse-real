# Synapse backend

FastAPI service, Celery workers, and RAG pipeline (see repository `README.md` and `docs/prompts/SYNAPSE_MASTER_PROMPT.md`).

## Local configuration

- Copy `.env.example` from the repository root to `.env` for Docker Compose variable substitution.
- For containerized development, adjust `backend/.env.dev` (loaded by `docker-compose.dev.yml`).
