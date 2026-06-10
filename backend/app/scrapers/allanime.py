import hashlib
import json
from urllib.parse import urljoin

import httpx

from app.config import settings

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0"
ALLANIME_KEY = hashlib.sha256(b"Xot36i3lK3:v1").digest()

HEX_MAP = {
    "79": "A", "7a": "B", "7b": "C", "7c": "D", "7d": "E", "7e": "F",
    "7f": "G", "70": "H", "71": "I", "72": "J", "73": "K", "74": "L",
    "75": "M", "76": "N", "77": "O", "68": "P", "69": "Q", "6a": "R",
    "6b": "S", "6c": "T", "6d": "U", "6e": "V", "6f": "W", "60": "X",
    "61": "Y", "62": "Z", "59": "a", "5a": "b", "5b": "c", "5c": "d",
    "5d": "e", "5e": "f", "5f": "g", "50": "h", "51": "i", "52": "j",
    "53": "k", "54": "l", "55": "m", "56": "n", "57": "o", "48": "p",
    "49": "q", "4a": "r", "4b": "s", "4c": "t", "4d": "u", "4e": "v",
    "4f": "w", "40": "x", "41": "y", "42": "z", "08": "0", "09": "1",
    "0a": "2", "0b": "3", "0c": "4", "0d": "5", "0e": "6", "0f": "7",
    "00": "8", "01": "9", "15": "-", "16": ".", "67": "_", "46": "~",
    "02": ":", "17": "/", "07": "?", "1b": "#", "63": "[", "65": "]",
    "78": "@", "19": "!", "1c": "$", "1e": "&", "10": "(", "11": ")",
    "12": "*", "13": "+", "14": ",", "03": ";", "05": "=", "1d": "%",
}


def _decrypt_tobeparsed(data: str) -> str:
    import base64
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

    raw = base64.b64decode(data)
    iv = raw[1:13]
    ctr = iv + b"\x00\x00\x00\x02"
    ct = raw[13:-16]
    cipher = Cipher(algorithms.AES(ALLANIME_KEY), modes.CTR(ctr))
    decryptor = cipher.decryptor()
    plain = decryptor.update(ct) + decryptor.finalize()
    return plain.decode("utf-8", errors="replace")


def _hex_id_decode(hex_id: str) -> str:
    pairs = [hex_id[i:i+2] for i in range(0, len(hex_id), 2)]
    result = "".join(HEX_MAP.get(p, "") for p in pairs)
    return result.replace("/clock", "/clock.json")


def _process_response(resp: str) -> str:
    import json as _json
    try:
        data = _json.loads(resp)
    except _json.JSONDecodeError:
        return resp

    if isinstance(data, dict):
        inner = data.get("data") or data
        if isinstance(inner, dict) and "tobeparsed" in inner:
            return _decrypt_tobeparsed(inner["tobeparsed"])
    return resp


def _normalize_url(url: str, base_url: str = "") -> str:
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("--"):
        return _hex_id_decode(url[2:])
    if url.startswith("/"):
        return urljoin(base_url, url)
    return url


class AllanimeSearchResult:
    def __init__(self, _id: str, title: str, episodes: int):
        self.id = _id
        self.title = title
        self.episodes = episodes


class AllanimeScraper:
    def __init__(self):
        self.client = httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
            timeout=httpx.Timeout(30.0, connect=10.0),
        )

    async def close(self):
        await self.client.aclose()

    async def search(self, query: str, mode: str = "sub") -> list[AllanimeSearchResult]:
        search_gql = """query($search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType) {
            shows(search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin) {
                edges { _id name availableEpisodes __typename }
            }
        }"""
        variables = {
            "search": {"allowAdult": False, "allowUnknown": False, "query": query},
            "limit": 40, "page": 1,
            "translationType": mode,
            "countryOrigin": "ALL",
        }

        resp = await self.client.post(
            f"{settings.allanime_api}/api",
            json={"variables": variables, "query": search_gql},
            headers={"Origin": settings.allanime_refr},
        )

        import re
        results = []
        for match in re.finditer(
            r'_id":"([^"]*)","name":"(.+?)",".*?' + re.escape(mode) + r'":([0-9][^,]*)',
            resp.text,
        ):
            _id = match.group(1)
            title = match.group(2).replace('\\"', '"')
            episodes = int(match.group(3))
            results.append(AllanimeSearchResult(_id, title, episodes))
        return results

    async def get_episodes(self, show_id: str, mode: str = "sub") -> list[str]:
        episodes_gql = """query($showId: String!) { show(_id: $showId) { _id availableEpisodesDetail } }"""

        resp = await self.client.post(
            f"{settings.allanime_api}/api",
            json={"variables": {"showId": show_id}, "query": episodes_gql},
            headers={"Origin": settings.allanime_refr},
        )

        import re
        match = re.search(rf'"{mode}"\s*:\s*\[([0-9.,"]*)\]', resp.text)
        if not match:
            return []

        raw_eps = match.group(1)
        eps = [e.strip('"') for e in raw_eps.split(",") if e.strip('"')]
        eps.sort(key=lambda x: float(x))
        return eps

    async def get_episode_sources(self, show_id: str, episode: str, mode: str = "sub") -> dict[str, str]:
        query_hash = "d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec"
        variables = {"showId": show_id, "translationType": mode, "episodeString": episode}
        extensions = {"persistedQuery": {"version": 1, "sha256Hash": query_hash}}

        vars_str = json.dumps(variables, separators=(",", ":"))
        exts_str = json.dumps(extensions, separators=(",", ":"))

        resp = await self.client.get(
            f"{settings.allanime_api}/api",
            params={"variables": vars_str, "extensions": exts_str},
            headers={"Origin": settings.allanime_refr},
        )

        if "tobeparsed" not in resp.text:
            episode_gql = """query($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
                episode(showId: $showId translationType: $translationType episodeString: $episodeString) {
                    episodeString sourceUrls
                }
            }"""
            resp = await self.client.post(
                f"{settings.allanime_api}/api",
                json={"variables": variables, "query": episode_gql},
                headers={"Origin": settings.allanime_refr},
            )

        processed = _process_response(resp.text)

        sources: dict[str, str] = {}
        try:
            parsed = json.loads(processed)
            episode_data = parsed.get("episode", parsed)
            source_urls = episode_data.get("sourceUrls", [])
            for s in source_urls:
                name = s.get("sourceName", "")
                url = s.get("sourceUrl", "")
                if name and url:
                    sources[name] = _normalize_url(url)
        except json.JSONDecodeError:
            pass
        return sources

    async def resolve_source(self, source_name: str, source_url: str) -> dict[int, str]:
        try:
            if source_name in ("Default",):
                return await self._resolve_wixmp(source_url)

            if source_name in ("Yt-mp4",):
                return {0: source_url}

            if source_name == "Fm-Hls":
                return await self._resolve_filemoon(source_url)

            if source_name in ("Mp4", "Vg", "Sw", "S-mp4", "Luf-Mp4"):
                return await self._resolve_embed_page(source_url)

            return await self._resolve_embed_page(source_url)
        except Exception:
            return {}

    async def _resolve_wixmp(self, source_url: str) -> dict[int, str]:
        embed_url = f"https://{settings.allanime_base}{source_url}"
        resp_text = await self._fetch_page(embed_url, referer=settings.allanime_refr)

        import re
        m3u8_match = re.search(r'link":"([^"]*)"[^}]*"resolutionStr":"([^"]*)"', resp_text)
        hls_match = re.search(r'hls","url":"([^"]*)"[^}]*"hardsub_lang":"en-US"', resp_text)

        if m3u8_match:
            resolved_url = m3u8_match.group(1)
        elif hls_match:
            resolved_url = hls_match.group(1)
        else:
            return {}

        resolved_url = resolved_url.replace("\\", "")

        if "repackager.wixmp.com" in resolved_url:
            return self._resolve_wixmp_repackaged(resolved_url)
        if "master.m3u8" in resolved_url:
            return await self._resolve_m3u8(resolved_url)

        quality_match = re.search(r'/(\d+)\.mp4', resolved_url)
        if quality_match:
            return {int(quality_match.group(1)): resolved_url}
        return {0: resolved_url}

    @staticmethod
    def _resolve_wixmp_repackaged(url: str) -> dict[int, str]:
        import re
        base = re.sub(r'repackager\.wixmp\.com/', '', url)
        base = re.sub(r'\.urlset.*', '', base)
        qualities = re.findall(r'/,([^/]*),/mp4', url)
        result = {}
        for q in qualities[0].split(",") if qualities else []:
            try:
                q_int = int(q)
                stream_url = base.replace(",", q, 1) if "," in base else base
                result[q_int] = stream_url
            except ValueError:
                continue
        return dict(sorted(result.items(), reverse=True))

    async def _resolve_m3u8(self, url: str) -> dict[int, str]:
        import re
        relative_base = re.sub(r'[^/]*$', '', url)
        resp = await self._fetch_page(url)

        result = {}
        lines = resp.strip().split("\n")
        for i, line in enumerate(lines):
            if "EXT-X-STREAM-INF" in line:
                quality_match = re.search(r'RESOLUTION=\d+x(\d+)', line)
                if quality_match:
                    quality = int(quality_match.group(1))
                    if i + 1 < len(lines):
                        stream_url = lines[i + 1].strip()
                        if not stream_url.startswith("http"):
                            stream_url = relative_base + stream_url
                        result[quality] = stream_url
        return dict(sorted(result.items(), reverse=True))

    async def _resolve_embed_page(self, source_url: str) -> dict[int, str]:
        resp_text = await self._fetch_page(source_url, referer=settings.allanime_refr)

        import re
        src_match = re.search(r'src:\s*"([^"]*)"', resp_text)
        iframe_match = re.search(r'<iframe[^>]*src="([^"]*)"', resp_text, re.IGNORECASE)
        source_match = re.search(r'(https?://[^"\']+\.(?:m3u8|mp4)[^"\']*)', resp_text)

        if src_match:
            return {0: src_match.group(1)}
        if source_match:
            return {0: source_match.group(1)}
        if iframe_match:
            nested = await self._resolve_embed_page(iframe_match.group(1))
            if nested:
                return nested

        return {}

    async def _resolve_filemoon(self, source_url: str) -> dict[int, str]:
        import re
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        import base64

        resp_text = await self._fetch_page(source_url, referer=settings.allanime_refr)
        clean = resp_text.replace("\n", "").replace(" ", "")
        parts = clean.split(",")

        def extract(pattern: str) -> str:
            m = re.search(pattern, clean)
            return m.group(1) if m else ""

        iv = extract(r'"iv":"([^"]*)"')
        payload = extract(r'"payload":"([^"]*)"')
        kp1 = extract(r'"key_parts":\["([^"]*)"')
        kp2_match = re.search(r'"key_parts":\["[^"]*","([^"]*)"', clean)
        kp2 = kp2_match.group(1) if kp2_match else ""

        if not (iv and payload and kp1):
            return {}

        def b64url_to_hex(s: str) -> str:
            pad_len = (4 - len(s) % 4) % 4
            s += "=" * pad_len
            return base64.urlsafe_b64decode(s).hex()

        key_hex = b64url_to_hex(kp1) + b64url_to_hex(kp2)
        iv_hex = b64url_to_hex(iv) + "00000002"

        pad_len = (4 - len(payload) % 4) % 4
        raw_payload = base64.urlsafe_b64decode(payload + "=" * pad_len)
        ct = raw_payload[:-16]

        cipher = Cipher(algorithms.AES(bytes.fromhex(key_hex)), modes.CTR(bytes.fromhex(iv_hex)))
        decryptor = cipher.decryptor()
        plain = decryptor.update(ct) + decryptor.finalize()

        result: dict[int, str] = {}
        for match in re.finditer(r'"url":"([^"]*)"[^}]*"height":(\d+)', plain.decode(errors="replace")):
            url = match.group(1).replace("\\u0026", "&").replace("\\u003D", "=")
            height = int(match.group(2))
            result[height] = url
        for match in re.finditer(r'"height":(\d+)[^}]*"url":"([^"]*)"', plain.decode(errors="replace")):
            url = match.group(2).replace("\\u0026", "&").replace("\\u003D", "=")
            height = int(match.group(1))
            result[height] = url

        return dict(sorted(result.items(), reverse=True))

    async def _fetch_page(self, url: str, referer: str = "") -> str:
        headers = {}
        if referer:
            headers["Referer"] = referer
        try:
            resp = await self.client.get(url, headers=headers, timeout=15.0)
            return resp.text
        except Exception:
            return ""
