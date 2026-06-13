from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func as sa_func, and_, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.library import AnimeLibrary
from app.models.user import User
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/api/library", tags=["library"])


class AddEntryRequest(BaseModel):
    anime_id: str
    anime_title: str
    anime_title_jp: str = ""
    total_episodes: int = 0
    genre: str = ""
    year: int | None = None
    studio: str = ""
    synopsis: str = ""
    image: str = ""
    banner: str = ""
    type: str = "TV"
    duration: str = "24m"
    season: str = ""
    status: str = "planning"


class UpdateEntryRequest(BaseModel):
    episodes_watched: int | None = None
    status: str | None = None
    user_score: int | None = None


def _serialize(e: AnimeLibrary) -> dict:
    return {
        "id": e.id,
        "anime_id": e.anime_id,
        "anime_title": e.anime_title,
        "anime_title_jp": e.anime_title_jp,
        "total_episodes": e.total_episodes,
        "episodes_watched": e.episodes_watched,
        "status": e.status,
        "user_score": e.user_score,
        "genre": e.genre,
        "year": e.year,
        "studio": e.studio,
        "synopsis": e.synopsis,
        "image": e.image,
        "banner": e.banner,
        "type": e.type,
        "duration": e.duration,
        "season": e.season,
        "last_updated": e.last_updated.isoformat() if e.last_updated else None,
        "added_date": e.added_date.isoformat() if e.added_date else None,
    }


@router.get("")
async def get_library(
    status_filter: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(AnimeLibrary).where(AnimeLibrary.user_id == user.id)
    if status_filter and status_filter != "all":
        q = q.where(AnimeLibrary.status == status_filter)
    q = q.order_by(AnimeLibrary.last_updated.desc())
    result = await db.execute(q)
    return [_serialize(e) for e in result.scalars().all()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_entry(
    body: AddEntryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(AnimeLibrary).where(
            AnimeLibrary.user_id == user.id,
            AnimeLibrary.anime_id == body.anime_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already in library")

    entry = AnimeLibrary(
        user_id=user.id,
        anime_id=body.anime_id,
        anime_title=body.anime_title,
        anime_title_jp=body.anime_title_jp,
        total_episodes=body.total_episodes,
        status=body.status,
        genre=body.genre,
        year=body.year,
        studio=body.studio,
        synopsis=body.synopsis,
        image=body.image,
        banner=body.banner,
        type=body.type,
        duration=body.duration,
        season=body.season,
        episodes_watched=0,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return _serialize(entry)


@router.put("/{entry_id}")
async def update_entry(
    entry_id: int,
    body: UpdateEntryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AnimeLibrary).where(
            AnimeLibrary.id == entry_id,
            AnimeLibrary.user_id == user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if body.episodes_watched is not None:
        entry.episodes_watched = body.episodes_watched
    if body.status is not None:
        entry.status = body.status
    if body.user_score is not None:
        entry.user_score = body.user_score if 1 <= body.user_score <= 10 else None

    entry.last_updated = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(entry)
    return _serialize(entry)


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AnimeLibrary).where(
            AnimeLibrary.id == entry_id,
            AnimeLibrary.user_id == user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    await db.delete(entry)
    await db.commit()
    return {"status": "ok"}


@router.get("/stats")
async def get_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AnimeLibrary).where(AnimeLibrary.user_id == user.id)
    )
    entries = result.scalars().all()

    total_entries = len(entries)
    total_ep = sum(e.episodes_watched for e in entries)
    total_min = 0
    scored = []
    genre_counts: dict[str, int] = {}
    status_counts: dict[str, int] = {}
    recent: list[dict] = []

    for e in entries:
        total_min += e.episodes_watched * (int(e.duration.replace("min", "").replace("m", "").strip()) if e.duration else 24)

        if e.user_score is not None:
            scored.append(e.user_score)

        for g in e.genre.split(","):
            g = g.strip()
            if g:
                genre_counts[g] = genre_counts.get(g, 0) + 1

        status_counts[e.status] = status_counts.get(e.status, 0) + 1

    # Score distribution
    score_dist = {str(i): 0 for i in range(1, 11)}
    for s in scored:
        score_dist[str(s)] = score_dist.get(str(s), 0) + 1

    # Recent activity
    sorted_entries = sorted(entries, key=lambda e: e.last_updated or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    for e in sorted_entries[:8]:
        recent.append({
            "id": e.id,
            "anime_title": e.anime_title,
            "anime_title_jp": e.anime_title_jp,
            "status": e.status,
            "last_updated": e.last_updated.isoformat() if e.last_updated else None,
        })

    avg_score = round(sum(scored) / len(scored), 1) if scored else None
    total_hours = round(total_min / 60, 1)

    return {
        "total_entries": total_entries,
        "total_episodes": total_ep,
        "total_hours": total_hours,
        "avg_score": avg_score,
        "status_counts": status_counts,
        "genre_top": sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:8],
        "score_distribution": score_dist,
        "recent_activity": recent,
    }
