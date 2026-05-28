from typing import Any
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.models.chat import KnowledgeCategory, KnowledgeEntry


class KnowledgeEntryDAO:
    """Data access for knowledge base entries."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: dict[str, Any]) -> KnowledgeEntry:
        entry = KnowledgeEntry(**data)
        self.session.add(entry)
        await self.session.flush()
        await self.session.refresh(entry)
        return entry

    async def get_by_id(self, entry_id: UUID) -> KnowledgeEntry | None:
        stmt = select(KnowledgeEntry).where(KnowledgeEntry.id == entry_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active(
        self,
        category: KnowledgeCategory | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[KnowledgeEntry]:
        stmt = select(KnowledgeEntry).where(KnowledgeEntry.is_active.is_(True))
        if category:
            stmt = stmt.where(KnowledgeEntry.category == category)
        stmt = stmt.order_by(KnowledgeEntry.priority.desc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def search(self, query: str, limit: int = 5) -> list[KnowledgeEntry]:
        term = f"%{query.lower()}%"
        stmt = (
            select(KnowledgeEntry)
            .where(
                KnowledgeEntry.is_active.is_(True),
                or_(
                    KnowledgeEntry.question.ilike(term),
                    KnowledgeEntry.answer.ilike(term),
                    KnowledgeEntry.keywords.ilike(term),
                ),
            )
            .order_by(KnowledgeEntry.priority.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, entry: KnowledgeEntry, data: dict[str, Any]) -> KnowledgeEntry:
        for field, value in data.items():
            setattr(entry, field, value)
        await self.session.flush()
        await self.session.refresh(entry)
        return entry

    async def delete(self, entry: KnowledgeEntry) -> None:
        await self.session.delete(entry)