from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./ani-track.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200
    allowed_origins: str = "http://localhost:5173,http://localhost:80"

    allanime_refr: str = "https://youtu-chan.com"
    allanime_base: str = "allanime.day"
    allanime_api: str = "https://api.allanime.day"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
