"""Central API router aggregator."""

from fastapi import APIRouter

from app.api.v1 import (
    query,
    sources,
    users,
    auth,
    admin,
    health,
    audit,
)

api_router = APIRouter()

api_router.include_router(query.router, prefix="/v1/query", tags=["query"])
api_router.include_router(sources.router, prefix="/v1/sources", tags=["sources"])
api_router.include_router(users.router, prefix="/v1/users", tags=["users"])
api_router.include_router(auth.router, prefix="/v1/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/v1/admin", tags=["admin"])
api_router.include_router(health.router, prefix="/v1/health", tags=["health"])
api_router.include_router(audit.router, prefix="/v1/audit", tags=["audit"])
