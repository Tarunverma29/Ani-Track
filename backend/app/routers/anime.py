from fastapi import APIRouter, Depends, Query

from app.scrapers.allanime import AllanimeScraper

router = APIRouter(prefix="/api/anime", tags=["anime"])

PROVIDER_PRIORITY = ["Yt-mp4", "Default", "Fm-Hls", "Mp4", "Sw", "Vg", "Luf-Mp4", "S-mp4"]


async def get_scraper() -> AllanimeScraper:
    scraper = AllanimeScraper()
    try:
        yield scraper
    finally:
        await scraper.close()


@router.get("/search")
async def search_anime(
    q: str = Query(...),
    mode: str = Query("sub"),
    scraper: AllanimeScraper = Depends(get_scraper),
):
    results = await scraper.search(q, mode=mode)
    return [
        {"id": r.id, "title": r.title, "episodes": r.episodes}
        for r in results
    ]


@router.get("/episodes")
async def get_episodes(
    show_id: str = Query(..., alias="id"),
    mode: str = Query("sub"),
    scraper: AllanimeScraper = Depends(get_scraper),
):
    episodes = await scraper.get_episodes(show_id, mode=mode)
    return {"episodes": episodes}


@router.get("/sources")
async def get_sources(
    show_id: str = Query(..., alias="id"),
    episode: str = Query(...),
    mode: str = Query("sub"),
    scraper: AllanimeScraper = Depends(get_scraper),
):
    sources = await scraper.get_episode_sources(show_id, episode, mode=mode)

    all_links: dict[int, str] = {}
    tried = set()

    for provider in PROVIDER_PRIORITY:
        if provider not in sources or provider in tried:
            continue
        tried.add(provider)
        links = await scraper.resolve_source(provider, sources[provider])
        if links:
            for quality, url in links.items():
                if quality not in all_links:
                    all_links[quality] = url
            if all_links:
                break

    return {"links": all_links}
