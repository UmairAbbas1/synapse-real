from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_documents: int
    total_chunks: int
    total_users: int
    active_sources: int
    queries_today: int
    avg_response_time_ms: float

class SystemHealth(BaseModel):
    api: bool
    postgres: bool
    pgvector: bool
    neo4j: bool
    redis: bool
    ollama: bool
