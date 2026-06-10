from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    default_quality = Column(Integer, default=0)
    default_mode = Column(String(8), default="sub")
