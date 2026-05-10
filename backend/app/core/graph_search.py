"""Knowledge Graph search and ingestion operations."""

from __future__ import annotations

import structlog
from neo4j import AsyncDriver

from app.connectors.base import RawDocument
from app.core.vector_search import RetrievedChunk

logger = structlog.get_logger(__name__)


class GraphSearchService:
    def __init__(self, driver: AsyncDriver) -> None:
        self.driver = driver

    async def enrich(
        self,
        query: str,
        chunks: list[RetrievedChunk],
    ) -> list[dict[str, object]]:
        """
        Given retrieved chunks, find related entities in the knowledge graph.
        Returns related tickets, projects, and authors for context enrichment.
        """
        _ = query
        chunk_sources = list({c.source_url for c in chunks if c.source_url})
        if not chunk_sources:
            return []

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

            enrichment_data = [record.data() async for record in result]
            logger.info("graph_enrichment_complete", nodes_enriched=len(enrichment_data))
            return enrichment_data

    async def update_graph(self, doc: RawDocument) -> None:
        """
        Update the Neo4j graph with new documents, linking people and projects.
        """
        async with self.driver.session() as session:
            raw_projects = doc.metadata.get("projects")
            projects_obj: object = raw_projects if raw_projects is not None else []
            projects = projects_obj if isinstance(projects_obj, list) else []
            valid_projects = [p for p in projects if isinstance(p, str) and p.strip()]
            
            await session.run(
                """
                // 1. Merge the Document
                MERGE (d:Document {source_url: $source_url})
                ON CREATE SET 
                    d.doc_id = $doc_id,
                    d.title = $title,
                    d.source_type = $source_type,
                    d.created_at = $created_at,
                    d.updated_at = $updated_at
                ON MATCH SET
                    d.title = $title,
                    d.updated_at = $updated_at
                    
                // 2. Merge the Author (Person) and link them
                WITH d
                MERGE (p:Person {email: $author_email})
                ON CREATE SET p.name = $author_name
                MERGE (p)-[:AUTHORED]->(d)
                
                // 3. Document mentions Projects (from metadata)
                FOREACH (proj_name IN $projects |
                   MERGE (proj:Project {name: proj_name})
                   MERGE (d)-[:MENTIONS]->(proj)
                )
                """,
                source_url=doc.source_url,
                doc_id=doc.source_id,
                title=doc.title,
                source_type=doc.source_type,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                author_email=doc.author_email,
                author_name=doc.author_name,
                projects=valid_projects,
            )
            logger.info("graph_update_complete", doc_title=doc.title)

    async def find_experts_for_topics(self, keywords: list[str]) -> list[dict[str, object]]:
        """
        Uses the fulltext index 'document_content' to find ranked experts.
        """
        if not keywords:
            return []
            
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
                RETURN p.name AS name,
                       p.email AS email,
                       p.title AS job_title,
                       relevance AS relevance_score
                """,
                keywords=keywords,
            )
            
            experts = [record.data() async for record in result]
            logger.info("experts_search_complete", experts_found=len(experts))
            return experts
