"""Admin knowledge graph endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncDriver
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.db.neo4j import get_neo4j_driver
from app.schemas.auth import CurrentUser

router = APIRouter()

ALLOWED_LABELS = ["Person", "Document", "Project", "Team"]


class GraphNodeResponse(BaseModel):
    id: str
    label: str
    name: str
    degree: int


class GraphEdgeResponse(BaseModel):
    source: str
    target: str


class GraphResponse(BaseModel):
    nodes: list[GraphNodeResponse]
    edges: list[GraphEdgeResponse]


def _require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def get_neo4j() -> AsyncDriver:
    return get_neo4j_driver()


@router.get("/graph", response_model=GraphResponse)
async def get_graph(
    _: CurrentUser = Depends(_require_admin),
    neo4j: AsyncDriver = Depends(get_neo4j),
) -> GraphResponse:
    async with neo4j.session() as session:
        node_result = await session.run(
            """
            MATCH (n)
            WHERE any(label IN labels(n) WHERE label IN $allowed_labels)
            WITH n, [label IN labels(n) WHERE label IN $allowed_labels][0] AS primary_label
            OPTIONAL MATCH (n)-[r]-()
            RETURN elementId(n) AS id,
                   primary_label AS label,
                   coalesce(n.name, n.title, n.email, n.source_url, elementId(n)) AS name,
                   count(r) AS degree
            ORDER BY degree DESC, name ASC
            LIMIT 200
            """,
            allowed_labels=ALLOWED_LABELS,
        )
        node_rows = [record async for record in node_result]

        nodes = [
            GraphNodeResponse(
                id=str(record["id"]),
                label=str(record["label"]),
                name=str(record["name"]),
                degree=int(record["degree"] or 0),
            )
            for record in node_rows
        ]

        node_ids = [node.id for node in nodes]
        if not node_ids:
            return GraphResponse(nodes=[], edges=[])

        edge_result = await session.run(
            """
            MATCH (a)-[r]->(b)
            WHERE elementId(a) IN $node_ids
              AND elementId(b) IN $node_ids
              AND any(label IN labels(a) WHERE label IN $allowed_labels)
              AND any(label IN labels(b) WHERE label IN $allowed_labels)
            RETURN DISTINCT elementId(a) AS source, elementId(b) AS target
            LIMIT 400
            """,
            node_ids=node_ids,
            allowed_labels=ALLOWED_LABELS,
        )
        edges = [
            GraphEdgeResponse(
                source=str(record["source"]),
                target=str(record["target"]),
            )
            async for record in edge_result
        ]

    return GraphResponse(nodes=nodes, edges=edges)
