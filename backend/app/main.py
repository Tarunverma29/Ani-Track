import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.database import init_db

logger = logging.getLogger("ani-track")
from app.auth.routes import router as auth_router
from app.routers.anime import router as anime_router
from app.routers.stream import router as stream_router
from app.routers.preferences import router as preferences_router
from app.routers.library import router as library_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    if settings.secret_key == "change-me-in-production":
        logger.warning("Using default SECRET_KEY - change it in production!")
    await init_db()
    yield


app = FastAPI(title="Ani-Track", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(anime_router)
app.include_router(stream_router)
app.include_router(preferences_router)
app.include_router(library_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return FileResponse(os.path.join("static", "index.html"), media_type="text/html")


@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "Not found"}, status_code=404)
    index_path = os.path.join("static", "index.html")
    if not os.path.isfile(index_path):
        return JSONResponse({"detail": "Frontend not built"}, status_code=503)
    file_path = os.path.join("static", full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(index_path, media_type="text/html")
