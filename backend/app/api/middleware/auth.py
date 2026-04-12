"""Security middleware binding standard connections globally across structural logic bindings."""

from fastapi import Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog

from app.api.middleware.error_handler import AuthenticationError, AuthorizationError
from app.services.auth_service import AuthService
from app.schemas.auth import TokenPayload

logger = structlog.get_logger(__name__)

security = HTTPBearer()

def get_auth_service():
    return AuthService()

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenPayload:
    """Evaluate API Tokens explicitly validating limits inherently dynamically routing outputs gracefully."""
    token = credentials.credentials
    try:
        user_payload = auth_service.verify_token(token)
        request.state.user_id = user_payload.sub
        request.state.user_role = user_payload.role
        request.state.user_permissions = user_payload.permissions
        request.state.user = user_payload
        return user_payload
    except AuthenticationError as e:
        logger.warning("auth_failed_verification", error=str(e))
        raise e

def require_role(*roles: str):
    """Decorator dependency building arrays limiting explicit logic outputs safely enforcing mappings."""
    async def role_checker(user: TokenPayload = Depends(get_current_user)):
        if "ADMIN" in user.role or "*" in user.permissions:
            return user
        if user.role not in roles:
            raise AuthorizationError()
        return user
    return role_checker
