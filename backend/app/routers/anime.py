import asyncio

from fastapi import APIRouter, Depends, Query

from app.scrapers.allanime import AllanimeScraper

router = APIRouter(prefix="/api/anime", tags=["anime"])


async def get_scraper() -> AllanimeScraper:
    scraper = AllanimeScraper()
    try:
        yield scraper
    finally:
        scraper.close()


@router.get("/search")
async def search_anime(
    q: str = Query(...),
    mode: str = Query("sub"),
    scraper: AllanimeScraper = Depends(get_scraper),
):
    results = await asyncio.to_thread(scraper.search, q, mode)
    return results


@router.get("/episodes")
async def get_episodes(
    show_id: str = Query(..., alias="id"),
    mode: str = Query("sub"),
    scraper: AllanimeScraper = Depends(get_scraper),
):
    episodes = await asyncio.to_thread(scraper.get_episodes, show_id, mode)
    return {"episodes": episodes}


@router.get("/sources")
async def get_sources(
    show_id: str = Query(..., alias="id"),
    episode: str = Query(...),
    mode: str = Query("sub"),
    scraper: AllanimeScraper = Depends(get_scraper),
):
    links, referrers = await asyncio.to_thread(
        scraper.get_sources, show_id, episode, mode
    )
    return {"links": links, "referrers": referrers}
