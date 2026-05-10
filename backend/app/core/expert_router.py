"""Expert Routing via Knowledge Graph."""

from __future__ import annotations

import structlog
from sklearn.feature_extraction.text import TfidfVectorizer
from neo4j import AsyncDriver

from app.schemas.query import ExpertSuggestion

logger = structlog.get_logger(__name__)


class ExpertRouter:
    def __init__(self, neo4j_driver: AsyncDriver):
        self.driver = neo4j_driver

    def _extract_keywords(self, text: str, top_n: int = 3) -> list[str]:
        """Extract main keywords using TF-IDF, handling short sequences gracefully."""
        if not text or not text.strip():
            return []
            
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            scores = tfidf_matrix.toarray()[0]
            
            # Combine names and scores, sort by descending score
            scored_words = sorted(zip(feature_names, scores), key=lambda x: x[1], reverse=True)
            return [word for word, score in scored_words[:top_n]]
        except ValueError:
            # Fallback for very short texts or stop-words only sequences
            words = [w.strip(".,!?()[]{}'\"").lower() for w in text.split()]
            return words[:top_n]

    async def find_expert(self, query: str) -> ExpertSuggestion | None:
        """Query knowledge graph for experts handling specific topics accurately."""
        keywords = self._extract_keywords(query, top_n=3)
        if not keywords:
            return None
            
        logger.info("expert_router_extracted_keywords", keywords=keywords)
        
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
                       relevance AS relevance_score
                """,
                keywords=keywords,
            )
            
            record = await result.single()
            if not record:
                logger.info("expert_search_no_results", query=query)
                return None
                
            expert = ExpertSuggestion(
                name=record["name"],
                email=record["email"],
                job_title=record["job_title"] or "Subject Matter Expert",
                relevance_score=float(record["relevance_score"]),
            )
            
            logger.info("expert_search_success", expert_name=expert.name)
            return expert
