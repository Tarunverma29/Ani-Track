from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func, UniqueConstraint
from app.database import Base


class AnimeLibrary(Base):
    __tablename__ = "anime_library"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    anime_id = Column(String(64), nullable=False)
    anime_title = Column(String(256), nullable=False)
    anime_title_jp = Column(String(256), default="")
    total_episodes = Column(Integer, default=0)
    episodes_watched = Column(Integer, default=0)
    status = Column(String(16), default="planning")
    user_score = Column(Integer, nullable=True)
    genre = Column(String(512), default="")
    year = Column(Integer, nullable=True)
    studio = Column(String(256), default="")
    synopsis = Column(Text, default="")
    image = Column(String(512), default="")
    banner = Column(String(512), default="")
    type = Column(String(16), default="TV")
    duration = Column(String(16), default="24m")
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    added_date = Column(DateTime, server_default=func.now(), nullable=False)
    season = Column(String(16), default="")

    __table_args__ = (
        UniqueConstraint("user_id", "anime_id", name="uq_user_anime"),
    )
