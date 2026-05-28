from typing import Any
from uuid import UUID

from fastapi import Depends
from pydantic import EmailStr
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.dependencies import get_db_session
from seatflow.db.models.user import User


class UserDAO:
    """Class for accessing user table."""

    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self.session = session

    async def create(self, user_data: dict[str, Any]) -> User:
        user = User(**user_data)
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def get_by_id(self, user_id: UUID) -> User | None:
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: EmailStr) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, user: User, update_data: dict[str, Any]) -> User:
        for field, value in update_data.items():
            setattr(user, field, value)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def delete(self, user: User) -> None:
        await self.session.delete(user)

    async def list_users(
        self,
        offset: int = 0,
        limit: int = 20,
        search: str | None = None,
        is_active: bool | None = None,
        is_superuser: bool | None = None,
    ) -> tuple[list[User], int]:
        conditions = []
        if search:
            conditions.append(or_(User.email.ilike(f"%{search}%"), User.full_name.ilike(f"%{search}%")))
        if is_active is not None:
            conditions.append(User.is_active == is_active)
        if is_superuser is not None:
            conditions.append(User.is_superuser == is_superuser)

        query = select(User)
        if conditions:
            query = query.where(and_(*conditions))
        query = query.order_by(User.created_at.desc())

        count_stmt = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_stmt)).scalar()

        result = await self.session.execute(query.offset(offset).limit(limit))
        return list(result.scalars().all()), total
