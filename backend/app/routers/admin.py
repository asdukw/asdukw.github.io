from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import require_admin, require_csrf
from ..db import get_db
from ..models import Comment, User
from ..schemas import ModerationRequest, ModerationResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.patch(
    "/comments/{comment_id}",
    response_model=ModerationResponse,
)
async def moderate_comment(
    payload: ModerationRequest,
    comment_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
    __: None = Depends(require_csrf),
) -> ModerationResponse:
    comment = await db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="comment_not_found")
    comment.status = payload.status
    await db.commit()
    return ModerationResponse(id=comment.id, status=payload.status)
