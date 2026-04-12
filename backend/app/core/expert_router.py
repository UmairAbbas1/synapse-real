"""Expert routing when retrieval confidence is low (Section 8)."""

from __future__ import annotations

import numpy as np
from neo4j import AsyncDriver
from sklearn.feature_extraction.text import TfidfVectorizer

from app.schemas.query import ExpertSuggestion


class ExpertRouter:
    def __init__(self, neo4j_driver: AsyncDriver) -> None:
        self.driver = neo4j_driver

    async def find_expert(self, query: str) -> ExpertSuggestion | None:
        """
        When similarity score < 0.65, find the Person most connected
        to the query topic via TF-IDF keyword extraction + graph traversal.
        """
        keywords = self._extract_keywords(query, top_n=3)
        if not keywords:
            return None

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

        if record is None:
            return None

        rel = record["relevance"]
        return ExpertSuggestion(
            name=str(record["name"]),
            email=str(record["email"]),
            job_title=str(record["job_title"]),
            relevance_score=int(rel) if rel is not None else 0,
        )

    def _extract_keywords(self, text: str, top_n: int = 3) -> list[str]:
        """Simple keyword extraction using TF-IDF weighting."""
        vectorizer = TfidfVectorizer(stop_words="english", max_features=top_n)
        tfidf = vectorizer.fit_transform([text])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf.toarray()[0]
        top_indices = np.argsort(scores)[::-1][:top_n]
        return [str(feature_names[i]) for i in top_indices if scores[i] > 0]
