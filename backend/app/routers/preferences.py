from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.preferences import UserPreferences
from app.models.user import User
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


class PreferencesResponse(BaseModel):
    default_quality: int = 0
    default_mode: str = "sub"


class PreferencesUpdate(BaseModel):
    default_quality: int | None = None
    default_mode: str | None = None


@router.get("", response_model=PreferencesResponse)
async def get_preferences(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        return PreferencesResponse()
    return PreferencesResponse(
        default_quality=prefs.default_quality,
        default_mode=prefs.default_mode,
    )


@router.put("", response_model=PreferencesResponse)
async def update_preferences(
    body: PreferencesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = UserPreferences(user_id=user.id)
        db.add(prefs)

    if body.default_quality is not None:
        prefs.default_quality = body.default_quality
    if body.default_mode is not None:
        prefs.default_mode = body.default_mode

    await db.commit()
    return PreferencesResponse(
        default_quality=prefs.default_quality,
        default_mode=prefs.default_mode,
    )
