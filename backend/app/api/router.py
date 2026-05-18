"""Central API router aggregator."""

from fastapi import APIRouter

from app.api.v1 import admin_dashboard as admin_stats
from app.api.v1 import auth, conversations, health, query
from app.api.v1.admin import audit as admin_audit
from app.api.v1.admin import graph as admin_graph
from app.api.v1.admin import roles as admin_roles
from app.api.v1.admin import sources as admin_sources
from app.api.v1.admin import users as admin_users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/v1/auth", tags=["auth"])
api_router.include_router(query.router, prefix="/v1/query", tags=["query"])
api_router.include_router(conversations.router, prefix="/v1/conversations", tags=["conversations"])
api_router.include_router(health.router, prefix="/v1/health", tags=["health"])

api_router.include_router(admin_stats.router, prefix="/v1/admin", tags=["admin"])
api_router.include_router(admin_graph.router, prefix="/v1/admin", tags=["admin-graph"])
api_router.include_router(admin_users.router, prefix="/v1/admin/users", tags=["admin-users"])
api_router.include_router(admin_roles.router, prefix="/v1/admin", tags=["admin-roles"])
api_router.include_router(admin_sources.router, prefix="/v1/admin/sources", tags=["admin-sources"])
api_router.include_router(admin_audit.router, prefix="/v1/admin", tags=["admin-audit"])
