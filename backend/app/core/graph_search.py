"""Neo4j graph enrichment for RAG context (Section 8)."""

from __future__ import annotations

from neo4j import AsyncDriver


class GraphSearchService:
    def __init__(self, driver: AsyncDriver) -> None:
        self.driver = driver

    async def enrich(
        self,
        chunk_sources: list[str],
        query_text: str,
    ) -> list[dict[str, object]]:
        """
        Given retrieved chunks, find related entities in the knowledge graph.
        Returns related tickets, projects, and authors for context enrichment.
        """
        _ = query_text
        async with self.driver.session() as session:
            result = await session.run(
                """
                UNWIND $source_urls AS url
                MATCH (d:Document {source_url: url})
                OPTIONAL MATCH (d)<-[:AUTHORED]-(p:Person)
                OPTIONAL MATCH (d)-[:MENTIONS]->(proj:Project)
                OPTIONAL MATCH (d)-[:RELATED_TO]->(related:Document)
                RETURN d.title AS doc_title,
                       collect(DISTINCT p.name) AS authors,
                       collect(DISTINCT proj.name) AS projects,
                       collect(DISTINCT related.title)[..3] AS related_docs
                """,
                source_urls=chunk_sources,
            )
            rows: list[dict[str, object]] = []
            async for record in result:
                rows.append(record.data())
            return rows
