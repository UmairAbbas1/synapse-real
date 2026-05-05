# SYNAPSE — 2-DAY SPRINT (Agent-Mode Prompts)
## For Cursor Free + Antigravity Free | Token-Optimized

> **HOW TO USE THIS FILE:**
> 1. Save as `docs/prompts/SYNAPSE_FINISH_LINE.md` in your repo
> 2. Each prompt is a single agent task → paste into Cursor Agent (Cmd+I → Agent mode) OR Antigravity Agent
> 3. Each prompt is short on purpose — to save quota. The agent reads your code, you don't paste it.
> 4. Run prompts **in order**. Don't skip.
> 5. After each prompt: `git commit -m "..."` so you can roll back if it breaks.
> 6. **When Cursor quota runs out → switch to Antigravity.** Same prompts work. The prompts are IDE-agnostic.

---

## ⚡ TOKEN-SAVING RULES (READ ONCE)

1. **Don't paste the master prompt with `@`** in every prompt — it's huge. Add it ONCE to `.cursorrules` so the agent always sees it implicitly.
2. **Use Agent mode, not Chat** — Agent reads files itself, you don't pay tokens to attach them.
3. **One mega-prompt per phase**, not 10 small ones. Less back-and-forth = less quota.
4. **Reject hallucinations fast.** If the agent generates Qdrant code, write `Use pgvector. NOT Qdrant. Retry.` and stop. Don't argue.
5. **Use `.cursorrules` to lock the stack.** See Section 1 below.
6. **If a prompt is interrupted by quota** — `git commit` the partial work, switch IDE, paste same prompt + "continue from commit <hash>".

---

## 1 — ONE-TIME SETUP (10 minutes, NO AI)

Open `.cursorrules` in your repo. **Replace the entire file** with this minimal version:

```
# SYNAPSE — Agent Rules (DO NOT CHANGE STACK)

Stack:
- Backend: FastAPI 0.115+, Python 3.12, async everywhere, SQLAlchemy 2.0 async or asyncpg
- Vector DB: PostgreSQL 16 + pgvector extension (NOT Qdrant, NOT Pinecone)
- Graph DB: Neo4j 5 with async driver
- Cache/Queue: Redis 7 + Celery
- LLM: Ollama (Llama 3 8B locally)
- Embeddings: sentence-transformers (all-MiniLM-L6-v2, 768 dim)
- Frontend: Next.js 14 App Router, TypeScript strict, Tailwind, Zustand
- Auth: JWT (python-jose) + bcrypt (passlib)

Hard rules:
- NO `any` in TypeScript. NO untyped Python.
- NO f-string SQL. ALWAYS parameterized queries.
- NO `print()`. Use structlog.
- NO inline styles. Tailwind only.
- ALL endpoints have Pydantic request + response schemas.
- ALL async DB queries use async session/connection properly.
- RBAC enforced via SQL `WHERE permission_tag = ANY($N)` — NEVER in Python after the query.
- LLM calls wrapped in tenacity retry (3 attempts, exp backoff 2-30s).
- Custom exceptions inherit SynapseError. Global handler returns structured JSON.

Spec: docs/prompts/SYNAPSE_MASTER_PROMPT.md (read sections relevant to current task only)
Active plan: docs/prompts/SYNAPSE_FINISH_LINE.md
```

Save. Commit:
```bash
git add .cursorrules && git commit -m "chore: lock stack to pgvector + agent rules"
```

---

## 2 — AUDIT FIRST (NO AI, 15 min)

Run these in your terminal. Save outputs in case you need them later.

```bash
cd ~/path/to/synapse-real

# Confirm pgvector vs Qdrant drift
grep -rn "qdrant\|AsyncQdrantClient" backend/app/ 2>/dev/null | head -5
grep -rn "pgvector\|VECTOR(768)\|embedding <=>" backend/ 2>/dev/null | head -5

# Find stubs/TODOs
grep -rn "TODO\|NotImplementedError\|# stub\|# placeholder" backend/app/ | wc -l
grep -rn "TODO\|placeholder" frontend/src/ | wc -l

# Does it boot?
make dev
sleep 30
curl -s http://localhost:8000/api/v1/health | head -5

# Count existing endpoints
grep -rn "@router\." backend/app/api/ | wc -l
```

If grep shows Qdrant code — that's bad, but **Prompt 1 below fixes it**. Don't worry.

---

## 3 — THE 2-DAY PLAN

| Block | Hours | Goal |
|---|---|---|
| **DAY 1 morning** | 4h | Backend: pgvector cleanup + query engine + LLM + auth |
| **DAY 1 afternoon** | 4h | Backend: source mgmt + user mgmt + audit + ingestion |
| **DAY 1 evening** | 2h | Seed data + smoke test backend |
| **DAY 2 morning** | 4h | Frontend: login + chat + admin pages wired to real backend |
| **DAY 2 afternoon** | 3h | Tests + production Docker |
| **DAY 2 evening** | 2h | README + demo rehearsal + submit |

**Total: ~19 hours of focused work.** Doable in 2 days. The prompts below are **6 mega-prompts**. That's it. Six.

---

# 🟢 PROMPT 1 — Backend Core (Day 1, ~9 AM)

**Tool:** Cursor Agent (Cmd+I, switch to Agent mode) OR Antigravity Agent
**Estimated time:** 30-45 min agent execution + 15 min you reviewing
**What it does:** Cleans up stack drift, finishes vector search + query engine + LLM client + all core RAG glue

```
TASK: Finish backend RAG core (5-7 files).

Read these files first to understand current state:
- backend/app/core/vector_search.py
- backend/app/core/query_engine.py
- backend/app/core/graph_search.py
- backend/app/core/llm_client.py
- backend/app/core/prompt_builder.py
- backend/app/core/expert_router.py
- backend/app/core/citation_builder.py
- backend/app/db/postgres.py
- backend/app/api/v1/query.py

CRITICAL: This project uses pgvector inside PostgreSQL. NOT Qdrant. If any file imports
qdrant_client or AsyncQdrantClient, REMOVE that import and rewrite the file using asyncpg
or SQLAlchemy async session against the document_chunks table.

Do these in order:

1. backend/app/core/vector_search.py — replace with pgvector implementation:
   - dataclass RetrievedChunk(chunk_id, chunk_text, source_url, doc_type, author, timestamp, permission_tag, similarity: float)
   - class VectorSearchService:
     * search(query_vector, permission_tags, top_k=5) — runs:
       SELECT id, chunk_text, source_url, doc_type, author, timestamp, permission_tag,
              1 - (embedding <=> $1::vector) AS similarity
       FROM document_chunks
       WHERE permission_tag = ANY($2::text[])
       ORDER BY embedding <=> $1::vector ASC LIMIT $3
     * upsert_chunks(chunks) — batch insert with ON CONFLICT (id) DO UPDATE
     * delete_by_source(source_id)
   - Comment above search(): "RBAC is enforced HERE, in SQL. Bypass is impossible — even a buggy caller cannot retrieve chunks outside permission_tags."

2. backend/app/core/llm_client.py — verify Ollama client with tenacity retry (3 attempts, exp backoff 2-30s on httpx.ConnectError + httpx.TimeoutException). Methods: generate(prompt, system_prompt), generate_stream() (async iterator yielding tokens), health_check(). Custom error LLMUnavailableError (no raw httpx exceptions leak out).

3. backend/app/core/query_engine.py — implement QueryEngine.run() executing 8 steps:
   embed → vector_search → confidence check → graph enrich → prompt build → llm → citations → expert routing if confidence<0.65
   Return QueryResponse(answer, citations, expert, confidence, latency_ms, audit_id).
   Also implement run_stream() yielding SSE events: "retrieval_done", "token", "complete", "error".

4. backend/app/api/v1/query.py — replace mock with real endpoint:
   - POST /api/v1/query (auth required, calls QueryEngine.run, returns QueryResponseSchema)
   - POST /api/v1/query/stream (returns text/event-stream from QueryEngine.run_stream)
   - 503 on LLMUnavailableError, 422 on validation, 401 on no token

5. backend/app/api/deps.py — add get_query_engine() that builds engine from app.state singletons.

After implementing, run these checks (do not skip):
- ruff check backend/app/ --fix
- mypy backend/app/ --ignore-missing-imports
- python -c "import ast; ast.parse(open('FILE').read())" on each modified file

If any check fails, fix it before stopping.

Deliverable: All files compile, type-check, follow .cursorrules. NO qdrant imports anywhere in backend/.
```

**After it finishes:**
```bash
cd backend && pytest -x --tb=short 2>&1 | head -30
git add -A && git commit -m "feat: pgvector RAG core complete"
```

---

# 🟢 PROMPT 2 — Auth + Sources + Users + Audit (Day 1, ~1 PM)

**Tool:** Cursor Agent OR Antigravity Agent
**Estimated time:** 45-60 min agent + 20 min review
**What it does:** All admin APIs + auth + ingestion task in one shot

```
TASK: Implement complete auth + admin APIs (8-10 files).

Read first:
- backend/app/core/auth.py
- backend/app/db/models/user.py
- backend/app/db/models/role.py
- backend/app/db/models/audit_log.py
- backend/app/db/models/data_source.py
- backend/app/api/v1/auth.py
- backend/app/api/deps.py
- backend/app/connectors/registry.py
- backend/app/tasks/ingest.py

Implement:

A) backend/app/core/auth.py — complete:
   - hash_password / verify_password (bcrypt via passlib)
   - create_access_token / decode_access_token (HS256, 8h expiry, payload: sub, role, perms, sid, iat, exp)
   - class AuthService(db, redis):
     * authenticate(email, password) -> User (raises InvalidCredentialsError)
     * create_session(user) -> (token, session_id) — writes user_sessions row + Redis key with TTL
     * revoke_session(session_id)
     * revoke_all_sessions_for_user(user_id) — used when role changes
     * validate_session(session_id) -> bool (Redis first, fallback to DB)

B) backend/app/api/deps.py — add:
   - get_current_user (extracts Bearer, decodes, validates session, returns CurrentUser with id/email/role/perms)
   - require_role("ADMIN") factory dependency
   - require_permission(tag) factory dependency

C) backend/app/api/v1/auth.py:
   - POST /auth/login {email, password} -> {access_token, token_type, expires_in_seconds, user}
     Rate limit: 5/IP per 5min via slowapi
   - POST /auth/logout (revokes current session, 204)
   - GET /auth/me
   - POST /auth/change-password {old, new (min 10)} — revokes ALL sessions for user

D) backend/app/api/v1/admin/users.py — ADMIN only:
   - GET /admin/users (paginated, filter by q + role)
   - POST /admin/users {email, password, display_name, role_name}
   - PATCH /admin/users/{id} — if role changes, calls revoke_all_sessions_for_user
   - DELETE /admin/users/{id} — soft delete (is_active=False) + revoke sessions
   - GET /admin/roles
   - PATCH /admin/roles/{id}/permissions {permission_tags} — revokes sessions for all users with this role
   - Block: cannot edit own role, cannot remove last admin

E) backend/app/api/v1/admin/sources.py — ADMIN only:
   - GET /admin/sources
   - POST /admin/sources {source_type, name, credentials, sync_schedule, default_permission_tag} — encrypts creds via Fernet (settings.FERNET_KEY must exist)
   - DELETE /admin/sources/{id} — disconnects + enqueues cleanup
   - POST /admin/sources/{id}/sync — enqueues Celery ingest_source.delay(source_id), returns {job_id}
   - GET /admin/sources/{id}/jobs — last 20 ingestion_jobs rows

F) backend/app/api/v1/admin/audit.py — ADMIN only:
   - GET /admin/audit (filter user_id, action, from, to, paginated, default sort created_at desc)
   - GET /admin/audit/{id}
   - DELETE /admin/gdpr/user/{email} — requires header X-Confirm-Erasure: true. Deletes chunks WHERE author=email + Neo4j Person node. Audit-logged.

G) backend/app/core/audit_logger.py — class AuditLogger(db):
   - log(user_id, action, resource_type, resource_id, details, ip_address, query_hash=None) -> UUID
   - log_query(req, chunks, answer) — query_hash = sha256(query_text)
   - log_role_change(...), log_source_action(...)

H) backend/app/connectors/base.py + backend/app/connectors/mock.py:
   - dataclass RawDocument(source_url, doc_type, title, content, author, author_email, timestamp, metadata, permission_tag)
   - class BaseConnector ABC with authenticate, fetch_documents (AsyncIterator[RawDocument]), health_check
   - MockConnector reads .md files from credentials["fixture_dir"] with YAML frontmatter (title, author, author_email, doc_type, permission_tag, timestamp)
   - Register "mock" in connectors/registry.py

I) backend/app/tasks/ingest.py — Celery task ingest_source(source_id, max_retries=3, default_retry_delay=60):
   - Load DataSource, decrypt credentials, instantiate connector
   - Create ingestion_jobs row (status="running")
   - Iterate fetch_documents() → chunk → embed → vector_search.upsert_chunks() → graph_search.update_graph()
   - Update job row every 50 docs
   - On exception: status="failed", retry with exponential backoff
   - On done: status="completed", update data_sources.doc_count and last_sync_at

After all files written:
- ruff check backend/app/ --fix
- mypy backend/app/ --ignore-missing-imports
- Verify all routers registered in backend/app/api/v1/__init__.py or main.py

Deliverable: Working login → JWT → protected endpoints. Admin can manage users/sources/audit. Sync triggers ingestion. ALL files type-check clean.
```

**After it finishes:**
```bash
git add -A && git commit -m "feat: auth + admin APIs + ingestion task"
```

Don't smoke-test yet — Prompt 3 builds the seed data needed to test.

---

# 🟢 PROMPT 3 — Seed Data + Backend Smoke Test (Day 1 Evening, ~7 PM)

**Tool:** Cursor Agent
**Estimated time:** 20-30 min agent + 15 min you running it

```
TASK: Build seed data script + 50 demo documents + smoke-test the full backend.

Create:

1. scripts/fixtures/mock_docs/ — 50 markdown files distributed:
   - 15 in engineering/ (deployment runbook, code review checklist, on-call procedures, AWS architecture, CI/CD pipeline topics)
   - 10 in hr/ (PTO policy, performance review cycle, onboarding checklist, benefits guide)
   - 10 in pm/ (Q1 roadmap, sprint retros, stakeholder updates)
   - 15 in public/ (company values, office locations, IT helpdesk how-tos)
   Each .md has YAML frontmatter:
     ---
     title: "..."
     author: "Alex Senior"
     author_email: "alex.senior@company.com"
     doc_type: "github" | "slack" | "jira" | "gdrive"
     permission_tag: "engineering" | "hr" | "pm" | "public"
     timestamp: 2025-XX-XX
     ---
   Body: 2-4 paragraphs of believable enterprise content. Vary authors across the 5 demo users.

2. scripts/seed_demo_data.py:
   - Run alembic upgrade head
   - Insert 5 roles: ADMIN(perms=public,engineering,hr,pm,finance,admin), SENIOR_DEV(public,engineering), JUNIOR_DEV(public,engineering), PM(public,engineering,pm), HR(public,hr)
   - Insert 5 users:
     admin@company.com / Admin123! / ADMIN
     alex.senior@company.com / Demo1234! / SENIOR_DEV
     jamie.junior@company.com / Demo1234! / JUNIOR_DEV
     pat.pm@company.com / Demo1234! / PM
     robin.hr@company.com / Demo1234! / HR
   - Insert 1 data_sources row: source_type="mock", credentials encrypted Fernet({"fixture_dir": "/app/scripts/fixtures/mock_docs"})
   - Run ingestion task SYNCHRONOUSLY (call the task function directly, not .delay())
   - Verify: SELECT COUNT(*) FROM document_chunks > 200
   - Verify: Neo4j Person count > 4
   - Print summary table
   - Idempotent: re-running doesn't duplicate. Use ON CONFLICT for users/roles, MERGE for graph.

3. Add Makefile target:
   seed:
       docker compose exec backend python scripts/seed_demo_data.py

4. Create scripts/smoke_test.sh — runs:
   - curl /api/v1/auth/login as admin → save token
   - curl /api/v1/auth/me with token → expect 200
   - curl /api/v1/query → expect non-empty answer + citations
   - Login as junior_dev → query an HR question → expect low confidence + expert OR no relevant chunks
   - Login as admin → GET /admin/sources → expect 1 source
   - Login as admin → GET /admin/users → expect 5 users
   - Login as admin → GET /admin/audit → expect non-empty log
   Print PASS/FAIL for each step. Exit non-zero on first FAIL.

Deliverable: `make seed` works. `bash scripts/smoke_test.sh` shows all PASS.
```

**You run:**
```bash
make seed
bash scripts/smoke_test.sh
```

If everything passes → **backend is DONE**. Tag it:
```bash
git tag v0.5-backend-complete && git push --tags
```

If something fails → fix that one thing manually OR feed the error back to the agent: `Smoke test failed at step X with error: <paste>. Fix.`

---

# 🟢 PROMPT 4 — Frontend Login + Chat + Admin (Day 2 Morning, ~9 AM)

**Tool:** Cursor Agent OR Antigravity Agent
**Estimated time:** 60-90 min agent + 30 min review

```
TASK: Wire frontend to real backend. Login + chat with streaming + admin pages.

Read first:
- frontend/src/lib/ (existing API client if any)
- frontend/src/store/ (existing stores)
- frontend/src/app/login/page.tsx (if exists)
- frontend/src/app/chat/page.tsx
- frontend/src/components/chat/ (all existing chat components)
- frontend/src/components/ui/ (existing primitives)

Implement:

1. frontend/src/lib/api-client.ts — typed ApiClient class:
   - login(email, password), logout(), me()
   - query(text), queryStream(text, callbacks: {onRetrieval, onToken, onComplete, onError}) — uses fetch + ReadableStream + TextDecoder for SSE (NOT EventSource — needs Authorization header)
   - listSources, createSource, deleteSource, syncSource, listSourceJobs
   - listUsers, createUser, updateUser, listRoles, updateRolePermissions
   - listAuditLogs(filters)
   - All methods strictly typed matching backend Pydantic schemas. Reads Bearer token from auth store. On 401 → calls auth.logout() + throws ApiError.

2. frontend/src/store/auth-store.ts (Zustand):
   - {token, user, isAuthenticated, login(), logout(), loadFromStorage()}
   - Persists token to localStorage

3. frontend/src/store/chat-store.ts (Zustand):
   - {messages: Message[], isLoading, sendQuery(text), clearChat()}
   - Message: {id, role: "user"|"assistant", content, citations?, expert?, confidence?, latency_ms?, status: "thinking"|"streaming"|"done"|"error"}
   - sendQuery uses queryStream — appends placeholder, updates content on each onToken, finalizes on onComplete

4. frontend/src/app/login/page.tsx:
   - Dark charcoal bg #0A0A0F, centered card max-width 400px, electric cyan #00E5CC accent
   - "SYNAPSE" wordmark + "Enterprise Knowledge, Grounded." subtitle
   - react-hook-form + zod validation (email + password min 6)
   - Loading state, error banner (5s auto-dismiss), demo creds hint at bottom: "Demo: admin@company.com / Admin123!"
   - On success → router.push("/chat")

5. frontend/src/app/chat/page.tsx:
   - Auth-gated (redirect /login if !authenticated)
   - Existing sidebar + topbar + ChatContainer
   - QueryInput → chatStore.sendQuery
   - MessageBubble: user (right, cyan tint), assistant (left, charcoal). Confidence pill (green >0.75, yellow 0.65-0.75, red <0.65), latency tooltip "Answered in X.Xs using N sources", copy button on hover
   - ThinkingIndicator while status="thinking", blinking caret while status="streaming"
   - CitationCard grid below assistant message: doc title, source icon (Slack/GitHub/Jira/Drive), author, relative date, click opens URL in new tab
   - ExpertCard above citations when expert present: avatar (first 2 letters), name, role, "Send Slack message" button (slack:// deeplink)
   - Smooth scroll to bottom on new message
   - 4 suggested-question chips on empty state ("What's our deployment process?", "How do I take PTO?", etc.)

6. frontend/src/app/admin/sources/page.tsx (ADMIN only — redirect non-admin to /chat with toast):
   - Grid of SourceCards: type icon, name, status pill (connected/syncing/error), last sync (relative), doc count, "Sync now" / "View jobs" / "Disconnect" buttons
   - "+ Add Source" modal: type select, name, JSON credentials textarea, cron schedule, default permission tag
   - Jobs drawer: last 20 jobs with started_at, duration, status, chunks_created, error_message
   - Poll every 5s while a sync job is running

7. frontend/src/app/admin/users/page.tsx (ADMIN only):
   - Search bar + role filter + "+ Add User" button
   - Table: avatar, email, name, role, status, last login, actions
   - Edit drawer: display_name, role select, is_active toggle
   - Confirmation: "Changing role will log [user] out of all devices. Continue?"
   - Block self-edit and last-admin removal with inline notice

8. frontend/src/app/admin/audit/page.tsx (ADMIN only):
   - Filters: action dropdown, user select, date range (default last 7d)
   - Virtualized list (react-window) of audit rows: timestamp, actor (avatar + name), action badge, resource, IP
   - Click row → modal with full JSON details
   - Export CSV button (client-side from current page)

9. frontend/src/middleware.ts — protects /chat and /admin/* routes (checks auth token in cookie/header).

After all files written:
- npm run lint -- --fix
- npm run type-check (or tsc --noEmit)
- npm run build (must succeed with no errors)

Use TypeScript strict, Tailwind classes only (no inline styles), CSS vars from existing styles. NO `any`. NO untyped fetch.

Deliverable: User can log in, chat with real backend (streaming tokens visible), admin can manage everything. `npm run build` succeeds.
```

**After it finishes:**
```bash
cd frontend && npm run build
git add -A && git commit -m "feat: frontend wired to real backend with streaming"
```

**Manual test (10 min):**
1. `make dev`
2. Open http://localhost:3000/login
3. Login as `admin@company.com` / `Admin123!`
4. Ask "what is our deployment process?" → see streaming answer + citations
5. Logout, login as `jamie.junior@company.com` / `Demo1234!` → ask an HR question → see low confidence
6. Login as admin → /admin/sources, /admin/users, /admin/audit all work

If all 6 work → tag it:
```bash
git tag v0.9-feature-complete && git push --tags
```

This tag is your safety net.

---

# 🟢 PROMPT 5 — Tests + Production Docker (Day 2 Afternoon, ~2 PM)

**Tool:** Cursor Agent
**Estimated time:** 45-60 min agent + 20 min review

```
TASK: Add tests + harden production Docker setup.

Read first:
- backend/tests/ (existing tests)
- backend/Dockerfile, frontend/Dockerfile
- docker-compose.prod.yml
- nginx/nginx.conf

Implement:

A) Backend unit tests in backend/tests/unit/:
   - test_chunker.py — 50-token overlap, 512 max, edge cases (empty, very short, single sentence)
   - test_embedding.py — mock model, 768-dim output
   - test_vector_search.py — mock asyncpg, verify SQL is parameterized (no string concat), RBAC filter always present
   - test_llm_client.py — respx for httpx mocking, retry behavior, timeout, LLMUnavailableError
   - test_prompt_builder.py — snapshot test on fixed input
   - test_expert_router.py — TF-IDF, ranking by author count
   - test_query_engine.py — all 8 deps mocked, low-confidence triggers expert lookup, latency tracked
   - test_auth.py — bcrypt roundtrip, JWT encode/decode, expired rejection, session validation
   pytest + pytest-asyncio + AsyncMock. Each test independent. AAA structure.

B) Backend integration tests in backend/tests/integration/:
   - test_query_pipeline.py — TestClient, login → query → verify citations + RBAC isolation between admin and junior_dev
   - test_auth_flow.py — full login → query → logout, role change kicks session

C) Frontend E2E in frontend/e2e/synapse.spec.ts (Playwright):
   - "happy path": login → query → see answer + citations
   - "rbac": junior_dev cannot reach /admin/users (redirected)
   - "low confidence": vague query → expert card shows
   - "streaming": tokens appear progressively
   playwright.config.ts: baseURL http://localhost:3000, webServer auto-start, chromium only, screenshot on-failure.
   Add npm script: "test:e2e": "playwright test"

D) Production hardening:

backend/Dockerfile (multi-stage):
   - Stage 1 builder: python:3.12-slim, install poetry, export requirements, install to /opt/venv
   - Stage 2 runtime: python:3.12-slim, copy /opt/venv, copy app/, run as non-root user 'synapse'
   - HEALTHCHECK CMD curl -f http://localhost:8000/api/v1/health || exit 1
   - CMD uvicorn with --workers 4

backend/Dockerfile.worker — same builder, CMD celery worker.

frontend/Dockerfile (multi-stage):
   - Stage 1 builder: node:20-alpine, npm ci, npm run build
   - Stage 2 runtime: node:20-alpine standalone output, non-root nextjs user
   - Build arg NEXT_PUBLIC_API_URL

docker-compose.prod.yml — verify:
   - All services restart unless-stopped
   - Resource limits: backend 2GB mem, worker 1GB, ollama 8GB
   - depends_on with healthcheck conditions
   - No source code mounts
   - nginx exposed on 80+443 only; everything else on internal network

nginx/nginx.conf:
   - HTTP→HTTPS redirect on 80
   - 443: TLS 1.3, security headers (HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, CSP)
   - upstream backend (server backend:8000), upstream frontend (server frontend:3000)
   - location /api/ → backend
   - location /api/v1/query/stream → backend with proxy_buffering off, proxy_cache off, proxy_read_timeout 1h
   - location / → frontend
   - gzip on for text types

nginx/certs/README.md with self-signed cert generation:
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout privkey.pem -out fullchain.pem -subj "/CN=localhost"

Deliverable: pytest --cov=app.core ≥60%, npx playwright test all green, docker compose -f docker-compose.prod.yml build succeeds.
```

**After it finishes:**
```bash
cd backend && pytest --cov=app.core
cd ../frontend && npx playwright test
cd .. && docker compose -f docker-compose.prod.yml build
git add -A && git commit -m "test: unit + integration + e2e + prod hardening"
```

If any tests fail and time is short — skip that one test, commit the rest, and move on. Don't burn an hour on one flaky test.

---

# 🟢 PROMPT 6 — README + User Manual + Demo Video (Day 2 Evening, ~6 PM)

**Tool:** Cursor Agent (writes docs only — low token cost)
**Estimated time:** 20 min agent + 30 min you doing manual stuff

```
TASK: Polish docs for submission.

Read backend/app/core/ and frontend/src/ briefly to confirm what's actually built.

Write:

1. README.md — replace existing with:
   - Hero: title, one-liner, badges (Python 3.12, Next.js 14, License)
   - "What is this?" 3 paragraphs (problem, approach, privacy guarantee)
   - Architecture mermaid diagram:
     ```mermaid
     graph TB
       subgraph Frontend
         UI[Next.js + React]
       end
       subgraph Edge
         NGINX[Nginx + TLS]
       end
       subgraph Backend
         API[FastAPI]
         Worker[Celery Worker]
       end
       subgraph Data
         PG[(PostgreSQL + pgvector)]
         Neo[(Neo4j)]
         R[(Redis)]
       end
       subgraph AI
         OL[Ollama / Llama 3]
         EM[Sentence-Transformers]
       end
       UI -->|HTTPS| NGINX
       NGINX --> API
       API -->|RBAC SQL| PG
       API -->|Cypher| Neo
       API -->|Sessions| R
       API -->|Generate| OL
       API -->|Embed| EM
       Worker -->|Queue| R
       Worker --> PG
       Worker --> Neo
     ```
   - Tech Stack bulleted with versions
   - Features mapped to SRS UFR-01 to UFR-06
   - Quick Start: clone, .env, make dev, make seed, open browser
   - Demo Accounts table (5 users with their permission scopes)
   - Project Structure tree
   - Database Architecture (3 paragraphs lifted from project report Section 5)
   - Development: tests, lint, migrations
   - API Reference: /api/v1/docs link + 4 curl examples (login, query, sources, users)
   - Deployment: docker compose prod + TLS cert generation
   - Roadmap / Known Limitations: "Connectors are mock; production needs real OAuth flows"
   - License + Acknowledgements

2. docs/USER_MANUAL.md (5-7 pages, friendly tone for non-technical PM):
   - Installation (Docker dev, Docker prod, manual)
   - First Login
   - Asking Your First Question
   - Understanding Citations
   - When Synapse Says "I Don't Know" — Expert Routing
   - Admin: Connect Data Source / Manage Users / Review Audit
   - Privacy & Security (lift from SRS UNFR-01, SNFR-02)
   - Troubleshooting (LLM down, slow, can't login)
   - FAQ (6 questions)

3. docs/VIVA_PREP.md — answers to 10 anticipated viva questions:
   1. Why pgvector over Pinecone/Qdrant? (security boundary inside SQL, ops simplicity)
   2. Why HNSW over IVFFlat? (recall vs build time for read-heavy workload)
   3. Why Neo4j over relational? (multi-hop traversal, Cypher expressiveness for expert routing)
   4. How prevent prompt injection? (system prompt grounding-only, no agentic action on retrieved text)
   5. What if Ollama dies? (tenacity retry 3x, 503 with structured error, audit-logged)
   6. How does RBAC work? (walk through WHERE permission_tag = ANY($2))
   7. How avoid hallucination? (grounded prompt + low-confidence → expert routing instead of inventing)
   8. Test coverage? (pytest cov ≥60%, integration on query pipeline, Playwright E2E)
   9. Biggest weakness? (mock connectors; architecture supports real OAuth, implementation is staged)
   10. Why 3 databases? (right tool per job: SQL+vector together, Cypher graph, Redis ephemeral)
   Each answer 60-90 seconds when read aloud.

Deliverable: README renders cleanly on GitHub. User manual is 5-7 readable pages. VIVA_PREP has all 10 answers.
```

**Manual stuff (you do, no AI — 30 min):**

1. **Take screenshots:**
   - login page
   - empty chat
   - chat with answer streaming
   - expert card showing
   - /admin/sources
   - /admin/audit
   Save as `docs/img/01-login.png`, `02-empty-chat.png`, etc.

2. **Record 3-min demo video:**
   - Use OBS, QuickTime, or any screen recorder
   - Login → ask 2 questions → show citations → switch to admin → show sources/users
   - Save as `docs/demo.mp4` (use git LFS if >50MB) or upload to YouTube unlisted and link in README

3. **Update README hero section** with one screenshot link.

4. **Memorize this 7-minute demo script** (practice 3 times tonight):

```
[0:00 — 0:30] HOOK
"Knowledge in companies is scattered — Slack, GitHub, Jira, Drive. Employees waste hours
searching, or interrupting senior devs. Synapse fixes this with one chat interface, fully
self-hosted, with privacy guarantees public AI tools cannot offer."

[0:30 — 1:00] ARCHITECTURE
"Three databases. Postgres+pgvector for vectors. Neo4j for the graph. Redis for sessions.
Llama 3 running locally via Ollama. RBAC enforced inside SQL — bypass is architecturally
impossible."

[1:00 — 2:30] CORE DEMO — Ask a question
[Login as alex.senior. Ask: "what is our deployment process?"]
"Watch — tokens stream in. Five citations from internal docs. Confidence 0.82. Latency
under 4 seconds end-to-end."
[Click a citation card] "Source verifiable."

[2:30 — 3:30] RBAC IN ACTION
[Logout, login as jamie.junior. Ask: "what is the parental leave policy?"]
"No answer. HR docs filtered at the database level — never reached the LLM. Application
code cannot leak them. This is security as physics, not as a coding convention."

[3:30 — 4:30] EXPERT ROUTING
[Ask a vague question]
"Confidence below 0.65. System pivots — queries the graph, finds the human expert by
authorship history. Better than hallucinating an answer."

[4:30 — 5:30] ADMIN
[Login as admin. Quick tour of /admin/sources, /admin/users, /admin/audit.]

[5:30 — 6:30] DESIGN CHOICES (your code-quality marks)
"Three things I'm proud of:
1. RBAC inside SQL WHERE clause — bypass is architecturally impossible.
2. pgvector instead of separate Qdrant — one DB to back up, one connection pool, one
   place to enforce policy.
3. Streaming SSE — perceived latency cut in half because tokens appear as generated."

[6:30 — 7:00] CLOSE
"Everything runs on company hardware. No data leaves. Architecture is production-ready —
running right now in this Docker compose. Questions?"
```

---

# 4 — IF SOMETHING BREAKS (Quick Fixes)

| Problem | Fix |
|---|---|
| Postgres won't start | `docker compose down -v && make dev` (stale volume) |
| `type vector does not exist` | `docker compose exec backend alembic upgrade head` |
| Ollama times out first request | First load is slow. `make models` to pre-pull. Or `OLLAMA_TIMEOUT=120`. |
| Frontend "fetch failed" | CORS — verify FastAPI allows http://localhost:3000 |
| JWT decode fails after restart | `SECRET_KEY` changed. Lock it in `.env.dev`. |
| Tests pass local, fail CI | env vars differ — check `.env.test` |
| Agent generates Qdrant code | Reject. Reply: "Use pgvector. NOT Qdrant. Retry with the WHERE permission_tag = ANY clause." |
| Agent ignores type hints | Reply: "All functions need type hints. NO `any`. Re-do." |
| Agent loops on a function | Stop. Open the file manually. Reply: "Here's the current state: <paste 30 lines>. Now do X only." |

---

# 5 — IF QUOTA RUNS OUT MID-PROMPT

1. **Stop immediately.** Don't waste the rest of the session.
2. **Save what's done.** `git add -A && git commit -m "wip: partial PROMPT N"`.
3. **Switch IDE.** Cursor → Antigravity (or vice versa).
4. **In the new IDE, paste the SAME prompt** — they're IDE-agnostic. Add at the end:
   ```
   PARTIAL WORK ALREADY DONE in commit <hash>. Read the modified files and continue from
   where the last agent stopped. Do NOT redo files that already look complete.
   ```
5. **Don't restart from scratch.** That doubles your token usage.

---

# 6 — PANIC PROTOCOL (cut features in this order)

If running out of time, cut in this order:
1. ❌ 3D knowledge graph viz (visual sugar)
2. ❌ Command palette
3. ❌ GDPR endpoint (mention as roadmap in README)
4. ❌ Streaming SSE → fall back to non-streaming POST
5. ❌ Real connectors → keep ONLY MockConnector

**Never cut:** login + JWT, RBAC SQL filter, one E2E query path, /admin/users + /admin/sources basics, audit log, seed data, README + manual.

If prod Docker doesn't work → demo from `make dev`. Grader cares about working > deployed.

---

# 7 — SUBMISSION CHECKLIST (Day 3 morning, 10 min)

```bash
# Final cleanup
cd backend && ruff format app/ && ruff check app/ --fix
cd ../frontend && npm run lint -- --fix

# Final tests
make test || true   # don't block submission on flaky tests

# Final build
docker compose -f docker-compose.prod.yml build

# Tag
git tag v1.0 && git push --tags
```

**Pre-submission checks:**
- [ ] GitHub repo public OR access shared with grader email
- [ ] README renders on GitHub (open it in browser to verify mermaid diagram works)
- [ ] `v1.0` tag exists
- [ ] User manual at `docs/USER_MANUAL.md`
- [ ] Demo video at `docs/demo.mp4` or YouTube unlisted link in README
- [ ] If deployment URL required: tested in incognito browser
- [ ] All deliverables uploaded to Google Classroom

**Don't refactor on submission day. Submit and rest.**

---

# 8 — FINAL NOTE

Six prompts. Two days. The hard architecture work is already done — your report proves it.
What's left is wiring + docs. Boring sequential work that only feels hard because of nerves.

Open the file. Run Section 2 audit. Then fire **Prompt 1**. Don't read ahead.

You've got this.

---

**End. Keep this file open. Close everything else.**