from urllib.request import Request as UrllibRequest, urlopen
import ssl

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.history import WatchHistory
from app.models.user import User
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/api/stream", tags=["stream"])

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0"

_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

CHUNK_SIZE = 256 * 1024


def _make_headers(url: str, range_header: str, referrer: str | None = None) -> dict[str, str]:
    headers = {
        "User-Agent": USER_AGENT,
        "Referer": referrer or "https://allanime.day",
    }
    if range_header:
        headers["Range"] = range_header
    return headers


@router.get("/download")
async def download_video(
    url: str,
    ref: str | None = Query(None, alias="ref"),
):
    import asyncio

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    def open_stream():
        headers = _make_headers(url, "", ref)
        req = UrllibRequest(url, headers=headers)
        return urlopen(req, timeout=60, context=ssl_ctx)

    loop = asyncio.get_event_loop()
    try:
        resp = await loop.run_in_executor(None, open_stream)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Download error: {str(e)}")

    content_type = resp.headers.get("Content-Type", "video/mp4")
    content_length = resp.headers.get("Content-Length")

    async def iterate():
        try:
            while True:
                chunk = await loop.run_in_executor(None, resp.read, CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk
        finally:
            resp.close()

    return StreamingResponse(
        iterate(),
        headers={
            "Content-Type": content_type,
            **({"Content-Length": content_length} if content_length else {}),
            "Content-Disposition": 'attachment; filename="anime-episode.mp4"',
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/proxy")
async def proxy_video(
    url: str,
    request: Request,
    ref: str | None = Query(None, alias="ref"),
):
    import asyncio

    range_header = request.headers.get("range", "")

    loop = asyncio.get_event_loop()

    def open_stream():
        headers = _make_headers(url, range_header, ref)
        req = UrllibRequest(url, headers=headers)
        return urlopen(req, timeout=60, context=_ssl_ctx)

    try:
        resp = await loop.run_in_executor(None, open_stream)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")

    content_type = resp.headers.get("Content-Type", "video/mp4")
    content_length = resp.headers.get("Content-Length")
    content_range = resp.headers.get("Content-Range")

    async def iterate():
        try:
            while True:
                chunk = await loop.run_in_executor(None, resp.read, CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk
        finally:
            resp.close()

    return StreamingResponse(
        iterate(),
        status_code=resp.status,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Type": content_type,
            **({"Content-Length": content_length} if content_length else {}),
            **({"Content-Range": content_range} if content_range else {}),
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/history")
async def get_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchHistory)
        .where(WatchHistory.user_id == user.id)
        .order_by(WatchHistory.last_watched.desc())
    )
    entries = result.scalars().all()
    return [
        {
            "id": e.id,
            "anime_id": e.anime_id,
            "anime_title": e.anime_title,
            "episode": e.episode,
            "progress": e.progress,
            "total_duration": e.total_duration,
            "last_watched": e.last_watched.isoformat() if e.last_watched else None,
        }
        for e in entries
    ]


@router.post("/history")
async def save_progress(
    anime_id: str,
    anime_title: str,
    episode: str,
    progress: float = 0.0,
    total_duration: float = 0.0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchHistory).where(
            WatchHistory.user_id == user.id,
            WatchHistory.anime_id == anime_id,
            WatchHistory.episode == episode,
        )
    )
    entry = result.scalar_one_or_none()
    if entry:
        entry.progress = progress
        entry.total_duration = total_duration
    else:
        entry = WatchHistory(
            user_id=user.id,
            anime_id=anime_id,
            anime_title=anime_title,
            episode=episode,
            progress=progress,
            total_duration=total_duration,
        )
        db.add(entry)
    await db.commit()
    return {"status": "ok"}
