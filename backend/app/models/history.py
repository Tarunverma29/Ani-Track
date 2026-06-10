from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func, UniqueConstraint
from app.database import Base


class WatchHistory(Base):
    __tablename__ = "watch_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    anime_id = Column(String(64), nullable=False)
    anime_title = Column(String(256), nullable=False)
    episode = Column(String(16), nullable=False)
    progress = Column(Float, default=0.0)
    total_duration = Column(Float, default=0.0)
    last_watched = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "anime_id", "episode", name="uq_user_anime_episode"),
    )
