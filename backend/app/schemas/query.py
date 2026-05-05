from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000, description="Natural language question")
    stream: bool = False

    @property
    def question(self) -> str:
        """Backward-compatible alias used by older call sites."""
        return self.query

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
    expert: Optional[ExpertSuggestion] = None
    is_low_confidence: bool
    metadata: QueryMetadata
