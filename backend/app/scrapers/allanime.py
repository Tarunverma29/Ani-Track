from anipy_api.provider import get_provider, LanguageTypeEnum

PROVIDER_PRIORITY = ["allanime"]


class AllanimeScraper:
    def __init__(self):
        self._providers = {}

    def _get_provider(self, name: str):
        if name not in self._providers:
            self._providers[name] = get_provider(name)
        return self._providers[name]

    def _parse_anime_id(self, anime_id: str) -> tuple[str, str]:
        if ":" in anime_id:
            parts = anime_id.split(":", 1)
            return parts[0], parts[1]
        return "allanime", anime_id

    def search(self, query: str, mode: str = "sub") -> list[dict]:
        results = []
        seen = set()
        for prov_name in PROVIDER_PRIORITY:
            try:
                provider = self._get_provider(prov_name)
                search_results = provider.get_search(query)
                for r in search_results:
                    key = r.name.lower().strip()
                    if key not in seen:
                        seen.add(key)
                        results.append({
                            "id": f"{prov_name}:{r.identifier}",
                            "title": r.name,
                            "episodes": 0,
                        })
            except Exception:
                continue
        return results

    def get_episodes(self, anime_id: str, mode: str = "sub") -> list[str]:
        prov_name, identifier = self._parse_anime_id(anime_id)
        provider = self._get_provider(prov_name)
        lang = LanguageTypeEnum.SUB if mode == "sub" else LanguageTypeEnum.DUB
        episodes = provider.get_episodes(identifier, lang)
        return [str(e) for e in episodes]

    def get_sources(self, anime_id: str, episode: str, mode: str = "sub") -> tuple[dict[int, str], dict[int, str | None]]:
        prov_name, identifier = self._parse_anime_id(anime_id)
        provider = self._get_provider(prov_name)
        lang = LanguageTypeEnum.SUB if mode == "sub" else LanguageTypeEnum.DUB
        ep_num = float(episode) if "." in episode else int(episode)
        streams = provider.get_video(identifier, ep_num, lang)
        links: dict[int, str] = {}
        referrers: dict[int, str | None] = {}
        for stream in streams:
            links[stream.resolution] = stream.url
            referrers[stream.resolution] = stream.referrer
        sorted_links = dict(sorted(links.items(), reverse=True))
        sorted_referrers = dict(sorted(referrers.items(), reverse=True))
        return sorted_links, sorted_referrers

    def close(self):
        for p in self._providers.values():
            try:
                p._session.close()
            except Exception:
                pass
