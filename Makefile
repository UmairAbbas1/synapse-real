.PHONY: dev build test deploy seed models migrate logs clean

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

# Seed demo data (roles, users, mock source, synchronous ingestion)
seed:
	docker compose exec synapse-api python scripts/seed_demo_data.py

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
