"""Citation formatting and extraction tools."""

from datetime import datetime, timezone
import structlog

from app.core.vector_search import RetrievedChunk
from app.schemas.query import Citation

logger = structlog.get_logger(__name__)


class CitationBuilder:
    def build(self, chunks: list[RetrievedChunk]) -> list[Citation]:
        """Convert, deduplicate, and map chunks securely to Citations."""
        if not chunks:
            return []
            
        citations_map = {}
        
        for chunk in chunks:
            if not chunk.source_url:
                continue
                
            if chunk.source_url in citations_map:
                if chunk.score > citations_map[chunk.source_url].score:
                    citations_map[chunk.source_url] = chunk
            else:
                citations_map[chunk.source_url] = chunk
                
        unique_chunks = sorted(citations_map.values(), key=lambda c: c.score, reverse=True)
        top_chunks = unique_chunks[:5]
        
        citations = []
        for chunk in top_chunks:
            try:
                # Handle standard ISO formats, specifically swapping Z for accurate Python offset parsing
                clean_ts = chunk.timestamp.replace("Z", "+00:00") if chunk.timestamp else ""
                parsed_time = datetime.fromisoformat(clean_ts)
            except Exception:
                parsed_time = datetime.now(timezone.utc)
                
            citations.append(
                Citation(
                    title=chunk.document_title or "Unknown Document",
                    source_type=chunk.source_type or "unknown",
                    source_url=chunk.source_url,
                    author=chunk.author or "Unknown",
                    timestamp=parsed_time,
                    relevance_score=round(float(chunk.score), 4),
                )
            )
            
        return citations

    def format_for_prompt(self, citations: list[Citation]) -> str:
        """Build contextual mappings representing ordered text layouts for prompt context bindings."""
        if not citations:
            return ""
            
        formatted_strings = []
        for index, citation in enumerate(citations, 1):
            date_str = citation.timestamp.strftime("%Y-%m-%d")
            formatted_strings.append(
                f"[{index}] {citation.title} ({citation.source_type}) — {citation.author}, {date_str}"
            )
            
        return "\n".join(formatted_strings) + "\n"
