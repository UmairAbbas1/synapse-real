"""Core query logic routing components securely tracking limits explicitly."""

from fastapi import APIRouter, Depends, BackgroundTasks

from app.schemas.query import QueryRequest, QueryResponse
from app.services.query_service import QueryService
from app.services.audit_service import AuditService
from app.api.middleware.rate_limit import check_rate_limit
from app.core.auth import get_current_user


def get_query_service() -> QueryService:
    raise NotImplementedError("Dependency resolved at application router")

def get_audit_service() -> AuditService:
    raise NotImplementedError("Dependency resolved at application router")


router = APIRouter()

@router.post("", response_model=QueryResponse, dependencies=[Depends(check_rate_limit)])
async def execute_query(
    request: QueryRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    query_service: QueryService = Depends(get_query_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """
    Execute deep LLM evaluations traversing across multi-modal retrieval processes exactly.
    1. Embed inputs securely building similarity maps natively against data.
    2. Extract context constraints dynamically spanning explicit RBAC node evaluations.
    3. Graph-enrich paths reliably executing local context relations structurally.
    4. Format, compute, and offload inference prompts strictly routing complex fallback logic toward designated SME sources dynamically.
    """
    user_id = user.sub if hasattr(user, "sub") else user.get("sub", "anonymous")
    permission_tags = user.permissions if hasattr(user, "permissions") else user.get("permissions", [])
    
    response = await query_service.execute_query(
        query=request.question,
        user_id=user_id,
        permission_tags=permission_tags
    )
    
    query_hash = audit_service.hash_query(request.question)
    
    # Audit log after every query securely avoiding direct wait-times
    background_tasks.add_task(
        audit_service.log,
        user_id=user_id,
        action="execute_query",
        resource_type="query",
        details={
            "model_used": response.metadata.model_used,
            "top_score": response.metadata.top_similarity_score
        },
        query_hash=query_hash
    )
    
    return response

