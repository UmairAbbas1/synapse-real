"""Specific bindings validating DB variables cleanly seamlessly executing natively safely!"""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from typing import Tuple

from app.models.user import User
from app.models.role import Role
from app.services.audit_service import AuditService
from app.schemas.user import RoleCreate, RoleUpdate

logger = structlog.get_logger(__name__)

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def list_users(self, limit: int, offset: int):
        res = await self.db.execute(select(User).limit(limit).offset(offset))
        import sqlalchemy as sa
        count_res = await self.db.execute(select(sa.func.count(User.id)))
        return {"items": res.scalars().all(), "total": count_res.scalar_one(), "limit": limit, "offset": offset}

    async def get_user(self, id: str) -> User:
        user = await self.db.get(User, id)
        if not user:
            raise HTTPException(404, "User not found")
        return user

    async def change_role(self, id: str, role_id: str, admin_id: str) -> User:
        user = await self.get_user(id)
        old_role = user.role_id
        user.role_id = role_id
        await self.db.commit()
        await self.db.refresh(user)
        await self.audit.log(
            user_id=admin_id,
            action="change_role",
            resource_type="user",
            details={"user_id": id, "old_role": old_role, "new_role": role_id}
        )
        return user

    async def list_roles(self):
        res = await self.db.execute(select(Role))
        return list(res.scalars().all())

    async def create_role(self, data: RoleCreate, admin_id: str) -> Role:
        role = Role(
            name=data.name,
            description=data.description,
            permissions=data.permissions
        )
        self.db.add(role)
        await self.db.commit()
        await self.db.refresh(role)
        await self.audit.log(
            user_id=admin_id,
            action="create_role",
            resource_type="role",
            details={"role_name": data.name}
        )
        return role

    async def update_role(self, id: str, data: RoleUpdate, admin_id: str) -> Role:
        role = await self.db.get(Role, id)
        if not role:
            raise HTTPException(404, "Role not found")
            
        old_permissions = role.permissions
        if data.name is not None: role.name = data.name
        if data.description is not None: role.description = data.description
        if data.permissions is not None: role.permissions = data.permissions
        
        await self.db.commit()
        await self.db.refresh(role)
        
        await self.audit.log(
            user_id=admin_id,
            action="update_role",
            resource_type="role",
            details={"role_id": id, "old_permissions": old_permissions, "new_permissions": data.permissions}
        )
        return role
